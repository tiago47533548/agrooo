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
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { firebaseStorage } from './firebaseClient';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export type UploadResult = { ok: true; revision: number } | { ok: false; kind: 'transient' | 'permission' | 'validation' | 'conflict' | 'unknown'; message: string; cloudRecord?: any };

async function compressAndUploadPhoto(dataUrl: string, uid: string, recordId: string, index: number): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No se pudo leer la imagen.')); });
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo comprimir la imagen en este dispositivo.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob: Blob | null = null;
  for (let quality = 0.86; quality >= 0.4; quality -= 0.1) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= 1024 * 1024) break;
  }
  if (!blob || blob.size > 1024 * 1024) throw new Error('La imagen supera 1 MiB aun después de comprimirla.');
  const path = `responses/${uid}/${recordId}/photo_${index}.jpg`;
  await uploadBytes(storageRef(firebaseStorage, path), blob, { contentType: 'image/jpeg' });
  return `storagePath:${path}`;
}

async function uploadInlinePhotos(value: any, uid: string, recordId: string, counter = { value: 0 }): Promise<any> {
  if (typeof value === 'string' && value.startsWith('data:image/')) return compressAndUploadPhoto(value, uid, recordId, counter.value++);
  if (Array.isArray(value)) return Promise.all(value.map((item) => uploadInlinePhotos(item, uid, recordId, counter)));
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await uploadInlinePhotos(item, uid, recordId, counter)])));
  return value;
}

function stripUndefined(value: any): any {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, stripUndefined(item)]));
  return value;
}

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
    const actor = auth.currentUser;
    if (!actor) return { ok: false, kind: 'permission', message: 'La sesión terminó; los datos permanecen en la cola local.' };
    const accountSnap = await getDoc(doc(firestoreDb, 'users', actor.uid));
    const account = accountSnap.data();
    if (!accountSnap.exists() || account?.active !== true || account?.approvalStatus !== 'approved' || actor.emailVerified !== true) return { ok: false, kind: 'permission', message: 'La cuenta no está autorizada. Los cambios siguen guardados localmente.' };
    const privileged = ['SUPERADMIN', 'ADMINISTRADOR'].includes(account.role);
    const payload = item.payload || {};
    if (item.table === 'producers' && !privileged && (!Array.isArray(account.assignedMunicipalities) || !account.assignedMunicipalities.includes(payload.municipalityId))) return { ok: false, kind: 'permission', message: 'El municipio ya no está asignado a esta cuenta. Los cambios siguen guardados localmente.' };
    if (item.table === 'questionnaire_responses') {
      const assigned = Array.isArray(account.assignedMunicipalities) && account.assignedMunicipalities.includes(payload.municipalityId);
      const technicianOwn = account.role === 'TECNICO' && payload.technicianAuthUid === actor.uid && assigned;
      const supervisorReview = account.role === 'SUPERVISOR' && item.action === 'update' && assigned;
      if (!privileged && !technicianOwn && !supervisorReview) return { ok: false, kind: 'permission', message: 'La respuesta no pertenece a las asignaciones vigentes de esta cuenta.' };
    }
    const payloadWithUploadedPhotos = await uploadInlinePhotos(payload, actor.uid, item.recordId);
    return await runTransaction(firestoreDb, async (transaction) => {
      const existing = await transaction.get(ref);
      const cloud = existing.exists() ? existing.data() : null;
      if (cloud?.lastOperationId === item.idempotencyKey) return { ok: true, revision: Number(cloud.cloudRevision || 1) } as UploadResult;
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
    const { syncStatus: _syncStatus, syncError: _syncError, syncConflict: _syncConflict, lastSyncedAt: _lastSyncedAt, cloudRevision: _cloudRevision, cloudUpdatedAt: _cloudUpdatedAt, lastOperationId: _lastOperationId, ...payloadWithoutLocalMetadata } = payloadWithUploadedPhotos || {};
      const sharedPayload = stripUndefined(payloadWithoutLocalMetadata);
      transaction.set(ref, {
        ...sharedPayload,
        cloudRevision: revision,
        lastOperationId: item.idempotencyKey,
        cloudUpdatedAt: serverTimestamp()
      }, { merge: false });
      return { ok: true, revision } as UploadResult;
    });
  } catch (error: any) {
    return { ok: false, kind: classifyError(error), message: error?.message || 'No se pudo conectar con Firestore.' };
  }
}

