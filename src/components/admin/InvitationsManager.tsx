import React, { useState, useEffect } from 'react';
import { Invitation } from '../../db/schema';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseDb, firebaseFunctions } from '../../services/firebaseClient';
import { 
  Key, 
  Plus, 
  Ban, 
  X
} from 'lucide-react';

export const InvitationsManager: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Invitation form
  const [maxUses, setMaxUses] = useState<number>(5);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [emailAllowed, setEmailAllowed] = useState('');
  const [municipalityIds, setMunicipalityIds] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [oneTimeCode, setOneTimeCode] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      const snap = await getDocs(query(collection(firebaseDb, 'invitations'), orderBy('createdAt', 'desc')));
      const all = snap.docs.map((item) => ({ ...item.data(), id: item.id, code: item.id, status: item.data().status } as Invitation));
      setInvitations(all);
    } catch (e) {
      console.error('Error loading invitations', e);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const created = await httpsCallable(firebaseFunctions, 'createTechnicianInvitation')({ maxUses: Number(maxUses), expiresInDays: Number(expiresInDays), emailAllowed: emailAllowed.trim() || undefined, assignedMunicipalities: municipalityIds.split(',').map((value) => value.trim()).filter(Boolean) });
      const { code, expiresAt } = created.data as { code: string; expiresAt: string };
      setOneTimeCode(code);
      await loadInvitations();
    } catch (err: any) {
      alert(`Error creando invitación: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Desea revocar esta invitación? Ya no podrá ser utilizada para nuevos registros.')) return;
    await httpsCallable(firebaseFunctions, 'revokeTechnicianInvitation')({ invitationId: id });
    loadInvitations();
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-[#27865A]" />
            <span>Sistema de Invitaciones y Accesos Institucionales</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generá enlaces de acceso para sumar técnicos de campo, directores y supervisores sin tocar código.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#174C35] hover:bg-[#27865A] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generar Nueva Invitación</span>
        </button>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Invitación protegida</th>
                <th className="px-4 py-3">Rol Asignado</th>
                <th className="px-4 py-3">Usos / Límite</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No hay invitaciones generadas todavía.
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">Código guardado como hash</code>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">
                          {inv.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <span className="font-bold text-slate-900">{inv.usedCount}</span>
                        <span className="text-slate-400"> / {inv.maxUses}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'activa' && !isExpired
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'utilizada'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isExpired ? 'Vencida' : inv.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'activa' && (
                            <button
                              onClick={() => handleRevoke(inv.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Revocar invitación"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nueva Invitación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#174C35] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#E8F2EA]" />
                <h3 className="font-bold text-base">Generar Invitación de Acceso</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oneTimeCode ? (
              <div className="p-5 space-y-4 text-xs">
                <p className="font-bold text-slate-900">Guardá este código ahora. No se puede recuperar desde el servidor.</p>
                <code className="block break-all rounded-xl bg-slate-100 p-3 font-mono text-sm">{oneTimeCode}</code>
                <button type="button" onClick={() => void navigator.clipboard?.writeText(oneTimeCode)} className="w-full rounded-xl bg-[#174C35] px-3 py-2.5 font-bold text-white">Copiar código</button>
                <button type="button" onClick={() => { setOneTimeCode(null); setIsModalOpen(false); }} className="w-full rounded-xl border px-3 py-2.5 font-semibold">Listo</button>
              </div>
            ) : <form onSubmit={handleCreateInvitation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Rol a Asignar
                </label>
                <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold">TÉCNICO DE CAMPO</div>
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Cantidad de Usos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                    Vigencia (Días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Correo autorizado (opcional)</label>
                <input type="email" value={emailAllowed} onChange={(event) => setEmailAllowed(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" placeholder="tecnico@misiones.gob.ar" />
              </div>
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">Municipios asignados (IDs separados por coma)</label>
                <input value={municipalityIds} onChange={(event) => setMunicipalityIds(event.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" placeholder="obera,campo_viera" />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 py-2.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white font-bold transition shadow-md"
                >
                  {isGenerating ? 'Generando...' : 'Crear Invitación'}
                </button>
              </div>
            </form>}
          </div>
        </div>
      )}
    </div>
  );
};
