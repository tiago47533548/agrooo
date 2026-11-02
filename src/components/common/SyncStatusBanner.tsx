import React, { useState } from 'react';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  CloudOff, 
  Database,
  ChevronRight,
  X
} from 'lucide-react';

interface SyncStatusBannerProps {
  compact?: boolean;
}

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({ compact = false }) => {
  const { state, isOnline, pendingCount, lastSyncedAt, errorMessage, supabaseConfigured, triggerSync } = useSyncEngine();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusConfig = () => {
    switch (state) {
      case 'OFFLINE':
        return {
          label: 'OFFLINE: Modo Campo',
          sub: 'Guardando datos localmente en dispositivo',
          icon: WifiOff,
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
          badge: 'bg-amber-500 text-white'
        };
      case 'PENDIENTE':
        return {
          label: `PENDIENTE: ${pendingCount} registro${pendingCount === 1 ? '' : 's'}`,
          sub: 'Guardado localmente listo para sincronizar',
          icon: AlertTriangle,
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          badge: 'bg-[#E9A23B] text-white'
        };
      case 'SINCRONIZANDO':
        return {
          label: 'SINCRONIZANDO...',
          sub: 'Enviando relevamientos a la base central',
          icon: RefreshCw,
          bg: 'bg-blue-50 border-blue-200 text-blue-800',
          badge: 'bg-blue-600 text-white animate-spin'
        };
      case 'ERROR':
        return {
          label: 'ERROR EN SINCRONIZACIÓN',
          sub: errorMessage || 'Se reintentará automáticamente',
          icon: AlertTriangle,
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          badge: 'bg-[#D94B4B] text-white'
        };
      case 'SINCRONIZADO':
        return {
          label: 'SINCRONIZADO',
          sub: lastSyncedAt ? `Última sincronización: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Al día',
          icon: CheckCircle2,
          bg: 'bg-[#E8F2EA] border-[#27865A]/20 text-[#174C35]',
          badge: 'bg-[#27865A] text-white'
        };
      case 'ONLINE':
      default:
        return {
          label: 'ONLINE',
          sub: 'Conectado a la red provincial',
          icon: Wifi,
          bg: 'bg-[#E8F2EA] border-[#27865A]/20 text-[#174C35]',
          badge: 'bg-[#27865A] text-white'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90 ${config.bg}`}
        title="Ver estado de sincronización y almacenamiento local"
      >
        <span className={`w-2 h-2 rounded-full ${state === 'OFFLINE' ? 'bg-amber-500' : state === 'PENDIENTE' ? 'bg-[#E9A23B]' : state === 'ERROR' ? 'bg-[#D94B4B]' : 'bg-[#27865A]'}`} />
        <span className="font-semibold tracking-tight">{config.label}</span>
      </button>
    );
  }

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className={`w-full px-4 py-2 border-b flex items-center justify-between transition-colors cursor-pointer text-xs md:text-sm ${config.bg}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md ${config.badge}`}>
            <Icon className={`w-4 h-4 ${state === 'SINCRONIZANDO' || isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold tracking-tight">{config.label}</span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="opacity-90 text-[11px] sm:text-xs">{config.sub}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </button>
          )}
          <ChevronRight className="w-4 h-4 opacity-60" />
        </div>
      </div>

      {/* Modal with detailed sync diagnostics & offline info */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-[#174C35] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#E8F2EA]" />
                <h3 className="font-bold text-base">Estado de Sincronización y Red</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-[#202B25]">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">Conectividad a Internet</span>
                <span className={`font-semibold flex items-center gap-1.5 ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  {isOnline ? 'Conectado (Online)' : 'Desconectado (Offline)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">Registros locales en espera</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                  {pendingCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">Almacenamiento Local</span>
                <span className="text-slate-800 font-medium">
                  IndexedDB activo (persistente)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">Servidor Central Supabase</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${supabaseConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {supabaseConfigured ? 'Conectado a Cloud' : 'Modo Autónomo Local'}
                </span>
              </div>

              {lastSyncedAt && (
                <div className="text-xs text-slate-500 text-center">
                  Última sincronización confirmada: {new Date(lastSyncedAt).toLocaleString()}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 py-2.5 px-4 bg-[#27865A] hover:bg-[#174C35] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  Forzar Sincronización
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
