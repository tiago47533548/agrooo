import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, connectAuthEmulator, getAuth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const projectId = 'demo-sip-misiones-tests';
const databaseId = firebaseConfig.firestoreDatabaseId;
const adminApp = getAdminApps().some((app) => app.name === 'named-firestore-rules-tests')
  ? getAdminApp('named-firestore-rules-tests')
  : initializeAdminApp({ projectId }, 'named-firestore-rules-tests');
const adminDb = getAdminFirestore(adminApp, databaseId);
const testApps: FirebaseApp[] = [];
const testUserIds: string[] = [];
const testProducerIds = new Set(['producer-posadas', 'producer-obera', 'new-producer', 'outside-producer']);
let sequence = 0;

type Role = 'SUPERADMIN' | 'ADMINISTRADOR' | 'DIRECTOR' | 'SUPERVISOR' | 'TECNICO';

const makeProducer = (id: string, createdById: string, municipalityId = 'posadas') => ({
  id, dni: '12345678', fullName: 'Productor de prueba', phone: '', isEstablishmentHead: true,
  producerType: 'pequeno_familiar', establishmentName: 'Chacra de prueba', municipality: municipalityId,
  municipalityId, colonyParaje: '', addressReference: '', lat: null, lng: null, isGeolocated: false,
  tenureType: null, surfaceHa: null, activities: [], version: 1,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  createdById, createdByName: 'Técnico de prueba', verifiedBySupervisor: false,
  cloudRevision: 1, lastOperationId: 'operation-00000001'
});

const makeResponse = (id: string, technicianUid = 'technician') => ({
  id, questionnaireId: 'survey-1', questionnaireVersion: 1, questionnaireTitle: 'Encuesta de prueba',
  producerId: 'producer-posadas', municipalityId: 'posadas', producerDni: '12345678',
  producerName: 'Productor de prueba', technicianId: technicianUid, technicianAuthUid: technicianUid,
  technicianName: 'Técnico de prueba', answers: { cultivo: 'té' }, status: 'completed', observations: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  cloudRevision: 1, lastOperationId: 'response-operation-01'
});

async function actor(role: Role, assignedMunicipalities = ['posadas'], options: { active?: boolean } = {}) {
  const app = initializeApp({ ...firebaseConfig, projectId, apiKey: 'demo-key' }, `rules-${++sequence}-${randomUUID()}`);
  testApps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const email = `rules-${sequence}-${randomUUID()}@example.test`;
  const credential = await createUserWithEmailAndPassword(auth, email, 'test-password-123');
  testUserIds.push(credential.user.uid);
  await getAdminAuth(adminApp).updateUser(credential.user.uid, { emailVerified: true });
  await credential.user.reload();
  const token = await credential.user.getIdTokenResult(true);
  if (token.claims.email_verified !== true) throw new Error('Auth emulator identity is not verified.');

  await adminDb.doc(`users/${credential.user.uid}`).set({
    id: credential.user.uid,
    uid: credential.user.uid,
    email,
    fullName: 'Cuenta de prueba',
    role,
    active: options.active ?? true,
    approvalStatus: options.active === false ? 'pending' : 'approved',
    assignedMunicipalities
  });
  const firestore = getFirestore(app, databaseId);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  return { uid: credential.user.uid, firestore };
}

async function seedRecords() {
  await Promise.all([
    adminDb.doc('producers/producer-posadas').set(makeProducer('producer-posadas', 'technician')),
    adminDb.doc('producers/producer-obera').set(makeProducer('producer-obera', 'another-technician', 'obera')),
    adminDb.doc('questionnaireResponses/response-1').set(makeResponse('response-1'))
  ]);
}

async function clearRecords() {
  const refs = [
    ...testUserIds.map((uid) => adminDb.doc(`users/${uid}`)),
    ...[...testProducerIds].map((id) => adminDb.doc(`producers/${id}`)),
    adminDb.doc('questionnaireResponses/response-1'),
    adminDb.doc('questionnaireResponses/new-response'),
    adminDb.doc('questionnaires/draft-1'),
    adminDb.doc('questionnaireVersions/survey-1_v1')
  ];
  const batch = adminDb.batch();
  refs.forEach((ref) => batch.delete(ref));
  await batch.commit();
}

