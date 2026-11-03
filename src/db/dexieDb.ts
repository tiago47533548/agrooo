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
  publishedQuestionnaireVersions!: Table<DynamicQuestionnaire & { publishedVersionId: string }, string>;
  questionnaireResponses!: Table<QuestionnaireResponse, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  auditLogs!: Table<AuditLog, string>;
  notifications!: Table<NotificationItem, string>;
  invitations!: Table<Invitation, string>;
  appConfig!: Table<AppConfigItem, string>;
  users!: Table<UserProfile, string>;
  importBatches!: Table<ImportBatch, string>;

  constructor(name = 'SipMisionesDB') {
    super(name);
    
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

    this.version(3).stores({
      producers: 'id, dni, fullName, municipality, syncStatus, isGeolocated, updatedAt, createdAt, createdById, importBatchId',
      questionnaires: 'id, code, category, status, version, updatedAt',
      questionnaireResponses: 'id, questionnaireId, producerId, syncStatus, createdAt',
      syncQueue: 'id, table, action, recordId, idempotencyKey, status, attempts, createdAt, nextAttemptAt, errorKind',
      auditLogs: 'id, timestamp, entity, userId',
      notifications: 'id, read, createdAt',
      invitations: 'id, code, status, role, expiresAt',
      appConfig: 'key',
      users: 'id, email, dni, role, active',
      importBatches: 'id, fileName, createdAt, createdById, status'
    }).upgrade(async (tx) => {
      // Old Firebase queue runs marked failed writes as synced; reconcile records
      // against Firestore before declaring them delivered.
      await tx.table('syncQueue').where('status').equals('syncing').modify({ status: 'pending' });
    });

    this.version(4).stores({
      producers: 'id, dni, fullName, municipality, syncStatus, isGeolocated, updatedAt, createdAt, createdById, importBatchId',
      questionnaires: 'id, code, category, status, version, updatedAt',
      questionnaireResponses: 'id, questionnaireId, producerId, syncStatus, createdAt',
      syncQueue: 'id, table, action, recordId, idempotencyKey, status, attempts, createdAt, nextAttemptAt, errorKind, blockedByOperationId',
      auditLogs: 'id, timestamp, entity, userId',
      notifications: 'id, read, createdAt',
      invitations: 'id, code, status, role, expiresAt',
      appConfig: 'key',
      users: 'id, email, dni, role, active',
      importBatches: 'id, fileName, createdAt, createdById, status'
    });

    this.version(5).stores({
      producers: 'id, dni, fullName, municipality, syncStatus, isGeolocated, updatedAt, createdAt, createdById, importBatchId',
      questionnaires: 'id, code, category, status, version, updatedAt',
      publishedQuestionnaireVersions: 'publishedVersionId, id, code, version, status, publishedAt',
      questionnaireResponses: 'id, questionnaireId, producerId, syncStatus, createdAt',
      syncQueue: 'id, table, action, recordId, idempotencyKey, status, attempts, createdAt, nextAttemptAt, errorKind, blockedByOperationId',
      auditLogs: 'id, timestamp, entity, userId',
      notifications: 'id, read, createdAt',
      invitations: 'id, code, status, role, expiresAt',
      appConfig: 'key',
      users: 'id, email, dni, role, active',
      importBatches: 'id, fileName, createdAt, createdById, status'
    }).upgrade(async (tx) => {
      const drafts = await tx.table('questionnaires').toArray();
      for (const questionnaire of drafts) {
        if (questionnaire.status === 'published') {
          await tx.table('publishedQuestionnaireVersions').put({
            ...questionnaire,
            publishedVersionId: `${questionnaire.id}_v${questionnaire.version}`
          });
        }
      }
    });
  }
}

let activeDatabase = new SipMisionesDatabase('SipMisionesDB_quarantine');
let activeUid: string | null = null;
let sessionGeneration = 0;
const retiredDatabases = new Set<SipMisionesDatabase>();

export interface LocalDatabaseSession {
  uid: string | null;
  db: SipMisionesDatabase;
  generation: number;
}

export function getDatabaseSession(): LocalDatabaseSession {
  return { uid: activeUid, db: activeDatabase, generation: sessionGeneration };
}

export function isDatabaseSessionCurrent(session: LocalDatabaseSession): boolean {
  return session.generation === sessionGeneration && session.db === activeDatabase && session.uid === activeUid;
}

export const db = new Proxy(activeDatabase, {
  get(_target, property) {
    const value = Reflect.get(activeDatabase, property, activeDatabase);
    return typeof value === 'function' ? value.bind(activeDatabase) : value;
  },
  set(_target, property, value) {
    return Reflect.set(activeDatabase, property, value, activeDatabase);
  }
}) as SipMisionesDatabase;

export async function switchDatabaseForUser(uid?: string): Promise<void> {
  const safeUid = uid ? uid.replace(/[^a-zA-Z0-9_-]/g, '_') : 'quarantine';
  const nextName = `SipMisionesDB_${safeUid}`;
  const nextUid = uid || null;
  if (activeDatabase.name === nextName && activeUid === nextUid) return;
  sessionGeneration++;
  activeUid = nextUid;
  const previousDatabase = activeDatabase;
  retiredDatabases.add(previousDatabase);
  // Closing Dexie while a fetch is in flight rejects later transaction work.
  // Leave the old handle open but unreachable from the active proxy so a late
  // acknowledgement can safely update only its original account's queue.
  setTimeout(() => {
    if (retiredDatabases.delete(previousDatabase)) previousDatabase.close();
  }, 60_000);
  activeDatabase = new SipMisionesDatabase(nextName);
  await activeDatabase.open();
  await activeDatabase.syncQueue.where('status').equals('syncing').modify({ status: 'pending', error: 'La app se cerró durante el envío; se reintentará.' });
}

export async function exportLegacyLocalDatabase(): Promise<Record<string, unknown[]>> {
  const legacy = new SipMisionesDatabase('SipMisionesDB');
  try {
    await legacy.open();
    const entries = await Promise.all(legacy.tables.map(async (table) => [table.name, await table.toArray()] as const));
    return Object.fromEntries(entries);
  } catch {
    return {};
  } finally {
    legacy.close();
  }
}
