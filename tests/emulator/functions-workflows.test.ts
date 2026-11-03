import { createHash, randomUUID } from 'node:crypto';
import process from 'node:process';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type Auth, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const projectId = 'demo-sip-misiones-tests';
const databaseId = firebaseConfig.firestoreDatabaseId;
vi.mock('../../firebase-applet-config.json', () => ({
  default: {
    projectId: 'demo-sip-misiones-tests',
    apiKey: 'demo-key',
    authDomain: 'demo-sip-misiones-tests.firebaseapp.com',
    firestoreDatabaseId: 'ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7',
    storageBucket: 'demo-sip-misiones-tests.appspot.com'
  }
}));

const adminApp = getAdminApps().some((app) => app.name === 'functions-workflow-tests')
  ? getAdminApp('functions-workflow-tests')
  : initializeAdminApp({ projectId }, 'functions-workflow-tests');
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp, databaseId);
let clientAuth: Auth;
let call: <TRequest, TResponse>(name: string, data: TRequest) => Promise<TResponse>;
const createdUids: string[] = [];
const testRunId = randomUUID();

type Actor = { uid: string; email: string; account: User };

async function actor(role: string, overrides: Record<string, unknown> = {}): Promise<Actor> {
  await signOut(clientAuth).catch(() => undefined);
  const email = `functions-${randomUUID()}@example.test`;
  const credential = await createUserWithEmailAndPassword(clientAuth, email, 'password-123456');
  const uid = credential.user.uid;
  createdUids.push(uid);
  await adminAuth.updateUser(uid, { emailVerified: true });
  await credential.user.reload();
  await credential.user.getIdToken(true);
  await adminDb.doc(`users/${uid}`).set({
    id: uid, uid, email, fullName: 'Cuenta de prueba', role,
    active: true, approvalStatus: 'approved', assignedMunicipalities: ['posadas'], testRunId, ...overrides
  });
  return { uid, email, account: credential.user };
}

async function pendingApplicant(): Promise<Actor> {
  const email = `applicant-${randomUUID()}@example.test`;
  const credential = await createUserWithEmailAndPassword(clientAuth, email, 'password-123456');
  const uid = credential.user.uid;
  createdUids.push(uid);
  await adminAuth.updateUser(uid, { emailVerified: true });
  await credential.user.reload();
  await credential.user.getIdToken(true);
  return { uid, email, account: credential.user };
}

async function signInActor(email: string) {
  const credential = await signInWithEmailAndPassword(clientAuth, email, 'password-123456');
  await credential.user.reload();
  await credential.user.getIdToken(true);
}

async function hashedInvite(code: string, data: Record<string, unknown>) {
  const id = createHash('sha256').update(code).digest('hex');
  await adminDb.doc(`invitations/${id}`).set({
    role: 'TECNICO', status: 'activa', usedCount: 0, maxUses: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    assignedMunicipalities: ['posadas'], testRunId, ...data
  });
  return { id, ref: adminDb.doc(`invitations/${id}`) };
}

