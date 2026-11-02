/**
 * SIP MISIONES - Firebase Firestore Cloud Sync Engine
 * Ministerio del Agro y la Producción de Misiones
 *
 * Sincronización bidireccional en tiempo real entre IndexedDB (Dexie)
 * en dispositivos móviles de campo (PWA) y Firebase Firestore Cloud.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDocFromServer,
  onSnapshot,
  query,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from '../db/dexieDb';
import { Producer, AuditLog } from '../db/schema';

// Inicializar la app de Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.warn('SIP Misiones Firestore sync notice: ', JSON.stringify(errInfo));
}

// Probar conectividad con Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestoreDb, 'system', 'ping'));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'system/ping');
    return false;
  }
}

/**
 * Sube un productor específico a Firestore Cloud
 */
export async function uploadProducerToCloud(producer: Producer): Promise<boolean> {
  const path = `producers/${producer.id}`;
  try {
    const docRef = doc(firestoreDb, 'producers', producer.id);
    // Sanitize payload for Firestore
    const cleanPayload = JSON.parse(JSON.stringify({
      ...producer,
      syncStatus: 'synced',
      cloudSyncedAt: new Date().toISOString()
    }));
    await setDoc(docRef, cleanPayload, { merge: true });
    
    // Actualizar estado en Dexie local
    await db.producers.update(producer.id, {
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Trae todos los productores almacenados en Firestore Cloud
 */
export async function fetchProducersFromCloud(): Promise<Producer[]> {
  const path = 'producers';
  try {
    const colRef = collection(firestoreDb, path);
    const snap = await getDocs(colRef);
    const cloudProducers: Producer[] = [];
    snap.forEach((d) => {
      cloudProducers.push(d.data() as Producer);
    });
    return cloudProducers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Sincronización completa bidireccional entre la base local (Dexie) y Firestore Cloud:
 * 1. Sube todos los productores locales que estén en Dexie a Firestore.
 * 2. Descarga todos los productores de Firestore que no estén en Dexie o sean más recientes.
 * 3. Actualiza el padrón local para que técnicos y administradores compartan la misma información.
 */
export async function syncCloudWithLocal(): Promise<{
  uploaded: number;
  downloaded: number;
  total: number;
}> {
  let uploaded = 0;
  let downloaded = 0;

  try {
    const localProducers = await db.producers.toArray();

    // 1. Subir locales a la nube
    for (const prod of localProducers) {
      const ok = await uploadProducerToCloud(prod);
      if (ok) uploaded++;
    }

    // 2. Traer registros de la nube
    const cloudProducers = await fetchProducersFromCloud();
    for (const cProd of cloudProducers) {
      if (!cProd || !cProd.id) continue;
      const existing = await db.producers.get(cProd.id);
      if (!existing) {
        await db.producers.put(cProd);
        downloaded++;
      } else {
        // Si el de la nube es más reciente, actualizar local
        const localTime = new Date(existing.updatedAt || 0).getTime();
        const cloudTime = new Date(cProd.updatedAt || 0).getTime();
        if (cloudTime > localTime) {
          await db.producers.put(cProd);
          downloaded++;
        }
      }
    }

    const total = await db.producers.count();
    return { uploaded, downloaded, total };
  } catch (e) {
    console.warn('Error durante la sincronización bidireccional con Firestore:', e);
    const total = await db.producers.count();
    return { uploaded, downloaded, total };
  }
}

/**
 * Suscribirse a actualizaciones en tiempo real de productores en Firestore
 */
export function subscribeToCloudProducers(onUpdate: (producers: Producer[]) => void): () => void {
  const colRef = collection(firestoreDb, 'producers');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: Producer[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Producer);
      });
      // Guardar automáticamente en Dexie
      for (const p of list) {
        db.producers.put(p).catch(() => {});
      }
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'producers');
    }
  );

  return unsubscribe;
}
