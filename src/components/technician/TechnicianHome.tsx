import React, { useState, useEffect } from 'react';
import { Producer, DynamicQuestionnaire, UserProfile } from '../../db/schema';
import { db } from '../../db/dexieDb';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { SurveyWizard } from './SurveyWizard';
import { MisionesMap } from '../map/MisionesMap';
import { 
  PlusCircle, 
  Search, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronRight, 
  User, 
  Building2, 
  Calendar,
  AlertTriangle,
  Map,
  X,
  Phone,
  Filter,
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2
} from 'lucide-react';
import { compressChacraLogo } from '../../utils/imageCompressor';
import { uploadProducerToCloud } from '../../services/firestoreSync';

interface TechnicianHomeProps {
  currentUser: UserProfile;
  onOpenQuestionnaire?: (questionnaire: DynamicQuestionnaire, producer?: Producer) => void;
  onSelectProducerDetail?: (producer: Producer) => void;
  onDataChanged?: () => void;
}

export const TechnicianHome: React.FC<TechnicianHomeProps> = ({
  currentUser,
  onOpenQuestionnaire,
  onSelectProducerDetail,
  onDataChanged
}) => {
  const { state, pendingCount, lastSyncedAt, triggerSync } = useSyncEngine();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [questionnaires, setQuestionnaires] = useState<DynamicQuestionnaire[]>([]);
  const [searchDni, setSearchDni] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'map' | 'questionnaires'>('home');
  const [isSurveyWizardOpen, setIsSurveyWizardOpen] = useState(false);
  const [editingProducer, setEditingProducer] = useState<Producer | null>(null);
  const [selectedProducerModal, setSelectedProducerModal] = useState<Producer | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Load local data from Dexie
  const loadData = async () => {
    try {
      const allProducers = await db.producers.orderBy('updatedAt').reverse().toArray();
      setProducers(allProducers);

      const allQuests = await db.questionnaires.where('status').equals('published').toArray();
      setQuestionnaires(allQuests);
    } catch (e) {
      console.error('Failed to load local technician data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [state]);

  // Sincronización real con Firebase Firestore Cloud
  const handleTechnicianSync = async () => {
    setIsSyncingCloud(true);
    setSyncToast(null);
    try {
      await triggerSync();
      const { syncCloudWithLocal } = await import('../../services/firestoreSync');
      const res = await syncCloudWithLocal();
      await loadData();
      onDataChanged?.();
      setSyncToast(`¡Sincronización ministerial completada! Se respaldaron ${res.total} productores en la nube y ya están visibles para el administrador.`);
      setTimeout(() => setSyncToast(null), 6000);
    } catch (err: any) {
      setSyncToast(`Aviso de sincronización: ${err?.message || 'Los datos permanecen seguros en tu dispositivo.'}`);
      setTimeout(() => setSyncToast(null), 5000);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Exportar respaldo de campo en JSON (ideal para compartir por WhatsApp sin señal)
  const handleExportBackup = () => {
    try {
      const exportData = {
        app: 'SIP MISIONES',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        technician: {
          id: currentUser.id,
          name: currentUser.fullName,
          dni: currentUser.dni
        },
        producersCount: producers.length,
        producers
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIP_Misiones_Relevamientos_${currentUser.dni}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar respaldo', err);
    }
  };

  // Filter producers by DNI or Name
  const filteredProducers = producers.filter((p) => {
    if (!searchDni.trim()) return true;
    const q = searchDni.toLowerCase().trim();
    return p.dni.includes(q) || p.fullName.toLowerCase().includes(q) || p.establishmentName.toLowerCase().includes(q);
  });

  const handleWizardSuccess = async (saved: Producer) => {
    setIsSurveyWizardOpen(false);
    setEditingProducer(null);
    await loadData();
    onDataChanged?.();

    // Intentar sincronizar inmediatamente a la nube en segundo plano
    try {
      const { uploadProducerToCloud } = await import('../../services/firestoreSync');
      await uploadProducerToCloud(saved);
    } catch (e) {
      console.warn('Relevamiento guardado localmente, pendiente de red:', e);
    }
  };

  // Manejo de actualización y subida rápida de logo de chacra
  const handleUpdateProducerLogo = async (producer: Producer, file: File) => {
    setIsUpdatingLogo(true);
    try {
      const compressed = await compressChacraLogo(file, 320);
      const updated: Producer = {
        ...producer,
        logoUrl: compressed,
        updatedAt: new Date().toISOString()
      };
      await db.producers.put(updated);
      setSelectedProducerModal(updated);
      await loadData();
      onDataChanged?.();
      uploadProducerToCloud(updated).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar el logo');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  const handleRemoveProducerLogo = async (producer: Producer) => {
    try {
      const updated: Producer = {
        ...producer,
        logoUrl: '',
        updatedAt: new Date().toISOString()
      };
      await db.producers.put(updated);
      setSelectedProducerModal(updated);
      await loadData();
      onDataChanged?.();
      uploadProducerToCloud(updated).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Error al quitar el logo');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-24 pb-safe space-y-4">
      {/* If Survey Wizard is Open */}
      {isSurveyWizardOpen ? (
        <SurveyWizard
          technicianId={currentUser.id}
          technicianName={currentUser.fullName}
          onCancel={() => {
            setIsSurveyWizardOpen(false);
            setEditingProducer(null);
          }}
          onSuccess={handleWizardSuccess}
          editProducer={editingProducer}
        />
      ) : (
        <div className="space-y-4">
          {/* Technician Welcome & Primary Big Button */}
          <div className="bg-gradient-to-br from-[#174C35] to-[#27865A] text-white p-5 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
            {/* Subtle background motif */}
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-4">
              <svg width="180" height="180" viewBox="0 0 100 100" fill="currentColor">
                <polygon points="50,6 92,38 78,88 22,88 8,38" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-[#E8F2EA] font-semibold">
                  Módulo de Campo · Técnico Zonal
                </span>
                <span className="text-[11px] font-mono bg-white/15 px-2.5 py-0.5 rounded-full text-white">
                  DNI {currentUser.dni}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {currentUser.fullName}
              </h1>

              <p className="text-xs sm:text-sm text-[#E8F2EA]/90 mt-1 max-w-md">
                Zona de relevamiento asignada: Oberá, Campo Viera y Leandro N. Alem. Sistema 100% operativo sin señal.
              </p>

              {/* Big Primary Action: NUEVO PRODUCTOR & Sincronización Real */}
              <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    setEditingProducer(null);
                    setIsSurveyWizardOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white text-[#174C35] hover:bg-[#E8F2EA] font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] transition cursor-pointer min-h-[48px]"
                >
                  <PlusCircle className="w-5 h-5 text-[#27865A]" />
                  <span>NUEVO PRODUCTOR</span>
                </button>

                <button
                  onClick={handleTechnicianSync}
                  disabled={isSyncingCloud}
                  className="w-full sm:w-auto px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                  title="Sincronizar todos los relevamientos con la Nube Ministerial de Firebase"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'Subiendo a la nube...' : `Sincronizar (${pendingCount} pendientes)`}</span>
                </button>

                <button
                  onClick={handleExportBackup}
                  className="w-full sm:w-auto px-3.5 py-3 bg-black/20 hover:bg-black/30 text-white/90 hover:text-white font-medium text-xs rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Descargar copia JSON de los relevamientos para compartir por WhatsApp"
                >
                  <FileText className="w-4 h-4" />
                  <span>Exportar Respaldo</span>
                </button>
              </div>

              {/* Toast banner */}
              {syncToast && (
                <div className="mt-3 p-3 bg-white/95 text-slate-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncToast}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Relevados</span>
              <span className="text-xl font-bold font-mono text-slate-900">{producers.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">en el dispositivo</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Por Enviar</span>
              <span className="text-xl font-bold font-mono text-[#E9A23B]">{pendingCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">esperando red</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Cuestionarios</span>
              <span className="text-xl font-bold font-mono text-[#27865A]">{questionnaires.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">activos offline</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Conectividad</span>
              <span className={`text-xs font-bold block mt-1 ${state === 'OFFLINE' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {state}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sin registro'}
              </span>
            </div>
          </div>

          {/* Navigation Segmented Controls: Lista / Mapa / Cuestionarios */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'home' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Productores ({producers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Mapa de Chacras</span>
            </button>

            <button
              onClick={() => setActiveTab('questionnaires')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'questionnaires' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cuestionarios ({questionnaires.length})</span>
            </button>
          </div>

          {/* TAB 1: Productores y Búsqueda por DNI */}
          {activeTab === 'home' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  placeholder="Buscar por DNI, nombre o chacra..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#27865A] shadow-2xs"
                />
                {searchDni && (
                  <button
                    onClick={() => setSearchDni('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Producers List */}
              <div className="space-y-2">
                {filteredProducers.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No se encontraron productores</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchDni ? `No hay coincidencias para "${searchDni}".` : 'Comience un nuevo relevamiento con el botón arriba.'}
                    </p>
                  </div>
                ) : (
                  filteredProducers.map((prod) => {
                    const isPending = prod.syncStatus === 'pending';
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProducerModal(prod)}
                        className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-[#27865A]/40 transition flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {prod.logoUrl ? (
                            <img
                              src={prod.logoUrl}
                              alt={prod.establishmentName}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#E8F2EA] text-[#174C35]'
                              }`}
                            >
                              {prod.fullName.charAt(0)}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 leading-tight">
                                {prod.fullName}
                              </span>
                              {isPending && (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  Pendiente
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-slate-700">DNI {prod.dni}</span>
                              <span>·</span>
                              <span>{prod.establishmentName}</span>
                              <span>·</span>
                              <span>{prod.municipality}</span>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {prod.activities?.slice(0, 3).map((act) => (
                                <span
                                  key={act.id}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                                >
                                  {act.title}
                                </span>
                              ))}
                              {(prod.activities?.length || 0) > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 text-slate-400">
                                  +{(prod.activities?.length || 0) - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 shrink-0">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Mapa */}
          {activeTab === 'map' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium px-1">
                Visualización satelital y territorial de las chacras relevadas en la provincia:
              </div>
              <MisionesMap
                producers={producers}
                onSelectProducer={(p) => setSelectedProducerModal(p)}
                height="h-[460px]"
              />
            </div>
          )}

          {/* TAB 3: Cuestionarios Disponibles */}
          {activeTab === 'questionnaires' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium px-1">
                Cuestionarios oficiales publicados por el Ministerio para completar en campo:
              </div>

              <div className="space-y-2.5">
                {questionnaires.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#27865A] font-bold">
                          {q.code} · Versión {q.version}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-0.5">{q.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{q.description}</p>
                      </div>

                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                        Offline Ready
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400">
                        {q.questions.length} preguntas dinámicas
                      </span>
                      <button
                        onClick={() => onOpenQuestionnaire?.(q)}
                        className="px-3.5 py-1.5 bg-[#174C35] hover:bg-[#27865A] text-white font-semibold rounded-xl text-xs transition"
                      >
                        Abrir Cuestionario
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Producer Detail Dossier Modal */}
      {selectedProducerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pt-safe pb-safe backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-[#174C35] text-white p-5 flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#E8F2EA] font-semibold">
                  Ficha Territorial del Productor
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedProducerModal.fullName}
                </h3>
                <p className="text-xs text-[#E8F2EA]/90">
                  {selectedProducerModal.establishmentName} · {selectedProducerModal.municipality}
                </p>
              </div>
              <button
                onClick={() => setSelectedProducerModal(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-sm">
              {/* Logo / Marca de la Chacra */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {selectedProducerModal.logoUrl ? (
                    <img
                      src={selectedProducerModal.logoUrl}
                      alt="Logo de la Chacra"
                      className="w-14 h-14 rounded-xl object-cover border border-emerald-300 shadow-xs shrink-0 bg-white"
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
                      {selectedProducerModal.logoUrl ? 'Logo de la Chacra' : 'Sin logo de chacra'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {selectedProducerModal.logoUrl
                        ? 'Identificación visual oficial de la unidad productiva'
                        : 'Podés cargar el logo o distintivo de este establecimiento'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-[#27865A]" />
                    <span>{selectedProducerModal.logoUrl ? 'Cambiar' : 'Subir Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUpdatingLogo}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpdateProducerLogo(selectedProducerModal, file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {selectedProducerModal.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProducerLogo(selectedProducerModal)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      title="Quitar logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">DNI</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProducerModal.dni}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Teléfono</span>
                  <span className="font-medium text-slate-800">{selectedProducerModal.phone || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Superficie Total</span>
                  <span className="font-semibold text-slate-800">{selectedProducerModal.surfaceHa} ha</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Estado de Sincronización</span>
                  <span className="font-semibold capitalize text-[#27865A]">
                    {selectedProducerModal.syncStatus === 'synced' ? 'Sincronizado' : 'Pendiente de envío'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Método Georreferencia</span>
                  <span className="font-semibold text-slate-800">
                    {selectedProducerModal.locationMethod === 'gps_auto' && '📡 GPS del Dispositivo'}
                    {selectedProducerModal.locationMethod === 'manual_map' && '🗺️ Selección en Mapa'}
                    {selectedProducerModal.locationMethod === 'shared_link' && '💬 Enlace WhatsApp/Maps'}
                    {selectedProducerModal.locationMethod === 'manual_coords' && '⌨️ Coordenadas Manuales'}
                    {(!selectedProducerModal.locationMethod || selectedProducerModal.locationMethod === 'not_georeferenced') && '⚠️ Sin georreferenciar'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Capturado Por</span>
                  <span className="font-medium text-slate-800">
                    {selectedProducerModal.locationCapturedBy || selectedProducerModal.createdByName || 'Técnico'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Coordenadas Registradas</span>
                  <span className="font-mono text-slate-800">
                    {selectedProducerModal.isGeolocated !== false ? (
                      `${selectedProducerModal.lat.toFixed(5)}, ${selectedProducerModal.lng.toFixed(5)} (±${selectedProducerModal.gpsAccuracyMeters || 5}m)`
                    ) : (
                      <span className="text-amber-700 font-sans font-medium">Sin coordenadas precisas asignadas</span>
                    )}
                  </span>
                  {selectedProducerModal.originalLocationInput && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      Origen: {selectedProducerModal.originalLocationInput}
                    </span>
                  )}
                </div>
              </div>

              {/* Import source badge if from external database */}
              {selectedProducerModal.importBatchId && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <span className="font-bold block">Importado de base externa</span>
                  <span className="text-[11px] text-blue-700">
                    Archivo: {selectedProducerModal.importSourceFileName || 'Base externa'} {selectedProducerModal.importRowNumber && `· Fila ${selectedProducerModal.importRowNumber}`}
                  </span>
                </div>
              )}

              {/* Activities */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Actividades Productivas Relevadas
                </h4>
                <div className="space-y-2">
                  {selectedProducerModal.activities?.map((a) => (
                    <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{a.title}</span>
                        <span className="font-mono text-[#174C35]">{a.surfaceHa} ha</span>
                      </div>
                      {Object.keys(a.specificData || {}).length > 0 && (
                        <div className="mt-1.5 text-slate-500 space-y-0.5">
                          {Object.entries(a.specificData).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-medium text-slate-700">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              {selectedProducerModal.photoUrls && selectedProducerModal.photoUrls.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Fotografías del Relevamiento
                  </h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedProducerModal.photoUrls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt="Relevamiento"
                        className="w-24 h-24 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  setEditingProducer(selectedProducerModal);
                  setSelectedProducerModal(null);
                  setIsSurveyWizardOpen(true);
                }}
                className="flex-1 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl transition"
              >
                Editar Relevamiento
              </button>
              <button
                onClick={() => setSelectedProducerModal(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
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
