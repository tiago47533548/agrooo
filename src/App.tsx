import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Producer, DynamicQuestionnaire } from './db/schema';
import { db } from './db/dexieDb';
import { seedInitialDatabaseIfEmpty, INITIAL_USERS } from './db/seedData';
import { useSyncEngine } from './hooks/useSyncEngine';
import { SipLogo } from './components/brand/SipLogo';
import { SyncStatusBanner } from './components/common/SyncStatusBanner';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { LandingPage } from './components/public/LandingPage';
import { TechnicianLogin } from './components/technician/TechnicianLogin';
import { TechnicianRegister } from './components/technician/TechnicianRegister';
import { TechnicianHome } from './components/technician/TechnicianHome';
import { AdminLogin } from './components/admin/AdminLogin';
import { ProducersList } from './components/admin/ProducersList';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { MisionesMap } from './components/map/MisionesMap';
import { QuestionnaireBuilder } from './components/questionnaires/QuestionnaireBuilder';
import { QuestionnaireRunner } from './components/questionnaires/QuestionnaireRunner';
import { InvitationsManager } from './components/admin/InvitationsManager';
import { DatabaseConfigView } from './components/admin/DatabaseConfigView';
import { DatabaseImporter } from './components/admin/DatabaseImporter';
import { TechniciansManager } from './components/admin/TechniciansManager';
import { RegisterWithInvitation } from './components/auth/RegisterWithInvitation';
import { SystemDocumentationModal } from './components/docs/SystemDocumentationModal';
import { AuthService } from './services/authService';
import { syncEngine } from './services/syncEngine';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  FileText, 
  Key, 
  Database, 
  Bell, 
  Smartphone, 
  Laptop, 
  ChevronDown, 
  Plus, 
  Trees, 
  FileSpreadsheet,
  LogOut,
  X,
  Share2,
  CheckCircle2,
  AlertCircle,
  Home,
  UserCog,
  ShieldCheck,
  UserCheck,
  RefreshCw
} from 'lucide-react';

