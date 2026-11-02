/**
 * SIP MISIONES - Authentic Google Sign-In with Firebase Auth & RBAC
 * Ministerio del Agro y la Producción de Misiones
 * 
 * Autenticación oficial mediante Google OAuth / Firebase.
 * Garantiza que el usuario certifique la titularidad de su cuenta Google
 * con su contraseña real y verificación en dos pasos.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  User, 
  onAuthStateChanged 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthService } from './authService';
import { UserProfile } from '../db/schema';

// Inicializar la aplicación Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface GoogleAuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
  status?: string;
  email?: string;
}

export class GoogleAuthService {
  /**
   * Inicia el flujo oficial de autenticación de Google mediante ventana emergente (Popup).
   * Google solicita la contraseña real y 2FA del usuario.
   */
  static async signInWithGoogle(targetRole: 'admin' | 'technician'): Promise<GoogleAuthResponse> {
    try {
      // Abre la ventana de login oficial de Google
      const credential = await signInWithPopup(auth, googleProvider);
      const firebaseUser: User = credential.user;

      const email = firebaseUser.email?.trim().toLowerCase();
      if (!email) {
        return {
          success: false,
          error: 'No se pudo obtener una dirección de correo verificada desde la cuenta de Google.'
        };
      }

      const displayName = firebaseUser.displayName || email.split('@')[0];

      // Validar contra el servicio de autorización ministerial (RBAC)
      const authResult = await AuthService.authenticateWithGoogle(targetRole, email, displayName);

      if (!authResult.success) {
        // Si no está autorizado para este rol, cerrar la sesión en Firebase para no dejar rastros
        try {
          await firebaseSignOut(auth);
        } catch {
          // Ignorar
        }

        return {
          success: false,
          error: authResult.error,
          status: authResult.status,
          email
        };
      }

      return {
        success: true,
        user: authResult.user,
        status: authResult.status,
        email
      };
    } catch (error: any) {
      console.error('Error durante la autenticación con Google:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: 'La ventana de inicio de sesión de Google fue cerrada antes de completar la autenticación.'
        };
      }

      if (error.code === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'El navegador bloqueó la ventana emergente de Google. Por favor habilitá las ventanas emergentes (popups) para este sitio.'
        };
      }

      if (error.code === 'auth/cancelled-popup-request') {
        return {
          success: false,
          error: 'Operación cancelada. Por favor intentá nuevamente.'
        };
      }

      return {
        success: false,
        error: error.message || 'Error inesperado al conectar con los servidores de autenticación de Google.'
      };
    }
  }

  /**
   * Cierra la sesión activa tanto en Firebase como en el almacenamiento local
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Error cerrando sesión en Firebase:', e);
    }
    AuthService.clearSession();
  }

  /**
   * Obtiene el usuario autenticado actual en Firebase
   */
  static getCurrentFirebaseUser(): User | null {
    return auth.currentUser;
  }
}
