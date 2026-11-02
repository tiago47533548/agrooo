import Dexie, { Table } from 'dexie';
import { 
  Producer, 
  DynamicQuestionnaire, 
  QuestionnaireResponse, 
  SyncQueueItem, 
  AuditLog, 
  NotificationItem, 
  Invitation,
  UserProfile,
  ImportBatch
} from './schema';

export interface AppConfigItem {
  key: string;
  value: any;
  updatedAt: string;
}

export class SipMisionesDatabase extends Dexie {
  producers!: Table<Producer, string>;
  questionnaires!: Table<DynamicQuestionnaire, string>;
  questionnaireResponses!: Table<QuestionnaireResponse, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  auditLogs!: Table<AuditLog, string>;
  notifications!: Table<NotificationItem, string>;
  invitations!: Table<Invitation, string>;
  appConfig!: Table<AppConfigItem, string>;
  users!: Table<UserProfile, string>;
  importBatches!: Table<ImportBatch, string>;

  constructor() {
    super('SipMisionesDB');
    
    this.version(1).stores({
      producers: 'id, dni, fullName, municipality, syncStatus, updatedAt, createdAt, createdById',
      questionnaires: 'id, code, category, status, version, updatedAt',
      questionnaireResponses: 'id, questionnaireId, producerId, syncStatus, createdAt',
      syncQueue: 'id, table, action, recordId, idempotencyKey, status, attempts, createdAt',
      auditLogs: 'id, timestamp, entity, userId',
      notifications: 'id, read, createdAt',
      invitations: 'id, code, status, role, expiresAt',
      appConfig: 'key',
      users: 'id, email, dni, role, active',
      importBatches: 'id, fileName, createdAt, createdById, status'
    });

    this.version(2).stores({
      producers: 'id, dni, fullName, municipality, syncStatus, isGeolocated, updatedAt, createdAt, createdById, importBatchId',
      importBatches: 'id, fileName, createdAt, createdById, status'
    });
  }
}

export const db = new SipMisionesDatabase();
