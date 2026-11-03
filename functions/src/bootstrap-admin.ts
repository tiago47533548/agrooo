import { getAuth } from 'firebase-admin/auth';
import { adminApp, firestore } from './firebaseAdmin.js';

const uid = process.argv[2];
if (!uid) throw new Error('Usage: npm run bootstrap-admin -- <verified-firebase-uid>');

const user = await getAuth(adminApp).getUser(uid);
if (!user.emailVerified || !user.email) throw new Error('The Firebase account must have a verified email address.');
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
