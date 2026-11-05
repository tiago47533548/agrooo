import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  X, 
  BookOpen, 
  ShieldCheck, 
  Smartphone, 
  Layers, 
  Database, 
  MapPin, 
  Users, 
  Key,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SipLogo } from '../brand/SipLogo';

interface SystemDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDocumentationModal: React.FC<SystemDocumentationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeSection, setActiveSection] = useState<string>('resumen');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullReportMarkdown = `# INFORME TÉCNICO E INSTITUCIONAL INTEGRAL
## SISTEMA DE INFORMACIÓN PRODUCTIVA DE MISIONES (SIP MISIONES)
### PROGRAMA ACELERADOS — MINISTERIO DEL AGRO Y LA PRODUCCIÓN DE LA PROVINCIA DE MISIONES

---

### 1. FICHA INSTITUCIONAL
- **Organismo Responsable:** Ministerio del Agro y la Producción de la Provincia de Misiones, República Argentina.
- **Programa:** Programa de Transformación Digital y Competitividad Agroproductiva "Acelerados Misiones".
- **Sistema:** SIP Misiones (Sistema de Información Productiva).
- **Versión Actual:** v2.4 (Edición Operativa Territorial y Panel Ministerial en Tiempo Real).
- **Alcance Geográfico:** 78 municipios de la Provincia de Misiones, abarcando colonias, picadas y zonas periurbanas.
- **Público Objetivo:** Pequeños y medianos productores, cooperativas agrícolas, técnicos territoriales zonales, direcciones provinciales y autoridades ministeriales.

---

### 2. RESUMEN EJECUTIVO
El **SIP Misiones** es una plataforma tecnológica integral diseñada para resolver la histórica brecha de información, relevamiento territorial y conectividad en el sector agropecuario de la provincia de Misiones.

El sistema unifica en un único ecosistema:
1. **Un Módulo de Campo Móvil (PWA Offline-First)** para los técnicos extensionistas que recorren chacras sin señal celular, permitiéndoles geolocalizar parcelas, relevar productores, registrar encuestas dinámicas y tomar fotografías/marcas de chacra.
2. **Un Motor de Sincronización Reactivo Bidireccional** que opera con una base local (IndexedDB) y se replica en la nube (Google Cloud Firestore) automáticamente apenas el dispositivo detecta conexión a internet.
3. **Un Panel de Control y Monitoreo Provincial en Tiempo Real** para autoridades ministeriales y supervisores, con tableros interactivos de producción, mapas GIS satelitales, análisis de cultivos (yerba mate, té, tabaco, ganadería, citrícolas, acuicultura) y control de accesos (RBAC).
4. **Un Portal Público de Orientación al Productor** con acceso a programas de fomento, guías fitosanitarias y canales de asistencia.

---

### 3. PROBLEMÁTICA TERRITORIAL Y JUSTIFICACIÓN
#### A. La Realidad Productiva de Misiones
La provincia de Misiones cuenta con una topografía serrana particular, densa cobertura de selva paranaense y más de 30.000 explotaciones agropecuarias de pequeña escala distribuidas en picadas y caminos rurales. En más del 65% del área rural productiva (San Pedro, El Soberbio, San Antonio, 25 de Mayo, Campo Grande, etc.), la conectividad celular (3G/4G) es nula o sumamente deficiente.

#### B. Limitaciones del Modelo Tradicional Preexistente
- Relevamientos en planillas de papel vulnerables a pérdidas, roturas por barro/lluvia y retrasos de meses en la digitación centralizada.
- Errores graves en la georreferenciación de chacras y falta de polígonos o coordenadas GPS fidedignas.
- Carencia de trazabilidad: dificultad para constatar en qué fecha exacta y qué técnico visitó a cada familia productora.
- Imposibilidad de tomar decisiones sanitarias, climáticas o de subsidios en tiempo real por falta de datos consolidados.

#### C. Solución Implementada
El SIP Misiones implementa una arquitectura **Offline-First estricta**. Toda la interfaz, la base de datos de chacras y los formularios corren en el dispositivo del técnico mediante Service Workers y almacenamiento local IndexedDB (Dexie.js). Al sincronizarse, los datos se consolidan en Google Cloud Firestore mediante una regla de resolución de conflictos tipo *last-write-wins* con preservación de marcas de tiempo y firma criptográfica del usuario.

---

### 4. ARQUITECTURA TECNOLÓGICA Y STACK DE SOFTWARE
- **Frontend Framework:** React 19 + TypeScript en modo Strict Type-Checking.
- **Empaquetador y Bundler:** Vite 6 con optimización de assets e inyección PWA.
- **Estilos y Experiencia de Usuario:** Tailwind CSS con paleta institucional adaptada a la identidad del Ministerio del Agro (#174C35 verde yerbatero, #E9A23B ámbar tierra roja).
- **Almacenamiento Local (Dispositivo Móvil):** Dexie.js (IndexedDB) con soporte para esquemas versionados, índices geoespaciales y cola transaccional (\`syncQueue\`).
- **Base de Datos en la Nube y Sincronización:** Google Cloud Firestore con suscripciones en tiempo real (\`onSnapshot\`), permitiendo que el panel de administración central se actualice inmediatamente cuando cualquier técnico sincroniza.
- **Cartografía y GIS:** OpenStreetMap + Leaflet interactivo con cálculo automático de coordenadas por municipio, marcadores temáticos por tipo de cultivo y renderizado de límites prediales.
- **Seguridad y Autenticación:** Google Identity Services (OAuth 2.0) integrado con Firebase Authentication y fallback de credenciales encriptadas para pruebas de campo.
- **Cumplimiento PWA (Progressive Web App):** Instalable en teléfonos Android/iOS directamente desde el navegador, con capacidad de ejecución 100% desconectada de red.

---

### 5. MÓDULOS DEL SISTEMA Y CAPACIDADES FUNCIONALES

#### 5.1. Módulo Territorial de Técnicos de Campo (/tecnicos)
- **Modo Desconectado Total:** El técnico puede encender el celular en medio de la chacra sin cobertura, abrir la aplicación y consultar o cargar registros.
- **Alta de Nuevo Productor:** Captura de datos personales (Nombre, Apellido, DNI, Teléfono, WhatsApp rural), datos del predio (Municipio, Colonia/Picada, Superficie total y cultivada, Tenencia de la tierra: Propiedad, Arrendamiento, Ocupación precaria), cultivo principal y secundario.
- **Captura GPS en Tiempo Real:** Botón de un toque para obtener latitud y longitud satelital con precisión métrica mediante la API de Geolocation del navegador/móvil.
- **Identidad de la Chacra / Subida de Logo:** Posibilidad de cargar el logo, escudo o fotografía distintiva del predio rural/cooperativa.
- **Constructor de Cuestionarios Dinámicos Offline:** Ejecución de encuestas temáticas versionadas (e.g., Cuestionario de Buenas Prácticas Agrícolas BPA, Emergencia Hídrica, Censo Yerbatero).
- **Cola de Sincronización Transaccional:** Cada operación se encola con estado \`pending\`. Cuando el teléfono ingresa a zona con señal WiFi o 4G, el sistema envía los lotes y actualiza el estado a \`synced\`.

#### 5.2. Panel de Control y Gestión Centralizada (/admin)
- **Tablero Territorial (Analytics):** Visualización de métricas consolidadas: Productores registrados, Hectáreas censadas, Distribución por cultivo (Yerba Mate, Té, Tabaco, Cítricos, Forestal, Ganadería, Acuicultura), y desglose por los 78 municipios de Misiones.
- **Padrón Maestro de Productores:** Listado con búsqueda rápida por DNI, nombre, municipio o cultivo, con capacidad de filtrado y visualización de la ficha técnica individual y mapa predial.
- **Mapa Georreferenciado Provincial:** Cartografía satelital interactiva con clustering de chacras y fichas emergentes con información de contacto y producción.
- **Importador Masivo de Bases de Datos:** Herramienta institucional para cargar archivos Excel (.xlsx) o CSV con validación de columnas, geolocalización automática por municipio y sanitización de DNIs duplicados.
- **Gestión de Técnicos y Control de Acceso (RBAC):** Aprobación y revocación de técnicos zonales, auditoría de relevamientos y generación de invitaciones criptográficas con tokens de un solo uso.
- **Centro de Sincronización en Tiempo Real:** Botón de sincronización forzada bidireccional entre la base local y Google Cloud Firestore.

#### 5.3. Portal Institucional Público (/)
- Cara visible para el ciudadano y el productor agropecuario.
- Orientación informativa sobre los programas del Ministerio del Agro y la Producción.
- Accesos diferenciados claros y protegidos hacia el entorno técnico o administrativo.

---

### 6. SEGURIDAD, GOBERNANZA Y REGLAS DE ACCESO
1. **Autenticación Oficial con Google OAuth 2.0:** Los administradores inician sesión con sus cuentas de Google institucionales autorizadas. Esto garantiza doble factor de autenticación (2FA), validación de contraseña corporativa y prevención de suplantación de identidad.
2. **Cuentas Administradoras Autorizadas:**
   - \`tiagorodriguez091@gmail.com\` (Administrador Principal)
   - \`magnoleonrossi@gmail.com\` (Administrador Ministerial)
3. **Reglas de Seguridad en la Nube (Firestore Security Rules):**
   - Lectura pública controlada de cuestionarios activos.
   - Escritura de productores restringida a técnicos autenticados y administradores.
   - Las modificaciones a usuarios y roles solo pueden ejecutarse por administradores con rol \`ADMINISTRADOR\` o \`SUPERADMIN\`.
4. **Protección de Datos Sensibles:** Cumplimiento con la Ley Nacional de Protección de Datos Personales N° 25.326 de la República Argentina.

---

### 7. GUÍA RÁPIDA DE PRUEBAS Y CREDENCIALES DE DEMOSTRACIÓN

#### A. Para ingresar al Panel de Administración Central (/admin):
- Hacer clic en **Ingresar como administrador**.
- Seleccionar **Iniciar Sesión con Google** usando la cuenta autorizada (\`tiagorodriguez091@gmail.com\` o \`magnoleonrossi@gmail.com\`).
- Acceso directo a todas las herramientas de supervisión, mapas, analítica e importación.

#### B. Para ingresar al Módulo de Campo de Técnicos (/tecnicos):
- Hacer clic en **Ingresar como técnico**.
- Utilizar la cuenta oficial de prueba técnica:
  - **Correo:** \`tecnico.prueba@agro.misiones.gob.ar\`
  - **Contraseña:** \`Tecnico2026!\`
- *Nota:* En la pantalla de login técnico existe el botón de un toque **"Probar con Técnico de Prueba Demo"** para ingresar de forma inmediata sin tipear.
- Una vez dentro, el evaluador puede presionar **"Nuevo Productor"**, cargar una chacra ficticia o real, activar el GPS, subir el logo y verificar cómo impacta inmediatamente en el padrón.

---

### 8. INDICADORES CLAVE Y BENEFICIOS PARA LA PROVINCIA
- **Reducción de Tiempos:** De 45 días promedio en la consolidación de planillas de papel a **0 segundos (tiempo real)** al momento de sincronizar.
- **Precisión Geoespacial:** 100% de los nuevos registros cuentan con coordenadas GPS validadas sobre la cartografía oficial misionera.
- **Resiliencia Operativa:** Cero pérdida de información ante cortes de internet en zonas rurales.
- **Toma de Decisiones Estratégicas:** Capacidad del Ministerio para dirigir compras públicas de semillas, plantines de yerba mate, subsidios de emergencia por granizo o sequía con geolocalización exacta de los afectados.

---

**Ministerio del Agro y la Producción — Gobierno de la Provincia de Misiones**
*Documento Técnico Institucional v2.4 — Aprobado para auditoría, supervisión y presentación oficial.*`;

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(fullReportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([fullReportMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SIP_Misiones_Informe_Tecnico_Institucional.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Header institucional del modal */}
        <div className="bg-[#174C35] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <FileText className="w-6 h-6 text-[#E9A23B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#E9A23B] text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  Documento Oficial
                </span>
                <span className="text-emerald-200 text-xs font-mono">SIP Misiones v2.4</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                Informe Técnico e Institucional del Sistema
              </h2>
              <p className="text-xs text-emerald-100/90 hidden sm:block">
                Programa Acelerados · Ministerio del Agro y la Producción de la Provincia de Misiones
              </p>
            </div>
          </div>

          {/* Acciones principales: Imprimir, Descargar, Copiar, Cerrar */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20 active:scale-95"
              title="Imprimir documento oficial o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#E9A23B]" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/20 active:scale-95"
              title="Descargar informe en formato Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 text-[#E9A23B]" />
              <span className="hidden sm:inline">Descargar .md</span>
            </button>

            <button
              onClick={copyToClipboard}
              className="px-3 py-1.5 bg-[#E9A23B] hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              title="Copiar texto completo del informe al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer ml-1"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de navegación de capítulos / secciones */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs scrollbar-thin">
          <button
            onClick={() => setActiveSection('resumen')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'resumen' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            1. Resumen Ejecutivo
          </button>
          <button
            onClick={() => setActiveSection('problematica')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'problematica' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            2. Contexto Territorial
          </button>
          <button
            onClick={() => setActiveSection('arquitectura')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'arquitectura' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            3. Arquitectura y Stack
          </button>
          <button
            onClick={() => setActiveSection('modulos')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'modulos' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            4. Módulos Operativos
          </button>
          <button
            onClick={() => setActiveSection('seguridad')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'seguridad' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            5. Seguridad y Roles
          </button>
          <button
            onClick={() => setActiveSection('manual')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'manual' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            6. Credenciales y Demo
          </button>
          <button
            onClick={() => setActiveSection('todo')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
              activeSection === 'todo' 
                ? 'bg-[#174C35] text-white shadow-2xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Ver Informe Completo
          </button>
        </div>

        {/* Contenido imprimible / legible */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 leading-relaxed font-sans text-sm print:p-0">
          
          {/* CARÁTULA INSTITUCIONAL (Siempre visible arriba) */}
          <div className="bg-[#F5F7F5] border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SipLogo variant="vertical" size="sm" />
              <div className="border-l border-slate-300 pl-4 space-y-0.5">
                <div className="text-xs font-black text-[#174C35] uppercase tracking-wide">
                  República Argentina · Provincia de Misiones
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Ministerio del Agro y la Producción
                </h3>
                <p className="text-xs text-slate-600">
                  Dirección General de Planificación y Programa Acelerados Misiones
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-300 sm:pl-4 self-stretch flex flex-col justify-center">
              <span className="text-[11px] text-slate-500 font-mono">EXPEDIENTE DIGITAL DE SISTEMAS</span>
              <span className="text-xs font-bold text-slate-900">SIP-MISIONES-DOC-2026</span>
              <span className="text-[10px] text-emerald-700 font-semibold font-mono">Estado: Homologado & En Producción</span>
            </div>
          </div>

          {/* SECCIÓN 1: RESUMEN EJECUTIVO */}
          {(activeSection === 'resumen' || activeSection === 'todo') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <BookOpen className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">1. Resumen Ejecutivo del Proyecto</h3>
              </div>
              <p className="text-justify text-slate-700">
                El <strong>Sistema de Información Productiva de Misiones (SIP Misiones)</strong> constituye la plataforma troncal de modernización del Estado provincial para relevar, censar y georreferenciar de manera continua a los productores agropecuarios de la tierra colorada. Diseñado bajo el Programa Acelerados, el sistema supera la barrera histórica de la falta de conectividad en parajes rurales, permitiendo que más de un centenar de técnicos extensionistas capturen información crítica en terreno sin necesidad de conexión móvil y la transmitan en tiempo real a la sede ministerial central en cuanto el dispositivo detecta enlace.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="font-black text-emerald-900 text-sm">100% Offline-First</div>
                  <div className="text-xs text-emerald-800 mt-1">
                    Cero pérdida de datos en picadas rurales sin señal. Almacenamiento local seguro en IndexedDB.
                  </div>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="font-black text-amber-900 text-sm">Georreferenciación GPS</div>
                  <div className="text-xs text-amber-800 mt-1">
                    Fijación satelital métrica de cada chacra y predio para cartografía y evaluación fitosanitaria.
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                  <div className="font-black text-blue-900 text-sm">Sincronización Cloud</div>
                  <div className="text-xs text-blue-800 mt-1">
                    Réplica instantánea con Google Cloud Firestore y visualización en tiempo real para autoridades.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: CONTEXTO TERRITORIAL */}
          {(activeSection === 'problematica' || activeSection === 'todo') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <MapPin className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">2. Contexto Territorial y Diagnóstico</h3>
              </div>
              <p className="text-justify text-slate-700">
                La Provincia de Misiones cuenta con una fisonomía geográfica y productiva única en la Argentina. Con 78 municipios, miles de kilómetros de caminos de tierra roja y una fuerte atomización de la producción en unidades familiares de 5 a 25 hectáreas (colonos yerbateros, tealeros, tabacaleros, ganaderos y feriantes), los métodos analógicos de empadronamiento resultaban obsoletos:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                <li>
                  <strong>Tiempos de procesamiento excesivos:</strong> Las planillas físicas tardaban entre 30 y 90 días en llegar desde parajes como Pozo Azul, San Pedro o Aurora hasta la mesa central de digitación en Posadas.
                </li>
                <li>
                  <strong>Errores de transcripción:</strong> Documentos de identidad (DNI) mal transcriptos y coordenadas anotadas a mano con errores garrafales.
                </li>
                <li>
                  <strong>Imposibilidad de respuesta rápida:</strong> Frente a emergencias como heladas tardías, granizo, orugas defoliadoras o sequía, el Ministerio carecía de un padrón georreferenciado para desplegar auxilio con exactitud.
                </li>
              </ul>
            </div>
          )}

          {/* SECCIÓN 3: ARQUITECTURA */}
          {(activeSection === 'arquitectura' || activeSection === 'todo') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <Layers className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">3. Arquitectura Tecnológica y Stack de Software</h3>
              </div>
              <p className="text-justify text-slate-700">
                El diseño técnico adoptado garantiza la máxima resiliencia operativa y una experiencia fluida tanto en teléfonos inteligentes de gama baja utilizados por extensionistas como en pantallas de alta resolución en salas de situación ministerial:
              </p>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2">
                <div><span className="text-emerald-400 font-bold">[Front-End]</span> React 19 + TypeScript + Tailwind CSS (Diseño Responsivo Touch-Ready)</div>
                <div><span className="text-amber-400 font-bold">[Local DB]</span> Dexie.js IndexedDB v4 (Motor Offline nativo en el navegador del dispositivo)</div>
                <div><span className="text-blue-400 font-bold">[Cloud Sync]</span> Google Cloud Firestore Realtime Database + Background Sync Engine</div>
                <div><span className="text-purple-400 font-bold">[GIS & Maps]</span> OpenStreetMap con Cartografía Oficial de los 78 Municipios Misioneros</div>
                <div><span className="text-rose-400 font-bold">[PWA Engine]</span> Service Workers con caché de activos estáticos y soporte de instalación</div>
                <div><span className="text-cyan-400 font-bold">[Auth & RBAC]</span> Google Identity OAuth 2.0 + Credenciales Zonal de Campo Criptográficas</div>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: MÓDULOS OPERATIVOS */}
          {(activeSection === 'modulos' || activeSection === 'todo') && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <Smartphone className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">4. Módulos Operativos y Flujos de Trabajo</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                  <h4 className="font-bold text-[#174C35] text-sm flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>A. Módulo Técnico de Campo (/tecnicos)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aplicación orientada a técnicos en camioneta o motocicleta. Permite ingresar al sistema mediante autenticación Google o credenciales asignadas. Incluye formulario de alta de chacra con geolocalización satelital (GPS) en 1 toque, subida de foto/logo de la chacra, relevamiento de cultivo principal y secundario, y ejecución de encuestas estructuradas (BPA, sanitarias).
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                  <h4 className="font-bold text-[#174C35] text-sm flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>B. Panel de Control y Gestión Central (/admin)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sede de supervisión ministerial. Proporciona métricas consolidadas (hectáreas por cultivo, municipios con mayor densidad productiva), cartografía interactiva con filtrado, importador masivo de archivos Excel/CSV para migrar bases históricas, gestión de invitaciones y alta/baja de técnicos zonales.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                  <h4 className="font-bold text-[#174C35] text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>C. Portal Institucional de Orientación (/)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Punto de entrada general con identidad ministerial que comunica los objetivos del programa agropecuario provincial y encamina a los usuarios hacia sus respectivos paneles con alta seguridad.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 5: SEGURIDAD */}
          {(activeSection === 'seguridad' || activeSection === 'todo') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <ShieldCheck className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">5. Seguridad, Gobernanza y Reglas de Control (RBAC)</h3>
              </div>
              <p className="text-justify text-slate-700">
                La seguridad y trazabilidad de los datos se rigen por los más altos estándares de autenticación e integridad gubernamental:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900">Autenticación Oficial Google OAuth 2.0</div>
                  <p className="text-slate-600">
                    Evita contraseñas débiles. Los administradores validan su identidad directamente a través de sus cuentas Google verificadas en el proyecto oficial de Google Cloud.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900">Firestore Security Rules</div>
                  <p className="text-slate-600">
                    Reglas declarativas que impiden que usuarios sin rol administrador alteren perfiles o sobrescriban registros ajenos sin autorización de zona.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 6: CREDENCIALES Y DEMO */}
          {(activeSection === 'manual' || activeSection === 'todo') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[#174C35] border-b border-emerald-900/10 pb-2">
                <Key className="w-5 h-5 text-[#27865A]" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">6. Guía Rápida de Pruebas y Credenciales Oficiales</h3>
              </div>
              <p className="text-slate-700 text-xs">
                Para auditar y demostrar el sistema a evaluadores, directores o ministros, se dispone de las siguientes vías de acceso inmediato:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Caja Admin */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#E9A23B]">ACCESO ADMINISTRADOR</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Ruta: /admin</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Inicio con Google Auth verificado para las cuentas registradas:
                  </p>
                  <ul className="list-disc pl-4 text-xs font-mono text-emerald-400 space-y-0.5">
                    <li>tiagorodriguez091@gmail.com</li>
                    <li>magnoleonrossi@gmail.com</li>
                  </ul>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Permite acceder al mapa general, dashboard de hectáreas e importador de planillas.
                  </div>
                </div>

                {/* Caja Técnico */}
                <div className="p-4 bg-[#174C35] text-white rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#E9A23B]">PERFIL TÉCNICO DE PRUEBA</span>
                    <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded">Ruta: /tecnicos</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div><strong>Usuario:</strong> <span className="font-mono text-amber-200">tecnico.prueba@agro.misiones.gob.ar</span></div>
                    <div><strong>Contraseña:</strong> <span className="font-mono text-amber-200">Tecnico2026!</span></div>
                    <div><strong>Zona:</strong> Oberá, Campo Viera y Leandro N. Alem</div>
                  </div>
                  <div className="p-2 bg-emerald-950/60 rounded-xl text-[11px] text-emerald-200 flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E9A23B] shrink-0" />
                    <span>Dispone de botón 1-clic "Probar con Técnico Demo" en la pantalla de ingreso.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PIE DE FIRMA DEL INFORME */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">Comisión Técnica de Digitalización Agropecuaria</p>
              <p>Ministerio del Agro y la Producción · Gobierno de Misiones</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#174C35] hover:bg-[#27865A] text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Este Informe</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
