import { createHash, randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
const auth = getAuth();
const db = getFirestore('ai-studio-sipmisionessiste-84140521-dd09-4717-8340-b1ed25aa1dd7');
const privilegedRoles = new Set(['SUPERADMIN', 'ADMINISTRADOR']);

async function requireRole(uid: string, roles: Set<string>) {
  const identity = await auth.getUser(uid);
  if (!identity.emailVerified) throw new HttpsError('permission-denied', 'Verificá tu correo antes de continuar.');
  const snap = await db.doc(`users/${uid}`).get();
  const account = snap.data();
  if (!account || account.active !== true || account.approvalStatus !== 'approved' || !roles.has(account.role)) {
    throw new HttpsError('permission-denied', 'No tenés permisos para esta operación.');
  }
  return account;
}

export const submitTechnicianApplication = onCall(async (request) => {
  if (!request.auth || !request.auth.token.email_verified) throw new HttpsError('unauthenticated', 'Verificá tu correo antes de continuar.');
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || '').toLowerCase();
  const fullName = String(request.data?.fullName || '').trim().slice(0, 120);
  const dni = String(request.data?.dni || '').replace(/\D/g, '').slice(0, 16);
  const phone = String(request.data?.phone || '').trim().slice(0, 40);
  const municipalityIds = Array.isArray(request.data?.municipalityIds)
    ? request.data.municipalityIds.filter((id: unknown) => typeof id === 'string' && /^[a-z0-9_]{2,64}$/.test(id)).slice(0, 10)
    : [];
  if (!fullName || !dni || !municipalityIds.length) throw new HttpsError('invalid-argument', 'Completá nombre, DNI y municipios asignados.');
  const userRef = db.doc(`users/${uid}`);
  const existing = await userRef.get();
  if (existing.exists && existing.data()?.role !== 'TECNICO') throw new HttpsError('permission-denied', 'Esta cuenta no puede solicitar un rol de técnico.');
  if (existing.exists && existing.data()?.approvalStatus === 'approved' && existing.data()?.active === true) {
    throw new HttpsError('already-exists', 'La cuenta ya está aprobada.');
  }
  const now = new Date().toISOString();
  await userRef.set({ id: uid, uid, email, fullName, dni, phone, role: 'TECNICO', active: false, approvalStatus: 'pending', assignedMunicipalities: [], requestedMunicipalities: municipalityIds, createdAt: existing.data()?.createdAt || now, updatedAt: now }, { merge: true });
  await db.collection('auditLogs').add({ uid, action: 'technician_application_submitted', entity: 'users', entityId: uid, timestamp: FieldValue.serverTimestamp() });
  return { status: 'pending' };
});

export const getTechnicianApplicationStatus = onCall(async (request) => {
  if (!request.auth || !request.auth.token.email_verified) throw new HttpsError('unauthenticated', 'Verificá tu cuenta antes de consultar el estado.');
  const profile = await db.doc(`users/${request.auth.uid}`).get();
  const data = profile.data();
  if (!data || data.role !== 'TECNICO') return { status: 'unregistered' };
  if (data.active !== true && data.approvalStatus === 'approved') return { status: 'disabled' };
  return { status: data.approvalStatus || 'pending' };
});

