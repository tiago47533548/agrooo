import React, { useState } from 'react';
import { DynamicQuestionnaire, DynamicQuestion, QuestionType, ProductiveActivityType } from '../../db/schema';
import { PRODUCTIVE_ACTIVITIES_CATALOG } from '../../db/misionesCatalog';
import { db } from '../../db/dexieDb';
import { 
  Plus, 
  Trash2, 
  Save, 
  Share2, 
  Eye, 
  CheckCircle2, 
  FileText, 
  ArrowLeft, 
  Copy, 
  Check,
  Layers,
  Sparkles
} from 'lucide-react';

interface QuestionnaireBuilderProps {
  onCancel: () => void;
  onSuccess: (saved: DynamicQuestionnaire) => void;
  existingQuestionnaire?: DynamicQuestionnaire | null;
}

export const QuestionnaireBuilder: React.FC<QuestionnaireBuilderProps> = ({
  onCancel,
  onSuccess,
  existingQuestionnaire = null
}) => {
  const [title, setTitle] = useState(existingQuestionnaire?.title || '');
  const [code, setCode] = useState(existingQuestionnaire?.code || `CUEST-${Date.now().toString().slice(-4)}`);
  const [description, setDescription] = useState(existingQuestionnaire?.description || '');
  const [category, setCategory] = useState<any>(existingQuestionnaire?.category || 'yerba_mate');
  const [status, setStatus] = useState<'draft' | 'published'>(existingQuestionnaire?.status === 'published' ? 'published' : 'published');
  const [questions, setQuestions] = useState<DynamicQuestion[]>(
    existingQuestionnaire?.questions || [
      {
        id: `q_${Date.now()}_1`,
        label: 'Superficie cultivada en la presente campaña',
        type: 'number',
        required: true,
        unit: 'hectáreas'
      },
      {
        id: `q_${Date.now()}_2`,
        label: 'Sistema de manejo agronómico implementado',
        type: 'select',
        required: true,
        options: ['Convencional con labranza', 'Agroecológico con cubiertas', 'Orgánico certificado']
      }
    ]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Add new question
  const handleAddQuestion = () => {
    const newQ: DynamicQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: 'Nueva pregunta del relevamiento',
      type: 'text',
      required: true,
      unit: ''
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<DynamicQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      alert('Por favor ingrese el título del cuestionario.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentVersion = existingQuestionnaire ? existingQuestionnaire.version + 1 : 1;
      
      const questionnaireRecord: DynamicQuestionnaire = {
        id: existingQuestionnaire?.id || `quest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        category,
        version: currentVersion,
        status: publish ? 'published' : status,
        questions,
        publishedAt: publish ? now : existingQuestionnaire?.publishedAt,
        createdAt: existingQuestionnaire?.createdAt || now,
        updatedAt: now
      };

      await db.questionnaires.put(questionnaireRecord);

      // Notification
      await db.notifications.add({
        id: `notif_${Date.now()}`,
        title: `Cuestionario Actualizado: ${questionnaireRecord.title}`,
        message: `Versión ${questionnaireRecord.version} publicada y disponible offline para todos los técnicos de campo.`,
        type: 'form',
        targetRoles: ['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR', 'DIRECTOR'],
        read: false,
        createdAt: now
      });

      onSuccess(questionnaireRecord);
    } catch (e: any) {
      alert(`Error al guardar cuestionario: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const directLink = `${window.location.origin}/formulario/${code}`;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden my-3">
      {/* Header */}
      <div className="bg-[#174C35] text-white p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Cuestionarios
          </button>
          <span className="text-xs font-mono bg-white/15 px-3 py-1 rounded-full text-[#E8F2EA]">
            Constructor Visual Dinámico
          </span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white">
          {existingQuestionnaire ? 'Editar Cuestionario Dinámico' : 'Crear Nuevo Cuestionario Territorial'}
        </h2>
        <p className="text-xs text-[#E8F2EA]/90 mt-1">
          Las preguntas agregadas aquí se sincronizan automáticamente a la app móvil de los técnicos sin necesidad de actualizar código ni compilar la aplicación.
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Basic Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título del Cuestionario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Relevamiento Integral de Yerba Mate y Suelos"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-[#27865A] bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Código Único (para Enlaces)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))}
              placeholder="Ej: RELEV-YERBA-2026"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:ring-2 focus:ring-[#27865A] bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción / Objetivo Agronómico
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Diagnóstico de manejo del suelo, cubiertas verdes y rendimiento de zafra"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Categoría Productiva
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white font-medium"
            >
              <option value="general">General Agropecuario</option>
              {PRODUCTIVE_ACTIVITIES_CATALOG.map((c) => (
                <option key={c.type} value={c.type}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shareable Link Bar */}
        <div className="p-3 bg-[#E8F2EA]/60 border border-[#27865A]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#27865A]" />
            <span className="font-semibold text-[#174C35]">Enlace Directo para Técnicos / WhatsApp:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-[#27865A]/20 font-mono text-slate-700">
              {directLink}
            </code>
          </div>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(directLink);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1 bg-white hover:bg-slate-50 text-[#174C35] font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
          </button>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#27865A]" />
              <span>Preguntas y Campos del Formulario ({questions.length})</span>
            </h3>

            <button
              onClick={handleAddQuestion}
              className="px-3.5 py-1.5 bg-[#27865A] hover:bg-[#174C35] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Pregunta</span>
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Pregunta #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={q.label}
                      onChange={(e) => handleUpdateQuestion(q.id, { label: e.target.value })}
                      placeholder="Escriba la pregunta aquí..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-1 focus:ring-[#27865A]"
                    />
                  </div>

                  <div className="w-44 shrink-0">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tipo de Campo
                    </label>
                    <select
                      value={q.type}
                      onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-1 focus:ring-[#27865A]"
                    >
                      <option value="text">Texto Libre</option>
                      <option value="number">Número / Cantidad</option>
                      <option value="select">Selección Única</option>
                      <option value="boolean">Sí / No</option>
                      <option value="date">Fecha</option>
                      <option value="photo">Fotografía</option>
                      <option value="coordinates">Coordenadas GPS</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition mt-5 shrink-0"
                    title="Eliminar pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Unit if number */}
                  {q.type === 'number' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Unidad de Medida
                      </label>
                      <input
                        type="text"
                        value={q.unit || ''}
                        onChange={(e) => handleUpdateQuestion(q.id, { unit: e.target.value })}
                        placeholder="Ej: kg/ha, hectáreas, plantas"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  )}

                  {/* Options if select */}
                  {q.type === 'select' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Opciones de Selección (separadas por coma)
                      </label>
                      <input
                        type="text"
                        value={q.options?.join(', ') || ''}
                        onChange={(e) => {
                          const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                          handleUpdateQuestion(q.id, { options: opts });
                        }}
                        placeholder="Opción 1, Opción 2, Opción 3"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  )}

                  {/* Required Toggle */}
                  <div className="flex items-center gap-2 self-end pb-1.5">
                    <input
                      type="checkbox"
                      id={`req_${q.id}`}
                      checked={q.required}
                      onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                      className="w-4 h-4 text-[#27865A] rounded"
                    />
                    <label htmlFor={`req_${q.id}`} className="font-semibold text-slate-700 cursor-pointer">
                      Campo Obligatorio
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Guardar Borrador
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E8F2EA]" />
            {isSaving ? 'Publicando...' : 'Publicar y Sincronizar a Campo'}
          </button>
        </div>
      </div>
    </div>
  );
};
