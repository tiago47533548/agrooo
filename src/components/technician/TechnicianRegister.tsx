import React, { useState } from 'react';
import { SipLogo } from '../brand/SipLogo';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Mail, 
  User, 
  Phone, 
  CreditCard, 
  MapPin, 
  Send
} from 'lucide-react';
import { AuthService } from '../../services/authService';

interface TechnicianRegisterProps {
  initialEmail?: string;
  onBackToLogin: () => void;
  onRegistrationComplete: () => void;
}

const MISIONES_MUNICIPALITIES = [
  'Oberá',
  'Posadas',
  'Eldorado',
  'San Vicente',
  'Apóstoles',
  'Leandro N. Alem',
  'Puerto Rico',
  'Aristóbulo del Valle',
  'San Pedro',
  'Montecarlo',
  'Campo Viera',
  'Campo Grande',
  'Jardín América',
  '2 de Mayo',
  'San Ignacio',
  'Bernardo de Irigoyen',
  'Comandante Andresito',
  'El Soberbio',
  'Wanda',
  'Capioví',
  'Alba Posse',
  'Concepción de la Sierra',
  'San Javier',
  'Cuenca Centro / Yerba Mate',
  'Cuenca Alto Uruguay / Tabaco',
  'Cuenca Norte / Forestal'
];

export const TechnicianRegister: React.FC<TechnicianRegisterProps> = ({
  initialEmail = '',
  onBackToLogin,
  onRegistrationComplete
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentOrZone, setDepartmentOrZone] = useState('Oberá');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor ingresá un correo Google válido.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Por favor completá tu nombre y apellido completo.');
      return;
    }
    if (!dni.trim() || dni.length < 7) {
      setErrorMessage('Por favor ingresá un número de DNI válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await AuthService.registerTechnicianRequest({
        email,
        fullName,
        dni,
        phone,
        departmentOrZone
      });

      if (!res.success) {
        setErrorMessage(res.error || 'No se pudo procesar la solicitud.');
      } else {
        setIsSubmittedSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la solicitud en la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmittedSuccess) {
    return (
      <div className="min-h-screen bg-[#F5F7F5] flex flex-col font-sans selection:bg-[#E8F2EA] selection:text-[#174C35]">
        <header className="bg-white border-b border-slate-200 px-4 py-3 pt-safe">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Solicitud Enviada con Éxito
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tu solicitud de alta para <strong>{fullName}</strong> con correo <span className="font-mono text-slate-800 font-semibold">{email}</span> ha sido registrada en el sistema.
            </p>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Próximos pasos
              </span>
              <p className="text-[11px] text-slate-500">
                1. La Dirección Provincial del Ministerio del Agro revisará tus datos territoriales.
              </p>
              <p className="text-[11px] text-slate-500">
                2. Una vez aprobada tu cuenta, podrás ingresar inmediatamente seleccionando tu correo Google en la pantalla de técnicos.
              </p>
            </div>

            <button
              onClick={onBackToLogin}
              className="w-full py-3 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl transition cursor-pointer min-h-[44px]"
            >
              Volver a la pantalla de acceso
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col font-sans selection:bg-[#E8F2EA] selection:text-[#174C35]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 pt-safe">
        <div className="max-w-md sm:max-w-xl mx-auto flex items-center justify-between">
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#174C35] transition p-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-[#174C35] text-white p-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8F2EA] block">
              Ministerio del Agro y la Producción
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
              Solicitud de Alta de Técnico Territorial
            </h1>
            <p className="text-xs text-[#E8F2EA]/90 mt-1">
              Completá tus datos oficiales para que la Dirección autorice tu dispositivo para relevamientos en campo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-900 text-xs">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cuenta de Google (Gmail o Institucional) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Con esta cuenta ingresarás después usando "Continuar con Google".
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nombre y Apellido Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Téc. Roberto Galeano"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Número de DNI *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="34567890"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Teléfono / Celular
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="3764..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Municipio o Zona de Trabajo Asignada *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={departmentOrZone}
                  onChange={(e) => setDepartmentOrZone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
                >
                  {MISIONES_MUNICIPALITIES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSubmitting ? (
                  <span>Enviando solicitud...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitud de Aprobación</span>
                  </>
                )}
              </button>
            </div>

            <span className="block text-center text-[10px] text-slate-400">
              El rol solicitado es exclusivamente Técnico de Campo. No se habilitan permisos administrativos por este canal.
            </span>
          </form>
        </div>
      </main>
    </div>
  );
};
