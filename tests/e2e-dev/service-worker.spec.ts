import { expect, test } from '@playwright/test';
import { expectNoDemoRecords } from '../e2e/no-demo-records';

test('development does not register a service worker or seed demo data by default', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SIP Misiones/);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  await expectNoDemoRecords(page);
});
