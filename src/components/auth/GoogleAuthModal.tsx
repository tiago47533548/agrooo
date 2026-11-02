import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, ArrowRight, ShieldCheck, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleIdentityService, GoogleUserProfile } from '../../services/googleIdentity';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'admin' | 'technician';
  onAuthenticate: (email: string, fullName?: string) => Promise<{ success: boolean; error?: string; status?: string }>;
  onNeedRegistration?: (email: string) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  onAuthenticate,
  onNeedRegistration
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

      // Intentar renderizar el botón oficial de Google Identity Services
      const timer = setTimeout(() => {
        if (googleBtnRef.current) {
          GoogleIdentityService.renderOfficialButton(
            googleBtnRef.current,
            async (profile) => {
              await handleVerifyIdentity(profile.email, profile.name);
            },
            (err) => {
              console.warn('GIS error:', err);
            }
          );
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyIdentity = async (verifiedEmail: string, name?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await onAuthenticate(verifiedEmail, name);
      if (!res.success) {
        if (res.status === 'unregistered' && onNeedRegistration) {
          onClose();
          onNeedRegistration(verifiedEmail);
        } else {
          setErrorMessage(
            res.error || 
            `Acceso denegado: La cuenta Google "${verifiedEmail}" no cuenta con autorización para este entorno ministerial.`
          );
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al validar credenciales con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await GoogleIdentityService.openGoogleOAuthPopup(
        async (profile) => {
          await handleVerifyIdentity(profile.email, profile.name);
        },
        (errorStr) => {
          setErrorMessage(errorStr);
          setIsLoading(false);
        }
      );
    } catch (e: any) {
      setErrorMessage('No se pudo abrir la ventana de autenticación de Google: ' + (e?.message || 'Error'));
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pt-safe pb-safe backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Google Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.13C3.25 21.31 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.59l4.01 3.13c.95-2.84 3.6-4.97 6.72-4.97z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                Iniciar sesión con Google
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {targetRole === 'admin'
                  ? 'Panel de Supervisión · Ministerio del Agro'
                  : 'Relevamiento de Campo · SIP Misiones'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-900 animate-in fade-in">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-xs">Acceso denegado</span>
                <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="text-center space-y-2 py-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F2EA] flex items-center justify-center text-[#174C35]">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Identidad protegida por Google
            </h4>
            <p className="text-slate-600 leading-relaxed text-xs max-w-xs mx-auto">
              Para ingresar debés comprobar la titularidad de tu cuenta iniciando sesión directamente con tu contraseña o verificación en dos pasos de Google.
            </p>
          </div>

          {/* GIS Container (si GIS está activo) */}
          <div ref={googleBtnRef} className="flex justify-center empty:hidden" />

          {/* Botón principal de autenticación auténtica de Google */}
          <button
            type="button"
            onClick={handleStartGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-[#174C35] font-extrabold text-sm rounded-2xl shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 min-h-[52px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-600 font-bold">
                <Loader2 className="w-5 h-5 animate-spin text-[#174C35]" />
                <span>Verificando con Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.13C3.25 21.31 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.59l4.01 3.13c.95-2.84 3.6-4.97 6.72-4.97z"
                  />
                </svg>
                <span>Acceder con mi cuenta de Google</span>
              </>
            )}
          </button>

          {/* Security details */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-700 block text-[11px]">
                Seguridad Criptográfica
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Nadie puede ingresar con solo escribir un correo. Google solicita tu contraseña y factor de autenticación para certificar que sos el dueño legítimo de la cuenta antes de otorgar acceso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
