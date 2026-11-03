import { afterEach, describe, expect, it, vi } from 'vitest';

const { uploadQueueItemMock, currentUser } = vi.hoisted(() => ({
  uploadQueueItemMock: vi.fn(),
  currentUser: { value: null as null | { uid: string } }
}));

vi.mock('../../src/services/firestoreSync', () => ({ uploadQueueItem: uploadQueueItemMock }));
vi.mock('../../src/services/firebaseClient', () => ({ firebaseAuth: { get currentUser() { return currentUser.value; } } }));
vi.mock('../../src/services/authService', () => ({ AuthService: { requireFieldworkAuthorization: vi.fn() } }));

import { getDatabaseSession, switchDatabaseForUser } from '../../src/db/dexieDb';
import { syncEngine } from '../../src/services/syncEngine';
import type { Producer } from '../../src/db/schema';

function producer(id: string): Producer {
  return {
    id, dni: '12345678', fullName: 'Productor de prueba', phone: '', isEstablishmentHead: false,
    producerType: 'pequeno_familiar', observations: '', establishmentName: '', municipality: 'Posadas', version: 1,
    municipalityId: 'posadas', colonyParaje: '', addressReference: '', lat: null, lng: null,
    isGeolocated: false, tenureType: null, surfaceHa: null, activities: [], infrastructure: undefined,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdById: 'sync-user-a',
    createdByName: 'Técnico de prueba', syncStatus: 'pending',
    cloudRevision: 0
  };
}

describe('sync session isolation', () => {
  afterEach(async () => {
    currentUser.value = null;
    uploadQueueItemMock.mockReset();
    await switchDatabaseForUser();
  });

  it('does not apply a late upload acknowledgement to the next account database', async () => {
    await switchDatabaseForUser('sync-user-a');
    currentUser.value = { uid: 'sync-user-a' };
    const firstSession = getDatabaseSession();
    const item = producer('producer-a');
    await firstSession.db.producers.put(item);
    await firstSession.db.syncQueue.add({
      id: 'queue-a', table: 'producers', action: 'insert', recordId: item.id, payload: item,
      idempotencyKey: 'operation-a-00000001', attempts: 0, status: 'pending',
      createdAt: new Date().toISOString(), baseRevision: 0, payloadRevision: item.updatedAt
    });

    let finishUpload!: (result: { ok: true; revision: number }) => void;
    uploadQueueItemMock.mockImplementation(() => new Promise((resolve) => { finishUpload = resolve; }));
    const sync = syncEngine.triggerSync();
    await vi.waitFor(() => expect(uploadQueueItemMock).toHaveBeenCalledTimes(1));

    await switchDatabaseForUser('sync-user-b');
    currentUser.value = { uid: 'sync-user-b' };
    const secondSession = getDatabaseSession();
    finishUpload({ ok: true, revision: 1 });
    await sync;

    expect(await secondSession.db.producers.get('producer-a')).toBeUndefined();
    expect(await secondSession.db.syncQueue.get('queue-a')).toBeUndefined();
    expect((await firstSession.db.syncQueue.get('queue-a'))?.status).toBe('pending');
  });

  it('uploads multiple edits for one record in order and advances the later base revision', async () => {
    await switchDatabaseForUser('sync-order-user');
    currentUser.value = { uid: 'sync-order-user' };
    const session = getDatabaseSession();
    const firstRecord = { ...producer('producer-order'), updatedAt: '2026-01-01T00:00:00.000Z' };
    const secondRecord = { ...firstRecord, fullName: 'Nombre editado', updatedAt: '2026-01-02T00:00:00.000Z' };
    await session.db.producers.put(secondRecord);
    await session.db.syncQueue.bulkAdd([
      { id: 'order-1', table: 'producers', action: 'insert', recordId: firstRecord.id, payload: firstRecord, idempotencyKey: 'operation-order-0001', attempts: 0, status: 'pending', createdAt: '2026-01-01T00:00:00.000Z', baseRevision: 0, payloadRevision: firstRecord.updatedAt },
      { id: 'order-2', table: 'producers', action: 'update', recordId: firstRecord.id, payload: secondRecord, idempotencyKey: 'operation-order-0002', attempts: 0, status: 'pending', createdAt: '2026-01-02T00:00:00.000Z', blockedByOperationId: 'operation-order-0001', payloadRevision: secondRecord.updatedAt }
    ]);
    uploadQueueItemMock
      .mockResolvedValueOnce({ ok: true, revision: 1 })
      .mockResolvedValueOnce({ ok: true, revision: 2 });

    const result = await syncEngine.triggerSync();

    expect(result.syncedCount).toBe(2);
    expect(uploadQueueItemMock.mock.calls.map(([item]) => item.id)).toEqual(['order-1', 'order-2']);
    expect(uploadQueueItemMock.mock.calls[1][0].baseRevision).toBe(1);
    expect((await session.db.syncQueue.get('order-1'))?.status).toBe('synced');
    expect((await session.db.syncQueue.get('order-2'))?.status).toBe('synced');
  });

  it('blocks later record edits after an earlier conflict', async () => {
    await switchDatabaseForUser('sync-conflict-user');
    currentUser.value = { uid: 'sync-conflict-user' };
    const session = getDatabaseSession();
    const record = { ...producer('producer-conflict'), cloudRevision: 1, updatedAt: '2026-01-01T00:00:00.000Z' };
    await session.db.producers.put(record);
    await session.db.syncQueue.bulkAdd([
      { id: 'conflict-1', table: 'producers', action: 'update', recordId: record.id, payload: record, idempotencyKey: 'operation-conflict-0001', attempts: 0, status: 'pending', createdAt: '2026-01-01T00:00:00.000Z', baseRevision: 1, payloadRevision: record.updatedAt },
      { id: 'conflict-2', table: 'producers', action: 'update', recordId: record.id, payload: record, idempotencyKey: 'operation-conflict-0002', attempts: 0, status: 'pending', createdAt: '2026-01-02T00:00:00.000Z', blockedByOperationId: 'operation-conflict-0001', payloadRevision: record.updatedAt }
    ]);
    uploadQueueItemMock.mockResolvedValueOnce({ ok: false, kind: 'conflict', message: 'conflict', cloudRecord: record });

    const result = await syncEngine.triggerSync();

    expect(result.success).toBe(false);
    expect(uploadQueueItemMock).toHaveBeenCalledTimes(1);
    expect((await session.db.syncQueue.get('conflict-1'))?.status).toBe('failed');
    expect((await session.db.syncQueue.get('conflict-2'))?.status).toBe('failed');
  });
});
