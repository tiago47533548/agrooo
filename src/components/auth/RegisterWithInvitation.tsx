import React, { useState, useEffect } from 'react';
import { Invitation, UserProfile } from '../../db/schema';
import { AuthService } from '../../services/authService';
import { firebaseAuth } from '../../services/firebaseClient';
import { SipLogo } from '../brand/SipLogo';
import { 
  Key,
  AlertCircle, 
  Lock,
  UserCheck,
  ArrowLeft
} from 'lucide-react';

interface RegisterWithInvitationProps {
  inviteCode?: string;
  onSuccessLogin: (user: UserProfile) => void;
  onBackToHome: () => void;
}

export const RegisterWithInvitation: React.FC<RegisterWithInvitationProps> = ({
  inviteCode: initialCode = '',
  onSuccessLogin,
  onBackToHome
}) => {
  const [code, setCode] = useState(initialCode);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Auto-validate if code is provided in URL
  useEffect(() => {
    if (initialCode) {
      validateCode(initialCode);
    }
  }, [initialCode]);

  const validateCode = async (codeToTest: string) => {
    if (!codeToTest.trim()) return;
    setIsValidating(true);
    setErrorMsg(null);

    try {
      const inv = await AuthService.validateTechnicianInvitation(codeToTest);
      if (inv.emailAllowed) setEmail(inv.emailAllowed);
      setInvitation({ id: '', code: inv.code, role: inv.role, emailAllowed: inv.emailAllowed || undefined, maxUses: 1, usedCount: 0, expiresAt: inv.expiresAt, status: 'activa', createdBy: '', createdByName: '', createdAt: '' });
    } catch (e: any) {
      setErrorMsg(`Error al validar invitación: ${e.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (!fullName.trim() || !dni.trim() || !email.trim() || !password) {
      alert('Por favor complete todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        try {
          await AuthService.createPasswordAccount(email, password, fullName);
          setVerificationSent(true);
          return;
        } catch (createError: any) {
          if (createError?.code !== 'auth/email-already-in-use') throw createError;
          await AuthService.signInForInvitation(email, password);
        }
      }
      if (firebaseAuth.currentUser?.email?.toLowerCase() !== email.trim().toLowerCase()) throw new Error('El correo de la cuenta debe coincidir con el correo del formulario.');
      const newUser = await AuthService.redeemTechnicianInvitation({ code: invitation.code, fullName, dni, phone });
      onSuccessLogin(newUser);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-[#174C35] text-white p-6 text-center">
          <SipLogo variant="white" size="lg" className="justify-center mx-auto" />
          <h2 className="text-lg font-bold mt-4">Registro con Invitación Oficial</h2>
          <p className="text-xs text-[#E8F2EA]/90 mt-1">
            Plataforma Territorial · Ministerio del Agro y la Producción de Misiones
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Code validation if not loaded */}
          {!invitation && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Código de Invitación
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ej: TECNICO-OBER-2026"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:ring-2 focus:ring-[#27865A] focus:outline-none"
                  />
                  <button
                    onClick={() => validateCode(code)}
                    disabled={isValidating || !code.trim()}
                    className="px-4 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {isValidating ? 'Validando...' : 'Validar'}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Invitación no válida:</span>
                    <p>{errorMsg}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  onClick={onBackToHome}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a la aplicación principal</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Valid invitation verified, show registration form */}
          {invitation && (
            <form onSubmit={handleRegister} className="space-y-4">
              {verificationSent && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">Te enviamos un correo de verificación. Abrilo y luego volvé a enviar este formulario para completar el registro.{firebaseAuth.currentUser && !firebaseAuth.currentUser.emailVerified && <button type="button" className="ml-1 underline font-bold" onClick={() => AuthService.resendVerificationEmail().then(() => setErrorMsg('Correo de verificación reenviado.')).catch((error) => setErrorMsg(error.message))}>Reenviar correo</button>}</div>}
              {errorMsg && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{errorMsg}</div>}
              <div className="p-3.5 bg-[#E8F2EA]/70 border border-[#27865A]/30 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#27865A] block">
                    Invitación Validada
                  </span>
                  <span className="font-bold text-[#174C35] text-sm">{invitation.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rol Autorizado</span>
                  <span className="font-mono font-bold bg-[#174C35] text-white px-2.5 py-0.5 rounded-lg text-[11px]">
                    {invitation.role}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre y Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Lic. Martín Alarcón"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    DNI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 32884910"
                    maxLength={10}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-[#27865A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+54 376 4..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  readOnly={Boolean(invitation.emailAllowed)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@misiones.gob.ar"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña de Acceso <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#E8F2EA]" />
                  <span>{isSubmitting ? 'Habilitando Cuenta...' : 'Completar Registro y Acceder'}</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setInvitation(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Usar otro código de invitación
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
