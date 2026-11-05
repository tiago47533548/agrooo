import React from 'react';
import { SipLogo } from '../brand/SipLogo';
import { 
  Smartphone, 
  ShieldCheck, 
  MapPin, 
  Trees, 
  BarChart3, 
  FileSpreadsheet, 
  WifiOff, 
  Layers, 
  ArrowRight, 
  CheckCircle,
  Database,
  Building2,
  Users2,
  FileText
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToTechnicians: () => void;
  onNavigateToAdmin: () => void;
  onOpenDocumentation?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToTechnicians,
  onNavigateToAdmin,
  onOpenDocumentation
}) => {
  const scrollToAccess = () => {
    const el = document.getElementById('seccion-accesos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToObjectives = () => {
    const el = document.getElementById('seccion-objetivos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5] text-[#202B25] flex flex-col font-sans selection:bg-[#E8F2EA] selection:text-[#174C35] overflow-x-hidden">
      {/* 1. Header Institucional Público */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 md:px-8 py-3 pt-safe transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo y Nombre Institucional */}
          <div className="flex items-center gap-3">
            <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
            <div className="hidden md:flex flex-col border-l border-slate-200 pl-3">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Sistema de Información Productiva de Misiones
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Ministerio del Agro y la Producción
              </span>
            </div>
          </div>

          {/* Navegación y CTA */}
          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={scrollToObjectives}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-[#174C35] transition px-2 py-1 cursor-pointer"
            >
              Objetivos
            </button>
            <button
              onClick={scrollToAccess}
              className="text-xs font-semibold text-slate-600 hover:text-[#174C35] transition px-2 py-1 cursor-pointer"
            >
              Accesos
            </button>
            {onOpenDocumentation && (
              <button
                onClick={onOpenDocumentation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#174C35]/30 bg-[#E8F2EA] hover:bg-[#d8ebd9] text-[#174C35] text-xs font-extrabold transition cursor-pointer"
                title="Ver informe técnico e institucional del sistema"
              >
                <FileText className="w-3.5 h-3.5 text-[#27865A]" />
                <span className="hidden xs:inline">Informe Oficial</span>
              </button>
            )}
            <button
              onClick={scrollToAccess}
              className="px-4 py-2 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer min-h-[40px] flex items-center gap-1.5"
            >
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-6 md:px-8 pt-8 sm:pt-14 pb-12 sm:pb-20 bg-gradient-to-b from-white via-white to-[#F5F7F5] border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F2EA] text-[#174C35] rounded-full text-[11px] font-bold tracking-wide uppercase">
            <Trees className="w-3.5 h-3.5" />
            <span>Ministerio del Agro y la Producción · Gobierno de Misiones</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#174C35] tracking-tight leading-[1.12]">
            Información productiva para transformar decisiones.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            SIP Misiones es una plataforma digital destinada a relevar, organizar, centralizar y analizar información sobre productores y establecimientos productivos de la provincia de Misiones. A través de herramientas tecnológicas y relevamientos territoriales, permite construir una base de información actualizada para acompañar el desarrollo productivo provincial.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              onClick={scrollToAccess}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#174C35] hover:bg-[#27865A] text-white font-extrabold text-sm rounded-2xl shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Ingresar al sistema</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={scrollToObjectives}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition active:scale-[0.98] cursor-pointer min-h-[48px]"
            >
              Conocer funcionalidades
            </button>
          </div>

          {/* Quick Institutional Highlights */}
          <div className="pt-6 sm:pt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Provincia</span>
              <span className="text-lg font-extrabold text-[#174C35] block mt-0.5">78 Municipios</span>
              <span className="text-[11px] text-slate-500">Misiones, Argentina</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Territorio</span>
              <span className="text-lg font-extrabold text-[#27865A] block mt-0.5">100% Offline</span>
              <span className="text-[11px] text-slate-500">Operativo en chacras</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cartografía</span>
              <span className="text-lg font-extrabold text-[#174C35] block mt-0.5">Geolocalización</span>
              <span className="text-[11px] text-slate-500">GPS y trazabilidad</span>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Seguridad</span>
              <span className="text-lg font-extrabold text-slate-900 block mt-0.5">Google Sign-In</span>
              <span className="text-[11px] text-slate-500">Control de roles RBAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sección de Funcionalidades y Objetivos Principales */}
      <section id="seccion-objetivos" className="px-4 sm:px-6 md:px-8 py-12 sm:py-16 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold text-[#27865A] tracking-wider block mb-1">
            Plataforma Territorial Integral
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Herramientas para el desarrollo productivo provincial
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Diseñado especialmente para las particularidades geográficas, climáticas y de conectividad de la provincia de Misiones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Item 1 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Relevamiento territorial de productores
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Carga ágil en campo de datos civiles, familiares, de tenencia de la tierra y características socioproductivas de cada unidad de producción.
            </p>
          </div>

          {/* Item 2 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <Trees className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Registro de establecimientos y actividades productivas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitoreo detallado de yerba mate, té, tabaco, horticultura, ganadería vacuna, forestación, apicultura y diversificación agropecuaria.
            </p>
          </div>

          {/* Item 3 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Geolocalización de unidades productivas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Captura GPS de alta precisión en el terreno, selección satelital en mapa o interpretación de enlaces compartidos de WhatsApp con trazabilidad completa.
            </p>
          </div>

          {/* Item 4 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Centralización de información provincial
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidación institucional de bases territoriales, importación de planillas externas Excel/CSV e interoperabilidad entre cuencas productivas.
            </p>
          </div>

          {/* Item 5 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Visualización de datos e indicadores
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tableros analíticos, mapas de densidad y distribución por municipios para evaluar la superficie cultivada y el rendimiento agropecuario.
            </p>
          </div>

          {/* Item 6 */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
            <div className="w-10 h-10 rounded-xl bg-[#E8F2EA] text-[#174C35] flex items-center justify-center mb-3.5">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">
              Tecnología Offline-First garantizada
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Los técnicos pueden cargar relevamientos en medio de la selva o caminos terrados sin señal. Al regresar a zona con conectividad, se sincroniza automáticamente.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Sección de Accesos Diferenciados */}
      <section id="seccion-accesos" className="px-4 sm:px-6 md:px-8 py-12 sm:py-16 bg-white border-t border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase font-bold text-[#174C35] tracking-wider block mb-1">
              Puntos de Acceso al Sistema
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Ingreso diferenciado por rol institucional
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Seleccioná el entorno según tu función en el Ministerio del Agro y la Producción.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta 1: ACCESO PARA TÉCNICOS */}
            <div className="p-6 sm:p-7 rounded-3xl border-2 border-slate-200 hover:border-[#27865A] bg-[#F5F7F5] transition flex flex-col justify-between group shadow-sm hover:shadow-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#174C35] text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-6 h-6" />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#27865A] block">
                    Módulo Móvil y PWA
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                    ACCESO PARA TÉCNICOS
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Herramientas para realizar relevamientos en territorio, registrar productores y establecimientos y cargar información productiva.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#27865A] shrink-0" />
                    <span>Relevamiento presencial sin internet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#27865A] shrink-0" />
                    <span>Geolocalización satelital y mapas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#27865A] shrink-0" />
                    <span>Cuestionarios y registro de actividades</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={onNavigateToTechnicians}
                  className="w-full py-3.5 px-5 bg-[#174C35] hover:bg-[#27865A] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Ingresar como técnico</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="block text-center text-[10px] text-slate-400 mt-2">
                  Acceso con cuenta Google autorizada o solicitud de alta
                </span>
              </div>
            </div>

            {/* Tarjeta 2: ACCESO PARA ADMINISTRADORES */}
            <div className="p-6 sm:p-7 rounded-3xl border-2 border-slate-200 hover:border-[#174C35] bg-white transition flex flex-col justify-between group shadow-sm hover:shadow-md">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-6 h-6 text-[#E9A23B]" />
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Gestión y Supervisión
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                    ACCESO PARA ADMINISTRADORES
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Herramientas de gestión, seguimiento, visualización, análisis y administración de la información productiva provincial.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#174C35] shrink-0" />
                    <span>Tableros analíticos e indicadores provinciales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#174C35] shrink-0" />
                    <span>Mapa territorial interactivo multicriterio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#174C35] shrink-0" />
                    <span>Importación masiva de bases Excel/CSV</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={onNavigateToAdmin}
                  className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Ingresar como administrador</span>
                  <ArrowRight className="w-4 h-4 text-[#E9A23B]" />
                </button>
                <span className="block text-center text-[10px] text-slate-400 mt-2">
                  Exclusivo para cuentas de correo con permisos verificados
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer Institucional */}
      <footer className="mt-auto bg-slate-900 text-white px-4 sm:px-6 md:px-8 py-8 pb-safe">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
            <div className="border-l border-slate-700 pl-3">
              <span className="text-white font-semibold block text-xs">
                Ministerio del Agro y la Producción
              </span>
              <span className="text-[10px] text-slate-400">
                Gobierno de la Provincia de Misiones, República Argentina
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] flex-wrap justify-center sm:justify-end">
            {onOpenDocumentation && (
              <button
                onClick={onOpenDocumentation}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Informe Oficial (PDF)</span>
              </button>
            )}
            <span>SIP Misiones v2.4</span>
            <span>·</span>
            <span>Plataforma PWA Offline-First</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
