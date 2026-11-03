import { afterEach, describe, expect, it } from 'vitest';
import { getDatabaseSession, isDatabaseSessionCurrent, switchDatabaseForUser } from '../../src/db/dexieDb';

describe('account-bound local database sessions', () => {
  afterEach(async () => {
    await switchDatabaseForUser();
  });

  it('changes the generation and invalidates the previous account session on switch', async () => {
    await switchDatabaseForUser('uid-a');
    const first = getDatabaseSession();
    expect(first.uid).toBe('uid-a');
    expect(first.db.name).toBe('SipMisionesDB_uid-a');
    expect(isDatabaseSessionCurrent(first)).toBe(true);

    await switchDatabaseForUser('uid-b');
    const second = getDatabaseSession();
    expect(second.uid).toBe('uid-b');
    expect(second.db.name).toBe('SipMisionesDB_uid-b');
    expect(second.generation).toBeGreaterThan(first.generation);
    expect(second.db).not.toBe(first.db);
    expect(isDatabaseSessionCurrent(first)).toBe(false);
    expect(isDatabaseSessionCurrent(second)).toBe(true);
  });

  it('keeps unauthenticated legacy storage quarantined instead of opening it as an account', async () => {
    await switchDatabaseForUser();
    const session = getDatabaseSession();
    expect(session.uid).toBeNull();
    expect(session.db.name).toBe('SipMisionesDB_quarantine');
  });
});
