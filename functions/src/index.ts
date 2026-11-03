import { createHash, randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { adminApp, firestore as db, storageBucket } from './firebaseAdmin.js';

const auth = getAuth(adminApp);
const privilegedRoles = new Set(['SUPERADMIN', 'ADMINISTRADOR']);

async function requireRole(uid: string, roles: Set<string>) {
  const identity = await auth.getUser(uid);
  if (identity.disabled || !identity.emailVerified) throw new HttpsError('permission-denied', 'La cuenta no está habilitada o el correo no está verificado.');
  const snap = await db.doc(`users/${uid}`).get();
  const account = snap.data();
  if (!account || account.active !== true || account.approvalStatus !== 'approved' || !roles.has(account.role)) {
    throw new HttpsError('permission-denied', 'No tenés permisos para esta operación.');
  }
  return account;
}

async function requireRoleInTransaction(tx: Transaction, uid: string, roles: Set<string>) {
  const identity = await auth.getUser(uid);
  if (identity.disabled || !identity.emailVerified) throw new HttpsError('permission-denied', 'La cuenta no está habilitada o el correo no está verificado.');
  const snap = await tx.get(db.doc(`users/${uid}`));
  const account = snap.data();
  if (!account || account.active !== true || account.approvalStatus !== 'approved' || !roles.has(account.role)) {
    throw new HttpsError('permission-denied', 'No tenés permisos para esta operación.');
  }
  return account;
}

function validatedMunicipalities(value: unknown, required = true): string[] {
  if (!Array.isArray(value)) {
    if (!required && value === undefined) return [];
    throw new HttpsError('invalid-argument', 'Los municipios asignados no son válidos.');
  }
  if ((!required && value.length === 0) || (required && (value.length < 1 || value.length > 10))) {
    throw new HttpsError('invalid-argument', 'Asigná entre 1 y 10 municipios válidos.');
  }
  if (value.length > 10 || value.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9_]{2,64}$/.test(id)) || new Set(value).size !== value.length) {
    throw new HttpsError('invalid-argument', 'Los municipios deben ser únicos y tener un identificador válido.');
  }
  return [...value];
}

function auditInTransaction(tx: Transaction, uid: string, action: string, entity: string, entityId: string, metadata: Record<string, unknown> = {}) {
  tx.create(db.collection('auditLogs').doc(), {
    ...metadata,
    uid,
    action,
    entity,
    entityId,
    timestamp: FieldValue.serverTimestamp()
  });
}

export const submitTechnicianApplication = onCall(async (request) => {
  if (!request.auth || !request.auth.token.email_verified) throw new HttpsError('unauthenticated', 'Verificá tu correo antes de continuar.');
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || '').toLowerCase();
  const fullName = typeof request.data?.fullName === 'string' ? request.data.fullName.trim() : '';
  const dni = typeof request.data?.dni === 'string' ? request.data.dni.replace(/\D/g, '') : '';
  const phone = typeof request.data?.phone === 'string' ? request.data.phone.trim() : '';
  const municipalityIds = validatedMunicipalities(request.data?.municipalityIds);
  if (fullName.length < 2 || fullName.length > 120 || dni.length < 5 || dni.length > 16 || phone.length > 40 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Revisá nombre, DNI, teléfono y correo.');
  }
  const userRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(userRef);
    const data = existing.data();
    if (data?.active === true || (data?.role && data.role !== 'TECNICO')) throw new HttpsError('permission-denied', 'Esta cuenta no puede solicitar un rol de técnico.');
    if (data?.approvalStatus === 'approved') throw new HttpsError('already-exists', 'La cuenta ya está aprobada.');
    const now = new Date().toISOString();
    tx.set(userRef, { id: uid, uid, email, fullName, dni, phone, role: 'TECNICO', active: false, approvalStatus: 'pending', assignedMunicipalities: [], requestedMunicipalities: municipalityIds, createdAt: data?.createdAt || now, updatedAt: now }, { merge: true });
    auditInTransaction(tx, uid, 'technician_application_submitted', 'users', uid);
  });
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
  const uid = String(request.data?.uid || '');
  const status = request.data?.status;
  const assignedMunicipalities = request.data?.assignedMunicipalities;
  if (!uid || !['approved', 'rejected'].includes(status) || (assignedMunicipalities !== undefined && !Array.isArray(assignedMunicipalities))) throw new HttpsError('invalid-argument', 'Solicitud inválida.');
  const assignments = status === 'approved' ? validatedMunicipalities(assignedMunicipalities) : [];
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'No se encontró la solicitud.');
    if (snap.data()?.role !== 'TECNICO') throw new HttpsError('permission-denied', 'Solo se pueden revisar solicitudes de técnicos.');
    if (snap.data()?.approvalStatus === status && snap.data()?.active === (status === 'approved') && JSON.stringify(snap.data()?.assignedMunicipalities || []) === JSON.stringify(assignments)) return;
    tx.update(ref, { approvalStatus: status, active: status === 'approved', assignedMunicipalities: assignments, updatedAt: new Date().toISOString() });
    auditInTransaction(tx, request.auth!.uid, `technician_application_${status}`, 'users', uid, { assignedMunicipalities: assignments });
  });
  return { ok: true };
});

