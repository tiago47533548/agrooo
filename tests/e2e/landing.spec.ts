import { expect, test } from '@playwright/test';
import { expectNoDemoRecords } from './no-demo-records';

test('production landing page loads without initializing demo records', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SIP Misiones/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expectNoDemoRecords(page);
});
