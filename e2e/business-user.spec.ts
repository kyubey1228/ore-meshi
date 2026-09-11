import { expect, test } from '@playwright/test';
import { statePath } from './fixtures';

test.use({ storageState: statePath('business') });
test('ビジネスユーザー: Dashboard・需要・分析・掲載作成導線', async ({ page }) => {
  await page.goto('/business/dashboard');
  await expect(page.getByRole('heading', { name: 'E2E テスト食堂' })).toBeVisible();
  await expect(page.getByText('今月の成果')).toBeVisible();
  await page.goto('/business/demand'); await expect(page.getByRole('heading', { name: 'Demand Intelligence', level: 1 })).toBeVisible();
  await page.goto('/business/analytics'); await expect(page.getByRole('heading', { level: 1 })).toContainText(/分析|Analytics/);
  await page.goto('/business/seats/new'); await expect(page.getByRole('heading', { level: 1 })).toContainText(/席|空席/);
});

test('ビジネスユーザー: 課金なしでも登録開始ページとFREE価値を確認できる', async ({ page }) => {
  await page.goto('/business/start');
  await expect(page.getByText('登録は無料')).toBeVisible();
  await expect(page.getByText('決済は後から')).toBeVisible();
});
