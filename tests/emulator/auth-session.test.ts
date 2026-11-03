import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createUserWithEmailAndPassword, signOut as clientSignOut, type Auth } from 'firebase/auth';
import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const projectId = 'demo-sip-misiones-tests';
vi.mock('../../firebase-applet-config.json', () => ({
  default: {
    projectId: 'demo-sip-misiones-tests',
    apiKey: 'demo-key',
    authDomain: `${projectId}.firebaseapp.com`,
    firestoreDatabaseId: 'ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7',
    storageBucket: `${projectId}.appspot.com`
  }
}));

const adminApp = getAdminApps().some((app) => app.name === 'auth-session-tests')
  ? getAdminApp('auth-session-tests')
  : initializeAdminApp({ projectId }, 'auth-session-tests');
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp, 'ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7');
let firebaseAuth: Auth;
let AuthService: (typeof import('../../src/services/authService'))['AuthService'];
const createdUids: string[] = [];

async function createIdentity(profile: Record<string, unknown> | null = {}, emailVerified = true) {
  const email = `auth-${randomUUID()}@example.test`;
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, 'password-123456');
  createdUids.push(credential.user.uid);
  await adminAuth.updateUser(credential.user.uid, { emailVerified });
  await credential.user.reload();
  await credential.user.getIdToken(true);
  if (profile !== null) {
    await adminDb.doc(`users/${credential.user.uid}`).set({
      id: credential.user.uid,
      uid: credential.user.uid,
      email,
      fullName: 'Cuenta de prueba',
      role: 'TECNICO',
      active: true,
      approvalStatus: 'approved',
      assignedMunicipalities: ['posadas'],
      ...profile
    });
  }
  await clientSignOut(firebaseAuth);
  return { email, uid: credential.user.uid };
}

describe('Firebase Authentication session behavior', () => {
  beforeAll(async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    ({ firebaseAuth } = await import('../../src/services/firebaseClient'));
    ({ AuthService } = await import('../../src/services/authService'));
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('Run these tests through `npm run test:rules`; real Firebase projects are not supported.');
    }
  });

  afterEach(async () => {
    await clientSignOut(firebaseAuth).catch(() => undefined);
    localStorage.clear();
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await Promise.all(createdUids.map((uid) => adminAuth.deleteUser(uid).catch(() => undefined)));
  });

  it('authenticates a verified account with its actual email/password and signs out', async () => {
    const { email } = await createIdentity({});
    const result = await AuthService.loginWithCredentials(email, 'password-123456');
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('TECNICO');
    expect(firebaseAuth.currentUser?.email).toBe(email);

    await AuthService.signOut();
    expect(firebaseAuth.currentUser).toBeNull();
  });

  it('rejects disabled accounts and clears their Firebase session', async () => {
    const { email } = await createIdentity({ active: false });
    const result = await AuthService.loginWithCredentials(email, 'password-123456');
    expect(result.success).toBe(false);
    expect(firebaseAuth.currentUser).toBeNull();
  });

  it('does not let a forged local profile authorize a Firebase account without a cloud profile', async () => {
    const { email, uid } = await createIdentity(null);
    localStorage.setItem(`sip-account-${uid}`, JSON.stringify({
      profile: { id: uid, uid, role: 'SUPERADMIN', active: true, approvalStatus: 'approved' },
      checkedAt: Date.now()
    }));

    const result = await AuthService.loginWithCredentials(email, 'password-123456');
    expect(result.success).toBe(false);
    expect(firebaseAuth.currentUser).toBeNull();
  });

  it('rejects unverified identities and clears the authenticated session', async () => {
    const { email } = await createIdentity({ emailVerified: false }, false);
    const result = await AuthService.loginWithCredentials(email, 'password-123456');
    expect(result.success).toBe(false);
    expect(firebaseAuth.currentUser).toBeNull();
  });
});