export const reviewTechnicianApplication = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, privilegedRoles);
  const uid = String(request.data?.uid || '');
  const status = request.data?.status;
  const assignedMunicipalities = request.data?.assignedMunicipalities;
  if (!uid || !['approved', 'rejected'].includes(status) || (assignedMunicipalities !== undefined && !Array.isArray(assignedMunicipalities))) throw new HttpsError('invalid-argument', 'Solicitud inválida.');
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'No se encontró la solicitud.');
    if (snap.data()?.role !== 'TECNICO') throw new HttpsError('permission-denied', 'Solo se pueden revisar solicitudes de técnicos.');
    if (status === 'approved' && (!assignedMunicipalities?.length || assignedMunicipalities.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9_]{2,64}$/.test(id)))) throw new HttpsError('invalid-argument', 'La aprobación requiere municipios elegidos por un administrador.');
    const assignments = assignedMunicipalities || [];
    tx.update(ref, { approvalStatus: status, active: status === 'approved', assignedMunicipalities: status === 'approved' ? assignments : [], updatedAt: new Date().toISOString() });
    tx.create(db.collection('auditLogs').doc(), { uid: request.auth!.uid, action: `technician_application_${status}`, entity: 'users', entityId: uid, timestamp: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const setTechnicianActive = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, privilegedRoles);
  const uid = String(request.data?.uid || '');
  const active = request.data?.active;
  if (!uid || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'Solicitud inválida.');
  const ref = db.doc(`users/${uid}`);
  const target = await ref.get();
  if (!target.exists || target.data()?.role !== 'TECNICO') throw new HttpsError('not-found', 'No se encontró el técnico.');
  if (active && target.data()?.approvalStatus !== 'approved') throw new HttpsError('failed-precondition', 'Solo se pueden activar cuentas aprobadas.');
  await ref.update({ active, updatedAt: new Date().toISOString() });
  await db.collection('auditLogs').add({ uid: request.auth.uid, action: active ? 'technician_enabled' : 'technician_disabled', entity: 'users', entityId: uid, timestamp: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const setTechnicianAssignments = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, privilegedRoles);
  const uid = String(request.data?.uid || '');
  const assignments = request.data?.assignedMunicipalities;
  if (!uid || !Array.isArray(assignments) || !assignments.length || assignments.length > 10 || assignments.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9_]{2,64}$/.test(id))) throw new HttpsError('invalid-argument', 'Asigná entre 1 y 10 municipios válidos.');
  const ref = db.doc(`users/${uid}`);
  const target = await ref.get();
  if (!target.exists || target.data()?.role !== 'TECNICO' || target.data()?.approvalStatus !== 'approved') throw new HttpsError('not-found', 'No se encontró el técnico aprobado.');
  await ref.update({ assignedMunicipalities: assignments, updatedAt: new Date().toISOString() });
  await db.collection('auditLogs').add({ uid: request.auth.uid, action: 'technician_assignments_changed', entity: 'users', entityId: uid, assignedMunicipalities: assignments, timestamp: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const createTechnicianInvitation = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const admin = await requireRole(request.auth.uid, privilegedRoles);
  const code = randomBytes(24).toString('base64url');
  const id = createHash('sha256').update(code).digest('hex');
  const maxUses = Math.max(1, Math.min(100, Number(request.data?.maxUses) || 1));
  const expiresAt = new Date(Date.now() + Math.min(90, Math.max(1, Number(request.data?.expiresInDays) || 14)) * 86400000).toISOString();
  const emailAllowed = typeof request.data?.emailAllowed === 'string' ? request.data.emailAllowed.trim().toLowerCase() : null;
  const assignedMunicipalities = Array.isArray(request.data?.assignedMunicipalities) ? request.data.assignedMunicipalities.filter((value: unknown) => typeof value === 'string' && /^[a-z0-9_]{2,64}$/.test(value)).slice(0, 10) : [];
  if (!assignedMunicipalities.length) throw new HttpsError('invalid-argument', 'Asigná al menos un municipio a la invitación.');
  await db.doc(`invitations/${id}`).create({ role: 'TECNICO', status: 'activa', usedCount: 0, maxUses, expiresAt, emailAllowed, createdBy: request.auth.uid, createdByName: admin.fullName, createdAt: FieldValue.serverTimestamp(), assignedMunicipalities });
  await db.collection('auditLogs').add({ uid: request.auth.uid, action: 'technician_invitation_created', entity: 'invitations', entityId: id, timestamp: FieldValue.serverTimestamp() });
  return { code, expiresAt };
});

