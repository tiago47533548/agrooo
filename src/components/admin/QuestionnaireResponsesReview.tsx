import React, { useEffect, useState } from 'react';
import { db } from '../../db/dexieDb';
import { QuestionnaireResponse, UserProfile } from '../../db/schema';
import { syncEngine } from '../../services/syncEngine';
import { CheckCircle2, Eye, RefreshCw } from 'lucide-react';

export const QuestionnaireResponsesReview: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const canReview = ['SUPERADMIN', 'ADMINISTRADOR', 'SUPERVISOR'].includes(currentUser.role);
  const load = async () => {
    setLoading(true);
    try {
      const all = await db.questionnaireResponses.orderBy('updatedAt').reverse().toArray();
      setResponses(all.filter((response) => ['SUPERADMIN', 'ADMINISTRADOR', 'DIRECTOR'].includes(currentUser.role) || currentUser.assignedMunicipalities?.includes(response.municipalityId)));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [currentUser.id]);
  const setStatus = async (response: QuestionnaireResponse, status: 'validated' | 'observed') => {
    const updated = { ...response, status, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const };
    await syncEngine.saveAndEnqueue('questionnaireResponses', updated, 'update');
    setResponses((previous) => previous.map((item) => item.id === response.id ? updated : item));
  };

  return <section className="space-y-4">
    <header className="flex items-center justify-between">
      <div><h2 className="text-lg font-bold text-slate-900">Revisión de respuestas</h2><p className="text-xs text-slate-500">Las respuestas se limitan a tus municipios asignados.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-3.5 w-3.5" />Actualizar</button>
    </header>
    {loading ? <p className="p-6 text-sm text-slate-500">Cargando respuestas...</p> : responses.length === 0 ? <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">No hay respuestas disponibles en la caché de esta cuenta.</p> :
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Cuestionario</th><th className="p-3">Productor</th><th className="p-3">Municipio</th><th className="p-3">Técnico</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead><tbody className="divide-y">
        {responses.map((response) => <tr key={response.id}><td className="p-3">{response.questionnaireTitle} · v{response.questionnaireVersion}</td><td className="p-3">{response.producerName}</td><td className="p-3">{response.municipalityId}</td><td className="p-3">{response.technicianName}</td><td className="p-3">{response.status}{response.syncStatus === 'pending' ? ' · pendiente de sincronizar' : ''}</td><td className="p-3"><div className="flex gap-2">{canReview && <><button onClick={() => void setStatus(response, 'validated')} className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-emerald-800"><CheckCircle2 className="h-3 w-3" />Validar</button><button onClick={() => void setStatus(response, 'observed')} className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-amber-800"><Eye className="h-3 w-3" />Observar</button></>}</div></td></tr>)}
      </tbody></table></div>}
  </section>;
};
