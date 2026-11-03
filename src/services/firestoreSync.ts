/** Firebase transport and reconciliation. Local sync state is owned by syncEngine. */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction,
  serverTimestamp, query, where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../db/dexieDb';
import { Producer, QuestionnaireResponse, SyncQueueItem } from '../db/schema';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export type UploadResult = { ok: true; revision: number } | { ok: false; kind: 'transient' | 'permission' | 'validation' | 'conflict' | 'unknown'; message: string; cloudRecord?: any };

/** Compatibility entry point: persist the change and enqueue it; never claims a cloud write. */
export async function uploadProducerToCloud(producer: Producer): Promise<boolean> {
  const { syncEngine } = await import('./syncEngine');
  await syncEngine.saveAndEnqueue('producers', { ...producer, syncStatus: 'pending' }, 'update');
  return true;
}

function classifyError(error: any): Extract<UploadResult, { ok: false }>['kind'] {
  const code = String(error?.code || '');
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'permission';
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) return 'validation';
  if (code.includes('unavailable') || code.includes('deadline-exceeded') || code.includes('network')) return 'transient';
  return 'unknown';
}

export async function uploadQueueItem(item: SyncQueueItem): Promise<UploadResult> {
  const collectionName = item.table === 'questionnaire_responses' ? 'questionnaireResponses' : 'producers';
  const ref = doc(firestoreDb, collectionName, item.recordId);
  try {
    await auth.authStateReady();
    return await runTransaction(firestoreDb, async (transaction) => {
      const existing = await transaction.get(ref);
      const cloud = existing.exists() ? existing.data() : null;
      const cloudRevision = Number(cloud?.cloudRevision || 0);
      const expectedRevision = Number(item.baseRevision || 0);
      if (item.action !== 'insert' && cloud && cloudRevision !== expectedRevision) {
        return { ok: false, kind: 'conflict', message: 'El registro cambió en la nube desde la última sincronización.', cloudRecord: cloud } as UploadResult;
      }
      if (item.action === 'insert' && cloud) {
        const same = cloud.updatedAt === item.payload?.updatedAt && cloud.id === item.recordId;
        if (!same) return { ok: false, kind: 'conflict', message: 'Ya existe un registro distinto con este identificador.', cloudRecord: cloud } as UploadResult;
      }
      const revision = cloudRevision + 1;
      transaction.set(ref, {
        ...item.payload,
        syncStatus: 'synced',
        cloudRevision: revision,
        cloudUpdatedAt: serverTimestamp()
      }, { merge: false });
      return { ok: true, revision } as UploadResult;
    });
  } catch (error: any) {
    return { ok: false, kind: classifyError(error), message: error?.message || 'No se pudo conectar con Firestore.' };
  }
}

export async function fetchProducersFromCloud(): Promise<Producer[]> {
  const snap = await getDocs(collection(firestoreDb, 'producers'));
  return snap.docs.map((item) => item.data() as Producer);
}

export async function syncCloudWithLocal(): Promise<{ uploaded: number; downloaded: number; total: number; errors: number }> {
  let uploaded = 0;
  let downloaded = 0;
  let errors = 0;
  await auth.authStateReady();
  const [cloudProducers, cloudResponses] = await Promise.all([
    fetchProducersFromCloud(),
    auth.currentUser && ['tiagorodirguez091@gmail.com', 'tiagorodriguez091@gmail.com', 'magnoleonrossi@gmail.com', 'admin@agro.misiones.gob.ar', 'marina.santos@agro.misiones.gob.ar'].includes(auth.currentUser.email || '')
      ? getDocs(collection(firestoreDb, 'questionnaireResponses'))
      : auth.currentUser
        ? getDocs(query(collection(firestoreDb, 'questionnaireResponses'), where('technicianAuthUid', '==', auth.currentUser.uid)))
        : Promise.resolve({ docs: [] } as any)
  ]);
  const cloudById = new Map(cloudProducers.map((p) => [p.id, p]));

  for (const cloud of cloudProducers) {
    const local = await db.producers.get(cloud.id);
    if (!local) {
      await db.producers.put(cloud);
      downloaded++;
    } else if (local.syncStatus === 'pending' || local.syncStatus === 'syncing' || local.syncStatus === 'conflict') {
      // Keep local edits intact. The revision check at upload time detects remote conflicts.
    } else {
      const cloudRevision = Number(cloud.cloudRevision || 0);
      const localRevision = Number(local.cloudRevision || 0);
      const localEditedAfterConfirmedUpload = Boolean(local.lastSyncedAt && new Date(local.updatedAt).getTime() > new Date(local.lastSyncedAt).getTime());
      const revisionChanged = Boolean(local.cloudRevision && cloudRevision !== localRevision);
      if (localEditedAfterConfirmedUpload || (revisionChanged && !local.lastSyncedAt)) {
        await db.producers.update(local.id, { syncStatus: 'conflict', syncConflict: { cloudRecord: cloud, detectedAt: new Date().toISOString() } });
      } else if (cloudRevision > localRevision || new Date(cloud.updatedAt || 0).getTime() > new Date(local.updatedAt || 0).getTime()) {
        await db.producers.put(cloud);
        downloaded++;
      } else if (!local.cloudRevision && cloudRevision === 0 && new Date(local.updatedAt || 0).getTime() > new Date(cloud.updatedAt || 0).getTime()) {
        await db.producers.update(local.id, { syncStatus: 'conflict', syncConflict: { cloudRecord: cloud, detectedAt: new Date().toISOString() } });
      }
    }
  }

  // Queue locally known producers missing from the cloud; never upload every
  // local row blindly during a read/reconciliation pass.
  for (const local of await db.producers.toArray()) {
    if (!cloudById.has(local.id) && local.syncStatus !== 'pending' && local.syncStatus !== 'conflict') {
      await db.producers.update(local.id, { syncStatus: 'pending' });
      await enqueueLocalRecord('producers', local.id, { ...local, syncStatus: 'pending' }, 0);
    }
  }

  const responseIds = new Set(cloudResponses.docs.map((d: any) => d.id));
  for (const response of await db.questionnaireResponses.toArray()) {
    if (!responseIds.has(response.id) && response.syncStatus === 'synced') {
      await db.questionnaireResponses.update(response.id, { syncStatus: 'pending' });
      await enqueueLocalRecord('questionnaire_responses', response.id, response, response.cloudRevision || 0);
    }
  }
  const total = await db.producers.count();
  return { uploaded, downloaded, total, errors };
}

