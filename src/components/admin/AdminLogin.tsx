import React, { useState } from 'react';
import { SipLogo } from '../brand/SipLogo';
import { 
  ShieldCheck, 
  ArrowLeft, 
  ShieldAlert, 
  Lock, 
  Loader2,
  Key,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GoogleAuthService } from '../../services/googleAuth';
import { AuthService } from '../../services/authService';
import { UserProfile } from '../../db/schema';

interface AdminLoginProps {
  onBackToLanding: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onBackToLanding,
  onLoginSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'google'>('credentials');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [adminUserInput, setAdminUserInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmittingCredentials(true);
    setErrorMessage(null);

    try {
      const res = await AuthService.loginWithCredentials(adminUserInput, adminPasswordInput);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Credenciales de administrador no válidas.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al validar credenciales');
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
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
      setIsLoadingGoogle(false);
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
          <div className="p-6 sm:p-7 space-y-5">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-900 text-xs animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-xs">Acceso denegado</span>
                  <p className="text-[11px] text-red-800 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Tab switch between Credentials & Google */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'credentials'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Credenciales</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'google'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.13C3.25 21.31 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.13z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.59l4.01 3.13c.95-2.84 3.6-4.97 6.72-4.97z" />
                </svg>
                <span>Google OAuth</span>
              </button>
            </div>

            {/* Tab 1: Credentials Form */}
            {activeTab === 'credentials' && (
              <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Autorizado
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={adminUserInput}
                      onChange={(e) => setAdminUserInput(e.target.value)}
                      placeholder="tiagorodriguez091@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 font-medium transition focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <button type="button" onClick={() => AuthService.resetPassword(adminUserInput).then(() => setErrorMessage('Si la cuenta existe, recibirás un correo para restablecer la contraseña.')).catch((error) => setErrorMessage(error.message))} className="text-[11px] font-semibold text-slate-600 underline">Olvidé mi contraseña</button>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 font-medium transition focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCredentials}
                  className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {isSubmittingCredentials ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Ingresando...</span>
                    </div>
                  ) : (
                    <>
                      <span>Ingresar al Panel de Supervisión</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Tab 2: Google Sign In */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoadingGoogle}
                  className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 min-h-[50px]"
                >
                  {isLoadingGoogle ? (
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Loader2 className="w-5 h-5 animate-spin text-[#E9A23B]" />
                      <span>Conectando con Google...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.27v3.13C3.25 21.31 7.31 24 12 24z" />
                        <path fill="#FBBC05" d="M5.28 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.59H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.41l4.01-3.13z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.59l4.01 3.13c.95-2.84 3.6-4.97 6.72-4.97z" />
                      </svg>
                      <span>Continuar con Google</span>
                    </>
                  )}
                </button>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    Autenticación oficial con cuenta Google ministerial verificada.
                  </span>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block text-[11px]">
                Control de Acceso Institucional (RBAC)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El acceso está reservado a funcionarios de la Dirección Provincial y técnicos zonales autorizados.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
