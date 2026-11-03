import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db, SipMisionesDatabase, exportLegacyLocalDatabase } from '../../src/db/dexieDb';
import { seedInitialDatabaseIfEmpty } from '../../src/db/emulatorFixtures';
import { isAuthorizationCacheFresh } from '../../src/services/authService';
import { decideMissingProducer } from '../../src/services/firestoreSync';

describe('local data foundations', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(db.tables.map((table) => table.clear()));
    await new Dexie('SipMisionesDB').delete();
  });

  it('refuses demo fixtures outside an explicitly enabled development emulator', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_LOAD_DEMO_DATA', 'true');
    await expect(seedInitialDatabaseIfEmpty()).rejects.toThrow(/Demo seeding is disabled/);

    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'false');
    await expect(seedInitialDatabaseIfEmpty()).rejects.toThrow(/Demo seeding is disabled/);
  });

  it('loads sample rows only after deliberate development emulator opt-in', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_USE_FIREBASE_EMULATORS', 'true');
    vi.stubEnv('VITE_LOAD_DEMO_DATA', 'true');

    await seedInitialDatabaseIfEmpty();

    expect(await db.users.count()).toBeGreaterThan(0);
    expect(await db.producers.count()).toBeGreaterThan(0);
  });

  it('exports records from the legacy browser database for review', async () => {
    const legacy = new SipMisionesDatabase('SipMisionesDB');
    await legacy.open();
    await legacy.producers.put({ id: 'legacy-producer', fullName: 'Legacy record' } as any);
    legacy.close();

    const exported = await exportLegacyLocalDatabase();
    expect(exported.producers).toEqual([
      expect.objectContaining({ id: 'legacy-producer', fullName: 'Legacy record' })
    ]);
  });

  it('expires cached authorization after seven days and rejects future timestamps', () => {
    const now = Date.UTC(2026, 10, 3);
    expect(isAuthorizationCacheFresh(now - 7 * 24 * 60 * 60 * 1000, now)).toBe(true);
    expect(isAuthorizationCacheFresh(now - 7 * 24 * 60 * 60 * 1000 - 1, now)).toBe(false);
    expect(isAuthorizationCacheFresh(now + 1, now)).toBe(false);
    expect(isAuthorizationCacheFresh('invalid', now)).toBe(false);
  });

  it('does not delete a missing producer after failed or out-of-scope downloads', () => {
    const producer = { id: 'producer', municipalityId: 'posadas', syncStatus: 'synced' } as any;
    expect(decideMissingProducer(producer, false, false, ['posadas'])).toBe('keep');
    expect(decideMissingProducer(producer, true, false, ['eldorado'])).toBe('quarantine');
    expect(decideMissingProducer(producer, true, false, ['posadas'])).toBe('delete');
    expect(decideMissingProducer({ ...producer, syncStatus: 'pending' }, true, false, ['posadas'])).toBe('keep');
  });
});