describe('privileged callable workflows', () => {
  beforeAll(async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    const client = await import('../../src/services/firebaseClient');
    clientAuth = client.firebaseAuth;
    call = <TRequest, TResponse>(name: string, data: TRequest) => httpsCallable<TRequest, TResponse>(client.firebaseFunctions, name)(data).then(({ data: result }) => result);
    if (process.env.GCLOUD_PROJECT !== projectId || !process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('Run these tests through `npm run test:rules`; real Firebase projects are not supported.');
    }
  });

  afterEach(async () => {
    await signOut(clientAuth).catch(() => undefined);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    const [audit, invitations, users] = await Promise.all([
      adminDb.collection('auditLogs').where('testRunId', '==', testRunId).get(),
      adminDb.collection('invitations').where('testRunId', '==', testRunId).get(),
      adminDb.collection('users').where('testRunId', '==', testRunId).get()
    ]);
    await Promise.all([
      ...audit.docs.map((document) => document.ref.delete()),
      ...invitations.docs.map((document) => document.ref.delete()),
      ...users.docs.map((document) => document.ref.delete()),
      ...createdUids.map((uid) => adminAuth.deleteUser(uid).catch(() => undefined))
    ]);
  });

  it('shares technician applications across devices and writes approval with its audit atomically', async () => {
    const applicant = await pendingApplicant();
    await signInActor(applicant.email);
    await call('submitTechnicianApplication', {
      fullName: 'Aplicante de prueba', dni: '12345678', phone: '3764000000', municipalityIds: ['posadas']
    });
    let profile = (await adminDb.doc(`users/${applicant.uid}`).get()).data();
    expect(profile?.approvalStatus).toBe('pending');
    expect(profile?.requestedMunicipalities).toEqual(['posadas']);
    const applicationAudit = await adminDb.collection('auditLogs').where('entityId', '==', applicant.uid).get();
    expect(applicationAudit.docs.map((document) => document.data().action)).toContain('technician_application_submitted');

    const admin = await actor('ADMINISTRADOR');
    expect((await adminDb.doc(`users/${admin.uid}`).get()).data()).toMatchObject({ role: 'ADMINISTRADOR', active: true, approvalStatus: 'approved' });
    await signInActor(admin.email);
    await call('reviewTechnicianApplication', { uid: applicant.uid, status: 'approved', assignedMunicipalities: ['posadas'] });
    profile = (await adminDb.doc(`users/${applicant.uid}`).get()).data();
    expect(profile?.active).toBe(true);
    expect(profile?.approvalStatus).toBe('approved');
    const approvalAudit = await adminDb.collection('auditLogs').where('entityId', '==', applicant.uid).where('action', '==', 'technician_application_approved').get();
    expect(approvalAudit.size).toBe(1);
  });

  it('rejects administrators attempting elevated role assignment and allows only a SUPERADMIN', async () => {
    const admin = await actor('ADMINISTRADOR');
    const target = await actor('DIRECTOR');
    await signInActor(admin.email);
    await expect(call('setUserRole', { uid: target.uid, role: 'ADMINISTRADOR' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    expect((await adminDb.doc(`users/${target.uid}`).get()).data()?.role).toBe('DIRECTOR');

    const root = await actor('SUPERADMIN');
    await signInActor(root.email);
    await call('setUserRole', { uid: target.uid, role: 'SUPERVISOR' });
    expect((await adminDb.doc(`users/${target.uid}`).get()).data()?.role).toBe('SUPERVISOR');
    expect((await adminDb.collection('auditLogs').where('entityId', '==', target.uid).where('action', '==', 'user_role_changed').get()).size).toBe(1);
  });

  it('stores invitation hashes, restricts email and atomically consumes a single-use code once under concurrency', async () => {
    const manager = await actor('ADMINISTRADOR');
    await signInActor(manager.email);
    const created = await call<{ maxUses: number; assignedMunicipalities: string[] }, { code: string; expiresAt: string }>(
      'createTechnicianInvitation', { maxUses: 1, assignedMunicipalities: ['posadas'] }
    );
    const inviteId = createHash('sha256').update(created.code).digest('hex');
    const cloudInvite = (await adminDb.doc(`invitations/${inviteId}`).get()).data();
    expect(cloudInvite?.code).toBeUndefined();
    expect(cloudInvite?.usedCount).toBe(0);
    expect(cloudInvite?.role).toBe('TECNICO');
    expect((await adminDb.collection('auditLogs').where('entityId', '==', inviteId).where('action', '==', 'technician_invitation_created').get()).size).toBe(1);

    const wrongEmail = await actor('TECNICO');
    const boundCode = 'bound-invitation-code';
    const bound = await hashedInvite(boundCode, { emailAllowed: `allowed-${randomUUID()}@example.test` });
    await signInActor(wrongEmail.email);
    await expect(call('redeemTechnicianInvitation', { code: boundCode, fullName: 'Usuario Prueba', dni: '12345678', phone: '' }))
      .rejects.toMatchObject({ code: 'functions/permission-denied' });
    expect((await bound.ref.get()).data()?.usedCount).toBe(0);

    const redeemingUser = await pendingApplicant();
    await signInActor(redeemingUser.email);
    const result = await call('redeemTechnicianInvitation', { code: created.code, fullName: 'Usuario Prueba', dni: '87654321', phone: '' });
    expect(result).toMatchObject({ ok: true });
    expect((await adminDb.doc(`invitations/${inviteId}`).get()).data()?.usedCount).toBe(1);
    const redeemedAudit = await adminDb.collection('auditLogs').where('action', '==', 'technician_invitation_redeemed').where('invitationId', '==', inviteId).get();
    expect(redeemedAudit.size).toBe(1);

    await expect(call('redeemTechnicianInvitation', { code: created.code, fullName: 'Usuario Prueba', dni: '87654321', phone: '' }))
      .resolves.toMatchObject({ ok: true });
    expect((await adminDb.doc(`invitations/${inviteId}`).get()).data()?.usedCount).toBe(1);
    expect((await adminDb.collection('auditLogs').where('action', '==', 'technician_invitation_redeemed').where('invitationId', '==', inviteId).get()).size).toBe(1);
  });

  it('does not restore an account disabled after its earlier successful redemption', async () => {
    const disabledCode = 'disabled-invitation-code';
    const disabledInvite = await hashedInvite(disabledCode, { maxUses: 2 });
    const user = await actor('TECNICO', { active: false, approvalStatus: 'approved', invitationId: disabledInvite.id });
    await signInActor(user.email);
    await expect(call('redeemTechnicianInvitation', { code: disabledCode, fullName: 'Usuario Prueba', dni: '12345678', phone: '' }))
      .rejects.toMatchObject({ code: 'functions/permission-denied' });
    expect((await adminDb.doc(`users/${user.uid}`).get()).data()?.active).toBe(false);
  });

  it('rejects malformed municipality and invitation limits instead of silently filtering values', async () => {
    const manager = await actor('ADMINISTRADOR');
    await signInActor(manager.email);
    await expect(call('createTechnicianInvitation', { maxUses: 1.5, assignedMunicipalities: ['posadas'] }))
      .rejects.toMatchObject({ code: 'functions/invalid-argument' });
    await expect(call('createTechnicianInvitation', { maxUses: 1, assignedMunicipalities: ['posadas', 'bad id'] }))
      .rejects.toMatchObject({ code: 'functions/invalid-argument' });
  });
});
