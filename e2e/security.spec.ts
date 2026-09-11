import { expect, test } from '@playwright/test';
import { statePath } from './fixtures';

test('権限: 一般ユーザーはBusiness Dashboardを閲覧できない', async ({ browser }) => {
  const context = await browser.newContext({ storageState: statePath('user1') });
  const page = await context.newPage();
  await page.goto('/business/dashboard');
  await expect(page).not.toHaveURL(/\/business\/dashboard$/);
  await context.close();
});

for (const account of ['user1', 'business'] as const) {
  test(`権限: ${account}はAdmin画面を閲覧できない`, async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath(account) });
    const page = await context.newPage();
    await page.goto('/admin/growth');
    await expect(page.getByRole('heading', { name: 'Growth Dashboard' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'ちょっと一息。' })).toBeVisible();
    await context.close();
  });
}
