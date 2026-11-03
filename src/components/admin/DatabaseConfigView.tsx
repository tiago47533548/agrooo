import React, { useState, useEffect } from 'react';
import { SIP_MISIONES_POSTGRES_SCHEMA } from '../../db/sqlExport';
import { AuditLog, SyncQueueItem } from '../../db/schema';
import { db } from '../../db/dexieDb';
import { seedInitialDatabaseIfEmpty } from '../../db/seedData';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { 
  Database, 
  Code, 
  Download, 
  Copy, 
  Check, 
  Shield, 
  AlertCircle, 
  Server, 
  Layers, 
  Clock, 
  Smartphone,
  ExternalLink,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export const DatabaseConfigView: React.FC = () => {
  const { isOnline, failedCount, conflictCount, state, pendingCount, triggerSync, retryFailed } = useSyncEngine();
  const [copiedSql, setCopiedSql] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [localProducerCount, setLocalProducerCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'sql' | 'audit' | 'queue' | 'firebase'>('firebase');

  useEffect(() => {
    const loadAuditAndQueue = async () => {
      try {
        const logs = await db.auditLogs.orderBy('timestamp').reverse().limit(20).toArray();
        setAuditLogs(logs);

        const queue = await db.syncQueue.orderBy('createdAt').reverse().limit(20).toArray();
        setQueueItems(queue);

        const count = await db.producers.count();
        setLocalProducerCount(count);
      } catch (e) {
        console.error('Error loading audit logs', e);
      }
    };
    loadAuditAndQueue();
  }, [state]);

  const handleResetAndSeedDatabase = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      await seedInitialDatabaseIfEmpty(true);
      try {
        const { syncCloudWithLocal } = await import('../../services/firestoreSync');
        await syncCloudWithLocal();
        const result = await triggerSync();
        if (!result.success) throw new Error(result.errors[0] || 'Hay registros pendientes de envío.');
        setResetMessage(`Firebase confirmó ${result.syncedCount} envíos. ${await db.producers.count()} productores disponibles.`);
      } catch (cloudErr) {
        setResetMessage(`Los datos locales siguen disponibles. Firebase no confirmó todos los envíos: ${(cloudErr as Error)?.message || 'error de conexión'}`);
      }
      const updated = await db.producers.count();
      setLocalProducerCount(updated);
      setTimeout(() => setResetMessage(null), 7000);
    } catch (e: any) {
      setResetMessage('Error al sincronizar base: ' + (e?.message || 'Error'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard?.writeText(SIP_MISIONES_POSTGRES_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SIP_MISIONES_POSTGRES_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SIP_MISIONES_PostgreSQL_PostGIS_Schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-[#27865A]" />
          <span>Infraestructura de Datos & Seguridad</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Firebase Firestore, registro local y cola de sincronización.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl">
        <button
          onClick={() => setActiveTab('firebase')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'firebase' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-[#27865A]" />
          <span>Conexión Firebase</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code className="w-3.5 h-3.5 text-[#27865A]" />
          <span>Esquema SQL PostGIS</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#27865A]" />
          <span>Auditoría ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'queue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#27865A]" />
          <span>Cola de Sincronización ({queueItems.length})</span>
        </button>
      </div>

      {/* TAB 1: Firebase configuration & status */}
      {activeTab === 'firebase' && (
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#27865A]" />
                  <span>Estado de Integración Backend Firebase</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conexión con Firebase Authentication y Firestore.
                </p>
              </div>

              <span
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800"
              >
                Firebase Firestore
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#27865A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900">Principio de Integración Transparente:</span>
                  <p className="text-slate-600 mt-0.5">
                    Los registros se guardan localmente y se envían a Firestore cuando hay conexión. Los errores quedan visibles en la cola para reintento.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Configuración del proyecto Firebase:
                </span>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <div>firebase-applet-config.json</div>
                </div>
              </div>
            </div>

            {/* Direct Territorial Database Seeder & Sync */}
            <div className="p-4 bg-[#E8F2EA]/70 border border-[#27865A]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#174C35]" />
                  <span className="font-bold text-slate-900 text-xs">
                    Padrón Territorial Provincial Activo: {localProducerCount} productores
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Incluye los relevamientos cargados por los técnicos territoriales (Flia. Rodríguez, Aurelia Fernández, etc.) y cuencas productivas clave.
                </p>
                {resetMessage && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{resetMessage}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetAndSeedDatabase}
                disabled={isResetting}
                className="px-4 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[40px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Sincronizando...' : 'Cargar Base Territorial (14 Productores)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SQL Export */}
      {activeTab === 'sql' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Script DDL de Migración PostgreSQL + PostGIS</h3>
              <p className="text-xs text-slate-500">Incluye tablas de productores, cuestionarios, RLS y funciones geoespaciales.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
              </button>

              <button
                onClick={handleDownloadSql}
                className="px-3 py-1.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .sql</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed">
            {SIP_MISIONES_POSTGRES_SCHEMA}
          </pre>
        </div>
      )}

      {/* TAB 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Usuario & Rol</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Detalle del Registro</th>
                  <th className="px-4 py-3">Dispositivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{log.userRole}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {log.device}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Cola Firebase: {pendingCount} pendientes · {failedCount} fallidos · {conflictCount} conflictos
            </span>
            <div className="flex gap-2">
              {failedCount > 0 && <button onClick={() => retryFailed()} className="px-3 py-1 bg-rose-700 text-white rounded-lg text-xs font-semibold">Reintentar fallidos</button>}
              <button onClick={() => triggerSync()} className="px-3 py-1 bg-[#27865A] text-white rounded-lg text-xs font-semibold hover:bg-[#174C35] transition">Procesar ahora</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tabla</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Idempotency Key</th>
                  <th className="px-4 py-3">Intentos</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      La cola de sincronización está vacía. Todos los registros están confirmados.
                    </td>
                  </tr>
                ) : (
                  queueItems.map((q) => (
                    <tr key={q.id}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{q.table}</td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase text-slate-600">{q.action}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{q.idempotencyKey}</td>
                      <td className="px-4 py-3 font-mono">{q.attempts}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          q.status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {q.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
