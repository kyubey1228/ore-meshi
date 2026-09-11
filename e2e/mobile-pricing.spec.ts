import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('企業向け料金: スマホ幅でクーポンと計算結果が見切れない', async ({ page }) => {
  await page.goto('/business/pricing');
  await expect(page.getByRole('heading', { name: '月の利用イメージ' })).toBeVisible();
  const coupon = page.getByRole('status');
  await expect(coupon).toBeVisible();
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  const box = await coupon.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewportWidth);
});
