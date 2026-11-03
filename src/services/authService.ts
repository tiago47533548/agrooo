import {
  createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, updateProfile, User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { UserProfile } from '../db/schema';
import { firebaseAuth, firebaseDb, firebaseFunctions } from './firebaseClient';

export interface GoogleAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'unregistered' | 'unauthorized';
  email?: string;
  name?: string;
}

function toProfile(uid: string, data: Record<string, any>): UserProfile {
  return { ...data, id: uid, uid, email: String(data.email || ''), fullName: String(data.fullName || ''), role: data.role, dni: String(data.dni || ''), active: data.active === true } as unknown as UserProfile;
}

export class AuthService {
  static async signOut(): Promise<void> {
    await signOut(firebaseAuth);
  }

  static clearSession(): void { /* Firebase Auth owns session state. */ }

  static async getAuthenticatedProfile(user: User = firebaseAuth.currentUser!): Promise<UserProfile | null> {
    if (!user) return null;
    const cacheKey = `sip-account-${user.uid}`;
    try {
      await user.reload();
      if (!user.emailVerified) return null;
      const snap = await getDoc(doc(firebaseDb, 'users', user.uid));
      if (!snap.exists()) return null;
      const profile = toProfile(user.uid, snap.data());
      localStorage.setItem(cacheKey, JSON.stringify({ profile, checkedAt: Date.now() }));
      return profile;
    } catch (error: any) {
      const networkFailure = ['auth/network-request-failed', 'unavailable', 'deadline-exceeded', 'network-request-failed'].includes(String(error?.code || ''));
      if (navigator.onLine && !networkFailure) throw error;
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached?.profile && Date.now() - Number(cached.checkedAt) <= 7 * 86400000) return cached.profile as UserProfile;
      } catch { /* Ignore corrupt or expired offline profile cache. */ }
      return null;
    }
  }


  static async loginWithCredentials(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, emailInput.trim().toLowerCase(), passwordInput);
      const profile = await this.getAuthenticatedProfile(credential.user);
      if (!profile?.active || profile.approvalStatus !== 'approved') {
        await signOut(firebaseAuth);
        return { success: false, error: profile?.approvalStatus === 'rejected' ? 'La solicitud fue rechazada.' : 'La cuenta todavía no está aprobada.' };
      }
      return { success: true, user: profile };
    } catch (error: any) {
      await signOut(firebaseAuth).catch(() => undefined);
      return { success: false, error: error?.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : error?.message || 'No se pudo iniciar sesión.' };
    }
  }

  static async createPasswordAccount(email: string, password: string, fullName: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
    await updateProfile(credential.user, { displayName: fullName.trim() });
    await sendEmailVerification(credential.user);
  }

  static async signInForInvitation(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
    return credential.user;
  }

  static async resendVerificationEmail(): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Iniciá sesión para reenviar el correo de verificación.');
    await sendEmailVerification(user);
  }

  static async validateTechnicianInvitation(code: string): Promise<{ code: string; role: UserProfile['role']; expiresAt: string; emailAllowed: string | null }> {
    const validate = httpsCallable<{ code: string }, { code: string; role: UserProfile['role']; expiresAt: string; emailAllowed: string | null }>(firebaseFunctions, 'validateTechnicianInvitation');
    return (await validate({ code: code.trim() })).data;
  }

  static async redeemTechnicianInvitation(data: { code: string; fullName: string; dni: string; phone: string }): Promise<UserProfile> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Creá una cuenta e iniciá sesión antes de canjear la invitación.');
    await user.reload();
    if (!user.emailVerified) throw new Error('Verificá tu correo electrónico antes de continuar.');
    await httpsCallable(firebaseFunctions, 'redeemTechnicianInvitation')(data);
    const profile = await this.getAuthenticatedProfile(user);
    if (!profile) throw new Error('La cuenta se creó, pero no se pudo cargar el perfil. Iniciá sesión nuevamente.');
    return profile;
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email.trim().toLowerCase());
  }

  static async getTechnicianApplicationStatus(): Promise<'approved' | 'pending' | 'rejected' | 'disabled' | 'unregistered'> {
    const status = httpsCallable<void, { status: 'approved' | 'pending' | 'rejected' | 'disabled' | 'unregistered' }>(firebaseFunctions, 'getTechnicianApplicationStatus');
    return (await status()).data.status;
  }

  static async authenticateWithGoogle(_targetRole: 'admin' | 'technician', email: string, fullName: string, uid: string): Promise<GoogleAuthResult> {
    try {
      const user = firebaseAuth.currentUser;
      if (!user || user.uid !== uid || !user.emailVerified) return { success: false, status: 'unauthorized', email, error: 'La cuenta debe tener un correo verificado.' };
      const snap = await getDoc(doc(firebaseDb, 'users', uid));
      if (!snap.exists()) return { success: false, status: 'unregistered', email, name: fullName, error: 'La cuenta todavía no está registrada. Solicitá el alta o usá una invitación.' };
      const profile = toProfile(uid, snap.data());
      if (!profile.active || profile.approvalStatus !== 'approved') return { success: false, status: profile.approvalStatus === 'rejected' ? 'rejected' : 'pending', user: profile, email, error: 'La cuenta está pendiente de aprobación o deshabilitada.' };
      if (_targetRole === 'admin' && !['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR', 'SUPERVISOR'].includes(profile.role)) return { success: false, status: 'unauthorized', email, error: 'La cuenta no tiene permisos administrativos.' };
      return { success: true, user: profile, status: 'approved', email };
    } catch (error: any) {
      return { success: false, error: error?.message || 'No se pudo validar el perfil.' };
    }
  }

  static async registerTechnicianRequest(data: { email: string; fullName: string; dni: string; phone: string; departmentOrZone: string }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const user = firebaseAuth.currentUser;
      if (!user || !user.emailVerified || user.email?.toLowerCase() !== data.email.trim().toLowerCase()) return { success: false, error: 'Iniciá sesión con el correo verificado que querés registrar.' };
      const submit = httpsCallable(firebaseFunctions, 'submitTechnicianApplication');
      const { municipalityId } = await import('../utils/municipality');
      const municipality = municipalityId(data.departmentOrZone);
      if (!municipality) return { success: false, error: 'Seleccioná un municipio válido.' };
      await submit({ fullName: data.fullName, dni: data.dni, phone: data.phone, municipalityIds: [municipality] });
      const profile: UserProfile = { id: user.uid, email: user.email, fullName: data.fullName.trim(), dni: data.dni.trim(), phone: data.phone.trim(), departmentOrZone: data.departmentOrZone.trim(), assignedMunicipalities: [], role: 'TECNICO', active: false, approvalStatus: 'pending', authProvider: 'google', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return { success: true, user: profile };
    } catch (error: any) { return { success: false, error: error?.message || 'No se pudo registrar la solicitud.' }; }
  }

  static async approveTechnician(uid: string, _adminUser: UserProfile, assignedMunicipalities: string[] = []): Promise<boolean> { return this.reviewTechnician(uid, 'approved', assignedMunicipalities); }
  static async rejectTechnician(uid: string, _adminUser: UserProfile): Promise<boolean> { return this.reviewTechnician(uid, 'rejected'); }
  static async setTechnicianActive(uid: string, active: boolean): Promise<boolean> {
    try { await httpsCallable(firebaseFunctions, 'setTechnicianActive')({ uid, active }); return true; }
    catch { return false; }
  }
  static async setTechnicianAssignments(uid: string, assignedMunicipalities: string[]): Promise<boolean> {
    try { await httpsCallable(firebaseFunctions, 'setTechnicianAssignments')({ uid, assignedMunicipalities }); return true; }
    catch { return false; }
  }
  private static async reviewTechnician(uid: string, status: 'approved' | 'rejected', assignedMunicipalities: string[] = []): Promise<boolean> {
    try {
      const review = httpsCallable(firebaseFunctions, 'reviewTechnicianApplication');
      await review({ uid, status, assignedMunicipalities });
      return true;
    } catch { return false; }
  }
}
