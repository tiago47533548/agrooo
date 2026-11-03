import React, { useState } from 'react';
import { ProtectedImage } from '../common/ProtectedImage';
import { Producer, ProductiveActivityType } from '../../db/schema';
import { PRODUCTIVE_ACTIVITIES_CATALOG, MISIONES_MUNICIPALITIES } from '../../db/misionesCatalog';
import { db } from '../../db/dexieDb';
import { 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  Printer, 
  MapPin, 
  Eye, 
  CheckCircle, 
  Clock, 
  User, 
  X,
  ShieldCheck,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2
} from 'lucide-react';
import { compressChacraLogo } from '../../utils/imageCompressor';
import { resolveProducerConflict, uploadProducerToCloud } from '../../services/firestoreSync';

interface ProducersListProps {
  currentUser: import('../../db/schema').UserProfile;
  producers: Producer[];
  onRefresh: () => void;
  onOpenMapLocation?: (producer: Producer) => void;
  onEditProducer?: (producer: Producer) => void;
}

export const ProducersList: React.FC<ProducersListProps> = ({
  currentUser,
  producers,
  onRefresh,
  onOpenMapLocation,
  onEditProducer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedGeoFilter, setSelectedGeoFilter] = useState<'all' | 'geolocated' | 'not_geolocated'>('all');
  const [selectedProducerModal, setSelectedProducerModal] = useState<Producer | null>(null);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  // Subir o actualizar logo de chacra desde el panel administrador
  const handleUpdateLogo = async (producer: Producer, file: File) => {
    setIsUpdatingLogo(true);
    try {
      const compressed = await compressChacraLogo(file, 320);
      const updated: Producer = {
        ...producer,
        logoUrl: compressed,
        updatedAt: new Date().toISOString()
      };
      await uploadProducerToCloud(updated);
      setSelectedProducerModal(updated);
      onRefresh();
      // Sincronizar en la nube inmediatamente
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar el logo');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const handleRemoveLogo = async (producer: Producer) => {
    try {
      const updated: Producer = {
        ...producer,
        logoUrl: '',
        updatedAt: new Date().toISOString()
      };
      await uploadProducerToCloud(updated);
      setSelectedProducerModal(updated);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al quitar el logo');
    }
  };

  // Filter producers
  const filtered = producers.filter((p) => {
    if (selectedMunicipality !== 'all' && p.municipality.toLowerCase() !== selectedMunicipality.toLowerCase()) {
      return false;
    }
    if (selectedActivity !== 'all') {
      const hasAct = p.activities?.some((a) => a.type === selectedActivity);
      if (!hasAct) return false;
    }
    if (selectedGeoFilter === 'geolocated' && (p.lat === undefined || p.lat === null)) {
      return false;
    }
    if (selectedGeoFilter === 'not_geolocated' && (p.lat !== undefined && p.lat !== null && !isNaN(p.lat))) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.fullName.toLowerCase().includes(q);
      const matchDni = p.dni.includes(q);
      const matchEst = p.establishmentName.toLowerCase().includes(q);
      if (!matchName && !matchDni && !matchEst) return false;
    }
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'DNI',
      'Nombre y Apellido',
      'Municipio',
      'Chacra / Establecimiento',
      'Superficie (ha)',
      'Latitud',
      'Longitud',
      'Actividades',
      'Técnico Responsable',
      'Fecha Relevamiento'
    ];

    const rows = filtered.map((p) => [
      p.dni,
      `"${p.fullName}"`,
      `"${p.municipality}"`,
      `"${p.establishmentName}"`,
      p.surfaceHa,
      p.lat,
      p.lng,
      `"${p.activities?.map((a) => a.title).join('; ') || ''}"`,
      `"${p.createdByName}"`,
      p.createdAt.split('T')[0]
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIP_Misiones_Productores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Supervisor validation
  const handleToggleValidation = async (producer: Producer) => {
    const updated = !producer.verifiedBySupervisor;
    if (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMINISTRADOR') return;
    const next = { ...producer, verifiedBySupervisor: updated, updatedAt: new Date().toISOString() };
    await uploadProducerToCloud(next);
    setSelectedProducerModal((prev) => (prev ? { ...prev, verifiedBySupervisor: updated } : null));
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por DNI, productor o chacra..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#27865A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Municipality Selector */}
          <select
            value={selectedMunicipality}
            onChange={(e) => setSelectedMunicipality(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#27865A]"
          >
            <option value="all">Todos los Municipios</option>
            {MISIONES_MUNICIPALITIES.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Activity Selector */}
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#27865A]"
          >
            <option value="all">Todas las Producciones</option>
            {PRODUCTIVE_ACTIVITIES_CATALOG.map((a) => (
              <option key={a.type} value={a.type}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Georeference Status Selector */}
          <select
            value={selectedGeoFilter}
            onChange={(e) => setSelectedGeoFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#27865A]"
          >
            <option value="all">Georreferenciación (Todos)</option>
            <option value="geolocated">Con Coordenadas GPS</option>
            <option value="not_geolocated">Sin Geolocalizar</option>
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Exportar a CSV compatible con Excel y Power BI"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#27865A]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Productor / DNI</th>
                <th className="px-4 py-3">Chacra / Paraje</th>
                <th className="px-4 py-3">Municipio</th>
                <th className="px-4 py-3">Superficie</th>
                <th className="px-4 py-3">Actividades Principales</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No se encontraron productores registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => (
                  <tr
                    key={prod.id}
                    onClick={() => setSelectedProducerModal(prod)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{prod.fullName}</span>
                        {(!prod.lat || isNaN(prod.lat)) && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                            Sin GPS
                          </span>
                        )}
                        {prod.importBatchId && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-200">
                            Importado
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-slate-500 text-[11px]">DNI {prod.dni}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {prod.logoUrl ? (
                          <ProtectedImage
                            src={prod.logoUrl}
                            alt={prod.establishmentName}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : null}
                        <div>
                          <div className="font-medium text-slate-800 leading-tight">{prod.establishmentName}</div>
                          <div className="text-slate-400 text-[11px] truncate max-w-xs">{prod.colonyParaje}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">{prod.municipality}</span>
                    </td>

                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      {prod.surfaceHa} ha
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {prod.activities?.slice(0, 2).map((a) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded-md bg-[#E8F2EA] text-[#174C35] font-medium text-[10px]"
                          >
                            {a.title}
                          </span>
                        ))}
                        {(prod.activities?.length || 0) > 2 && (
                          <span className="text-[10px] text-slate-400 px-1 py-0.5">
                            +{(prod.activities?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {prod.createdByName}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProducerModal(prod);
                        }}
                        className="p-1.5 text-[#27865A] hover:bg-[#E8F2EA] rounded-lg transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Producer Full Dossier Modal */}
      {selectedProducerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-[#174C35] text-white p-5 flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#E8F2EA] font-semibold">
                  Ficha Oficial del Productor Agropecuario
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedProducerModal.fullName}
                </h3>
                <p className="text-xs text-[#E8F2EA]/90">
                  {selectedProducerModal.establishmentName} · {selectedProducerModal.municipality} (DNI {selectedProducerModal.dni})
                </p>
              </div>
              <button
                onClick={() => setSelectedProducerModal(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto text-xs">
              {/* Logo o Marca de la Chacra */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  {selectedProducerModal.logoUrl ? (
                    <ProtectedImage
                      src={selectedProducerModal.logoUrl}
                      alt="Logo de la Chacra"
                      className="w-14 h-14 rounded-xl object-cover border border-emerald-300 shadow-2xs shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white border border-dashed border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                      {isUpdatingLogo ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#27865A]" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-emerald-500" />
                      )}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {selectedProducerModal.logoUrl ? 'Logo o Distintivo de la Chacra' : 'Sin logo de chacra asignado'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {selectedProducerModal.logoUrl
                        ? 'Imagen oficial del establecimiento productivo'
                        : 'Permite cargar el logo o foto representativa de la chacra'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-[#27865A]" />
                    <span>{selectedProducerModal.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUpdatingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpdateLogo(selectedProducerModal, file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {selectedProducerModal.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLogo(selectedProducerModal)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      title="Quitar logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Validation Status */}
              {selectedProducerModal.syncConflict && (
                <div className="p-4 rounded-2xl border border-orange-300 bg-orange-50 space-y-2">
                  <strong className="text-orange-900">Conflicto de sincronización</strong>
                  <p className="text-orange-800">Este productor cambió en otro dispositivo. Elija qué versión conservar.</p>
                  <div className="flex gap-2">
                    <button onClick={async () => { await resolveProducerConflict(selectedProducerModal.id, 'cloud'); setSelectedProducerModal(null); onRefresh(); }} className="px-3 py-2 rounded-lg bg-white border border-orange-300 text-orange-900 font-semibold">Usar versión de Firebase</button>
                    <button onClick={async () => { await resolveProducerConflict(selectedProducerModal.id, 'local'); setSelectedProducerModal(null); onRefresh(); }} className="px-3 py-2 rounded-lg bg-orange-700 text-white font-semibold">Conservar versión local</button>
                  </div>
                </div>
              )}
              {/* Validation Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-5 h-5 ${selectedProducerModal.verifiedBySupervisor ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {selectedProducerModal.verifiedBySupervisor ? 'Relevamiento Validado por Supervisión' : 'Pendiente de Validación'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Relevado por {selectedProducerModal.createdByName} el {new Date(selectedProducerModal.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {(currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMINISTRADOR') && <button
                  onClick={() => handleToggleValidation(selectedProducerModal)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    selectedProducerModal.verifiedBySupervisor
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-[#27865A] text-white hover:bg-[#174C35]'
                  }`}
                >
                  {selectedProducerModal.verifiedBySupervisor ? 'Desmarcar' : 'Validar Relevamiento'}
                </button>}
              </div>

              {/* Geo & Land details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Municipio:</span>
                  <span className="font-semibold text-slate-800">{selectedProducerModal.municipality}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Colonia / Paraje:</span>
                  <span className="font-semibold text-slate-800">{selectedProducerModal.colonyParaje}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Superficie Total:</span>
                  <span className="font-bold font-mono text-slate-900">{selectedProducerModal.surfaceHa} ha</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tenencia:</span>
                  <span className="capitalize text-slate-800">{selectedProducerModal.tenureType?.replace(/_/g, ' ') || 'No informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Método Georreferencia:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedProducerModal.locationMethod === 'gps_auto' && '📡 GPS del Dispositivo'}
                    {selectedProducerModal.locationMethod === 'manual_map' && '🗺️ Selección en Mapa'}
                    {selectedProducerModal.locationMethod === 'shared_link' && '💬 Enlace WhatsApp/Maps'}
                    {selectedProducerModal.locationMethod === 'manual_coords' && '⌨️ Coordenadas Manuales'}
                    {(!selectedProducerModal.locationMethod || selectedProducerModal.locationMethod === 'not_georeferenced') && '⚠️ Sin georreferenciar'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Captura Geográfica:</span>
                  <span className="text-slate-700">
                    {selectedProducerModal.locationCapturedBy || selectedProducerModal.createdByName || 'Técnico'}
                    {selectedProducerModal.locationCapturedAt ? ` (${new Date(selectedProducerModal.locationCapturedAt).toLocaleDateString()})` : ''}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-400 block text-[10px]">Coordenadas Registradas:</span>
                  <span className="font-mono text-slate-800">
                    {selectedProducerModal.isGeolocated !== false ? (
                      Number.isFinite(selectedProducerModal.lat) && Number.isFinite(selectedProducerModal.lng) ? `${selectedProducerModal.lat!.toFixed(6)}, ${selectedProducerModal.lng!.toFixed(6)}${selectedProducerModal.gpsAccuracyMeters != null ? ` (±${selectedProducerModal.gpsAccuracyMeters}m)` : ''}` : 'Sin coordenadas registradas'
                    ) : (
                      <span className="text-amber-700 font-sans font-medium">Sin coordenadas precisas asignadas</span>
                    )}
                  </span>
                  {selectedProducerModal.originalLocationInput && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      Entrada original: {selectedProducerModal.originalLocationInput}
                    </span>
                  )}
                </div>
              </div>

              {/* Import Traceability Info if imported from external dataset */}
              {selectedProducerModal.importBatchId && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-800 shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-blue-950 block text-xs">Registro Importado de Base Externa</span>
                    <p className="text-[11px] text-blue-800 mt-0.5">
                      Archivo: <span className="font-mono font-medium">{selectedProducerModal.importSourceFileName || 'Archivo'}</span>
                      {selectedProducerModal.importRowNumber && ` · Fila ${selectedProducerModal.importRowNumber}`}
                      {selectedProducerModal.importSheetName && ` · Hoja "${selectedProducerModal.importSheetName}"`}
                    </p>
                    <span className="text-[10px] text-blue-600 block mt-0.5 font-mono">
                      Lote ID: {selectedProducerModal.importBatchId}
                    </span>
                  </div>
                </div>
              )}

              {/* Activities */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Actividades Productivas
                </h4>
                <div className="space-y-2">
                  {selectedProducerModal.activities?.map((a) => (
                    <div key={a.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{a.title}</span>
                        <span className="font-mono text-[#27865A]">{a.surfaceHa} ha</span>
                      </div>
                      {Object.keys(a.specificData || {}).length > 0 && (
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                          {Object.entries(a.specificData).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}: </span>
                              <span className="font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Infrastructure */}
              {selectedProducerModal.infrastructure && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Infraestructura y Condiciones
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Energía:</span>
                      <p className="font-medium text-slate-800 capitalize">
                        {selectedProducerModal.infrastructure.electricity.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Caminos:</span>
                      <p className="font-medium text-slate-800 capitalize">
                        {selectedProducerModal.infrastructure.roadAccess.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Saneamiento:</span>
                      <p className="font-medium text-slate-800 capitalize">
                        {selectedProducerModal.infrastructure.sanitation.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Fuentes de Agua:</span>
                      <p className="font-medium text-slate-800">
                        {selectedProducerModal.infrastructure.waterSource.map((w) => w.replace(/_/g, ' ')).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photos */}
              {selectedProducerModal.photoUrls && selectedProducerModal.photoUrls.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                    Fotografías Adjuntas
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedProducerModal.photoUrls.map((p, idx) => (
                      <ProtectedImage
                        key={idx}
                        src={p}
                        alt="Relevamiento"
                        className="w-28 h-28 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (onOpenMapLocation) {
                    onOpenMapLocation(selectedProducerModal);
                    setSelectedProducerModal(null);
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <MapPin className="w-4 h-4 text-[#27865A]" />
                <span>Ver en Mapa</span>
              </button>

              <button
                onClick={() => setSelectedProducerModal(null)}
                className="px-5 py-2 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