async function enqueueLocalRecord(table: 'producers' | 'questionnaire_responses', id: string, payload: any, baseRevision: number) {
  const existing = (await db.syncQueue.where('status').equals('pending').toArray()).find((item) => item.table === table && item.recordId === id);
  if (existing) return;
  const now = new Date().toISOString();
  await db.syncQueue.add({ id: `queue_reconcile_${table}_${id}_${Date.now()}`, table, action: baseRevision ? 'update' : 'insert', recordId: id, payload, idempotencyKey: `reconcile_${table}_${id}_${payload.updatedAt || now}`, attempts: 0, status: 'pending', createdAt: now, baseRevision, payloadRevision: payload.updatedAt } as SyncQueueItem);
}

export function subscribeToCloudProducers(onUpdate: (producers: Producer[]) => void): () => void {
  return onSnapshot(collection(firestoreDb, 'producers'), (snapshot) => {
    const list = snapshot.docs.map((item) => item.data() as Producer);
    void (async () => {
      for (const cloud of list) {
        const local = await db.producers.get(cloud.id);
        if (!local) await db.producers.put(cloud);
        else if (local.syncStatus === 'pending' || local.syncStatus === 'syncing' || local.syncStatus === 'conflict') {
          // Never replace a local edit from a listener callback.
        } else if (local.syncStatus === 'synced' && local.cloudRevision && cloud.cloudRevision && local.cloudRevision !== cloud.cloudRevision) {
          const locallyChanged = Boolean(local.lastSyncedAt && new Date(local.updatedAt).getTime() > new Date(local.lastSyncedAt).getTime());
          if (locallyChanged) await db.producers.update(local.id, { syncStatus: 'conflict', syncConflict: { cloudRecord: cloud, detectedAt: new Date().toISOString() } });
          else if (Number(cloud.cloudRevision) > Number(local.cloudRevision)) await db.producers.put(cloud);
        } else if (local.syncStatus === 'synced' && new Date(cloud.updatedAt || 0).getTime() > new Date(local.updatedAt || 0).getTime()) await db.producers.put(cloud);
      }
      onUpdate(list);
    })().catch((error) => console.warn('No se pudieron aplicar cambios de Firestore:', error));
  }, (error) => console.warn('Listener Firestore:', error));
}

export async function resolveProducerConflict(producerId: string, choice: 'local' | 'cloud'): Promise<void> {
  const local = await db.producers.get(producerId);
  if (!local?.syncConflict) return;
  const cloud = local.syncConflict.cloudRecord;
  await db.syncQueue.where('recordId').equals(producerId).modify((item) => {
    if (item.status === 'failed' && item.errorKind === 'conflict') item.status = 'synced';
  });
  if (choice === 'cloud') {
    await db.producers.put({ ...cloud, syncStatus: 'synced', syncConflict: undefined });
    return;
  }
  await db.producers.put({ ...local, syncStatus: 'pending', cloudRevision: Number(cloud.cloudRevision || 0), syncConflict: undefined, updatedAt: new Date().toISOString() });
  const updated = await db.producers.get(producerId);
  if (updated) await enqueueLocalRecord('producers', producerId, updated, Number(cloud.cloudRevision || 0));
}

export async function getCloudRecord(collectionName: 'producers' | 'questionnaireResponses', id: string) {
  const snap = await getDoc(doc(firestoreDb, collectionName, id));
  return snap.exists() ? snap.data() : null;
}
