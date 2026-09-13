import { expect, test } from '@playwright/test';
import { E2E_PREFIX, statePath } from './fixtures';

test('表示最適化: 個人の履歴・プロフィール・企業の画面別取得が描画できる', async ({ browser }) => {
  test.setTimeout(90_000);
  for (const [account, routes] of [
    ['user1', ['/history', '/profile', '/mypage']],
    ['business', ['/business/dashboard', '/business/account', '/business/coupons', '/business/seats', '/business/sponsored-meals', '/business/direct-ads', '/business/social', '/business/analytics']],
  ] as const) {
    const context = await browser.newContext({ storageState: statePath(account) });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'ちょっと一息。' })).toHaveCount(0);
    }
    await context.close();
  }
});

test('表示最適化: スマホでも詳細フォームの遅延読込後に募集作成と共有ダイアログが動作する', async ({ browser }) => {
  const context = await browser.newContext({ storageState: statePath('user1'), viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/meals/new');
  await expect(page.getByRole('heading', { name: '30秒で募集する' })).toBeVisible();
  await expect(page.locator('[data-slot="calendar"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'くわしく作る' }).click();
  await page.getByLabel('どんな飯にする？').fill(`${E2E_PREFIX}-詳細フォーム表示`);
  await page.getByLabel('どこ', { exact: true }).fill('渋谷');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.locator(`button[data-day="${tomorrow.toLocaleDateString('ja-JP')}"]`).click();
  await page.getByRole('button', { name: '夜 18:00〜22:00', exact: true }).click();
  await page.getByRole('button', { name: 'この飯、一緒に行く人！' }).click();
  await expect(page.getByRole('heading', { name: '募集を作成しました！' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Xで共有' })).toBeVisible();
  await page.getByRole('button', { name: 'あとで・募集ページへ' }).click();
  await expect(page.getByRole('heading', { name: `${E2E_PREFIX}-詳細フォーム表示`, exact: true })).toBeVisible();
  await context.close();
});

test('表示最適化: 最近見た募集APIは必要な公開情報だけを指定順に返す', async ({ page, request }) => {
  await page.goto('/meals');
  const links = await page.locator('.meal-card .card-cta').evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).pathname));
  expect(links.length).toBeGreaterThan(0);
  const ids = links.slice(0, 2).reverse().map(path => path.split('/').pop()!);
  const response = await request.get(`/api/meals/lookup?${new URLSearchParams(ids.map(id => ['id', id]))}`);
  expect(response.status()).toBe(200);
  const meals = await response.json();
  expect(meals.map((meal: { id: string }) => meal.id)).toEqual(ids);
  for (const meal of meals) expect(Object.keys(meal).sort()).toEqual(['area', 'genre', 'id', 'title']);
  expect((await request.get('/api/meals/lookup?id=invalid%2Fid')).status()).toBe(400);
  expect((await request.get(`/api/meals/lookup?${new URLSearchParams(Array.from({ length: 21 }, () => ['id', ids[0]]))}`)).status()).toBe(400);
});
