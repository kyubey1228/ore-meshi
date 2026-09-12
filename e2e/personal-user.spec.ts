import { expect, test } from '@playwright/test';
import { statePath } from './fixtures';

test.use({ storageState: statePath('user1') });
test('個人ユーザー: 一覧・Demand・マイページ・通知設定を横断できる', async ({ page }) => {
  await page.goto('/meals');
  await expect(page.getByRole('heading', { name: '誰かの飯に乗っかる。' })).toBeVisible();
  await page.goto('/demand');
  await expect(page.getByRole('heading', { name: '行きたい登録', level: 2 })).toBeVisible();
  await page.goto('/mypage');
  await expect(page.getByRole('heading', { name: 'マイページ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '友達も誘う', level: 2 })).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: '通知', level: 1 })).toBeVisible();
});

test('個人ユーザー: 未ログイン参加CTAはログイン後の戻り先を保持する', async ({ browser }) => {
  const anonymous = await browser.newPage();
  await anonymous.goto('/meals');
  const firstMeal = anonymous.locator('a[href^="/meals/"]').first();
  if (await firstMeal.count()) {
    await firstMeal.click();
    const join = anonymous.getByRole('button', { name: /参加/ }).first();
    if (await join.count()) { await join.click(); await expect(anonymous).toHaveURL(/\/login\?next=%2Fmeals%2F/); }
  }
  await anonymous.close();
});
