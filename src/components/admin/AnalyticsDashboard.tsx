import React, { useState, useRef } from 'react';
import { Producer, ProductiveActivityType } from '../../db/schema';
import { PRODUCTIVE_ACTIVITIES_CATALOG, MISIONES_MUNICIPALITIES } from '../../db/misionesCatalog';
import { parseAndImportProducerFile } from '../../utils/fileImporterUtil';
import { syncCloudWithLocal } from '../../services/firestoreSync';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  MapPin, 
  Trees, 
  Download, 
  Printer, 
  Layers, 
  FileCheck2,
  Calendar,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';

interface AnalyticsDashboardProps {
  producers: Producer[];
  onSelectMunicipalityFilter?: (mun: string) => void;
  onDataChanged?: () => void;
  onGoToProducers?: () => void;
  currentUserName?: string;
  currentUserId?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  producers,
  onSelectMunicipalityFilter,
  onDataChanged,
  onGoToProducers,
  currentUserName = 'Administrador Ministerial',
  currentUserId = 'user-admin'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Direct file upload handler (.xlsx, .xls, .csv, .json)
  const handleDirectFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    setDashboardMessage(null);

    try {
      const result = await parseAndImportProducerFile(file, currentUserName, currentUserId);
      if (result.success) {
        setDashboardMessage({
          type: 'success',
          text: `¡Archivo "${file.name}" cargado exitosamente! Se incorporaron ${result.importedCount} productores nuevos y se actualizaron ${result.updatedCount} registros. El dashboard se actualizó en tiempo real.`
        });
        onDataChanged?.();
      } else {
        setDashboardMessage({
          type: 'error',
          text: `No se pudo procesar el archivo: ${result.error || 'Error desconocido'}`
        });
      }
    } catch (err: any) {
      setDashboardMessage({
        type: 'error',
        text: `Error al subir el archivo: ${err.message || 'Error inesperado'}`
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    setDashboardMessage(null);
    try {
      const res = await syncCloudWithLocal();
      setDashboardMessage({
        type: 'success',
        text: `¡Sincronización con la Nube Ministerial (Firebase) completada! Se descargaron ${res.downloaded} nuevos relevamientos de campo y se sincronizaron ${res.total} productores en total.`
      });
      onDataChanged?.();
    } catch (e: any) {
      setDashboardMessage({
        type: 'error',
        text: `Error al sincronizar con la nube: ${e.message || 'Verifique la conexión a internet'}`
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };
  // Aggregate KPIs
  const totalProducers = producers.length;
  const totalSurfaceHa = producers.reduce((sum, p) => sum + (Number(p.surfaceHa) || 0), 0);
  const validatedCount = producers.filter((p) => p.verifiedBySupervisor).length;
  const uniqueMunicipalities = new Set(producers.map((p) => p.municipality)).size;

  // Breakdown by productive activity
  const activityDistribution: Record<string, { count: number; surfaceHa: number; color: string; name: string }> = {};

  PRODUCTIVE_ACTIVITIES_CATALOG.forEach((cat) => {
    activityDistribution[cat.type] = {
      count: 0,
      surfaceHa: 0,
      color: cat.color,
      name: cat.name
    };
  });

  producers.forEach((p) => {
    p.activities?.forEach((act) => {
      if (activityDistribution[act.type]) {
        activityDistribution[act.type].count += 1;
        activityDistribution[act.type].surfaceHa += Number(act.surfaceHa) || 0;
      }
    });
  });

  const sortedActivities = Object.entries(activityDistribution)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].surfaceHa - a[1].surfaceHa);

  // Breakdown by municipality
  const municipalityCounts: Record<string, number> = {};
  producers.forEach((p) => {
    municipalityCounts[p.municipality] = (municipalityCounts[p.municipality] || 0) + 1;
  });

  const sortedMunicipalities = Object.entries(municipalityCounts)
    .sort((a, b) => b[1] - a[1]);

  const maxMunCount = sortedMunicipalities[0]?.[1] || 1;

  // Print official executive report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#27865A]" />
            <span>Centro de Inteligencia Productiva y Reportes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidación territorial provincial en tiempo real a partir de relevamientos de campo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleDirectFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Cargar archivo Excel, CSV o JSON con datos de productores"
          >
            <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Procesando Archivo...' : 'Subir Archivo de Productores'}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncingCloud}
            className="px-3.5 py-2 bg-[#E8F2EA] hover:bg-[#d5ebd8] text-[#174C35] text-xs font-bold rounded-xl border border-[#27865A]/30 shadow-2xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Sincronizar con la base ministerial en Firebase Firestore"
          >
            <RefreshCw className={`w-4 h-4 text-[#27865A] ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#27865A]" />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      {/* Dashboard Notification Banner */}
      {dashboardMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs animate-in fade-in ${
            dashboardMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {dashboardMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block text-sm font-bold">
                {dashboardMessage.type === 'success' ? 'Operación Exitosa' : 'Atención al Cargar Datos'}
              </strong>
              <p className="mt-0.5 leading-relaxed">{dashboardMessage.text}</p>
              {dashboardMessage.type === 'success' && onGoToProducers && (
                <button
                  type="button"
                  onClick={onGoToProducers}
                  className="mt-2 text-xs font-bold text-[#174C35] hover:underline flex items-center gap-1"
                >
                  <span>Ver en el Padrón de Productores</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setDashboardMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Productores Relevados
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#174C35] mt-1">
            {totalProducers}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            En {uniqueMunicipalities} municipios
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Superficie Relevada
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#27865A] mt-1">
            {Math.round(totalSurfaceHa).toLocaleString()} <span className="text-base font-normal">ha</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Tierras productivas georreferenciadas
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Validación de Campo
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1">
            {totalProducers > 0 ? Math.round((validatedCount / totalProducers) * 100) : 0}%
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {validatedCount} de {totalProducers} certificados
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Compatibilidad Power BI
          </span>
          <div className="text-sm font-bold text-slate-900 mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Modelo OData / CSV</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Esquema relacional normalizado
          </span>
        </div>
      </div>

      {/* Main Charts & Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribution by Production (ha) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trees className="w-4 h-4 text-[#27865A]" />
              <span>Superficie por Actividad Productiva (Hectáreas)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Total: {Math.round(totalSurfaceHa)} ha</span>
          </div>

          <div className="space-y-3">
            {sortedActivities.map(([type, item]) => {
              const percent = totalSurfaceHa > 0 ? Math.round((item.surfaceHa / totalSurfaceHa) * 100) : 0;

              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-2 text-slate-800">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-slate-400 text-[11px]">({item.count} chacras)</span>
                    </span>
                    <span className="font-mono text-slate-700 font-bold">
                      {item.surfaceHa} ha <span className="text-slate-400 font-normal">({percent}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percent, 4)}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Producers by Municipality */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#27865A]" />
              <span>Concentración Territorial por Municipio</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{sortedMunicipalities.length} distritos</span>
          </div>

          <div className="space-y-3">
            {sortedMunicipalities.map(([mun, count]) => {
              const barPercent = Math.round((count / maxMunCount) * 100);

              return (
                <div key={mun} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-800 font-semibold">{mun}</span>
                    <span className="font-mono text-slate-700 font-bold">
                      {count} <span className="text-slate-400 font-normal">productor{count === 1 ? '' : 'es'}</span>
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#174C35] rounded-full transition-all duration-500"
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
