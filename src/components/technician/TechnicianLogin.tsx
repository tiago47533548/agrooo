import React, { useState } from 'react';
import { SipLogo } from '../brand/SipLogo';
import { 
  Smartphone, 
  ArrowLeft, 
  ArrowRight, 
  WifiOff, 
  MapPin, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  UserPlus, 
  Search,
  Loader2,
  Lock
} from 'lucide-react';
import { GoogleAuthService } from '../../services/googleAuth';
import { db } from '../../db/dexieDb';
import { UserProfile } from '../../db/schema';

interface TechnicianLoginProps {
  onBackToLanding: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateToRegister: (prefillEmail?: string) => void;
}

export const TechnicianLogin: React.FC<TechnicianLoginProps> = ({
  onBackToLanding,
  onLoginSuccess,
  onNavigateToRegister
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusCheckEmail, setStatusCheckEmail] = useState('');
  const [statusCheckResult, setStatusCheckResult] = useState<any | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setGeneralError(null);
    setUnregisteredEmail(null);

    try {
      const res = await GoogleAuthService.signInWithGoogle('technician');
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else if (res.status === 'unregistered' && res.email) {
        setUnregisteredEmail(res.email);
        setGeneralError(res.error || 'Tu cuenta de Google no se encuentra registrada como técnico territorial.');
      } else if (res.error) {
        setGeneralError(res.error);
      }
    } catch (e: any) {
      setGeneralError(e?.message || 'Error al conectar con los servicios de autenticación de Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusCheckEmail || !statusCheckEmail.includes('@')) return;
    setIsCheckingStatus(true);
    setStatusCheckResult(null);
    setGeneralError(null);

    try {
      const email = statusCheckEmail.trim().toLowerCase();
      const user = await db.users.where('email').equalsIgnoreCase(email).first();

      if (!user) {
        setStatusCheckResult({
          found: false,
          message: 'No se encontró ninguna solicitud registrada para este correo.'
        });
      } else {
        setStatusCheckResult({
          found: true,
          user,
          status: user.approvalStatus || (user.active ? 'approved' : 'pending')
        });
      }
    } catch {
      setStatusCheckResult({
        found: false,
        message: 'Error al consultar la base de datos local.'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col font-sans selection:bg-[#E8F2EA] selection:text-[#174C35]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 pt-safe">
        <div className="max-w-md sm:max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#174C35] transition p-1 cursor-pointer"
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
          <div className="bg-gradient-to-br from-[#174C35] via-[#1B573D] to-[#27865A] text-white p-6 sm:p-7 relative overflow-hidden">
            <div className="relative z-10 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold tracking-wider uppercase text-[#E8F2EA]">
                <Smartphone className="w-3 h-3" />
                <span>Módulo de Campo · PWA Territorial</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Acceso para Técnicos
              </h1>
              <p className="text-xs text-[#E8F2EA]/90 leading-relaxed">
                Herramientas de relevamiento de chacras, geolocalización GPS y carga de datos offline para el personal territorial del Ministerio del Agro.
              </p>
            </div>

            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Form and Actions */}
          <div className="p-6 sm:p-7 space-y-6">
            {generalError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <span className="font-bold block text-xs">Aviso de acceso</span>
                  <p className="text-[11px] text-red-800 leading-relaxed">{generalError}</p>
                  {unregisteredEmail && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRegister(unregisteredEmail)}
                      className="px-3 py-1.5 bg-[#174C35] text-white font-bold rounded-lg text-xs hover:bg-[#27865A] transition cursor-pointer flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Completar solicitud con esta cuenta</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Google Primary CTA Button */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Método principal de ingreso seguro
              </span>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 px-5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-[#174C35] font-extrabold text-sm rounded-2xl shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 min-h-[52px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Loader2 className="w-5 h-5 animate-spin text-[#174C35]" />
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

              <div className="p-3 bg-[#E8F2EA]/60 rounded-xl border border-[#27865A]/20 flex items-center gap-2 text-xs text-[#174C35]">
                <Lock className="w-4 h-4 shrink-0 text-[#27865A]" />
                <span className="text-[11px] leading-snug">
                  Acceso verificado con Google. Requiere autenticar con tu contraseña y cuenta habilitada.
                </span>
              </div>
            </div>

            {/* Offline & Territory Perks */}
            <div className="grid grid-cols-2 gap-2 text-slate-600 text-xs py-2 border-t border-b border-slate-100">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-[#27865A]" />
                <span className="text-[11px]">Modo sin conexión</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#27865A]" />
                <span className="text-[11px]">Georreferencia GPS</span>
              </div>
            </div>

            {/* Solicitud de nueva cuenta */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                ¿Sos técnico de campo y aún no tenés cuenta?
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Podés iniciar el trámite de alta con tu cuenta Google. La cuenta quedará sujeta a revisión y habilitación por la Dirección Provincial.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToRegister()}
                className="w-full py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 min-h-[40px] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Solicitar cuenta de técnico</span>
              </button>
            </div>

            {/* Consultar estado de solicitud */}
            <div className="space-y-2 pt-1">
              <details className="text-xs text-slate-600 group">
                <summary className="font-semibold text-slate-700 hover:text-[#174C35] cursor-pointer list-none flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 transition">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>¿Ya solicitaste tu cuenta? Consultar estado</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>

                <form onSubmit={handleCheckStatus} className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ingresá tu correo Google registrado
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="tu.correo@gmail.com"
                      value={statusCheckEmail}
                      onChange={(e) => setStatusCheckEmail(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#174C35]"
                    />
                    <button
                      type="submit"
                      disabled={isCheckingStatus}
                      className="px-3 py-1.5 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer"
                    >
                      {isCheckingStatus ? '...' : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {statusCheckResult && (
                    <div className="p-2.5 rounded-lg text-[11px] mt-2 border bg-white">
                      {statusCheckResult.found ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{statusCheckResult.user.fullName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              statusCheckResult.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              statusCheckResult.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {statusCheckResult.status === 'approved' ? 'Aprobada' :
                               statusCheckResult.status === 'rejected' ? 'Rechazada' : 'En Revisión'}
                            </span>
                          </div>
                          {statusCheckResult.status === 'approved' && (
                            <button
                              type="button"
                              onClick={handleGoogleLogin}
                              className="mt-2 text-[#174C35] font-bold underline cursor-pointer"
                            >
                              ¡Tu cuenta está aprobada! Ingresá haciendo clic acá con Google.
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">{statusCheckResult.message}</span>
                      )}
                    </div>
                  )}
                </form>
              </details>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
