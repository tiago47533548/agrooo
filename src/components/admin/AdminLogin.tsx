import React, { useState } from 'react';
import { SipLogo } from '../brand/SipLogo';
import { 
  ShieldCheck, 
  ArrowLeft, 
  ShieldAlert, 
  Lock, 
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { GoogleAuthService } from '../../services/googleAuth';
import { UserProfile } from '../../db/schema';

interface AdminLoginProps {
  onBackToLanding: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onBackToLanding,
  onLoginSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await GoogleAuthService.signInWithGoogle('admin');
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error al conectar con los servicios de autenticación de Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col font-sans selection:bg-[#E8F2EA] selection:text-[#174C35]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 pt-safe">
        <div className="max-w-md sm:max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition p-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </button>

          <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Card Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
            <div className="relative z-10 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold tracking-wider uppercase text-[#E9A23B]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Gestión y Supervisión Provincial</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Panel Administrativo
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acceso restringido a funcionarios y autoridades de la Dirección Provincial del Ministerio del Agro y la Producción de Misiones.
              </p>
            </div>

            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#E9A23B]/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Form and Actions */}
          <div className="p-6 sm:p-7 space-y-6">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-xs">Acceso denegado</span>
                  <p className="text-[11px] text-red-800 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Google Primary CTA Button */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Ingreso oficial con identidad verificada
              </span>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 px-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 min-h-[52px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Loader2 className="w-5 h-5 animate-spin text-[#E9A23B]" />
                    <span>Conectando con Google...</span>
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
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Autenticación oficial con contraseña y 2FA de Google. Nadie puede acceder sin verificar la propiedad de su cuenta en los servidores de Google.
                </span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block text-[11px]">
                Control de Acceso Institucional (RBAC)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El acceso está reservado exclusivamente a las cuentas autorizadas por la Dirección Provincial. Cualquier intento de inicio de sesión no autorizado es rechazado y registrado para auditoría.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
