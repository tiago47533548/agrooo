import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) throw new Error('Usage: npm run bootstrap-admin -- <verified-firebase-uid>');

initializeApp({ projectId: 'gen-lang-client-0928991490' });
const user = await getAuth().getUser(uid);
if (!user.emailVerified || !user.email) throw new Error('The Firebase account must have a verified email address.');
const firestore = getFirestore('ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7');
const ref = firestore.doc(`users/${uid}`);
await ref.create({
  id: uid,
  uid,
  email: user.email.toLowerCase(),
  fullName: user.displayName || user.email,
  role: 'SUPERADMIN',
  active: true,
  approvalStatus: 'approved',
  assignedMunicipalities: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
console.log(`Created SUPERADMIN profile for verified UID ${uid}.`);