export const revokeTechnicianInvitation = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, privilegedRoles);
  const invitationId = String(request.data?.invitationId || '');
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invitación inválida.');
  const ref = db.doc(`invitations/${invitationId}`);
  await db.runTransaction(async (tx) => {
    const invite = await tx.get(ref);
    if (!invite.exists) throw new HttpsError('not-found', 'No se encontró la invitación.');
    tx.update(ref, { status: 'revocada', revokedAt: FieldValue.serverTimestamp(), revokedBy: request.auth!.uid });
    tx.create(db.collection('auditLogs').doc(), { uid: request.auth!.uid, action: 'technician_invitation_revoked', entity: 'invitations', entityId: invitationId, timestamp: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const redeemTechnicianInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.token.email_verified) throw new HttpsError('unauthenticated', 'Verificá tu correo antes de registrarte.');
  const code = String(request.data?.code || '').trim();
  const fullName = String(request.data?.fullName || '').trim().slice(0, 120);
  const dni = String(request.data?.dni || '').replace(/\D/g, '').slice(0, 16);
  const phone = String(request.data?.phone || '').trim().slice(0, 40);
  if (!code || !fullName || !dni) throw new HttpsError('invalid-argument', 'Completá los datos requeridos.');
  const id = createHash('sha256').update(code).digest('hex');
  const inviteRef = db.doc(`invitations/${id}`);
  const userRef = db.doc(`users/${request.auth.uid}`);
  await db.runTransaction(async (tx) => {
    const [inviteSnap, userSnap] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);
    const invite = inviteSnap.data();
    if (userSnap.exists && userSnap.data()?.invitationId === id && userSnap.data()?.approvalStatus === 'approved') return;
    if (!inviteSnap.exists || invite?.role !== 'TECNICO' || invite?.status !== 'activa' || Date.parse(invite.expiresAt) <= Date.now() || invite.usedCount >= invite.maxUses) throw new HttpsError('failed-precondition', 'La invitación no es válida o ya fue utilizada.');
    if (invite.emailAllowed && String(invite.emailAllowed).toLowerCase() !== String(request.auth!.token.email || '').toLowerCase()) throw new HttpsError('permission-denied', 'El correo no coincide con el autorizado en la invitación.');
    if (userSnap.exists && userSnap.data()?.approvalStatus === 'approved') throw new HttpsError('already-exists', 'La cuenta ya está aprobada.');
    const now = new Date().toISOString();
    tx.update(inviteRef, { usedCount: FieldValue.increment(1), status: invite.usedCount + 1 >= invite.maxUses ? 'utilizada' : 'activa' });
    tx.set(userRef, { id: request.auth!.uid, uid: request.auth!.uid, email: String(request.auth!.token.email).toLowerCase(), fullName, dni, phone, role: 'TECNICO', active: true, approvalStatus: 'approved', assignedMunicipalities: invite.assignedMunicipalities || [], authProvider: 'invitation', emailVerified: true, invitationId: id, createdAt: userSnap.data()?.createdAt || now, updatedAt: now });
    tx.create(db.collection('auditLogs').doc(), { uid: request.auth!.uid, action: 'technician_invitation_redeemed', entity: 'users', entityId: request.auth!.uid, timestamp: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const validateTechnicianInvitation = onCall(async (request) => {
  const code = String(request.data?.code || '').trim();
  if (!code) throw new HttpsError('invalid-argument', 'Ingresá el código de invitación.');
  const id = createHash('sha256').update(code).digest('hex');
  const snap = await db.doc(`invitations/${id}`).get();
  const invite = snap.data();
  if (!invite || invite.role !== 'TECNICO' || invite.status !== 'activa' || Date.parse(invite.expiresAt) <= Date.now() || invite.usedCount >= invite.maxUses) throw new HttpsError('failed-precondition', 'La invitación no es válida o ya fue utilizada.');
  return { code, role: invite.role, expiresAt: invite.expiresAt, emailAllowed: invite.emailAllowed || null };
});

export const setUserRole = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, new Set(['SUPERADMIN']));
  const uid = String(request.data?.uid || '');
  const role = String(request.data?.role || '');
  if (!uid || !['ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR', 'TECNICO'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido.');
  const targetRef = db.doc(`users/${uid}`);
  const target = await targetRef.get();
  if (!target.exists || target.data()?.role === 'SUPERADMIN') throw new HttpsError('failed-precondition', 'No se puede modificar este usuario.');
  await targetRef.update({ role, updatedAt: new Date().toISOString() });
  await db.collection('auditLogs').add({ uid: request.auth.uid, action: 'user_role_changed', entity: 'users', entityId: uid, timestamp: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const publishQuestionnaire = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  await requireRole(request.auth.uid, privilegedRoles);
  const questionnaire = request.data?.questionnaire;
  if (!questionnaire || typeof questionnaire.id !== 'string' || !Array.isArray(questionnaire.questions) || !questionnaire.questions.length) throw new HttpsError('invalid-argument', 'El cuestionario no es válido.');
  const ref = db.doc(`questionnaires/${questionnaire.id}`);
  const versionRef = (version: number) => db.doc(`questionnaireVersions/${questionnaire.id}_v${version}`);
  const published = await db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const currentVersion = Number(current.data()?.version || 0);
    const nextVersion = currentVersion + 1;
    const now = new Date().toISOString();
    const record = { ...questionnaire, version: nextVersion, status: 'published', publishedAt: now, updatedAt: now };
    tx.set(ref, record);
    tx.create(versionRef(nextVersion), { ...record, publishedBy: request.auth!.uid });
    tx.create(db.collection('auditLogs').doc(), { uid: request.auth!.uid, action: 'questionnaire_published', entity: 'questionnaires', entityId: questionnaire.id, version: nextVersion, timestamp: FieldValue.serverTimestamp() });
    return record;
  });
  return { questionnaire: published };
});

export const getResponsePhotoUrl = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const accountSnap = await db.doc(`users/${request.auth.uid}`).get();
  const account = accountSnap.data();
  if (!account || account.active !== true || account.approvalStatus !== 'approved' || request.auth.token.email_verified !== true) throw new HttpsError('permission-denied', 'La cuenta no está autorizada.');
  const path = String(request.data?.path || '');
  const match = path.match(/^responses\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (!match) throw new HttpsError('invalid-argument', 'La ruta de imagen no es válida.');
  const [, ownerUid, recordId] = match;
  let authorized = ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'].includes(account.role);
  const response = await db.doc(`questionnaireResponses/${recordId}`).get();
  const producer = response.exists ? null : await db.doc(`producers/${recordId}`).get();
  const record = response.exists ? response.data() : producer?.data();
  if (!authorized && ownerUid === request.auth.uid && record && (record.technicianAuthUid === request.auth.uid || record.createdById === request.auth.uid)) authorized = true;
  if (!authorized && account.role === 'SUPERVISOR' && record && Array.isArray(account.assignedMunicipalities) && account.assignedMunicipalities.includes(record.municipalityId)) authorized = true;
  if (!authorized || !record) throw new HttpsError('permission-denied', 'No tenés acceso a esta imagen.');
  const [url] = await getStorage().bucket('gen-lang-client-0928991490.firebasestorage.app').file(path).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 });
  return { url };
});

