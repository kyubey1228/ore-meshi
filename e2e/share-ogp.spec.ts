import { expect, test, type APIRequestContext } from '@playwright/test';

async function assertImage(request: APIRequestContext, imageUrl: string) {
  const parsed = new URL(imageUrl);
  expect(parsed.protocol).toMatch(/^https?:$/);
  const response = await request.get(imageUrl, { maxRedirects: 3 });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
  expect((await response.body()).subarray(0, 5).toString()).not.toContain('<html');
}

for (const path of ['/', '/meals']) test(`Share / OGP: ${path}に完全なTwitter Cardと有効な画像がある`, async ({ page, request }) => {
  await page.goto(path);
  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', /.+/);
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) await expect(page.locator(`meta[name="${name}"]`)).toHaveAttribute('content', /.+/);
  await assertImage(request, await page.locator('meta[name="twitter:image"]').getAttribute('content') as string);
});

test('Share / OGP: Twitterbotが公開募集のmetadataと画像を認証なしで取得できる', async ({ browser, request }) => {
  const bot = await browser.newPage({ userAgent: 'Twitterbot/1.0' });
  await bot.goto('/meals');
  const links = bot.locator('a[href^="/meals/"]');
  test.skip(await links.count() === 0, '公開中のfixture募集がありません');
  const href = await links.first().getAttribute('href');
  const response = await bot.goto(href as string);
  expect(response?.status()).toBe(200);
  expect(bot.url()).not.toContain('/login');
  const image = await bot.locator('meta[name="twitter:image"]').getAttribute('content');
  expect(image).toBeTruthy();
  await assertImage(request, image as string);
  await bot.close();
});
