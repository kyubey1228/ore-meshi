import { expect, type Page } from '@playwright/test';

export async function createMeal(page: Page, title: string, maxParticipants = 2) {
  await page.goto('/meals/new');
  await page.getByLabel('どんな飯にする？').fill(title);
  await page.getByLabel('どこ').fill('渋谷');
  await page.getByLabel('何人で？（自分を含む）').fill(String(maxParticipants));
  await page.locator('[data-day]:not([data-outside="true"])').last().click();
  await page.getByRole('button', { name: /夜/ }).click();
  await page.getByLabel('予算の下限').fill('1000');
  await page.getByLabel('予算の上限').fill('5000');
  await page.getByRole('button', { name: 'この飯、一緒に行く人！' }).click();
  await expect(page.getByRole('heading', { name: '募集を作成しました！' })).toBeVisible();
  await page.getByRole('button', { name: 'あとで・募集ページへ' }).click();
  await expect(page).toHaveURL(/\/meals\//);
  return page.url();
}