export const setTechnicianActive = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const uid = String(request.data?.uid || '');
  const active = request.data?.active;
  if (!uid || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'Solicitud inválida.');
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const target = await tx.get(ref);
    if (!target.exists || target.data()?.role !== 'TECNICO') throw new HttpsError('not-found', 'No se encontró el técnico.');
    if (active && target.data()?.approvalStatus !== 'approved') throw new HttpsError('failed-precondition', 'Solo se pueden activar cuentas aprobadas.');
    if (target.data()?.active === active) return;
    tx.update(ref, { active, updatedAt: new Date().toISOString() });
    auditInTransaction(tx, request.auth!.uid, active ? 'technician_enabled' : 'technician_disabled', 'users', uid);
  });
  return { ok: true };
});

export const setTechnicianAssignments = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const uid = String(request.data?.uid || '');
  const assignments = validatedMunicipalities(request.data?.assignedMunicipalities);
  if (!uid) throw new HttpsError('invalid-argument', 'Técnico inválido.');
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const target = await tx.get(ref);
    if (!target.exists || target.data()?.role !== 'TECNICO' || target.data()?.approvalStatus !== 'approved') throw new HttpsError('not-found', 'No se encontró el técnico aprobado.');
    if (JSON.stringify(target.data()?.assignedMunicipalities || []) === JSON.stringify(assignments)) return;
    tx.update(ref, { assignedMunicipalities: assignments, updatedAt: new Date().toISOString() });
    auditInTransaction(tx, request.auth!.uid, 'technician_assignments_changed', 'users', uid, { assignedMunicipalities: assignments });
  });
  return { ok: true };
});

export const createTechnicianInvitation = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const maxUses = request.data?.maxUses === undefined ? 1 : Number(request.data.maxUses);
  const expiresInDays = request.data?.expiresInDays === undefined ? 14 : Number(request.data.expiresInDays);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100 || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) throw new HttpsError('invalid-argument', 'La cantidad de usos o la vigencia no es válida.');
  const emailAllowed = typeof request.data?.emailAllowed === 'string' && request.data.emailAllowed.trim() ? request.data.emailAllowed.trim().toLowerCase() : null;
  if (emailAllowed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAllowed)) throw new HttpsError('invalid-argument', 'El correo de la invitación no es válido.');
  const assignedMunicipalities = validatedMunicipalities(request.data?.assignedMunicipalities);
  const code = randomBytes(24).toString('base64url');
  const id = createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
  const inviteRef = db.doc(`invitations/${id}`);
  await db.runTransaction(async (tx) => {
    const admin = await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    tx.create(inviteRef, { role: 'TECNICO', status: 'activa', usedCount: 0, maxUses, expiresAt, emailAllowed, createdBy: request.auth!.uid, createdByName: admin.fullName, createdAt: FieldValue.serverTimestamp(), assignedMunicipalities });
    auditInTransaction(tx, request.auth!.uid, 'technician_invitation_created', 'invitations', id, { assignedMunicipalities, emailAllowed, maxUses, expiresAt });
  });
  return { code, expiresAt };
});

