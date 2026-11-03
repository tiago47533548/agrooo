import { databaseId, firestore } from './firebaseAdmin.js';
import { writeFile } from 'node:fs/promises';

const collections = ['users', 'producers', 'questionnaires', 'questionnaireVersions', 'questionnaireResponses', 'invitations', 'auditLogs'];
const output: Record<string, unknown[]> = {};
for (const name of collections) {
  const snapshot = await firestore.collection(name).get();
  output[name] = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}
const path = process.argv[2] || `firestore-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(path, JSON.stringify({ exportedAt: new Date().toISOString(), databaseId, collections: output }, null, 2), { flag: 'wx' });
console.log(`Exported ${Object.entries(output).map(([name, docs]) => `${name}: ${docs.length}`).join(', ')} to ${path}`);
