import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT || 'gen-lang-client-0928991490';
export const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7';
export const storageBucket = process.env.FUNCTIONS_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;

export const adminApp = getApps().length ? getApp() : initializeApp({ projectId, storageBucket });
export const firestore = getFirestore(adminApp, databaseId);