export const revokeTechnicianInvitation = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const invitationId = String(request.data?.invitationId || '');
  if (!invitationId) throw new HttpsError('invalid-argument', 'Invitación inválida.');
  const ref = db.doc(`invitations/${invitationId}`);
  await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const invite = await tx.get(ref);
    if (!invite.exists) throw new HttpsError('not-found', 'No se encontró la invitación.');
    if (invite.data()?.status === 'revocada') return;
    tx.update(ref, { status: 'revocada', revokedAt: FieldValue.serverTimestamp(), revokedBy: request.auth!.uid });
    auditInTransaction(tx, request.auth!.uid, 'technician_invitation_revoked', 'invitations', invitationId);
  });
  return { ok: true };
});

export const redeemTechnicianInvitation = onCall(async (request) => {
  if (!request.auth || !request.auth.token.email_verified) throw new HttpsError('unauthenticated', 'Verificá tu correo antes de registrarte.');
  const code = String(request.data?.code || '').trim();
  const fullName = typeof request.data?.fullName === 'string' ? request.data.fullName.trim() : '';
  const dni = typeof request.data?.dni === 'string' ? request.data.dni.replace(/\D/g, '') : '';
  const phone = typeof request.data?.phone === 'string' ? request.data.phone.trim() : '';
  if (!code || fullName.length < 2 || fullName.length > 120 || dni.length < 5 || dni.length > 16 || phone.length > 40 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(request.auth.token.email || ''))) throw new HttpsError('invalid-argument', 'Revisá los datos requeridos.');
  const id = createHash('sha256').update(code).digest('hex');
  const inviteRef = db.doc(`invitations/${id}`);
  const userRef = db.doc(`users/${request.auth.uid}`);
  await db.runTransaction(async (tx) => {
    const [inviteSnap, userSnap] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);
    const invite = inviteSnap.data();
    if (userSnap.exists && userSnap.data()?.active === false && userSnap.data()?.approvalStatus === 'approved') {
      throw new HttpsError('permission-denied', 'La cuenta fue deshabilitada y no puede reactivarse con una invitación.');
    }
    if (userSnap.exists && userSnap.data()?.invitationId === id && userSnap.data()?.approvalStatus === 'approved') {
      if (userSnap.data()?.active !== true) throw new HttpsError('permission-denied', 'La cuenta fue deshabilitada y no puede reactivarse con una invitación.');
      return;
    }
    if (!inviteSnap.exists || invite?.role !== 'TECNICO' || invite?.status !== 'activa' || typeof invite.expiresAt !== 'string' || !Number.isFinite(Date.parse(invite.expiresAt)) || Date.parse(invite.expiresAt) <= Date.now() || !Number.isInteger(invite.usedCount) || !Number.isInteger(invite.maxUses) || invite.usedCount >= invite.maxUses) throw new HttpsError('failed-precondition', 'La invitación no es válida o ya fue utilizada.');
    if (invite.emailAllowed && String(invite.emailAllowed).toLowerCase() !== String(request.auth!.token.email || '').toLowerCase()) throw new HttpsError('permission-denied', 'El correo no coincide con el autorizado en la invitación.');
    const assignments = validatedMunicipalities(invite.assignedMunicipalities);
    if (userSnap.exists && userSnap.data()?.approvalStatus === 'approved') throw new HttpsError('already-exists', 'La cuenta ya está aprobada.');
    const now = new Date().toISOString();
    tx.update(inviteRef, { usedCount: FieldValue.increment(1), status: invite.usedCount + 1 >= invite.maxUses ? 'utilizada' : 'activa' });
    tx.set(userRef, { id: request.auth!.uid, uid: request.auth!.uid, email: String(request.auth!.token.email).toLowerCase(), fullName, dni, phone, role: 'TECNICO', active: true, approvalStatus: 'approved', assignedMunicipalities: assignments, authProvider: 'invitation', emailVerified: true, invitationId: id, createdAt: userSnap.data()?.createdAt || now, updatedAt: now });
    auditInTransaction(tx, request.auth!.uid, 'technician_invitation_redeemed', 'users', request.auth!.uid, { invitationId: id });
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
  const uid = String(request.data?.uid || '');
  const role = String(request.data?.role || '');
  if (!uid || !['ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR', 'TECNICO'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido.');
  const targetRef = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, new Set(['SUPERADMIN']));
    const target = await tx.get(targetRef);
    if (!target.exists || target.data()?.role === 'SUPERADMIN') throw new HttpsError('failed-precondition', 'No se puede modificar este usuario.');
    if (target.data()?.role === role) return;
    tx.update(targetRef, { role, updatedAt: new Date().toISOString() });
    auditInTransaction(tx, request.auth!.uid, 'user_role_changed', 'users', uid, { role });
  });
  return { ok: true };
});

