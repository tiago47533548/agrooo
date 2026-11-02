import React, { useState, useEffect } from 'react';
import { Invitation, UserRole } from '../../db/schema';
import { db } from '../../db/dexieDb';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Share2, 
  Calendar, 
  Users, 
  Trash2, 
  Ban, 
  ExternalLink,
  MessageCircle,
  X
} from 'lucide-react';

interface InvitationsManagerProps {
  currentUserId: string;
  currentUserName: string;
}

export const InvitationsManager: React.FC<InvitationsManagerProps> = ({
  currentUserId,
  currentUserName
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Invitation form
  const [role, setRole] = useState<UserRole>('TECNICO');
  const [customCode, setCustomCode] = useState('');
  const [maxUses, setMaxUses] = useState<number>(5);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loadInvitations = async () => {
    try {
      const all = await db.invitations.orderBy('createdAt').reverse().toArray();
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
      const generatedCode = customCode.trim() 
        ? customCode.trim().toUpperCase() 
        : `SIP-${role.substring(0, 3)}-${Date.now().toString().slice(-4)}`;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + Number(expiresInDays));

      const newInv: Invitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: generatedCode,
        role,
        maxUses: Number(maxUses),
        usedCount: 0,
        expiresAt: expiryDate.toISOString(),
        status: 'activa',
        createdBy: currentUserId,
        createdByName: currentUserName,
        createdAt: new Date().toISOString(),
        notes: notes.trim()
      };

      await db.invitations.put(newInv);
      await loadInvitations();
      setIsModalOpen(false);
      setCustomCode('');
      setNotes('');
    } catch (err: any) {
      alert(`Error creando invitación: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Desea revocar esta invitación? Ya no podrá ser utilizada para nuevos registros.')) return;
    await db.invitations.update(id, { status: 'revocada' });
    loadInvitations();
  };

  const getInviteLink = (code: string) => {
    return `${window.location.origin}/registro/${code}`;
  };

  const copyLink = (inv: Invitation) => {
    const link = getInviteLink(inv.code);
    navigator.clipboard?.writeText(link);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareWhatsApp = (inv: Invitation) => {
    const link = getInviteLink(inv.code);
    const text = encodeURIComponent(
      `Hola! Te comparto la invitación oficial para acceder a SIP Misiones (Ministerio del Agro y la Producción) con rol de ${inv.role}.\n\nAccedé aquí: ${link}\nCódigo: ${inv.code}\nValidez: hasta ${new Date(inv.expiresAt).toLocaleDateString()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
                <th className="px-4 py-3">Código & Enlace</th>
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
                  const isCopied = copiedId === inv.id;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {inv.code}
                          </code>
                          <button
                            onClick={() => copyLink(inv)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                            title="Copiar enlace directo"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {inv.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {inv.notes}
                          </div>
                        )}
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
                          <button
                            onClick={() => shareWhatsApp(inv)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Compartir por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

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

            <form onSubmit={handleCreateInvitation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Rol a Asignar
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-[#27865A] bg-white"
                >
                  <option value="TECNICO">TÉCNICO DE CAMPO (Relevamiento y GPS)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Control de Avances y Validación)</option>
                  <option value="DIRECTOR">DIRECTOR (Visualización, Mapas y Reportes)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Gestión Completa)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Control Total del Sistema)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Código Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))}
                  placeholder="Ej: TECNICO-SAN-VICENTE-2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:ring-2 focus:ring-[#27865A]"
                />
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
                <label className="block text-slate-700 font-bold uppercase tracking-wider mb-1">
                  Notas de Referencia
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Convocatoria técnicos zona centro"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
