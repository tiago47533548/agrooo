import { db } from '../db/dexieDb';
import { Producer, SyncQueueItem, QuestionnaireResponse } from '../db/schema';

export type SyncStatusState = 'ONLINE' | 'OFFLINE' | 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR';

export interface SyncEngineStatus {
  state: SyncStatusState;
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  supabaseConfigured: boolean;
}

type StatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private listeners: Set<StatusListener> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private errorMessage: string | null = null;
  private pingInterval: any = null;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Initial status from storage
    try {
      const lastSyncItem = await db.appConfig.get('last_sync_timestamp');
      if (lastSyncItem) {
        this.lastSyncedAt = lastSyncItem.value;
      }
    } catch (e) {
      console.warn('Could not read last_sync_timestamp from local DB', e);
    }

    // 2. Network event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivityChange(true));
      window.addEventListener('offline', () => this.handleConnectivityChange(false));

      // Trigger sync on foreground / visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isOnline) {
          this.triggerSync();
        }
      });

      // Background Sync API if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg: any) => {
          reg.sync?.register('sync-producers').catch(() => {});
        }).catch(() => {});
      }

      // Heartbeat ping every 45s to verify true internet reachability
      this.pingInterval = setInterval(() => this.checkRealConnectivity(), 45000);
    }

    this.notify();
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncEngineStatus {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const isConfigured = Boolean(supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co');

    let state: SyncStatusState = 'ONLINE';
    if (!this.isOnline) {
      state = 'OFFLINE';
    } else if (this.isSyncing) {
      state = 'SINCRONIZANDO';
    } else if (this.errorMessage) {
      state = 'ERROR';
    }

    return {
      state,
      isOnline: this.isOnline,
      pendingCount: 0, // Will be enriched dynamically
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
      supabaseConfigured: isConfigured
    };
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue.where('status').equals('pending').count();
    } catch {
      return 0;
    }
  }

  private async handleConnectivityChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      await this.checkRealConnectivity();
      this.triggerSync();
    } else {
      this.notify();
    }
  }

  private async checkRealConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      this.isOnline = false;
      this.notify();
      return false;
    }

    try {
      // Lightweight HTTP ping
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/favicon.ico', { 
        method: 'HEAD', 
        cache: 'no-store', 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      this.isOnline = res.ok || res.status < 500;
    } catch {
      // Could be truly offline
      this.isOnline = false;
    }
    this.notify();
    return this.isOnline;
  }

  /**
   * Enqueue a new operation into the local IndexedDB sync queue
   */
  public async enqueue(
    table: 'producers' | 'questionnaire_responses' | 'activities',
    action: 'insert' | 'update' | 'delete',
    recordId: string,
    payload: any
  ): Promise<string> {
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const queueItem: SyncQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      table,
      action,
      recordId,
      payload,
      idempotencyKey,
      attempts: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await db.syncQueue.add(queueItem);
    this.notify();

    // If online, attempt immediate sync
    if (this.isOnline && !this.isSyncing) {
      setTimeout(() => this.triggerSync(), 300);
    }

    return idempotencyKey;
  }

  /**
   * Execute sync cycle for all pending items
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, errors: ['Sincronización ya en curso'] };
    }

    const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
    if (pendingItems.length === 0) {
      this.errorMessage = null;
      this.notify();
      return { success: true, syncedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    this.errorMessage = null;
    this.notify();

    let syncedCount = 0;
    const errors: string[] = [];

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const hasSupabase = Boolean(supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co');

    try {
      for (const item of pendingItems) {
        await db.syncQueue.update(item.id, { status: 'syncing', lastAttempt: new Date().toISOString() });

        if (hasSupabase) {
          // Real cloud sync against Supabase REST endpoint
          try {
            const endpoint = `${supabaseUrl}/rest/v1/${item.table}`;
            const method = item.action === 'insert' ? 'POST' : item.action === 'update' ? 'PATCH' : 'DELETE';
            const headers: Record<string, string> = {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            };

            const response = await fetch(endpoint, {
              method,
              headers,
              body: JSON.stringify(item.payload)
            });

            if (!response.ok) {
              const errBody = await response.text();
              throw new Error(`HTTP ${response.status}: ${errBody}`);
            }

            // Mark as synced
            await db.syncQueue.update(item.id, { status: 'synced' });
            if (item.table === 'producers') {
              await db.producers.update(item.recordId, { 
                syncStatus: 'synced', 
                lastSyncedAt: new Date().toISOString() 
              });
            }
            syncedCount++;
          } catch (err: any) {
            console.error('Failed to sync item to Supabase:', err);
            const attempts = item.attempts + 1;
            await db.syncQueue.update(item.id, { 
              status: attempts >= 5 ? 'failed' : 'pending',
              attempts,
              error: err.message 
            });
            errors.push(`Error en ${item.recordId}: ${err.message}`);
          }
        } else {
          // Offline-First + Firebase Firestore Cloud Sync mode:
          // Syncs directly with Firebase Firestore cloud database
          try {
            if (item.table === 'producers' && item.payload) {
              const { uploadProducerToCloud } = await import('./firestoreSync');
              await uploadProducerToCloud(item.payload);
            }
          } catch (cloudErr) {
            console.warn('[SyncEngine] Cloud upload notice:', cloudErr);
          }
          
          await db.syncQueue.update(item.id, { status: 'synced' });
          if (item.table === 'producers') {
            await db.producers.update(item.recordId, { 
              syncStatus: 'synced', 
              lastSyncedAt: new Date().toISOString() 
            });
          } else if (item.table === 'questionnaire_responses') {
            await db.questionnaireResponses.update(item.recordId, {
              syncStatus: 'synced'
            });
          }
          syncedCount++;
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      await db.appConfig.put({ 
        key: 'last_sync_timestamp', 
        value: this.lastSyncedAt, 
        updatedAt: this.lastSyncedAt 
      });

      if (errors.length > 0) {
        this.errorMessage = `Se sincronizaron ${syncedCount} elementos con ${errors.length} observaciones.`;
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Error durante la sincronización';
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { success: errors.length === 0, syncedCount, errors };
  }

  private async notify() {
    const pendingCount = await this.getPendingCount();
    const current = this.getStatus();
    current.pendingCount = pendingCount;
    
    // Compute aggregate state
    if (!this.isOnline) {
      current.state = 'OFFLINE';
    } else if (this.isSyncing) {
      current.state = 'SINCRONIZANDO';
    } else if (this.errorMessage) {
      current.state = 'ERROR';
    } else if (pendingCount > 0) {
      current.state = 'PENDIENTE';
    } else {
      current.state = 'SINCRONIZADO';
    }

    this.listeners.forEach((listener) => listener(current));
  }
}

export const syncEngine = new SyncEngine();