export async function fetchProducersFromCloud(): Promise<Producer[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];
  const profile = await getDoc(doc(firestoreDb, 'users', currentUser.uid));
  if (!profile.exists()) return [];
  const account = profile.data();
  if (account.active !== true || account.approvalStatus !== 'approved') return [];
  const base = collection(firestoreDb, 'producers');
  const privileged = ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'].includes(account.role);
  const municipalities = Array.isArray(account.assignedMunicipalities) ? account.assignedMunicipalities.slice(0, 10) : [];
  if (!privileged && municipalities.length === 0) return [];
  const snap = privileged
    ? await getDocs(base)
    : await getDocs(query(base, where('municipalityId', 'in', municipalities)));
  return snap.docs.map((item) => ({ ...item.data(), syncStatus: 'synced' } as Producer));
}

export async function syncCloudWithLocal(): Promise<{ uploaded: number; downloaded: number; total: number; errors: number }> {
  let uploaded = 0;
  let downloaded = 0;
  let errors = 0;
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  const profile = currentUser ? await getDoc(doc(firestoreDb, 'users', currentUser.uid)) : null;
  const account = profile?.data();
  const privileged = account && ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'].includes(account.role);
  const municipalities = Array.isArray(account?.assignedMunicipalities) ? account!.assignedMunicipalities.slice(0, 10) : [];
  let responseQuerySucceeded = false;
  const responsePromise = currentUser && account?.active === true && account?.approvalStatus === 'approved'
      ? privileged
        ? getDocs(collection(firestoreDb, 'questionnaireResponses'))
        : account?.role === 'TECNICO'
          ? municipalities.length ? getDocs(query(collection(firestoreDb, 'questionnaireResponses'), where('technicianAuthUid', '==', currentUser.uid), where('municipalityId', 'in', municipalities))) : Promise.resolve({ docs: [] } as any)
          : municipalities.length
            ? getDocs(query(collection(firestoreDb, 'questionnaireResponses'), where('municipalityId', 'in', municipalities)))
            : Promise.resolve({ docs: [] } as any)
      : Promise.resolve({ docs: [] } as any)
  const safeResponsePromise = responsePromise.then((result) => { responseQuerySucceeded = true; return result; }).catch((err) => {
      console.warn('Aviso lectura questionnaireResponses en nube:', err);
      return { docs: [] } as any;
  });
  const [cloudProducers, cloudResponses] = await Promise.all([fetchProducersFromCloud(), safeResponsePromise]);
  const allowedProducerIds = new Set(cloudProducers.map((producer) => producer.id));
  const allowedResponseIds = new Set(cloudResponses.docs.map((snapshot: any) => snapshot.id));
  const isPrivilegedWriter = Boolean(account && ['SUPERADMIN', 'ADMINISTRADOR'].includes(account.role));
  for (const local of await db.producers.toArray()) {
    if (allowedProducerIds.has(local.id)) continue;
    if (local.syncStatus === 'pending' || local.syncStatus === 'syncing' || local.syncStatus === 'conflict' || local.syncStatus === 'error') {
      if (!isPrivilegedWriter && !municipalities.includes(local.municipalityId || '')) {
        await db.producers.update(local.id, { syncStatus: 'error', syncError: 'Acceso retirado; el cambio se conserva localmente para exportar o revisar.' });
        await db.syncQueue.where('recordId').equals(local.id).modify((item) => { item.status = 'failed'; item.errorKind = 'permission'; item.error = 'La cuenta ya no tiene acceso al municipio.'; });
      }
    } else {
      await db.producers.delete(local.id);
    }
  }
  if (responseQuerySucceeded) for (const local of await db.questionnaireResponses.toArray()) {
    if (allowedResponseIds.has(local.id)) continue;
    if (local.syncStatus === 'pending' || local.syncStatus === 'error') {
      if (!account || local.technicianAuthUid !== currentUser?.uid || !municipalities.includes(local.municipalityId)) {
        await db.questionnaireResponses.update(local.id, { syncStatus: 'error' });
        await db.syncQueue.where('recordId').equals(local.id).modify((item) => { item.status = 'failed'; item.errorKind = 'permission'; item.error = 'La respuesta se conserva localmente; el acceso a su municipio ya no está vigente.'; });
      }
    } else {
      await db.questionnaireResponses.delete(local.id);
    }
  }
  for (const snapshot of cloudResponses.docs as any[]) {
    const cloud = { ...snapshot.data(), id: snapshot.id, syncStatus: 'synced' } as QuestionnaireResponse;
    const local = await db.questionnaireResponses.get(cloud.id);
    if (!local) {
      await db.questionnaireResponses.put(cloud);
      downloaded++;
    } else if (!['pending', 'syncing', 'error', 'conflict'].includes(local.syncStatus) && Number(cloud.cloudRevision || 0) > Number(local.cloudRevision || 0)) {
      await db.questionnaireResponses.put(cloud);
      downloaded++;
    }
  }
  if (currentUser && account?.active === true && account?.approvalStatus === 'approved') {
    const questionnaires = await getDocs(collection(firestoreDb, 'questionnaireVersions')).catch(() => null);
    if (questionnaires) for (const questionnaire of questionnaires.docs) {
      const version = questionnaire.data() as any;
      const cached = await db.questionnaires.get(version.id);
      if (!cached || Number(version.version) >= Number(cached.version)) await db.questionnaires.put(version);
    }
  }
  for (const cloud of cloudProducers) {
    const local = await db.producers.get(cloud.id);
    if (!local) {
      await db.producers.put(cloud);
      downloaded++;
    } else if (local.syncStatus === 'pending' || local.syncStatus === 'syncing' || local.syncStatus === 'conflict' || local.syncStatus === 'error') {
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

  // A scoped query omits records outside the current account's access. Absence
  // from that result is not evidence that a previously synced record is new.
  const total = await db.producers.count();
  return { uploaded, downloaded, total, errors };
}

async function enqueueLocalRecord(table: 'producers' | 'questionnaire_responses', id: string, payload: any, baseRevision: number) {
  const existing = (await db.syncQueue.where('status').equals('pending').toArray()).find((item) => item.table === table && item.recordId === id);
  if (existing) return;
  const now = new Date().toISOString();
  await db.syncQueue.add({ id: crypto.randomUUID(), table, action: baseRevision ? 'update' : 'insert', recordId: id, payload, idempotencyKey: crypto.randomUUID(), attempts: 0, status: 'pending', createdAt: now, baseRevision, payloadRevision: payload.updatedAt } as SyncQueueItem);
}

export function subscribeToCloudProducers(onUpdate: (producers: Producer[]) => void): () => void {
  let unsubscribe: (() => void) | undefined;
  let disposed = false;
  const currentUser = auth.currentUser;
  if (!currentUser) return () => undefined;
  void getDoc(doc(firestoreDb, 'users', currentUser.uid)).then((profile) => {
    if (disposed || !profile.exists()) return;
    const account = profile.data();
    if (account.active !== true || account.approvalStatus !== 'approved') return;
    const municipalities = Array.isArray(account.assignedMunicipalities) ? account.assignedMunicipalities.slice(0, 10) : [];
    const source = ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'].includes(account.role)
      ? collection(firestoreDb, 'producers')
      : municipalities.length ? query(collection(firestoreDb, 'producers'), where('municipalityId', 'in', municipalities)) : null;
    if (!source || disposed) return;
    unsubscribe = onSnapshot(source, (snapshot) => {
    const list = snapshot.docs.map((item) => ({ ...item.data(), syncStatus: 'synced' } as Producer));
    void (async () => {
      for (const cloud of list) {
        const local = await db.producers.get(cloud.id);
        if (!local) await db.producers.put(cloud);
        else if (local.syncStatus === 'pending' || local.syncStatus === 'syncing' || local.syncStatus === 'conflict' || local.syncStatus === 'error') {
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
  }).catch((error) => console.warn('Listener Firestore:', error));
  return () => { disposed = true; unsubscribe?.(); };
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
