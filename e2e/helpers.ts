import { expect, type Page } from '@playwright/test';

export async function createMeal(page: Page, title: string, maxParticipants = 2) {
  await page.goto('/meals/new');
  await page.getByLabel('エリア').fill('渋谷');
  await page.getByLabel('ジャンル・お店（任意）').fill(title);
  await page.getByLabel('募集人数').fill(String(maxParticipants));
  await page.getByRole('button', { name: 'この内容で募集する' }).click();
  await expect(page).toHaveURL(url => /^\/meals\/[^/]+$/.test(url.pathname) && url.pathname !== '/meals/new', { timeout: 30_000 });
  return page.url();
}