export type AppRoute = 
  | 'landing' 
  | 'tecnicos-login' 
  | 'tecnicos-register' 
  | 'tecnicos-dashboard' 
  | 'admin-login' 
  | 'admin-dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('landing');
  const [prefillRegisterEmail, setPrefillRegisterEmail] = useState<string>('');
  
  // Admin Navigation State
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'producers' | 'map' | 'technicians' | 'questionnaires' | 'invitations' | 'importer' | 'database'>('dashboard');
  
  // Data State
  const [producers, setProducers] = useState<Producer[]>([]);
  const [questionnaires, setQuestionnaires] = useState<DynamicQuestionnaire[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedMapProducer, setSelectedMapProducer] = useState<Producer | null>(null);

  // Questionnaire runner & builder modal state
  const [runningQuestionnaire, setRunningQuestionnaire] = useState<{ q: DynamicQuestionnaire; p?: Producer } | null>(null);
  const [builderQuestionnaire, setBuilderQuestionnaire] = useState<DynamicQuestionnaire | null | 'new'>(null);

  // Deep Link State (e.g. /registro/CODE)
  const [deepLinkInviteCode, setDeepLinkInviteCode] = useState<string | null>(null);
  const [routeAccessNotice, setRouteAccessNotice] = useState<string | null>(null);
  const [isReloadingDb, setIsReloadingDb] = useState(false);
  const [dbSuccessMessage, setDbSuccessMessage] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Initialize DB, Seed Data, and Session/Routes with Firestore Real-time Cloud Sync
  useEffect(() => {
    let unsubscribeCloud: (() => void) | null = null;

    const init = async () => {
      await seedInitialDatabaseIfEmpty();
      await refreshData();

      // Check stored session
      const stored = AuthService.getStoredSession();
      if (stored) {
        setCurrentUser(stored);
      }

      // Read current URL path
      resolveInitialRoute(stored);

      // Sincronización bidireccional y suscripción en tiempo real con Firebase Firestore
      try {
        const { syncCloudWithLocal, subscribeToCloudProducers } = await import('./services/firestoreSync');
        
        // 1. Sincronización inicial rápida en segundo plano
        syncCloudWithLocal().then(() => syncEngine.triggerSync()).then(() => {
          refreshData();
        }).catch((err) => {
          console.warn('Aviso sincronización inicial Firestore:', err);
        });

        // 2. Suscripción en tiempo real: cualquier productor cargado por técnicos
        // o archivos se refleja inmediatamente en el panel administrativo sin recargar
        unsubscribeCloud = subscribeToCloudProducers((cloudProducers) => {
          if (cloudProducers && cloudProducers.length > 0) {
            refreshData();
          }
        });
      } catch (err) {
        console.warn('No se pudo inicializar listener en tiempo real de Firestore:', err);
      }
    };

    init();

    // Listen to browser navigation (back/forward)
    const handlePopState = () => {
      const stored = AuthService.getStoredSession();
      resolveInitialRoute(stored);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (unsubscribeCloud) {
        unsubscribeCloud();
      }
    };
  }, []);

  const resolveInitialRoute = (activeUser: UserProfile | null) => {
    const path = window.location.pathname;

    if (path.startsWith('/registro/')) {
      const code = path.replace('/registro/', '').trim();
      if (code) {
        setDeepLinkInviteCode(code);
        return;
      }
    }

    if (path.startsWith('/formulario/')) {
      const formCode = path.replace('/formulario/', '').trim();
      db.questionnaires.where('code').equalsIgnoreCase(formCode).first().then((found) => {
        if (found) setRunningQuestionnaire({ q: found });
      });
    }

    if (path === '/tecnicos/registro') {
      setCurrentRoute('tecnicos-register');
      return;
    }

    if (path === '/tecnicos/dashboard') {
      if (activeUser && activeUser.role === 'TECNICO' && activeUser.active) {
        setCurrentRoute('tecnicos-dashboard');
      } else {
        setRouteAccessNotice('Debes iniciar sesión con una cuenta técnica autorizada.');
        navigateTo('tecnicos-login', '/tecnicos');
      }
      return;
    }

    if (path === '/tecnicos') {
      if (activeUser && activeUser.role === 'TECNICO' && activeUser.active) {
        setCurrentRoute('tecnicos-dashboard');
        window.history.replaceState({}, '', '/tecnicos/dashboard');
      } else {
        setCurrentRoute('tecnicos-login');
      }
      return;
    }

    if (path === '/admin/dashboard') {
      if (activeUser && (activeUser.role === 'ADMINISTRADOR' || activeUser.role === 'SUPERADMIN' || activeUser.role === 'DIRECTOR')) {
        setCurrentRoute('admin-dashboard');
      } else {
        setRouteAccessNotice('Acceso restringido: Debes autenticarte con una cuenta administradora autorizada.');
        navigateTo('admin-login', '/admin');
      }
      return;
    }

    if (path === '/admin') {
      if (activeUser && (activeUser.role === 'ADMINISTRADOR' || activeUser.role === 'SUPERADMIN' || activeUser.role === 'DIRECTOR')) {
        setCurrentRoute('admin-dashboard');
        window.history.replaceState({}, '', '/admin/dashboard');
      } else {
        setCurrentRoute('admin-login');
      }
      return;
    }

    // Default: Public landing page
    setCurrentRoute('landing');
  };

  const navigateTo = (route: AppRoute, pathUrl: string) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', pathUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshData = async () => {
    try {
      let prods = await db.producers.orderBy('updatedAt').reverse().toArray();
      // If DB has 0 producers, automatically seed the 14 territorial producers
      if (prods.length === 0) {
        await seedInitialDatabaseIfEmpty(true);
        prods = await db.producers.orderBy('updatedAt').reverse().toArray();
      }
      setProducers(prods);

      const quests = await db.questionnaires.toArray();
      setQuestionnaires(quests);

      const notifs = await db.notifications.orderBy('createdAt').reverse().limit(10).toArray();
      setNotifications(notifs);
    } catch (e) {
      console.error('Error refreshing app data', e);
    }
  };

  const handleForceReloadDatabase = async () => {
    setIsReloadingDb(true);
    setDbSuccessMessage(null);
    try {
      await seedInitialDatabaseIfEmpty(true);
      // Sincronizar con Firebase Firestore para traer datos subidos por técnicos
      try {
        const { syncCloudWithLocal } = await import('./services/firestoreSync');
        await syncCloudWithLocal();
        const syncRes = await syncEngine.triggerSync();
        await refreshData();
        setDbSuccessMessage(syncRes.success
          ? `Sincronización completada: ${syncRes.syncedCount} registros confirmados en Firebase.`
          : `Sincronización incompleta: ${syncRes.syncedCount} confirmados. ${syncRes.errors[0] || 'Hay registros pendientes de reintento.'}`);
      } catch (cloudErr) {
        await refreshData();
        setDbSuccessMessage(`Los datos locales siguen disponibles, pero Firebase no confirmó la sincronización: ${(cloudErr as Error)?.message || 'error de conexión'}`);
      }
      setTimeout(() => setDbSuccessMessage(null), 5000);
    } catch (e: any) {
      console.error('Error reloading database', e);
    } finally {
      setIsReloadingDb(false);
    }
  };

  const handleLogout = () => {
    AuthService.clearSession();
    setCurrentUser(null);
    navigateTo('landing', '/');
  };

  // 1. Deep link invitation handler
  if (deepLinkInviteCode) {
    return (
      <RegisterWithInvitation
        inviteCode={deepLinkInviteCode}
        onSuccessLogin={(user) => {
          setDeepLinkInviteCode(null);
          setCurrentUser(user);
          AuthService.setStoredSession(user);
          if (user.role === 'TECNICO') {
            navigateTo('tecnicos-dashboard', '/tecnicos/dashboard');
          } else {
            navigateTo('admin-dashboard', '/admin/dashboard');
          }
        }}
        onBackToHome={() => {
          setDeepLinkInviteCode(null);
          navigateTo('landing', '/');
        }}
      />
    );
  }

  // 2. Public Landing Page
  if (currentRoute === 'landing') {
    return (
      <LandingPage
        onNavigateToTechnicians={() => {
          if (currentUser && currentUser.role === 'TECNICO' && currentUser.active) {
            navigateTo('tecnicos-dashboard', '/tecnicos/dashboard');
          } else {
            navigateTo('tecnicos-login', '/tecnicos');
          }
        }}
        onNavigateToAdmin={() => {
          if (currentUser && (currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'SUPERADMIN')) {
            navigateTo('admin-dashboard', '/admin/dashboard');
          } else {
            navigateTo('admin-login', '/admin');
          }
        }}
      />
    );
  }

  // 3. Technician Login
  if (currentRoute === 'tecnicos-login') {
    return (
      <TechnicianLogin
        onBackToLanding={() => navigateTo('landing', '/')}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          navigateTo('tecnicos-dashboard', '/tecnicos/dashboard');
        }}
        onNavigateToRegister={(prefill) => {
          setPrefillRegisterEmail(prefill || '');
          navigateTo('tecnicos-register', '/tecnicos/registro');
        }}
      />
    );
  }

  // 4. Technician Register Request
  if (currentRoute === 'tecnicos-register') {
    return (
      <TechnicianRegister
        initialEmail={prefillRegisterEmail}
        onBackToLogin={() => navigateTo('tecnicos-login', '/tecnicos')}
        onRegistrationComplete={() => navigateTo('tecnicos-login', '/tecnicos')}
      />
    );
  }

  // 5. Admin Login
  if (currentRoute === 'admin-login') {
    return (
      <AdminLogin
        onBackToLanding={() => navigateTo('landing', '/')}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          navigateTo('admin-dashboard', '/admin/dashboard');
        }}
      />
    );
  }

  // Strict Auth Guard: Nobody can view dashboards without an authenticated session
  if (!currentUser) {
    if (currentRoute === 'tecnicos-dashboard') {
      return (
        <TechnicianLogin
          onBackToLanding={() => navigateTo('landing', '/')}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            navigateTo('tecnicos-dashboard', '/tecnicos/dashboard');
          }}
          onNavigateToRegister={(prefill) => {
            setPrefillRegisterEmail(prefill || '');
            navigateTo('tecnicos-register', '/tecnicos/registro');
          }}
        />
      );
    }
    if (currentRoute === 'admin-dashboard') {
      return (
        <AdminLogin
          onBackToLanding={() => navigateTo('landing', '/')}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            navigateTo('admin-dashboard', '/admin/dashboard');
          }}
        />
      );
    }
    return (
      <>
        <LandingPage
          onNavigateToTechnicians={() => navigateTo('tecnicos-login', '/tecnicos')}
          onNavigateToAdmin={() => navigateTo('admin-login', '/admin')}
          onOpenDocumentation={() => setIsDocModalOpen(true)}
        />
        <SystemDocumentationModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
        />
      </>
    );
  }

  const activeUser = currentUser;

  return (
    <div className="min-h-screen bg-[#F5F7F5] flex flex-col text-[#202B25] selection:bg-[#E8F2EA] selection:text-[#174C35] overflow-x-hidden">
      {/* Global Offline-First Sync & Network Status Banner */}
      <SyncStatusBanner />

      {routeAccessNotice && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
          <span>{routeAccessNotice}</span>
          <button onClick={() => setRouteAccessNotice(null)} className="p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP BAR CONTRACT: 3 Zones, Single Line, iPhone Safe-Area Compliant */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 pt-safe flex items-center justify-between gap-3">
        {/* Zone 1: Single text element Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <SipLogo variant="horizontal" size="sm" showSubtitle={false} />
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {currentRoute === 'tecnicos-dashboard' ? 'Módulo Territorial de Campo' : 'Panel de Gestión y Supervisión'}
          </span>
        </div>

        {/* Zone 2: Navigation Links or Institutional Context */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentRoute === 'admin-dashboard' && (
            <button
              onClick={() => navigateTo('landing', '/')}
              className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Ver Landing</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs hover:bg-slate-50"
            title="Ver informe técnico e institucional del sistema"
          >
            <FileText className="w-3.5 h-3.5 text-[#27865A]" />
            <span className="hidden sm:inline">Informe Oficial</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] font-bold">
              {currentRoute === 'tecnicos-dashboard' ? 'TÉCNICO' : 'ADMINISTRADOR'}
            </span>
          </div>
        </div>

        {/* Zone 3: Primary Action, PWA Install & User / Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton compact={true} />

          {/* Notifications Button */}
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition relative cursor-pointer"
            title="Centro de notificaciones"
          >
            <Bell className="w-4 h-4" />
            {notifications.some((n) => !n.read) && (
              <span className="w-2 h-2 rounded-full bg-[#E9A23B] absolute top-1.5 right-1.5" />
            )}
          </button>

          {/* User Profile Pill & Logout Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer text-xs">
              <div className="w-6 h-6 rounded-lg bg-[#174C35] text-white font-bold flex items-center justify-center text-[11px]">
                {activeUser.fullName?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="font-bold text-slate-900 truncate max-w-[130px]">{activeUser.fullName}</span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">{activeUser.email}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Menu */}
            <div className="absolute right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 hidden group-hover:block animate-in fade-in duration-150 z-50">
              <div className="p-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 block text-xs truncate">{activeUser.fullName}</span>
                <span className="text-[11px] text-slate-500 font-mono block truncate">{activeUser.email}</span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#E8F2EA] text-[#174C35]">
                  {activeUser.role}
                </span>
              </div>

              <div className="pt-2 space-y-1">
                <button
                  onClick={() => navigateTo('landing', '/')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ir a la Landing Pública</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-red-50 text-red-700 font-semibold flex items-center gap-2 cursor-pointer transition"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 pb-safe">
        {/* ENTORNO 1: APLICACIÓN DE CAMPO PARA TÉCNICOS */}
        {currentRoute === 'tecnicos-dashboard' && (
          <TechnicianHome
            currentUser={activeUser}
            onOpenQuestionnaire={(q, p) => setRunningQuestionnaire({ q, p })}
            onSelectProducerDetail={(p) => {
              setSelectedMapProducer(p);
            }}
            onDataChanged={refreshData}
          />
        )}

        {/* ENTORNO 2: PANEL ADMINISTRATIVO WEB */}
        {currentRoute === 'admin-dashboard' && (
          <div className="space-y-5">
            {/* Admin Subnav Strip with Sync/Upload Button */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveAdminTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'dashboard'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Territorial</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('producers')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'producers'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Productores ({producers.length})</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('map')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'map'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span>Mapa Productivo</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('technicians')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'technicians'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>Gestión de Técnicos</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('importer')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'importer'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importar Base Externa</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('questionnaires')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'questionnaires'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Cuestionarios ({questionnaires.length})</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('invitations')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'invitations'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Invitaciones</span>
              </button>

              <button
                onClick={() => setActiveAdminTab('database')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeAdminTab === 'database'
                    ? 'bg-[#174C35] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Base de Datos</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap shrink-0 text-slate-700 hover:text-[#174C35] hover:bg-emerald-50 border border-slate-200 bg-white font-bold cursor-pointer"
                title="Abrir informe técnico e institucional del sistema (imprimir / descargar PDF)"
              >
                <FileText className="w-4 h-4 text-[#E9A23B]" />
                <span>Informe Técnico Oficial</span>
              </button>

              {/* Action to synchronize/upload all technician field data */}
              <div className="ml-auto pl-2 shrink-0">
                <button
                  type="button"
                  onClick={handleForceReloadDatabase}
                  disabled={isReloadingDb}
                  className="px-3.5 py-2 bg-[#E8F2EA] hover:bg-[#d5ebd8] text-[#174C35] font-extrabold text-xs rounded-xl flex items-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-2xs border border-[#27865A]/30"
                  title="Sincronizar y cargar todos los relevamientos territoriales de los técnicos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#27865A] ${isReloadingDb ? 'animate-spin' : ''}`} />
                  <span>{isReloadingDb ? 'Sincronizando datos...' : 'Sincronizar Datos de Campo'}</span>
                </button>
              </div>
            </div>

            {/* Success notification banner */}
            {dbSuccessMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{dbSuccessMessage}</span>
                </div>
                <button onClick={() => setDbSuccessMessage(null)} className="p-1 hover:text-emerald-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB CONTENTS */}
            {activeAdminTab === 'dashboard' && (
              <AnalyticsDashboard
                producers={producers}
                onSelectMunicipalityFilter={() => {
                  setActiveAdminTab('producers');
                }}
                onDataChanged={refreshData}
                onGoToProducers={() => setActiveAdminTab('producers')}
                currentUserName={activeUser?.fullName || 'Administrador'}
                currentUserId={activeUser?.id || 'admin-user'}
              />
            )}

            {activeAdminTab === 'producers' && (
              <ProducersList
                producers={producers}
                onRefresh={refreshData}
                onOpenMapLocation={(p) => {
                  setSelectedMapProducer(p);
                  setActiveAdminTab('map');
                }}
              />
            )}

            {activeAdminTab === 'map' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Mapa Georreferenciado Provincial</h3>
                    <p className="text-xs text-slate-500">
                      Capas de información territorial de chacras y cultivos sobre cartografía oficial OpenStreetMap.
                    </p>
                  </div>
                </div>

                <MisionesMap
                  producers={producers}
                  selectedProducerId={selectedMapProducer?.id}
                  height="h-[620px]"
                />
              </div>
            )}

            {activeAdminTab === 'technicians' && (
              <TechniciansManager currentAdmin={activeUser} />
            )}

            {activeAdminTab === 'importer' && (
              <DatabaseImporter
                currentUserId={activeUser.id}
                currentUserName={activeUser.fullName}
                onImportComplete={() => {
                  refreshData();
                }}
                onGoToProducers={() => {
                  refreshData();
                  setActiveAdminTab('producers');
                }}
                onGoToMap={() => {
                  refreshData();
                  setActiveAdminTab('map');
                }}
              />
            )}

            {activeAdminTab === 'questionnaires' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Constructor de Cuestionarios Dinámicos</h3>
                    <p className="text-xs text-slate-500">
                      Formularios versionados disponibles automáticamente para técnicos en campo sin conexión.
                    </p>
                  </div>

                  <button
                    onClick={() => setBuilderQuestionnaire('new')}
                    className="px-4 py-2 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Cuestionario</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionnaires.map((q) => (
                    <div
                      key={q.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase font-bold text-[#27865A]">
                            {q.code} · Versión {q.version}
                          </span>
                          <h4 className="font-bold text-base text-slate-900 mt-0.5">{q.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">{q.description}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold uppercase shrink-0">
                          {q.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">
                          {q.questions.length} campos dinámicos
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/formulario/${q.code}`;
                              navigator.clipboard?.writeText(link);
                              alert(`Enlace copiado al portapapeles:\n${link}`);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px] flex items-center gap-1"
                          >
                            <Share2 className="w-3 h-3 text-[#27865A]" />
                            <span>Enlace</span>
                          </button>

                          <button
                            onClick={() => setBuilderQuestionnaire(q)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px]"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => setRunningQuestionnaire({ q })}
                            className="px-3 py-1 rounded-lg bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-[11px]"
                          >
                            Probar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeAdminTab === 'invitations' && (
              <InvitationsManager
                currentUserId={activeUser.id}
                currentUserName={activeUser.fullName}
              />
            )}

            {activeAdminTab === 'database' && (
              <DatabaseConfigView />
            )}
          </div>
        )}
      </main>

      {/* Questionnaire Builder Modal */}
      {builderQuestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pt-safe pb-safe backdrop-blur-xs overflow-y-auto">
          <QuestionnaireBuilder
            existingQuestionnaire={builderQuestionnaire === 'new' ? null : builderQuestionnaire}
            onCancel={() => setBuilderQuestionnaire(null)}
            onSuccess={() => {
              setBuilderQuestionnaire(null);
              refreshData();
            }}
          />
        </div>
      )}

      {/* Questionnaire Runner Modal */}
      {runningQuestionnaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pt-safe pb-safe backdrop-blur-xs overflow-y-auto">
          <QuestionnaireRunner
            questionnaire={runningQuestionnaire.q}
            producers={producers}
            preselectedProducer={runningQuestionnaire.p}
            technicianId={activeUser.id}
            technicianName={activeUser.fullName}
            onClose={() => setRunningQuestionnaire(null)}
            onSuccess={() => {
              setRunningQuestionnaire(null);
              refreshData();
              alert('¡Cuestionario guardado con éxito en el almacenamiento local!');
            }}
          />
        </div>
      )}

      {/* Notifications Slide-out Drawer */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-5 pt-safe pb-safe flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#27865A]" />
                  <h3 className="font-bold text-slate-900 text-base">Notificaciones del Sistema</h3>
                </div>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[75vh]">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Institutional Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 px-4 sm:px-6 py-4 pb-safe text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="font-bold text-[#174C35]">SIP MISIONES</span>
            <span>·</span>
            <span>Ministerio del Agro y la Producción de la Provincia de Misiones</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px] flex-wrap justify-center sm:justify-end">
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="text-[#174C35] hover:text-[#27865A] font-bold flex items-center gap-1 cursor-pointer transition font-sans text-xs bg-[#E8F2EA] px-2.5 py-1 rounded-lg border border-[#174C35]/20"
            >
              <FileText className="w-3.5 h-3.5 text-[#27865A]" />
              <span>Informe Oficial del Sistema</span>
            </button>
            <span>Arquitectura Offline-First</span>
            <span>·</span>
            <span>IndexedDB + Firestore</span>
          </div>
        </div>
      </footer>

      {/* System Documentation & Technical Institutional Report Modal */}
      <SystemDocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />
    </div>
  );
}
