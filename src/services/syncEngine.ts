import { db, getDatabaseSession, isDatabaseSessionCurrent, type LocalDatabaseSession } from '../db/dexieDb';
import { Producer, QuestionnaireResponse, SyncQueueItem } from '../db/schema';
import { uploadQueueItem } from './firestoreSync';
import { firebaseAuth } from './firebaseClient';
import { AuthService } from './authService';

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
  private cycleSession: LocalDatabaseSession | null = null;

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
    const session = getDatabaseSession();
    const authUid = firebaseAuth.currentUser?.uid;
    if (!authUid || session.uid !== authUid) throw new Error('La sesión está cambiando. Esperá antes de guardar.');
    const profile = await AuthService.requireFieldworkAuthorization();
    if (!isDatabaseSessionCurrent(session) || firebaseAuth.currentUser?.uid !== authUid) throw new Error('La sesión cambió antes de guardar. El registro no se agregó a otra cuenta.');
    const privileged = ['SUPERADMIN', 'ADMINISTRADOR'].includes(profile.role);
    const assigned = Array.isArray(profile.assignedMunicipalities) && profile.assignedMunicipalities.includes((record as any).municipalityId);
    if (table === 'producers') {
      if (!privileged && profile.role !== 'TECNICO') throw new Error('Este rol no puede crear ni editar productores.');
      if (!privileged && !assigned) throw new Error('El municipio del productor no está asignado a esta cuenta.');
    } else if (!privileged) {
      const response = record as QuestionnaireResponse;
      const technicianCreate = profile.role === 'TECNICO' && action === 'insert' && response.technicianAuthUid === profile.id && assigned;
      const supervisorReview = profile.role === 'SUPERVISOR' && action === 'update' && assigned;
      if (!technicianCreate && !supervisorReview) throw new Error('La cuenta no puede guardar esta respuesta en el municipio indicado.');
    }
    const localDb = session.db;
    const dexieTable = table === 'producers' ? localDb.producers : localDb.questionnaireResponses;
    const queues = localDb.syncQueue;
    const now = new Date().toISOString();
    const baseRevision = Number((record as any).cloudRevision || 0);
    const operationId = crypto.randomUUID();
    const pendingForRecord = await queues.where('recordId').equals(record.id).toArray();
    const predecessors = pendingForRecord
      .filter((item) => item.table === (table === 'questionnaireResponses' ? 'questionnaire_responses' : 'producers') && item.status !== 'synced')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const priorOperation = predecessors.at(-1);
    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(), table: table === 'questionnaireResponses' ? 'questionnaire_responses' : 'producers',
      action, recordId: record.id, payload: { ...record, cloudRevision: baseRevision, lastOperationId: operationId }, idempotencyKey: operationId,
      attempts: 0, status: 'pending', createdAt: now,
      baseRevision: priorOperation ? undefined : baseRevision,
      blockedByOperationId: priorOperation?.idempotencyKey,
      payloadRevision: (record as any).updatedAt || now
    };
    await localDb.transaction('rw', dexieTable, queues, async () => { await dexieTable.put(record as any); await queues.add(queueItem); });
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
    const session = getDatabaseSession();
    if (!firebaseAuth.currentUser || !session.uid || firebaseAuth.currentUser.uid !== session.uid) return { success: false, syncedCount: 0, errors: ['Iniciá sesión para sincronizar los datos de esta cuenta.'] };
    if (!this.isOnline) return { success: false, syncedCount: 0, errors: ['Sin conexión; los datos siguen guardados en este dispositivo.'] };
    if (this.cycle && this.cycleSession && isDatabaseSessionCurrent(this.cycleSession)) return this.cycle;
    const cycle = this.runCycle(session);
    this.cycle = cycle;
    this.cycleSession = session;
    try { return await cycle; } finally {
      if (this.cycle === cycle) { this.cycle = null; this.cycleSession = null; }
    }
  }

  private async runCycle(session: LocalDatabaseSession) {
    const localDb = session.db;
    const isCurrent = () => isDatabaseSessionCurrent(session) && firebaseAuth.currentUser?.uid === session.uid;
    this.isSyncing = true; this.errorMessage = null; await this.notify();
    let syncedCount = 0; const errors: string[] = [];
    try {
      // Drain repeatedly so work enqueued during an upload is handled this cycle.
      while (this.isOnline && isCurrent()) {
        const now = Date.now();
        const pending = await localDb.syncQueue.where('status').equals('pending').toArray();
        const earliestByRecord = new Map<string, SyncQueueItem>();
        for (const queued of pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
          const key = `${queued.table}:${queued.recordId}`;
          if (!earliestByRecord.has(key)) earliestByRecord.set(key, queued);
        }
        const batch = [...earliestByRecord.values()]
          .filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now)
          .sort((a, b) => (a.table === 'producers' ? 0 : 1) - (b.table === 'producers' ? 0 : 1) || a.createdAt.localeCompare(b.createdAt));
        if (!batch.length) {
          const nextTime = pending
            .map((item) => item.nextAttemptAt ? new Date(item.nextAttemptAt).getTime() : 0)
            .filter((time) => time > now)
            .sort((a, b) => a - b)[0];
          if (nextTime) this.scheduleRetry(nextTime - now);
          break;
        }
        const sentRecords = new Set<string>();
        for (const scheduled of batch) {
          if (!isCurrent()) break;
          const recordKey = `${scheduled.table}:${scheduled.recordId}`;
          if (sentRecords.has(recordKey)) continue;
          sentRecords.add(recordKey);
          const item = await localDb.syncQueue.get(scheduled.id);
          if (!item || item.status !== 'pending') continue;
          const predecessor = item.blockedByOperationId
            ? await localDb.syncQueue.where('idempotencyKey').equals(item.blockedByOperationId).first()
            : undefined;
          if (predecessor && predecessor.status !== 'synced') continue;
          await localDb.syncQueue.update(item.id, { status: 'syncing', lastAttempt: new Date().toISOString(), baseRevision: item.baseRevision });
          const result = await uploadQueueItem(item);
          if (!isCurrent()) {
            await localDb.syncQueue.update(item.id, {
              status: 'pending',
              error: 'La sesión cambió durante el envío; se reintentará al volver a esta cuenta.'
            }).catch(() => undefined);
            break;
          }
          if (result.ok) {
            await localDb.transaction('rw', localDb.producers, localDb.questionnaireResponses, localDb.syncQueue, async () => {
              const local = item.table === 'questionnaire_responses' ? await localDb.questionnaireResponses.get(item.recordId) : await localDb.producers.get(item.recordId);
              const matches = local && ((local as any).updatedAt || '') === (item.payloadRevision || (item.payload as any).updatedAt || '');
              if (matches) {
                if (item.table === 'questionnaire_responses') await localDb.questionnaireResponses.update(item.recordId, { syncStatus: 'synced', cloudRevision: result.revision });
                else await localDb.producers.update(item.recordId, { syncStatus: 'synced', cloudRevision: result.revision, lastSyncedAt: new Date().toISOString(), syncError: undefined });
              }
              await localDb.syncQueue.update(item.id, { status: 'synced', error: undefined, errorKind: undefined });
              // The next local edit is based on this device's successful write.
              const next = (await localDb.syncQueue.where('status').equals('pending').toArray())
                .find((queued) => queued.table === item.table && queued.recordId === item.recordId && queued.createdAt >= item.createdAt);
              if (next) await localDb.syncQueue.update(next.id, { baseRevision: result.revision, blockedByOperationId: item.idempotencyKey });
            });
            syncedCount++;
            this.lastSyncedAt = new Date().toISOString();
            await localDb.appConfig.put({ key: 'last_sync_timestamp', value: this.lastSyncedAt, updatedAt: this.lastSyncedAt });
          } else if (result.kind === 'conflict') {
            if (item.table === 'producers') await localDb.producers.update(item.recordId, { syncStatus: 'conflict', syncError: result.message, syncConflict: { cloudRecord: result.cloudRecord as Producer, detectedAt: new Date().toISOString() } });
            await localDb.syncQueue.update(item.id, { status: 'failed', error: result.message, errorKind: 'conflict' });
            await localDb.syncQueue.where('recordId').equals(item.recordId).modify((queued) => {
              if (queued.table === item.table && queued.status === 'pending') { queued.status = 'failed'; queued.error = 'Se detuvo la cola de este registro por un conflicto anterior.'; queued.errorKind = 'conflict'; }
            });
            errors.push(result.message);
          } else {
            const attempts = item.attempts + 1;
            const terminal = result.kind === 'permission' || result.kind === 'validation' || attempts >= 10;
            const delay = Math.min(5 * 60_000, 2_000 * 2 ** Math.min(attempts - 1, 8));
            await localDb.syncQueue.update(item.id, { status: terminal ? 'failed' : 'pending', attempts, error: result.message, errorKind: result.kind, nextAttemptAt: terminal ? undefined : new Date(Date.now() + delay).toISOString() });
            if (terminal) await localDb.syncQueue.where('recordId').equals(item.recordId).modify((queued) => {
              if (queued.table === item.table && queued.status === 'pending') {
                queued.status = 'failed';
                queued.error = 'La cola se detuvo por una operación anterior que no pudo sincronizarse.';
                queued.errorKind = result.kind;
              }
            });
            if (item.table === 'producers') await localDb.producers.update(item.recordId, { syncStatus: terminal ? 'error' : 'pending', syncError: result.message });
            else if (item.table === 'questionnaire_responses') await localDb.questionnaireResponses.update(item.recordId, { syncStatus: terminal ? 'error' : 'pending' });
            errors.push(result.message);
            if (!terminal) this.scheduleRetry(delay);
          }
        }
      }
    } catch (error: any) { const message = error?.message || 'Error durante la sincronización.'; this.errorMessage = message; errors.push(message); }
    finally {
      if (this.cycleSession === session) {
        this.isSyncing = false;
        if (errors.length) this.errorMessage = errors[0];
      }
      await this.notify();
    }
    return { success: errors.length === 0, syncedCount, errors };
  }
  private scheduleRetry(delay: number) {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.triggerSync(); }, delay);
  }
  private async notify() {
    const session = getDatabaseSession();
    const localDb = session.db;
    const [pendingCount, failedCount, conflictCount] = await Promise.all([
      localDb.syncQueue.where('status').equals('pending').count().catch(() => 0),
      localDb.syncQueue.where('status').equals('failed').count().catch(() => 0),
      localDb.producers.where('syncStatus').equals('conflict').count().catch(() => 0)
    ]);
    if (!isDatabaseSessionCurrent(session)) return;
    const current = this.getStatus(); current.pendingCount = pendingCount; current.failedCount = failedCount; current.conflictCount = conflictCount;
    if (!this.isOnline) current.state = 'OFFLINE'; else if (this.isSyncing) current.state = 'SINCRONIZANDO'; else if (this.errorMessage || failedCount || conflictCount) current.state = 'ERROR'; else if (pendingCount) current.state = 'PENDIENTE'; else current.state = 'SINCRONIZADO';
    this.listeners.forEach((listener) => listener(current));
  }
}

export const syncEngine = new SyncEngine();
