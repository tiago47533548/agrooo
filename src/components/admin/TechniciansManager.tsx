import React, { useState, useEffect } from 'react';
import { UserProfile, Producer } from '../../db/schema';
import { db } from '../../db/dexieDb';
import { collection, getDocs } from 'firebase/firestore';
import { firebaseDb } from '../../services/firebaseClient';
import { MISIONES_MUNICIPALITIES } from '../../db/misionesCatalog';
import { AuthService } from '../../services/authService';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle,
  FileText,
  RefreshCw
} from 'lucide-react';

interface TechniciansManagerProps {
  currentAdmin: UserProfile;
}

export const TechniciansManager: React.FC<TechniciansManagerProps> = ({ currentAdmin }) => {
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [producerCounts, setProducerCounts] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({});

  const loadTechnicians = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(firebaseDb, 'users'));
      const techs = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as UserProfile)).filter((u) => u.role === 'TECNICO');
      setTechnicians(techs);

      // Count surveys for each
      const counts: Record<string, number> = {};
      for (const t of techs) {
        const count = await db.producers
          .where('createdById')
          .equals(t.id)
          .or('createdByName')
          .equalsIgnoreCase(t.fullName)
          .count();
        counts[t.id] = count;
      }
      setProducerCounts(counts);
    } catch (e) {
      console.error('Error loading technicians', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicians();
  }, []);

  const handleApprove = async (tech: UserProfile) => {
    const assignedMunicipalities = assignmentDrafts[tech.id] || [];
    if (!assignedMunicipalities.length) {
      setActionNotice('Elegí al menos un municipio antes de aprobar la cuenta.');
      return;
    }
    const ok = await AuthService.approveTechnician(tech.id, currentAdmin, assignedMunicipalities);
    if (ok) {
      setActionNotice(`Cuenta técnica aprobada para ${tech.fullName}`);
      loadTechnicians();
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleReject = async (tech: UserProfile) => {
    const ok = await AuthService.rejectTechnician(tech.id, currentAdmin);
    if (ok) {
      setActionNotice(`Solicitud rechazada para ${tech.fullName}`);
      loadTechnicians();
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleToggleActive = async (tech: UserProfile) => {
    const nextActive = !tech.active;
    const ok = await AuthService.setTechnicianActive(tech.id, nextActive);
    if (!ok) return;
    setActionNotice(`Estado de ${tech.fullName} actualizado a ${nextActive ? 'Activo' : 'Inactivo'}`);
    loadTechnicians();
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSaveAssignments = async (tech: UserProfile) => {
    const assigned = assignmentDrafts[tech.id] || tech.assignedMunicipalities || [];
    if (!assigned.length) { setActionNotice('Elegí al menos un municipio.'); return; }
    if (await AuthService.setTechnicianAssignments(tech.id, assigned)) {
      setActionNotice(`Asignaciones actualizadas para ${tech.fullName}.`);
      setAssignmentDrafts((previous) => { const next = { ...previous }; delete next[tech.id]; return next; });
      await loadTechnicians();
    }
  };

  const filteredTechnicians = technicians.filter((t) => {
    const status = t.approvalStatus || (t.active ? 'approved' : 'pending');
    if (filterTab === 'pending' && status !== 'pending') return false;
    if (filterTab === 'approved' && status !== 'approved') return false;
    if (filterTab === 'rejected' && status !== 'rejected') return false;

    if (selectedMunicipality !== 'all') {
      const zone = (t.departmentOrZone || t.assignedMunicipalities?.join(' ') || '').toLowerCase();
      if (!zone.includes(selectedMunicipality.toLowerCase())) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.fullName.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.dni.includes(q) ||
        (t.departmentOrZone && t.departmentOrZone.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const pendingCount = technicians.filter(
    (t) => (t.approvalStatus || (t.active ? 'approved' : 'pending')) === 'pending'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Técnicos de Campo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisión del personal territorial, aprobación de nuevas solicitudes y seguimiento de relevamientos.
          </p>
        </div>

        <button
          onClick={loadTechnicians}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition self-start cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar lista</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Técnicos
          </span>
          <span className="text-2xl font-extrabold text-slate-900 font-mono block mt-1">
            {technicians.length}
          </span>
          <span className="text-[11px] text-slate-500">en base provincial</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Solicitudes Pendientes
          </span>
          <span className="text-2xl font-extrabold text-amber-600 font-mono block mt-1">
            {pendingCount}
          </span>
          <span className="text-[11px] text-amber-800">requieren aprobación</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Técnicos Activos
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 font-mono block mt-1">
            {technicians.filter((t) => t.active).length}
          </span>
          <span className="text-[11px] text-emerald-800">habilitados en campo</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Relevamientos
          </span>
          <span className="text-2xl font-extrabold text-[#174C35] font-mono block mt-1">
            {Object.values(producerCounts).reduce((a, b) => a + b, 0)}
          </span>
          <span className="text-[11px] text-slate-500">productores cargados</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, DNI o municipio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174C35]"
            />
          </div>

          {/* Segmented status filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({technicians.length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-800 hover:bg-amber-100'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTab === 'approved' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aprobados
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTab === 'rejected' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rechazados
            </button>
          </div>
        </div>
      </div>

      {/* Technicians List / Cards */}
      <div className="space-y-3">
        {filteredTechnicians.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No se encontraron técnicos para los criterios seleccionados.
          </div>
        ) : (
          filteredTechnicians.map((t) => {
            const status = t.approvalStatus || (t.active ? 'approved' : 'pending');
            const surveyCount = producerCounts[t.id] || 0;
            const selectedAssignments = assignmentDrafts[t.id] || t.assignedMunicipalities || t.requestedMunicipalities || [];

            return (
              <div
                key={t.id}
                className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Tech Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {t.fullName}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        status === 'approved' && t.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {status === 'approved' && t.active
                        ? 'Activo / Aprobado'
                        : status === 'pending'
                        ? 'Pendiente de Aprobación'
                        : status === 'rejected'
                        ? 'Rechazado'
                        : 'Inactivo'}
                    </span>

                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      DNI {t.dni}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {t.email}
                    </span>

                    {t.phone && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {t.phone}
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {t.assignedMunicipalities?.map((id) => MISIONES_MUNICIPALITIES.find((municipality) => municipality.id === id)?.name || id).join(', ') || t.departmentOrZone || 'Sin municipios asignados'}
                    </span>
                  </div>
                </div>

                {/* Metrics & Actions */}
                <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <div className="text-right px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Relevados</span>
                    <span className="text-sm font-extrabold font-mono text-[#174C35]">{surveyCount}</span>
                  </div>

                  {status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-600">Municipios autorizados
                        <select multiple value={selectedAssignments} onChange={(event) => setAssignmentDrafts((previous) => ({ ...previous, [t.id]: Array.from(event.target.selectedOptions, (option) => option.value) }))} className="mt-1 block w-40 min-h-20 rounded-lg border border-slate-200 p-1 text-[10px]">
                          {MISIONES_MUNICIPALITIES.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
                        </select>
                      </label>
                      <button
                        onClick={() => handleApprove(t)}
                        className="px-3.5 py-2 bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Aprobar</span>
                      </button>

                      <button
                        onClick={() => handleReject(t)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-slate-600">Municipios asignados
                      <select multiple value={selectedAssignments} onChange={(event) => setAssignmentDrafts((previous) => ({ ...previous, [t.id]: Array.from(event.target.selectedOptions, (option) => option.value) }))} className="mt-1 block w-40 min-h-20 rounded-lg border border-slate-200 p-1 text-[10px]">
                        {MISIONES_MUNICIPALITIES.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}
                      </select>
                    </label>
                    <button onClick={() => handleSaveAssignments(t)} className="px-3 py-2 rounded-xl bg-blue-100 text-blue-800 text-xs font-bold">Guardar asignaciones</button>
                    <button
                      onClick={() => handleToggleActive(t)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        t.active
                          ? 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {t.active ? 'Desactivar' : 'Activar Cuenta'}
                    </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
