import { expect, test } from '@playwright/test';
import { mealTitle, statePath } from './fixtures';
import { createMeal } from './helpers';

test.describe.serial('ユーザー1とユーザー2', () => {
  let mealUrl: string;
  test('ユーザー1が募集を作成し共有導線を確認する', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') }); const page = await context.newPage();
    mealUrl = await createMeal(page, mealTitle, 2);
    await expect(page.getByRole('link', { name: 'Xで共有' })).toBeVisible(); await expect(page.getByRole('link', { name: 'LINEで送る' })).toBeVisible(); await expect(page.getByRole('button', { name: 'URLをコピー', exact: true })).toBeVisible(); await expect(page.getByText('QRコード', { exact: true })).toBeVisible();
    await context.close();
  });
  test('ユーザー2が参加申請する', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user2') }); const page = await context.newPage(); await page.goto(mealUrl);
    await page.getByRole('button', { name: 'この募集に参加する' }).click();
    await expect(page.getByRole('status')).toContainText('保存しました'); await context.close();
  });
  test('ユーザー1が承認して成立させる', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') }); const page = await context.newPage(); await page.goto(mealUrl);
    await page.getByRole('button', { name: '一緒に行く' }).click();
    await expect(page.getByRole('heading', { name: '飯、決まった。' })).toBeVisible({ timeout: 20_000 }); await context.close();
  });
});
