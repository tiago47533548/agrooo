import { db } from '../db/dexieDb';
import { Producer, QuestionnaireResponse, SyncQueueItem } from '../db/schema';
import { uploadQueueItem } from './firestoreSync';

export type SyncStatusState = 'ONLINE' | 'OFFLINE' | 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR';
export interface SyncEngineStatus {
  state: SyncStatusState; isOnline: boolean; pendingCount: number; failedCount: number;
  conflictCount: number; lastSyncedAt: string | null; errorMessage: string | null;
}
type StatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private listeners = new Set<StatusListener>();
  private isOnline = typeof navigator === 'undefined' || navigator.onLine;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private errorMessage: string | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private cycle: Promise<{ success: boolean; syncedCount: number; errors: string[] }> | null = null;

  constructor() { void this.init(); }
  private async init() {
    const last = await db.appConfig.get('last_sync_timestamp').catch(() => undefined);
    this.lastSyncedAt = last?.value || null;
    await db.syncQueue.where('status').equals('syncing').modify({ status: 'pending', error: 'La app se cerró durante el envío; se reintentará.' });
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.isOnline = true; void this.triggerSync(); });
      window.addEventListener('offline', () => { this.isOnline = false; void this.notify(); });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void this.triggerSync(); });
      window.addEventListener('focus', () => void this.triggerSync());
      void this.triggerSync();
    }
    await this.notify();
  }
  subscribe(listener: StatusListener) { this.listeners.add(listener); void this.notify(); return () => this.listeners.delete(listener); }
  getStatus(): SyncEngineStatus {
    return { state: !this.isOnline ? 'OFFLINE' : this.isSyncing ? 'SINCRONIZANDO' : this.errorMessage ? 'ERROR' : 'ONLINE', isOnline: this.isOnline, pendingCount: 0, failedCount: 0, conflictCount: 0, lastSyncedAt: this.lastSyncedAt, errorMessage: this.errorMessage };
  }
  async getPendingCount() { return db.syncQueue.where('status').equals('pending').count().catch(() => 0); }

  async saveAndEnqueue(table: 'producers' | 'questionnaireResponses', record: Producer | QuestionnaireResponse, action: 'insert' | 'update') {
    const dexieTable = table === 'producers' ? db.producers : db.questionnaireResponses;
    const queues = db.syncQueue;
    const now = new Date().toISOString();
    const baseRevision = (record as any).cloudRevision || 0;
    const queueItem: SyncQueueItem = {
      id: `queue_${table}_${record.id}_${Date.now()}`, table: table === 'questionnaireResponses' ? 'questionnaire_responses' : 'producers',
      action, recordId: record.id, payload: record, idempotencyKey: `idemp_${table}_${record.id}_${(record as any).updatedAt || now}`,
      attempts: 0, status: 'pending', createdAt: now, baseRevision, payloadRevision: (record as any).updatedAt || now
    };
    await db.transaction('rw', dexieTable, queues, async () => { await dexieTable.put(record as any); await queues.add(queueItem); });
    void this.notify();
    if (this.isOnline) setTimeout(() => void this.triggerSync(), 100);
    return queueItem.idempotencyKey;
  }

  async enqueue(table: 'producers' | 'questionnaire_responses' | 'activities', action: 'insert' | 'update' | 'delete', recordId: string, payload: any) {
    if (table === 'producers') return this.saveAndEnqueue('producers', payload, action === 'delete' ? 'update' : action);
    if (table === 'questionnaire_responses') return this.saveAndEnqueue('questionnaireResponses', payload, action === 'delete' ? 'update' : action);
    throw new Error('La sincronización de actividades individuales no está implementada; inclúyalas en el registro productor.');
  }

  async retryFailed() {
    await db.syncQueue.where('status').equals('failed').modify({ status: 'pending', attempts: 0, nextAttemptAt: undefined, error: undefined, errorKind: undefined });
    this.errorMessage = null;
    return this.triggerSync();
  }

  async triggerSync(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (this.cycle) return this.cycle;
    if (!this.isOnline) return { success: false, syncedCount: 0, errors: ['Sin conexión; los datos siguen guardados en este dispositivo.'] };
    this.cycle = this.runCycle();
    try { return await this.cycle; } finally { this.cycle = null; }
  }

  private async runCycle() {
    this.isSyncing = true; this.errorMessage = null; await this.notify();
    let syncedCount = 0; const errors: string[] = [];
    try {
      // Drain repeatedly so work enqueued during an upload is handled this cycle.
      while (this.isOnline) {
        const now = Date.now();
        const batch = (await db.syncQueue.where('status').equals('pending').toArray())
          .filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now)
          .sort((a, b) => (a.table === 'producers' ? 0 : 1) - (b.table === 'producers' ? 0 : 1) || a.createdAt.localeCompare(b.createdAt));
        if (!batch.length) {
          const nextTime = (await db.syncQueue.where('status').equals('pending').toArray())
            .map((item) => item.nextAttemptAt ? new Date(item.nextAttemptAt).getTime() : 0)
            .filter((time) => time > now)
            .sort((a, b) => a - b)[0];
          if (nextTime) this.scheduleRetry(nextTime - now);
          break;
        }
        for (const item of batch) {
          await db.syncQueue.update(item.id, { status: 'syncing', lastAttempt: new Date().toISOString() });
          const result = await uploadQueueItem(item);
          if (result.ok) {
            await db.transaction('rw', db.producers, db.questionnaireResponses, db.syncQueue, async () => {
              const local = item.table === 'questionnaire_responses' ? await db.questionnaireResponses.get(item.recordId) : await db.producers.get(item.recordId);
              const matches = local && ((local as any).updatedAt || '') === (item.payloadRevision || (item.payload as any).updatedAt || '');
              if (matches) {
                if (item.table === 'questionnaire_responses') await db.questionnaireResponses.update(item.recordId, { syncStatus: 'synced', cloudRevision: result.revision });
                else await db.producers.update(item.recordId, { syncStatus: 'synced', cloudRevision: result.revision, lastSyncedAt: new Date().toISOString(), syncError: undefined });
              }
              await db.syncQueue.update(item.id, { status: 'synced', error: undefined, errorKind: undefined });
              // The next local edit is based on this device's successful write.
              const next = (await db.syncQueue.where('status').equals('pending').toArray())
                .find((queued) => queued.table === item.table && queued.recordId === item.recordId && queued.createdAt >= item.createdAt);
              if (next) await db.syncQueue.update(next.id, { baseRevision: result.revision });
            });
            syncedCount++;
            this.lastSyncedAt = new Date().toISOString();
            await db.appConfig.put({ key: 'last_sync_timestamp', value: this.lastSyncedAt, updatedAt: this.lastSyncedAt });
          } else if (result.kind === 'conflict') {
            if (item.table === 'producers') await db.producers.update(item.recordId, { syncStatus: 'conflict', syncError: result.message, syncConflict: { cloudRecord: result.cloudRecord as Producer, detectedAt: new Date().toISOString() } });
            await db.syncQueue.update(item.id, { status: 'failed', error: result.message, errorKind: 'conflict' });
            errors.push(result.message);
          } else {
            const attempts = item.attempts + 1;
            const terminal = result.kind === 'permission' || result.kind === 'validation' || attempts >= 10;
            const delay = Math.min(5 * 60_000, 2_000 * 2 ** Math.min(attempts - 1, 8));
            await db.syncQueue.update(item.id, { status: terminal ? 'failed' : 'pending', attempts, error: result.message, errorKind: result.kind, nextAttemptAt: terminal ? undefined : new Date(Date.now() + delay).toISOString() });
            if (item.table === 'producers') await db.producers.update(item.recordId, { syncStatus: terminal ? 'error' : 'pending', syncError: result.message });
            else if (item.table === 'questionnaire_responses') await db.questionnaireResponses.update(item.recordId, { syncStatus: terminal ? 'error' : 'pending' });
            errors.push(result.message);
            if (!terminal) this.scheduleRetry(delay);
          }
        }
      }
    } catch (error: any) { const message = error?.message || 'Error durante la sincronización.'; this.errorMessage = message; errors.push(message); }
    finally { this.isSyncing = false; if (errors.length) this.errorMessage = errors[0]; await this.notify(); }
    return { success: errors.length === 0, syncedCount, errors };
  }
  private scheduleRetry(delay: number) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.triggerSync(); }, delay);
  }
  private async notify() {
    const [pendingCount, failedCount, conflictCount] = await Promise.all([
      db.syncQueue.where('status').equals('pending').count().catch(() => 0),
      db.syncQueue.where('status').equals('failed').count().catch(() => 0),
      db.producers.where('syncStatus').equals('conflict').count().catch(() => 0)
    ]);
    const current = this.getStatus(); current.pendingCount = pendingCount; current.failedCount = failedCount; current.conflictCount = conflictCount;
    if (!this.isOnline) current.state = 'OFFLINE'; else if (this.isSyncing) current.state = 'SINCRONIZANDO'; else if (this.errorMessage || failedCount || conflictCount) current.state = 'ERROR'; else if (pendingCount) current.state = 'PENDIENTE'; else current.state = 'SINCRONIZADO';
    this.listeners.forEach((listener) => listener(current));
  }
}

export const syncEngine = new SyncEngine();
