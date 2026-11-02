/**
 * SIP MISIONES - Google Identity Services Integration
 * Ministerio del Agro y la Producción de Misiones
 * 
 * Gestiona la autenticación oficial con Google Identity Services (GIS)
 * y la decodificación segura de tokens y credenciales de Google.
 */

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initTokenClient: (config: any) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
  emailVerified: boolean;
}

export class GoogleIdentityService {
  private static defaultClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

  /**
   * Decodifica un JWT emitido por Google Identity Services
   */
  static decodeJwtCredential(credential: string): GoogleUserProfile | null {
    try {
      const parts = credential.split('.');
      if (parts.length !== 3) return null;
      
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const parsed = JSON.parse(jsonPayload);
      return {
        email: parsed.email || '',
        name: parsed.name || parsed.email?.split('@')[0] || 'Usuario Google',
        picture: parsed.picture,
        sub: parsed.sub,
        emailVerified: Boolean(parsed.email_verified)
      };
    } catch (e) {
      console.error('Error al decodificar credencial de Google:', e);
      return null;
    }
  }

  /**
   * Inicializa Google Identity Services en un contenedor HTML si hay un Client ID disponible
   */
  static renderOfficialButton(
    container: HTMLElement, 
    onSuccess: (profile: GoogleUserProfile) => void,
    onError?: (err: any) => void
  ): boolean {
    if (!window.google?.accounts?.id) {
      return false;
    }

    const clientId = this.defaultClientId;
    if (!clientId) {
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            const profile = this.decodeJwtCredential(response.credential);
            if (profile) {
              onSuccess(profile);
            } else if (onError) {
              onError(new Error('No se pudo verificar el perfil de Google.'));
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width: Math.min(340, container.clientWidth || 320)
      });

      return true;
    } catch (e) {
      console.warn('Google Identity Services no pudo renderizar el botón oficial:', e);
      return false;
    }
  }

  /**
   * Abre el popup de inicio de sesión de Google con OAuth2
   */
  static async openGoogleOAuthPopup(
    onSuccess: (profile: GoogleUserProfile) => void,
    onError: (err: string) => void
  ): Promise<void> {
    const clientId = this.defaultClientId;

    // Si GIS token client está disponible y tiene client_id configurado
    if (window.google?.accounts?.oauth2 && clientId) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (res.ok) {
                  const userInfo = await res.json();
                  onSuccess({
                    email: userInfo.email,
                    name: userInfo.name || userInfo.email?.split('@')[0],
                    picture: userInfo.picture,
                    sub: userInfo.sub,
                    emailVerified: Boolean(userInfo.email_verified)
                  });
                  return;
                }
              } catch (e: any) {
                onError('Error al obtener perfil desde Google: ' + e.message);
                return;
              }
            }
            onError('No se recibieron credenciales válidas de Google.');
          }
        });
        client.requestAccessToken();
        return;
      } catch (err: any) {
        console.warn('OAuth2 token client no disponible, usando flujo de diálogo:', err);
      }
    }
  }
}
