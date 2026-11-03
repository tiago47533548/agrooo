/**
 * SIP MISIONES - Core Data Types & Schema
 * Ministerio del Agro y la Producción de Misiones
 */

export type UserRole = 'SUPERADMIN' | 'ADMINISTRADOR' | 'DIRECTOR' | 'TECNICO' | 'SUPERVISOR';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  dni: string;
  assignedMunicipalities?: string[];
  requestedMunicipalities?: string[];
  departmentOrZone?: string;
  active: boolean;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  authProvider?: 'google' | 'password' | 'invitation';
  emailVerified?: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'activa' | 'utilizada' | 'vencida' | 'revocada';

export interface Invitation {
  id: string;
  code: string;
  role: UserRole;
  emailAllowed?: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: InvitationStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes?: string;
}

export type ProducerType = 
  | 'pequeno_familiar' 
  | 'mediano_comercial' 
  | 'cooperativista' 
  | 'empresa_agropecuaria' 
  | 'comunidad_originaria';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'PENDIENTE' | 'SINCRONIZANDO' | 'SINCRONIZADO' | 'ERROR';

export type ProductiveActivityType = 
  | 'yerba_mate' 
  | 'te' 
  | 'tabaco' 
  | 'horticultura' 
  | 'ganaderia_bovina' 
  | 'porcicultura' 
  | 'avicultura' 
  | 'piscicultura' 
  | 'forestacion' 
  | 'apicultura' 
  | 'fruticultura' 
  | 'cultivos_industriales' 
  | 'otros';

export interface ProductiveActivity {
  id: string;
  producerId: string;
  type: ProductiveActivityType;
  title: string;
  surfaceHa: number | null;
  specificData: Record<string, any>;
  createdAt: string;
}

export interface Establishment {
  id: string;
  producerId: string;
  name: string;
  cadastralCode?: string;
  municipality: string;
  colonyParaje: string;
  addressReference: string;
  surfaceHa: number;
  lat: number;
  lng: number;
  gpsAccuracyMeters?: number;
  tenureType: 'propiedad_con_titulo' | 'ocupacion_con_permiso' | 'arrendamiento' | 'fiscal_en_tramite' | 'comunitaria' | null;
  createdAt: string;
}

export interface Infrastructure {
  id: string;
  producerId: string;
  waterSource: ('vertiente_protegida' | 'pozo_perforado' | 'red_publica' | 'arroyo' | 'recoleccion_lluvia')[];
  electricity: 'red_monofasica' | 'red_trifasica' | 'panel_solar' | 'generador' | 'sin_electricidad';
  roadAccess: 'asfalto' | 'entoscado_bueno' | 'tierra_colorada_transitable' | 'dificil_acceso_lluvia';
  hasStorageFacility: boolean;
  storageDescription?: string;
  sanitation: 'inodoro_con_camara' | 'letrina_sanitaria' | 'letrina_comun';
  machinery: string[];
  irrigationSystem?: 'goteo' | 'aspersion' | 'por_surco' | 'sin_riego';
  observations?: string;
  createdAt: string;
}

export interface Producer {
  id: string;
  dni: string;
  fullName: string;
  phone: string;
  email?: string;
  isEstablishmentHead: boolean;
  producerType: ProducerType;
  observations?: string;
  
  // Geolocation & Establishment
  establishmentName: string;
  municipality: string;
  municipalityId?: string;
  colonyParaje: string;
  addressReference: string;
  lat: number | null;
  lng: number | null;
  gpsAccuracyMeters?: number;
  isGeolocated?: boolean;
  locationMethod?: LocationCaptureMethod;
  locationCapturedAt?: string;
  locationCapturedBy?: string;
  originalLocationInput?: string;
  tenureType: 'propiedad_con_titulo' | 'ocupacion_con_permiso' | 'arrendamiento' | 'fiscal_en_tramite' | 'comunitaria' | null;
  surfaceHa: number | null;

  // Activities & Infrastructure
  activities: ProductiveActivity[];
  infrastructure?: Infrastructure;
  photoUrls?: string[];
  logoUrl?: string; // Logo o Marca de la Chacra / Establecimiento

  // Meta & Sync
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  syncError?: string;
  version: number;
  lastSyncedAt?: string;
  cloudRevision?: number;
  syncConflict?: { cloudRecord: Producer; detectedAt: string };
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdByName: string;
  verifiedBySupervisor?: boolean;

  // Import trace metadata (Módulo 3)
  importBatchId?: string;
  importSourceFileName?: string;
  importSheetName?: string;
  importRowNumber?: number;
}

export type LocationCaptureMethod = 'gps_auto' | 'manual_map' | 'shared_link' | 'manual_coords' | 'not_georeferenced';

export interface ImportBatch {
  id: string;
  fileName: string;
  fileSize: number;
  format: string;
  sheetsCount: number;
  selectedSheet: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  duplicateStrategy: 'create_only_new' | 'update_existing' | 'import_all_flag_review';
  columnMapping: Record<string, string>;
  createdAt: string;
  createdById: string;
  createdByName: string;
  status: 'completed' | 'partial' | 'failed';
  reportLog: string[];
}


export type QuestionType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multiselect' 
  | 'boolean' 
  | 'photo' 
  | 'coordinates';

export interface DynamicQuestion {
  id: string;
  label: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For select/multiselect
  unit?: string;     // e.g. "kg/ha", "hectáreas", "plantas"
  conditionalOnField?: string;
  conditionalEquals?: string | number | boolean;
}

export interface DynamicQuestionnaire {
  id: string;
  code: string;
  title: string;
  description: string;
  category: ProductiveActivityType | 'general' | 'socioeconomico' | 'ambiental';
  version: number;
  status: 'draft' | 'published' | 'archived';
  questions: DynamicQuestion[];
  publishedAt?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  questionnaireVersion: number;
  questionnaireTitle: string;
  producerId: string;
  municipalityId: string;
  producerDni: string;
  producerName: string;
  technicianId: string;
  technicianAuthUid?: string;
  technicianName: string;
  answers: Record<string, any>;
  status: 'draft' | 'completed' | 'validated' | 'observed';
  observations?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'error';
  cloudRevision?: number;
}

export interface SyncQueueItem {
  id: string;
  table: 'producers' | 'questionnaire_responses' | 'activities';
  action: 'insert' | 'update' | 'delete';
  recordId: string;
  payload: any;
  idempotencyKey: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: string;
  nextAttemptAt?: string;
  errorKind?: 'transient' | 'permission' | 'validation' | 'conflict' | 'unknown';
  baseRevision?: number;
  payloadRevision?: string;
  blockedByOperationId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  device: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'form' | 'sync' | 'assignment' | 'alert' | 'review';
  targetRoles: UserRole[];
  targetUserId?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface MunicipalityInfo {
  id: string;
  name: string;
  department: string;
  lat: number;
  lng: number;
  producerCount?: number;
}
