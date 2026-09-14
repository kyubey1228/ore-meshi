import { expect, test } from '@playwright/test';
import { statePath } from './fixtures';

test('未ログインでも案内を読め、登録時はプロフィールへ戻るログイン導線になる', async ({ page }) => {
  await page.goto('/email-notifications');
  await expect(page.getByRole('heading', { name: 'メールアドレスを登録すると、こんなに便利。' })).toBeVisible();
  await page.getByRole('link', { name: 'プロフィールでメールアドレスを登録する →' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprofile(?:#email)?$/);
});

test('個人向けメール案内から登録欄へ進め、スマホでも見切れない', async ({ browser }) => {
  const context = await browser.newContext({ storageState: statePath('user1'), viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of ['/mypage', '/notifications']) {
    await page.goto(route);
    const guide = page.getByRole('complementary', { name: 'メール通知のご案内' });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole('link', { name: 'メール通知の便利な使い方を見る →' })).toHaveAttribute('href', '/email-notifications');
    const box = await guide.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.getByRole('complementary', { name: 'メール通知のご案内' }).getByRole('link', { name: 'メール通知の便利な使い方を見る →' }).click();
  await expect(page.getByRole('heading', { name: 'メールアドレスを登録すると、こんなに便利。' })).toBeVisible();
  await page.getByRole('link', { name: 'プロフィールでメールアドレスを登録する →' }).click();
  await expect(page).toHaveURL(/\/profile#email$/);
  await expect(page.getByLabel('メールアドレス（任意・通知の送付先）')).toBeInViewport();
  await context.close();
});

test('店舗の管理画面・アカウント設定から店舗向けメール案内へ進める', async ({ browser }) => {
  const context = await browser.newContext({ storageState: statePath('business') });
  const page = await context.newPage();
  for (const route of ['/business/dashboard', '/business/account']) {
    await page.goto(route);
    const guide = page.getByRole('complementary', { name: 'メール通知のご案内' });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole('link', { name: 'メール通知の便利な使い方を見る →' })).toHaveAttribute('href', '/business/email-notifications');
  }
  await page.getByRole('complementary', { name: 'メール通知のご案内' }).getByRole('link', { name: 'メール通知の便利な使い方を見る →' }).click();
  await expect(page.getByRole('heading', { name: '誰に届きますか？' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'プロフィールでメールアドレスを登録する →' })).toHaveAttribute('href', '/profile#email');
  await context.close();
});
