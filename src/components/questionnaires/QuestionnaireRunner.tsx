import React, { useState } from 'react';
import { DynamicQuestionnaire, Producer, QuestionnaireResponse } from '../../db/schema';
import { db } from '../../db/dexieDb';
import { syncEngine } from '../../services/syncEngine';
import { 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  Camera, 
  AlertCircle, 
  Save, 
  MapPin, 
  Check, 
  Clock,
  User
} from 'lucide-react';

interface QuestionnaireRunnerProps {
  questionnaire: DynamicQuestionnaire;
  producers: Producer[];
  preselectedProducer?: Producer | null;
  technicianId: string;
  technicianName: string;
  onClose: () => void;
  onSuccess: (response: QuestionnaireResponse) => void;
}

export const QuestionnaireRunner: React.FC<QuestionnaireRunnerProps> = ({
  questionnaire,
  producers,
  preselectedProducer,
  technicianId,
  technicianName,
  onClose,
  onSuccess
}) => {
  const [selectedProducerId, setSelectedProducerId] = useState<string>(
    preselectedProducer?.id || producers[0]?.id || ''
  );
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProducer = producers.find((p) => p.id === selectedProducerId) || preselectedProducer;

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handlePhotoCapture = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      handleAnswerChange(questionId, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!selectedProducer) {
      alert('Por favor seleccione un productor para vincular el relevamiento.');
      return;
    }

    // Validate required questions if not draft
    if (!isDraft) {
      for (const q of questionnaire.questions) {
        if (q.required && (answers[q.id] === undefined || answers[q.id] === '')) {
          alert(`La pregunta "${q.label}" es obligatoria.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const responseRecord: QuestionnaireResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        questionnaireId: questionnaire.id,
        questionnaireVersion: questionnaire.version,
        questionnaireTitle: questionnaire.title,
        producerId: selectedProducer.id,
        producerDni: selectedProducer.dni,
        producerName: selectedProducer.fullName,
        technicianId,
        technicianName,
        answers,
        status: isDraft ? 'draft' : 'completed',
        observations,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending'
      };

      // Save to IndexedDB
      await db.questionnaireResponses.put(responseRecord);

      // Enqueue to syncQueue
      await syncEngine.enqueue(
        'questionnaire_responses',
        'insert',
        responseRecord.id,
        responseRecord
      );

      // Audit log
      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        userId: technicianId,
        userName: technicianName,
        userRole: 'TECNICO',
        action: 'SUBMIT_QUESTIONNAIRE_RESPONSE',
        entity: 'questionnaire_responses',
        entityId: responseRecord.id,
        details: `Cuestionario "${questionnaire.title}" completado para ${selectedProducer.fullName} (DNI ${selectedProducer.dni})`,
        device: 'PWA Mobile / Field',
        timestamp: now
      });

      onSuccess(responseRecord);
    } catch (e: any) {
      alert(`Error al guardar respuesta: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden my-3">
      {/* Header */}
      <div className="bg-[#174C35] text-white p-5">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <span className="text-[11px] font-mono bg-white/15 px-2.5 py-0.5 rounded-full text-[#E8F2EA]">
            {questionnaire.code} · v{questionnaire.version}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          {questionnaire.title}
        </h2>
        <p className="text-xs text-[#E8F2EA]/90 mt-1">{questionnaire.description}</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Producer Selection */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Productor Asignado a este Relevamiento
          </label>
          <select
            value={selectedProducerId}
            onChange={(e) => setSelectedProducerId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:ring-2 focus:ring-[#27865A] focus:outline-none"
          >
            {producers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — DNI {p.dni} ({p.establishmentName}, {p.municipality})
              </option>
            ))}
          </select>

          {selectedProducer && (
            <div className="text-xs text-slate-500 pt-1 flex items-center gap-3">
              <span>Superficie: <strong className="text-slate-800">{selectedProducer.surfaceHa} ha</strong></span>
              <span>·</span>
              <span>Municipio: <strong className="text-slate-800">{selectedProducer.municipality}</strong></span>
            </div>
          )}
        </div>

        {/* Dynamic Questions List */}
        <div className="space-y-4">
          {questionnaire.questions.map((q, idx) => {
            const currentVal = answers[q.id];

            return (
              <div key={q.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-start justify-between">
                  <label className="text-xs font-bold text-slate-900 leading-snug">
                    <span className="text-[#27865A] mr-1">{idx + 1}.</span> {q.label}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {q.unit && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {q.unit}
                    </span>
                  )}
                </div>

                {/* TEXT INPUT */}
                {q.type === 'text' && (
                  <input
                    type="text"
                    value={currentVal || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Escriba la respuesta..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-[#27865A]"
                  />
                )}

                {/* NUMBER INPUT */}
                {q.type === 'number' && (
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="any"
                      value={currentVal ?? ''}
                      onChange={(e) => handleAnswerChange(q.id, Number(e.target.value))}
                      placeholder="Ingrese valor numérico"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-[#27865A]"
                    />
                    {q.unit && (
                      <span className="absolute right-3 text-xs text-slate-400 font-mono">
                        {q.unit}
                      </span>
                    )}
                  </div>
                )}

                {/* SELECT INPUT */}
                {q.type === 'select' && (
                  <select
                    value={currentVal || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-[#27865A]"
                  >
                    <option value="">Seleccione una opción...</option>
                    {q.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* BOOLEAN INPUT */}
                {q.type === 'boolean' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(q.id, true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        currentVal === true
                          ? 'bg-[#E8F2EA] border-[#27865A] text-[#174C35]'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(q.id, false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        currentVal === false
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}

                {/* PHOTO INPUT */}
                {q.type === 'photo' && (
                  <div className="space-y-2">
                    {currentVal ? (
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200">
                        <img src={currentVal} alt="Foto cargada" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, null)}
                          className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#27865A] cursor-pointer bg-slate-50 text-xs font-medium text-slate-600 transition">
                        <Camera className="w-4 h-4 text-[#27865A]" />
                        <span>Capturar o adjuntar fotografía</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhotoCapture(q.id, e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Observations */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Observaciones del Técnico
          </label>
          <textarea
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Anotaciones cualitativas sobre las respuestas..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-[#27865A]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Borrador
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
          >
            <CheckCircle className="w-4 h-4 text-[#E8F2EA]" />
            {isSubmitting ? 'Guardando...' : 'Completar Relevamiento'}
          </button>
        </div>
      </div>
    </div>
  );
};