describe('Firestore authorization rules on the configured named database', () => {
  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new Error('Run these tests through `npm run test:rules`; real Firebase projects are not supported.');
    }
  });

  beforeEach(async () => {
    await clearRecords();
    await seedRecords();
  });

  afterEach(async () => {
    const apps = testApps.splice(0);
    await Promise.all(apps.map((app) => deleteApp(app)));
  });

  afterAll(async () => {
    await clearRecords();
    await Promise.all(testUserIds.map((uid) => getAdminAuth(adminApp).deleteUser(uid).catch(() => undefined)));
  });

  it('denies anonymous, unverified, pending, and disabled accounts', async () => {
    const anonymousApp = initializeApp({ ...firebaseConfig, projectId, apiKey: 'demo-key' }, `anonymous-${randomUUID()}`);
    testApps.push(anonymousApp);
    const anonymousDb = getFirestore(anonymousApp, databaseId);
    connectFirestoreEmulator(anonymousDb, '127.0.0.1', 8080);
    await expect(getDoc(doc(anonymousDb, 'producers', 'producer-posadas'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(anonymousDb, 'producers', 'anonymous'), makeProducer('anonymous', 'anonymous'))).rejects.toMatchObject({ code: 'permission-denied' });

    const pending = await actor('TECNICO', ['posadas'], { active: false });
    await expect(getDoc(doc(pending.firestore, 'producers', 'producer-posadas'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(pending.firestore, 'producers', 'pending-producer'), makeProducer('pending-producer', pending.uid))).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('limits producer reads by role and municipality', async () => {
    const technician = await actor('TECNICO');
    expect((await getDoc(doc(technician.firestore, 'producers', 'producer-posadas'))).exists()).toBe(true);
    await expect(getDoc(doc(technician.firestore, 'producers', 'producer-obera'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(getDocs(query(collection(technician.firestore, 'producers'), where('municipalityId', '==', 'posadas')))).resolves.toMatchObject({ size: 1 });
    await expect(getDocs(collection(technician.firestore, 'producers'))).rejects.toMatchObject({ code: 'permission-denied' });

    const supervisor = await actor('SUPERVISOR');
    expect((await getDoc(doc(supervisor.firestore, 'producers', 'producer-posadas'))).exists()).toBe(true);
    await expect(getDoc(doc(supervisor.firestore, 'producers', 'producer-obera'))).rejects.toMatchObject({ code: 'permission-denied' });

    const director = await actor('DIRECTOR');
    expect((await getDoc(doc(director.firestore, 'producers', 'producer-obera'))).exists()).toBe(true);
    await expect(updateDoc(doc(director.firestore, 'producers', 'producer-obera'), { fullName: 'No puede editar' })).rejects.toMatchObject({ code: 'permission-denied' });

    const admin = await actor('ADMINISTRADOR');
    expect((await getDoc(doc(admin.firestore, 'producers', 'producer-obera'))).exists()).toBe(true);
  });

  it('allows assigned technicians to create and edit producers without changing protected fields', async () => {
    const technician = await actor('TECNICO');
    await expect(setDoc(doc(technician.firestore, 'producers', 'new-producer'), makeProducer('new-producer', technician.uid))).resolves.toBeUndefined();
    await expect(setDoc(doc(technician.firestore, 'producers', 'outside-producer'), makeProducer('outside-producer', technician.uid, 'eldorado'))).rejects.toMatchObject({ code: 'permission-denied' });

    await expect(updateDoc(doc(technician.firestore, 'producers', 'producer-posadas'), {
      fullName: 'Nombre actualizado', updatedAt: '2026-01-02T00:00:00.000Z', cloudRevision: 2, lastOperationId: 'operation-00000002'
    })).resolves.toBeUndefined();
    await expect(updateDoc(doc(technician.firestore, 'producers', 'producer-posadas'), {
      createdById: 'attacker', cloudRevision: 3, lastOperationId: 'operation-00000003'
    })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(doc(technician.firestore, 'producers', 'producer-posadas'), {
      verifiedBySupervisor: true, cloudRevision: 3, lastOperationId: 'operation-00000004'
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('allows technicians to create own responses and supervisors to validate without editing answers', async () => {
    const technician = await actor('TECNICO');
    const technicianResponse = makeResponse('new-response', technician.uid);
    await expect(setDoc(doc(technician.firestore, 'questionnaireResponses', 'new-response'), technicianResponse)).resolves.toBeUndefined();

    const supervisor = await actor('SUPERVISOR');
    await expect(updateDoc(doc(supervisor.firestore, 'questionnaireResponses', 'response-1'), {
      status: 'validated', observations: 'Revisado', updatedAt: '2026-01-02T00:00:00.000Z', cloudRevision: 2, lastOperationId: 'response-operation-02'
    })).resolves.toBeUndefined();
    await expect(updateDoc(doc(supervisor.firestore, 'questionnaireResponses', 'response-1'), {
      answers: { cultivo: 'dato alterado' }, status: 'observed', updatedAt: '2026-01-03T00:00:00.000Z', cloudRevision: 3, lastOperationId: 'response-operation-03'
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('denies client account privilege and audit writes, including for administrators', async () => {
    const admin = await actor('ADMINISTRADOR');
    await expect(updateDoc(doc(admin.firestore, 'users', admin.uid), { role: 'SUPERADMIN' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.firestore, 'auditLogs', 'forged'), { action: 'role_changed' })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('keeps questionnaire drafts callable-only and denies unknown collection paths', async () => {
    await adminDb.doc('questionnaires/draft-1').set({ id: 'draft-1', status: 'draft' });
    await adminDb.doc('questionnaireVersions/survey-1_v1').set({
      id: 'survey-1', version: 1, status: 'published', code: 'survey-1',
      title: 'Encuesta de prueba', description: '', category: 'otros', questions: []
    });

    const admin = await actor('ADMINISTRADOR');
    const technician = await actor('TECNICO');
    expect((await getDoc(doc(admin.firestore, 'questionnaires', 'draft-1'))).exists()).toBe(true);
    await expect(getDoc(doc(technician.firestore, 'questionnaires', 'draft-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.firestore, 'questionnaires', 'client-forged'), { id: 'client-forged', status: 'published' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect((await getDoc(doc(technician.firestore, 'questionnaireVersions', 'survey-1_v1'))).exists()).toBe(true);
    await expect(setDoc(doc(admin.firestore, 'questionnaireVersions', 'forged_v1'), { status: 'published' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(admin.firestore, 'unrecognizedCollection', 'record'), { value: 'forged' }))
      .rejects.toMatchObject({ code: 'permission-denied' });
  });
});
