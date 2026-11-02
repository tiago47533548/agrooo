/**
 * SIP MISIONES - Authentication & RBAC Service
 * Ministerio del Agro y la Producción de Misiones
 * 
 * Reglas de autorización e identidades de acceso con Google Sign-In.
 */

import { UserProfile, UserRole } from '../db/schema';
import { db } from '../db/dexieDb';
import { INITIAL_USERS } from '../db/seedData';

// Cuentas administradoras autorizadas de forma estricta
export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  'tiagorodirguez091@gmail.com',
  'tiagorodriguez091@gmail.com',
  'magnoleonrossi@gmail.com',
  'admin@agro.misiones.gob.ar',
  'marina.santos@agro.misiones.gob.ar'
];

// Cuenta técnica inicial autorizada para relevamiento de campo
export const INITIAL_APPROVED_TECHNICIAN_EMAILS: string[] = [
  'acelerados.misiones@gmail.com',
  'juan.benitez@campo.misiones.gob.ar'
];

const SESSION_STORAGE_KEY = 'sip_misiones_auth_user';

export interface GoogleAuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'unregistered' | 'unauthorized';
  email?: string;
  name?: string;
}

export class AuthService {
  /**
   * Obtiene la sesión autenticada actual almacenada localmente
   */
  static getStoredSession(): UserProfile | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }

  /**
   * Guarda la sesión autenticada
   */
  static setStoredSession(user: UserProfile): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error guardando sesión de usuario', e);
    }
  }

  /**
   * Cierra la sesión activa
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error('Error limpiando sesión', e);
    }
  }

  /**
   * Autenticación con Google e inspección de roles (RBAC)
   */
  static async authenticateWithGoogle(
    targetRole: 'admin' | 'technician',
    emailInput: string,
    fullNameInput?: string
  ): Promise<GoogleAuthResult> {
    const email = emailInput.trim().toLowerCase();
    const fullName = fullNameInput?.trim() || email.split('@')[0];

    // 1. FLUJO ADMINISTRATIVO
    if (targetRole === 'admin') {
      const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(
        (e) => e.toLowerCase() === email
      );

      if (!isAuthorized) {
        return {
          success: false,
          status: 'unauthorized',
          error: `Acceso administrativo denegado: El correo "${email}" no posee permisos de administración en SIP Misiones. Esta sección está reservada exclusivamente a funcionarios autorizados del Ministerio del Agro y la Producción.`
        };
      }

      // Buscar si ya existe el usuario en la base de datos local
      let user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (!user) {
        // Crear registro en la tabla de usuarios locales
        user = {
          id: `user-admin-${Date.now()}`,
          email,
          fullName: fullName.includes('@') ? (email.includes('tiago') ? 'Tiago Rodríguez' : email.includes('magno') ? 'Magno León Rossi' : 'Administrador Provincial') : fullName,
          role: 'ADMINISTRADOR',
          dni: '35000000',
          active: true,
          approvalStatus: 'approved',
          authProvider: 'google',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.users.put(user);
      }

      this.setStoredSession(user);
      return { success: true, user, status: 'approved' };
    }

    // 2. FLUJO TÉCNICO DE CAMPO
    if (targetRole === 'technician') {
      // Verificar si es la cuenta técnica inicial aprobada por defecto
      const isPreApproved = INITIAL_APPROVED_TECHNICIAN_EMAILS.some(
        (e) => e.toLowerCase() === email
      );

      let user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (isPreApproved) {
        if (!user) {
          user = {
            id: 'user-tecnico-acelerados',
            email,
            fullName: 'Técnico Zonal Acelerados Misiones',
            role: 'TECNICO',
            dni: '35194820',
            phone: '+54 3755 49-3320',
            assignedMunicipalities: ['obera', 'campo_viera', 'leandro_n_alem', 'san_vicente', 'posadas'],
            active: true,
            approvalStatus: 'approved',
            authProvider: 'google',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await db.users.put(user);
        }

        this.setStoredSession(user);
        return { success: true, user, status: 'approved' };
      }

      // Si no es la cuenta inicial de Acelerados, buscar registro en base de datos
      if (!user) {
        return {
          success: false,
          status: 'unregistered',
          email,
          name: fullName,
          error: 'Esta cuenta de Google no se encuentra registrada como técnico territorial. Por favor completá tu solicitud de alta de técnico.'
        };
      }

      // Si existe pero está pendiente
      if (user.approvalStatus === 'pending' || !user.active) {
        return {
          success: false,
          status: 'pending',
          user,
          error: `Tu cuenta como técnico (${email}) está pendiente de aprobación por la Dirección del Ministerio del Agro y la Producción.`
        };
      }

      // Si está rechazado
      if (user.approvalStatus === 'rejected') {
        return {
          success: false,
          status: 'rejected',
          user,
          error: `Tu solicitud de técnico para el correo ${email} no ha sido aprobada por el Ministerio del Agro.`
        };
      }

      this.setStoredSession(user);
      return { success: true, user, status: 'approved' };
    }

    return {
      success: false,
      error: 'Rol no especificado'
    };
  }

  /**
   * Registro de nueva solicitud de técnico de campo
   */
  static async registerTechnicianRequest(data: {
    email: string;
    fullName: string;
    dni: string;
    phone: string;
    departmentOrZone: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const email = data.email.trim().toLowerCase();

      // Verificar si ya existe
      const existing = await db.users.where('email').equalsIgnoreCase(email).first();
      if (existing) {
        if (existing.approvalStatus === 'pending') {
          return {
            success: false,
            error: 'Ya existe una solicitud pendiente de aprobación para este correo electrónico.'
          };
        }
        if (existing.active && existing.approvalStatus === 'approved') {
          return {
            success: false,
            error: 'Esta cuenta ya está registrada y aprobada. Ingresá directamente desde la pantalla de técnicos.'
          };
        }
      }

      const newTechnician: UserProfile = {
        id: `user-tec-req-${Date.now()}`,
        email,
        fullName: data.fullName.trim(),
        dni: data.dni.trim(),
        phone: data.phone.trim(),
        departmentOrZone: data.departmentOrZone.trim(),
        assignedMunicipalities: [data.departmentOrZone.toLowerCase().replace(/\s+/g, '_')],
        role: 'TECNICO',
        active: false,
        approvalStatus: 'pending',
        authProvider: 'google',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.users.put(newTechnician);

      // Registrar en auditoría
      await db.auditLogs.add({
        id: `audit-${Date.now()}`,
        userId: newTechnician.id,
        userName: newTechnician.fullName,
        userRole: 'TECNICO',
        action: 'SOLICITUD_REGISTRO_TECNICO',
        entity: 'users',
        entityId: newTechnician.id,
        details: `Solicitud de registro de nuevo técnico territorial para zona: ${data.departmentOrZone}`,
        device: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      return { success: true, user: newTechnician };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Error al procesar la solicitud' };
    }
  }

  /**
   * Aprobación de técnico por parte de un administrador
   */
  static async approveTechnician(userId: string, adminUser: UserProfile): Promise<boolean> {
    try {
      const user = await db.users.get(userId);
      if (!user) return false;

      user.active = true;
      user.approvalStatus = 'approved';
      user.updatedAt = new Date().toISOString();
      await db.users.put(user);

      await db.auditLogs.add({
        id: `audit-${Date.now()}`,
        userId: adminUser.id,
        userName: adminUser.fullName,
        userRole: adminUser.role,
        action: 'APROBAR_TECNICO',
        entity: 'users',
        entityId: user.id,
        details: `Aprobación de cuenta técnica para ${user.fullName} (${user.email})`,
        device: 'Admin Console',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rechazo de solicitud de técnico
   */
  static async rejectTechnician(userId: string, adminUser: UserProfile): Promise<boolean> {
    try {
      const user = await db.users.get(userId);
      if (!user) return false;

      user.active = false;
      user.approvalStatus = 'rejected';
      user.updatedAt = new Date().toISOString();
      await db.users.put(user);

      await db.auditLogs.add({
        id: `audit-${Date.now()}`,
        userId: adminUser.id,
        userName: adminUser.fullName,
        userRole: adminUser.role,
        action: 'RECHAZAR_TECNICO',
        entity: 'users',
        entityId: user.id,
        details: `Rechazo de solicitud de técnico para ${user.fullName} (${user.email})`,
        device: 'Admin Console',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch {
      return false;
    }
  }
}
