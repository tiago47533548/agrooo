import { expect, type Page } from '@playwright/test';

export async function expectNoDemoRecords(page: Page) {
  const count = await page.evaluate(async () => {
    let records = 0;
    for (const info of await indexedDB.databases()) {
      if (!info.name?.startsWith('SipMisionesDB_')) continue;
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const stores = ['users', 'invitations', 'producers'].filter((name) => database.objectStoreNames.contains(name));
      if (stores.length) {
        records += await new Promise<number>((resolve, reject) => {
          const transaction = database.transaction(stores, 'readonly');
          let total = 0;
          for (const name of stores) {
            const request = transaction.objectStore(name).count();
            request.onsuccess = () => { total += request.result; };
          }
          transaction.oncomplete = () => resolve(total);
          transaction.onerror = () => reject(transaction.error);
        });
      }
      database.close();
    }
    return records;
  });
  expect(count).toBe(0);
}