export const publishQuestionnaire = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const questionnaire = validateQuestionnaireInput(request.data?.questionnaire);
  const ref = db.doc(`questionnaires/${questionnaire.id}`);
  const versionRef = (version: number) => db.doc(`questionnaireVersions/${questionnaire.id}_v${version}`);
  const published = await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const current = await tx.get(ref);
    const currentData = current.data();
    if (currentData?.status === 'archived') throw new HttpsError('failed-precondition', 'No se puede publicar un cuestionario archivado.');
    const currentVersion = Number(currentData?.version || 0);
    const nextVersion = currentVersion + 1;
    const now = new Date().toISOString();
    const record = { ...questionnaire, version: nextVersion, status: 'published', publishedAt: now, updatedAt: now };
    tx.set(ref, { ...questionnaire, version: nextVersion, status: 'published', publishedAt: now, updatedAt: now, createdAt: currentData?.createdAt || now });
    tx.create(versionRef(nextVersion), { ...record, publishedBy: request.auth!.uid });
    auditInTransaction(tx, request.auth!.uid, 'questionnaire_published', 'questionnaires', questionnaire.id, { version: nextVersion });
    return record;
  });
  return { questionnaire: published };
});

export const saveQuestionnaireDraft = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión.');
  const questionnaire = validateQuestionnaireInput(request.data?.questionnaire);
  const ref = db.doc(`questionnaires/${questionnaire.id}`);
  const saved = await db.runTransaction(async (tx) => {
    await requireRoleInTransaction(tx, request.auth!.uid, privilegedRoles);
    const current = await tx.get(ref);
    const data = current.data();
    if (data?.status === 'published' || data?.status === 'archived') throw new HttpsError('failed-precondition', 'Este cuestionario ya está publicado o archivado; creá un borrador separado.');
    const now = new Date().toISOString();
    const draft = { ...questionnaire, version: 0, status: 'draft', createdAt: data?.createdAt || now, updatedAt: now };
    tx.set(ref, draft);
    auditInTransaction(tx, request.auth!.uid, 'questionnaire_draft_saved', 'questionnaires', questionnaire.id);
    return draft;
  });
  return { questionnaire: saved };
});

function validateQuestionnaireInput(value: any) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id)
      || typeof value.code !== 'string' || value.code.trim().length < 2 || value.code.trim().length > 64
      || typeof value.title !== 'string' || value.title.trim().length < 2 || value.title.trim().length > 200
      || typeof value.description !== 'string' || value.description.length > 2000
      || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 100) {
    throw new HttpsError('invalid-argument', 'El cuestionario no es válido.');
  }
  const ids = new Set<string>();
  const questions = value.questions.map((question: any) => {
    if (!question || typeof question.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(question.id) || ids.has(question.id)
        || typeof question.label !== 'string' || question.label.trim().length < 1 || question.label.length > 500
        || !['text', 'number', 'textarea', 'select', 'multiselect', 'checkbox', 'date', 'photo'].includes(question.type)
        || typeof question.required !== 'boolean'
        || (question.options !== undefined && (!Array.isArray(question.options) || question.options.length > 100 || question.options.some((option: unknown) => typeof option !== 'string' || option.length > 300)))) {
      throw new HttpsError('invalid-argument', 'Una o más preguntas no son válidas.');
    }
    ids.add(question.id);
    return question;
  });
  return {
    id: value.id,
    code: value.code.trim().toUpperCase(),
    title: value.title.trim(),
    description: value.description.trim(),
    category: ['general', 'yerba_mate', 'socioeconomico', 'ambiental', 'te', 'tabaco', 'horticultura', 'ganaderia_bovina', 'porcicultura', 'avicultura', 'piscicultura', 'forestacion', 'apicultura', 'fruticultura', 'cultivos_industriales', 'cooperativista', 'empresa_agropecuaria', 'comunidad_originaria'].includes(value.category) ? value.category : 'general',
    questions
  };
}

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
  const [url] = await getStorage(adminApp).bucket(storageBucket).file(path).getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 });
  return { url };
});

