import React, { useState, useEffect } from 'react';
import { ProtectedImage } from '../common/ProtectedImage';
import { 
  Producer, 
  ProductiveActivity, 
  Infrastructure, 
  ProductiveActivityType,
  ProducerType 
} from '../../db/schema';
import { 
  PRODUCTIVE_ACTIVITIES_CATALOG, 
  MISIONES_MUNICIPALITIES, 
  ActivityCatalogItem 
} from '../../db/misionesCatalog';
import { db } from '../../db/dexieDb';
import { municipalityId } from '../../utils/municipality';
import { syncEngine } from '../../services/syncEngine';
import { MisionesMap } from '../map/MisionesMap';
import { SharedLocationPicker } from './SharedLocationPicker';
import { compressCapturedImage, compressChacraLogo } from '../../utils/imageCompressor';
import { 
  User, 
  MapPin, 
  Sprout, 
  ClipboardCheck, 
  Wrench, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Camera, 
  Compass, 
  Save, 
  Trash2,
  Check,
  Info,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

interface SurveyWizardProps {
  technicianId: string;
  technicianName: string;
  onCancel: () => void;
  onSuccess: (savedProducer: Producer) => void;
  editProducer?: Producer | null;
}

export const SurveyWizard: React.FC<SurveyWizardProps> = ({
  technicianId,
  technicianName,
  onCancel,
  onSuccess,
  editProducer = null
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dniDuplicateWarning, setDniDuplicateWarning] = useState<string | null>(null);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [isCompressingLogo, setIsCompressingLogo] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Producer>>({
    id: editProducer?.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dni: editProducer?.dni || '',
    fullName: editProducer?.fullName || '',
    phone: editProducer?.phone || '',
    email: editProducer?.email || '',
    isEstablishmentHead: editProducer?.isEstablishmentHead ?? true,
    producerType: editProducer?.producerType || 'pequeno_familiar',
    establishmentName: editProducer?.establishmentName || '',
    logoUrl: editProducer?.logoUrl || '',
    municipality: editProducer?.municipality || '',
    colonyParaje: editProducer?.colonyParaje || '',
    addressReference: editProducer?.addressReference || '',
    lat: editProducer?.lat ?? null,
    lng: editProducer?.lng ?? null,
    gpsAccuracyMeters: editProducer?.gpsAccuracyMeters,
    tenureType: editProducer?.tenureType,
    surfaceHa: editProducer?.surfaceHa ?? null,
    observations: editProducer?.observations || '',
    activities: editProducer?.activities || [],
    infrastructure: editProducer?.infrastructure,
    photoUrls: editProducer?.photoUrls || [],
    version: (editProducer?.version || 0) + 1,
    syncStatus: 'pending'
  });

  // Check DNI duplicates in IndexedDB
  useEffect(() => {
    const checkDni = async () => {
      if (!formData.dni || formData.dni.length < 7) {
        setDniDuplicateWarning(null);
        return;
      }
      try {
        const existing = await db.producers.where('dni').equals(formData.dni).first();
        if (existing && existing.id !== formData.id) {
          setDniDuplicateWarning(
            `Atención: El DNI ${formData.dni} ya está registrado para "${existing.fullName}" en ${existing.municipality} (${existing.establishmentName}).`
          );
        } else {
          setDniDuplicateWarning(null);
        }
      } catch {
        setDniDuplicateWarning(null);
      }
    };
    checkDni();
  }, [formData.dni, formData.id]);

  // Capture Real GPS
  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      setGpsMessage('La geolocalización no está soportada en este navegador.');
      return;
    }
    setIsLocatingGPS(true);
    setGpsMessage('Obteniendo coordenadas satelitales GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setFormData((prev) => ({
          ...prev,
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          gpsAccuracyMeters: Math.round(accuracy)
        }));
        setIsLocatingGPS(false);
        setGpsMessage(`Coordenadas fijadas con precisión de ${Math.round(accuracy)} metros.`);
      },
      (err) => {
        setIsLocatingGPS(false);
        setGpsMessage(`No se pudo obtener la posición satelital: ${err.message}. Puede ajustar el marcador en el mapa.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // Toggle productive activities
  const handleToggleActivity = (type: ProductiveActivityType) => {
    const current = formData.activities || [];
    const exists = current.some((a) => a.type === type);

    if (exists) {
      // Don't allow removing if only 1 activity remains
      if (current.length === 1) return;
      setFormData((prev) => ({
        ...prev,
        activities: current.filter((a) => a.type !== type)
      }));
    } else {
      const cat = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) => c.type === type);
      const newAct: ProductiveActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        producerId: formData.id || '',
        type,
        title: cat?.name || type,
        surfaceHa: null,
        specificData: {},
        createdAt: new Date().toISOString()
      };
      setFormData((prev) => ({
        ...prev,
        activities: [...current, newAct]
      }));
    }
  };

  // Update specific activity data
  const handleUpdateActivityData = (type: ProductiveActivityType, key: string, value: any) => {
    setFormData((prev) => {
      const updated = (prev.activities || []).map((a) => {
        if (a.type === type) {
          if (key === 'surfaceHa') {
            return { ...a, surfaceHa: value === '' ? null : Number(value) };
          }
          return {
            ...a,
            specificData: {
              ...a.specificData,
              [key]: value
            }
          };
        }
        return a;
      });
      return { ...prev, activities: updated };
    });
  };

  // Photo capture / upload
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const compressed = await compressCapturedImage(file);
      setFormData((prev) => ({ ...prev, photoUrls: [...(prev.photoUrls || []), compressed] }));
    } catch (error: any) { alert(error.message || 'No se pudo comprimir la foto.'); }
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photoUrls: (prev.photoUrls || []).filter((_, i) => i !== index)
    }));
  };

  // Logo de Chacra / Establecimiento
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingLogo(true);
    try {
      const compressed = await compressChacraLogo(file, 320);
      setFormData((prev) => ({
        ...prev,
        logoUrl: compressed
      }));
    } catch (err: any) {
      alert(err.message || 'Error al procesar la imagen del logo');
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: ''
    }));
  };

  // Save survey to local IndexedDB and enqueue
  const handleSaveSurvey = async (isDraft: boolean = false) => {
    if (!formData.fullName?.trim() || !formData.dni?.trim()) {
      alert('Por favor complete el Nombre y DNI del productor.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const completeProducer: Producer = {
        id: formData.id!,
        dni: formData.dni.trim(),
        fullName: formData.fullName.trim(),
        phone: formData.phone || '',
        email: formData.email || '',
        isEstablishmentHead: formData.isEstablishmentHead ?? true,
        producerType: formData.producerType || 'pequeno_familiar',
        establishmentName: formData.establishmentName?.trim() || 'Establecimiento sin nombre',
        logoUrl: formData.logoUrl || '',
        municipality: formData.municipality || '',
        municipalityId: municipalityId(formData.municipality),
        colonyParaje: formData.colonyParaje || 'Zona rural',
        addressReference: formData.addressReference || '',
        lat: formData.lat ?? null,
        lng: formData.lng ?? null,
        gpsAccuracyMeters: formData.gpsAccuracyMeters,
        isGeolocated: Number.isFinite(formData.lat) && Number.isFinite(formData.lng),
        locationMethod: formData.locationMethod || 'not_georeferenced',
        locationCapturedAt: formData.locationCapturedAt,
        locationCapturedBy: formData.locationCapturedBy,
        originalLocationInput: formData.originalLocationInput || '',
        tenureType: formData.tenureType ?? null,
        surfaceHa: formData.surfaceHa == null ? null : Number(formData.surfaceHa),
        observations: formData.observations || '',
        activities: formData.activities || [],
        infrastructure: formData.infrastructure,
        photoUrls: formData.photoUrls || [],
        syncStatus: 'pending',
        version: formData.version || 1,
        cloudRevision: editProducer?.cloudRevision,
        createdAt: editProducer?.createdAt || now,
        updatedAt: now,
        createdById: editProducer?.createdById || technicianId,
        createdByName: editProducer?.createdByName || technicianName,
        verifiedBySupervisor: editProducer?.verifiedBySupervisor ?? false
      };

      // Save the local record and its upload operation atomically.
      await syncEngine.saveAndEnqueue('producers', completeProducer, editProducer ? 'update' : 'insert');

      // 3. Log audit event
      await db.auditLogs.add({
        id: `audit_${Date.now()}`,
        userId: technicianId,
        userName: technicianName,
        userRole: 'TECNICO',
        action: editProducer ? 'UPDATE_PRODUCER_OFFLINE' : 'CREATE_PRODUCER_OFFLINE',
        entity: 'producers',
        entityId: completeProducer.id,
        details: `${isDraft ? 'Borrador' : 'Relevamiento'} de ${completeProducer.fullName} (DNI ${completeProducer.dni}) en ${completeProducer.municipality}`,
        device: 'PWA Mobile / Tablet',
        timestamp: now
      });

      onSuccess(completeProducer);
    } catch (err: any) {
      alert(`Error al guardar en almacenamiento local: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col my-2">
      {/* Step Header */}
      <div className="bg-[#174C35] text-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E8F2EA]">
            Paso {currentStep} de 6 · Relevamiento Territorial
          </span>
          <button
            onClick={onCancel}
            className="text-xs text-white/80 hover:text-white px-2.5 py-1 rounded-lg bg-white/10"
          >
            Cancelar
          </button>
        </div>

        {/* Step Progress indicators */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`h-2 rounded-full transition-all ${
                step <= currentStep ? 'bg-[#27865A]' : 'bg-white/20'
              }`}
              title={`Ir al paso ${step}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {currentStep === 1 && 'Identificación del Productor'}
            {currentStep === 2 && 'Ubicación y Georreferenciación'}
            {currentStep === 3 && 'Actividades Productivas'}
            {currentStep === 4 && 'Detalle Productivo'}
            {currentStep === 5 && 'Infraestructura y Servicios'}
            {currentStep === 6 && 'Resumen, Fotos y Confirmación'}
          </h2>
          <span className="text-xs font-mono text-[#E8F2EA]/90 hidden sm:inline">
            Técnico: {technicianName}
          </span>
        </div>
      </div>

      {/* Step Body */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {/* PANTALLA 1: Identificación */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {dniDuplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-[#E9A23B] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Advertencia de Duplicado</div>
                  <div>{dniDuplicateWarning}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre y Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ej: Casimiro Kowalski"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#27865A] focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  DNI (Identificador Único) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.dni}
                  onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ej: 14820194"
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-[#27865A] focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: +54 3755 42-8910"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#27865A] focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@misiones.ar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#27865A] focus:outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Productor
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'pequeno_familiar', label: 'Pequeño Familiar (Chacra)' },
                    { id: 'cooperativista', label: 'Cooperativista' },
                    { id: 'mediano_comercial', label: 'Mediano Comercial' },
                    { id: 'empresa_agropecuaria', label: 'Empresa Agropecuaria' },
                    { id: 'comunidad_originaria', label: 'Comunidad Originaria' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, producerType: t.id as ProducerType })}
                      className={`p-2.5 text-xs rounded-xl font-medium border text-left transition ${
                        formData.producerType === t.id
                          ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold ring-1 ring-[#27865A]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="establishmentHead"
                  checked={formData.isEstablishmentHead}
                  onChange={(e) => setFormData({ ...formData, isEstablishmentHead: e.target.checked })}
                  className="w-4 h-4 text-[#27865A] rounded focus:ring-[#27865A]"
                />
                <label htmlFor="establishmentHead" className="text-xs font-medium text-slate-800 cursor-pointer">
                  El productor es el titular / responsable directo del establecimiento o chacra
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observaciones Generales
                </label>
                <textarea
                  rows={2}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Detalles familiares, antecedentes del productor..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA 2: Ubicación y Georreferenciación */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* MÓDULO 1: Ubicación del Establecimiento con 3 alternativas */}
            <SharedLocationPicker
              initialLat={formData.lat ?? -27.4862}
              initialLng={formData.lng ?? -55.1205}
              hasInitialLocation={Number.isFinite(formData.lat) && Number.isFinite(formData.lng) && Boolean(formData.locationCapturedAt)}
              initialMethod={formData.locationMethod || 'manual_map'}
              initialAddressRef={formData.addressReference || ''}
              initialMunicipality={formData.municipality || 'Oberá'}
              currentUserName={technicianName}
              onLocationConfirmed={(loc) => {
                setFormData((prev) => ({
                  ...prev,
                  lat: loc.lat,
                  lng: loc.lng,
                  municipality: loc.municipality,
                  addressReference: loc.addressReference,
                  locationMethod: loc.locationMethod,
                  gpsAccuracyMeters: loc.gpsAccuracyMeters,
                  originalLocationInput: loc.originalInput,
                  locationCapturedAt: loc.locationCapturedAt,
                  locationCapturedBy: loc.locationCapturedBy,
                  isGeolocated: true
                }));
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Chacra / Establecimiento
                </label>
                <input
                  type="text"
                  value={formData.establishmentName}
                  onChange={(e) => setFormData({ ...formData, establishmentName: e.target.value })}
                  placeholder="Ej: Chacra La Polaca / Lote 45"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none"
                />
              </div>

              {/* MÓDULO LOGO DE LA CHACRA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Logo o Marca de la Chacra (Opcional)
                </label>
                <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {formData.logoUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0 shadow-2xs">
                      <ProtectedImage
                        src={formData.logoUrl}
                        alt="Logo chacra"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition"
                        title="Quitar logo"
                      >
                        <Trash2 className="w-4 h-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-dashed border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                      {isCompressingLogo ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#27865A]" />
                      ) : (
                        <ImageIcon className="w-6 h-6 opacity-70" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-[#27865A]" />
                      <span>{formData.logoUrl ? 'Cambiar logo' : 'Subir logo o foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {formData.logoUrl ? 'Logo cargado y optimizado' : 'JPG, PNG o foto de la marca'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Municipio de Misiones <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.municipality}
                  onChange={(e) => {
                    const munName = e.target.value;
                    setFormData({
                      ...formData,
                      municipality: munName
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none bg-white font-medium"
                >
                  <option value="">Seleccione un municipio...</option>
                  {MISIONES_MUNICIPALITIES.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Paraje, Colonia o Picada
                </label>
                <input
                  type="text"
                  value={formData.colonyParaje}
                  onChange={(e) => setFormData({ ...formData, colonyParaje: e.target.value })}
                  placeholder="Ej: Picada Guaraní / Km 14"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Superficie Total del Lote (Hectáreas) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.surfaceHa ?? ''}
                  onChange={(e) => setFormData({ ...formData, surfaceHa: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="Ej: 25.0"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Régimen de Tenencia de la Tierra
                </label>
                <select
                  value={formData.tenureType ?? ''}
                  onChange={(e) => setFormData({ ...formData, tenureType: (e.target.value || null) as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none bg-white"
                >
                  <option value="">No informado</option>
                  <option value="propiedad_con_titulo">Propiedad con Título Perfecto</option>
                  <option value="ocupacion_con_permiso">Permiso de Ocupación Fiscal</option>
                  <option value="fiscal_en_tramite">Fiscal en Trámite de Regularización</option>
                  <option value="arrendamiento">Arrendamiento / Alquiler</option>
                  <option value="comunitaria">Comunitaria Originaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Referencia de Acceso
                </label>
                <input
                  type="text"
                  value={formData.addressReference}
                  onChange={(e) => setFormData({ ...formData, addressReference: e.target.value })}
                  placeholder="Ej: Frente al secadero cooperativo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA 3: Selección de Actividades Productivas */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Seleccione las actividades que se desarrollan en esta unidad productiva:
              </span>
              <span className="text-xs font-mono font-bold text-[#174C35] bg-[#E8F2EA] px-2.5 py-0.5 rounded-full">
                {formData.activities?.length || 0} seleccionada(s)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRODUCTIVE_ACTIVITIES_CATALOG.map((item) => {
                const isSelected = formData.activities?.some((a) => a.type === item.type);
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleToggleActivity(item.type)}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between min-h-[95px] relative ${
                      isSelected
                        ? 'border-[#27865A] bg-[#E8F2EA]/70 ring-2 ring-[#27865A]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: item.color }}
                      />
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#27865A] text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PANTALLA 4: Detalle Productivo Dinámico */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {formData.activities?.map((act) => {
              const catalogItem = PRODUCTIVE_ACTIVITIES_CATALOG.find((c) => c.type === act.type);
              if (!catalogItem) return null;

              return (
                <div key={act.id} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catalogItem.color }} />
                      <h3 className="font-bold text-sm text-slate-900">{catalogItem.name}</h3>
                      <span className="text-[11px] text-slate-500 font-medium">({catalogItem.category})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700">Superficie asignada:</label>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        <input
                          type="number"
                          step="0.5"
                          value={act.surfaceHa ?? ''}
                          onChange={(e) => handleUpdateActivityData(act.type, 'surfaceHa', e.target.value)}
                          className="w-16 text-right font-mono text-xs focus:outline-none"
                        />
                        <span className="text-xs text-slate-500">ha</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Fields from Catalog */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {catalogItem.fields.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {f.label}
                        </label>
                        {f.type === 'select' ? (
                          <select
                            value={act.specificData?.[f.key] || ''}
                            onChange={(e) => handleUpdateActivityData(act.type, f.key, e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-[#27865A] bg-white"
                          >
                            <option value="">Seleccione...</option>
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="relative flex items-center">
                            <input
                              type={f.type}
                              value={act.specificData?.[f.key] ?? ''}
                              onChange={(e) => handleUpdateActivityData(act.type, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-[#27865A]"
                            />
                            {f.unit && (
                              <span className="absolute right-3 text-[11px] text-slate-400 font-mono">
                                {f.unit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PANTALLA 5: Infraestructura y Condiciones */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Acceso a Energía Eléctrica
                </label>
                <select
                  value={formData.infrastructure?.electricity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      infrastructure: { ...formData.infrastructure!, electricity: e.target.value as any }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white font-medium"
                >
                  <option value="red_monofasica">Red Rural Monofásica</option>
                  <option value="red_trifasica">Red Trifásica</option>
                  <option value="panel_solar">Energía Solar Fotovoltaica</option>
                  <option value="generador">Grupo Electrógeno / Diésel</option>
                  <option value="sin_electricidad">Sin Electricidad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Estado de Caminos de Acceso
                </label>
                <select
                  value={formData.infrastructure?.roadAccess}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      infrastructure: { ...formData.infrastructure!, roadAccess: e.target.value as any }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white font-medium"
                >
                  <option value="asfalto">Asfalto / Ruta Pavimentada</option>
                  <option value="entoscado_bueno">Entoscado en Buen Estado</option>
                  <option value="tierra_colorada_transitable">Tierra Colorada Transitable</option>
                  <option value="dificil_acceso_lluvia">Difícil Acceso en Días de Lluvia</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fuentes de Agua Disponibles
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'vertiente_protegida', label: 'Vertiente Protegida' },
                    { id: 'pozo_perforado', label: 'Pozo Perforado' },
                    { id: 'red_publica', label: 'Red Pública / Cooperativa' },
                    { id: 'arroyo', label: 'Arroyo Encauzado' },
                    { id: 'recoleccion_lluvia', label: 'Aljibe / Lluvia' }
                  ].map((src) => {
                    const selected = formData.infrastructure?.waterSource?.includes(src.id as any);
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => {
                          const currentSources = formData.infrastructure?.waterSource || [];
                          const nextSources = selected
                            ? currentSources.filter((s) => s !== src.id)
                            : [...currentSources, src.id as any];
                          setFormData({
                            ...formData,
                            infrastructure: { ...formData.infrastructure!, waterSource: nextSources }
                          });
                        }}
                        className={`p-2.5 text-xs rounded-xl font-medium border text-left transition ${
                          selected
                            ? 'border-[#27865A] bg-[#E8F2EA] text-[#174C35] font-semibold'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {src.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Saneamiento y Letrina
                </label>
                <select
                  value={formData.infrastructure?.sanitation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      infrastructure: { ...formData.infrastructure!, sanitation: e.target.value as any }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white font-medium"
                >
                  <option value="inodoro_con_camara">Baño Instalado con Cámara Séptica</option>
                  <option value="letrina_sanitaria">Letrina Sanitaria Ventilada</option>
                  <option value="letrina_comun">Letrina Común</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sistema de Riego
                </label>
                <select
                  value={formData.infrastructure?.irrigationSystem}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      infrastructure: { ...formData.infrastructure!, irrigationSystem: e.target.value as any }
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A] bg-white font-medium"
                >
                  <option value="goteo">Riego por Goteo</option>
                  <option value="aspersion">Riego por Aspersión</option>
                  <option value="por_surco">Riego por Surco / Gravedad</option>
                  <option value="sin_riego">Sin Riego (Secano)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Maquinarias e Implementos
                </label>
                <input
                  type="text"
                  value={formData.infrastructure?.machinery?.join(', ') || ''}
                  onChange={(e) => {
                    const list = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    setFormData({
                      ...formData,
                      infrastructure: { ...formData.infrastructure!, machinery: list }
                    });
                  }}
                  placeholder="Ej: Tractor Massey Ferguson, Motoguadaña, Pulverizadora"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#27865A]"
                />
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA 6: Resumen, Fotos y Confirmación */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Summary Dossier Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 text-sm">{formData.fullName}</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                  DNI {formData.dni}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                <div>
                  <span className="block text-slate-400 text-[10px]">Municipio:</span>
                  <span className="font-semibold text-slate-800">{formData.municipality}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Chacra:</span>
                  <span className="font-semibold text-slate-800">{formData.establishmentName}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Superficie:</span>
                  <span className="font-semibold text-slate-800">{formData.surfaceHa} hectáreas</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Coordenadas GPS:</span>
                  <span className="font-mono text-slate-800">
                    {formData.lat?.toFixed(4)}, {formData.lng?.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Tenencia:</span>
                  <span className="capitalize text-slate-800">
                    {formData.tenureType?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px]">Técnico responsable:</span>
                  <span className="font-semibold text-slate-800">{technicianName}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="block text-slate-400 text-[10px] mb-1">Actividades Relevadas:</span>
                <div className="flex flex-wrap gap-1">
                  {formData.activities?.map((a) => (
                    <span
                      key={a.id}
                      className="px-2.5 py-1 rounded-lg bg-[#E8F2EA] text-[#174C35] font-semibold text-xs"
                    >
                      {a.title} ({a.surfaceHa == null ? 'Sin dato' : `${a.surfaceHa} ha`})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Offline Photographs Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#27865A]" />
                  Fotografías de la Chacra / Cultivos (Persistentes Offline)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {formData.photoUrls?.length || 0} foto(s)
                </span>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#27865A] bg-slate-50 hover:bg-[#E8F2EA]/30 flex flex-col items-center justify-center cursor-pointer transition">
                  <Camera className="w-6 h-6 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-600 mt-1">Agregar</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                </label>

                {formData.photoUrls?.map((url, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 group">
                    <ProtectedImage src={url} alt={`Chacra ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#E8F2EA]/70 border border-[#27865A]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#174C35]">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Prioridad Offline-First Garantizada:</span> Al confirmar, toda la información se guarda inmediatamente en el almacenamiento local del dispositivo (IndexedDB). Si no tiene internet en la chacra, el relevamiento se mantendrá seguro y se enviará automáticamente al recuperar conectividad.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Navigation */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700 flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-semibold text-xs text-slate-700 transition"
          >
            Cancelar
          </button>
        )}

        <div className="flex items-center gap-2">
          {currentStep === 6 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveSurvey(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              Guardar Borrador
            </button>
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && (!formData.fullName?.trim() || !formData.dni?.trim())) {
                  alert('Por favor complete el Nombre y DNI del productor.');
                  return;
                }
                setCurrentStep(currentStep + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#27865A] hover:bg-[#174C35] text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveSurvey(false)}
              className="px-6 py-2.5 rounded-xl bg-[#174C35] hover:bg-[#27865A] text-white font-bold text-xs flex items-center gap-2 transition shadow-md active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4 text-[#E8F2EA]" />
              {isSubmitting ? 'Guardando en Disco Local...' : 'Confirmar y Finalizar Relevamiento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
