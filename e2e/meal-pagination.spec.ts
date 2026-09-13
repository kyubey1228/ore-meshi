import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { E2E_PREFIX, users } from './fixtures';

const area = `${E2E_PREFIX}-pagination`;
let prisma: PrismaClient;
const date = new Date(); date.setUTCDate(date.getUTCDate() + 3); date.setUTCHours(0, 0, 0, 0);
const purposeSlug = `${E2E_PREFIX}-pagination`;

test.beforeAll(async () => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url || new URL(url).searchParams.get('schema') !== 'e2e_ore_meshi') throw new Error('Pagination fixtures require the isolated e2e_ore_meshi schema.');
  prisma = new PrismaClient({ datasources: { db: { url } } });
  const host = await prisma.user.findUniqueOrThrow({ where: { twitterId: users.user1.twitterId }, select: { id: true } });
  const purpose = await prisma.mealPurpose.upsert({ where: { slug: purposeSlug }, create: { slug: purposeSlug, label: 'ページ分割検証' }, update: { isActive: true } });
  const base = Date.now();
  const meals = Array.from({ length: 30 }, (_, i) => ({
    id: `${E2E_PREFIX}-pagination-${i}`, hostId: host.id, title: `${E2E_PREFIX}-pagination-${i}`, area,
    budgetMin: 1000, budgetMax: 3000, paymentType: 'SPLIT' as const,
    maxParticipants: i < 5 ? 4 : 2, createdAt: new Date(base - i * 1000),
  }));
  await prisma.meal.createMany({ data: meals });
  await prisma.mealCandidate.createMany({ data: meals.map(meal => ({ mealId: meal.id, date, startTime: '19:00', endTime: '21:00' })) });
  await prisma.mealPurposeRelation.createMany({ data: meals.map(meal => ({ mealId: meal.id, purposeId: purpose.id })) });
});
test.afterAll(async () => { await prisma?.$disconnect(); });

test('12件ずつDBで分割し、次・前・最終ページで重複や欠落がない', async ({ page }) => {
  await page.goto(`/meals?area=${encodeURIComponent(area)}`);
  const cards = page.locator('[data-meal-results="ready"] .meal-card .card-cta');
  await expect(cards).toHaveCount(12);
  const first = await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')));
  await expect(page.getByRole('link', { name: '前の12件' })).toHaveCount(0);
  await page.getByRole('link', { name: '次の12件' }).click();
  await expect(page.getByText('2ページ目', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(12);
  const second = await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')));
  expect(second.some(id => first.includes(id))).toBe(false);
  await page.getByRole('link', { name: '次の12件' }).click();
  await expect(page.getByText('3ページ目', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(6);
  const third = await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')));
  expect(new Set([...first, ...second, ...third]).size).toBe(30);
  await expect(page.getByRole('link', { name: '次の12件' })).toHaveCount(0);
  await page.getByRole('link', { name: '前の12件' }).click();
  await expect(page.getByText('2ページ目', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(12);
  expect((await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')))).sort()).toEqual(second.sort());
});

test('残席・目的・日付・予算を分割前に適用し検索条件を次ページへ引き継ぐ', async ({ page }) => {
  const query = new URLSearchParams({ area, remaining: '1', purpose: purposeSlug, date: date.toISOString().slice(0, 10), budget: '3000', paymentType: 'SPLIT' });
  await page.goto(`/meals?${query}`);
  const cards = page.locator('[data-meal-results="ready"] .meal-card .card-cta');
  await expect(cards).toHaveCount(12);
  const ids = await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href')));
  expect(ids).not.toContain(`/meals/${E2E_PREFIX}-pagination-0`);
  await page.getByRole('link', { name: '次の12件' }).click();
  await expect(page.getByText('2ページ目', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(12);
  for (const [key, value] of query) expect(new URL(page.url()).searchParams.get(key)).toBe(value);
  await page.getByRole('link', { name: '次の12件' }).click();
  await expect(page.getByText('3ページ目', { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(page.getByRole('link', { name: '次の12件' })).toHaveCount(0);
});

test('存在しないページから前へ戻れ、クイック条件変更時は1ページ目へ戻る', async ({ page }) => {
  await page.goto(`/meals?area=${encodeURIComponent(area)}&page=4`);
  await expect(page.locator('[data-meal-results="empty"]')).toBeVisible();
  await expect(page.getByRole('link', { name: '前の12件' })).toBeVisible();
  await page.getByRole('link', { name: 'あと1人', exact: true }).click();
  await expect(page.locator('[data-meal-results="ready"] .meal-card')).toHaveCount(12);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
});
