import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { E2E_PREFIX, statePath, users } from './fixtures';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).searchParams.get('schema') !== 'e2e_ore_meshi') {
  throw new Error('Chat tests require the isolated e2e_ore_meshi schema.');
}
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;
let ids: Record<string, string>;
let matchId: string;
let mealId: string;
const created: string[] = [];
const endpoint = () => `/api/matches/${matchId}/chat`;
const send = (request: APIRequestContext, body: string, clientMessageId = randomUUID()) => request.post(endpoint(), {
  headers: { Origin: origin }, data: { body, clientMessageId },
});
test.use({ storageState: statePath('user1') });
test.beforeAll(async () => {
  const rows = await db.user.findMany({ where: { twitterId: { in: Object.values(users).map(user => user.twitterId) } } });
  ids = Object.fromEntries(Object.entries(users).map(([key, user]) => [key, rows.find(row => row.twitterId === user.twitterId)!.id]));
});
test.beforeEach(async () => {
  const meal = await db.meal.create({ data: {
    hostId: ids.user1, title: `${E2E_PREFIX}-chat-${randomUUID()}`, area: '渋谷', status: 'MATCHED', maxParticipants: 3,
    budgetMin: 1000, budgetMax: 3000, paymentType: 'SPLIT',
    candidates: { create: { date: new Date(Date.now() - 3600000), startTime: '19:00', endTime: '21:00' } },
  }, include: { candidates: true } });
  mealId = meal.id; created.push(mealId);
  const match = await db.match.create({ data: {
    mealId, candidateId: meal.candidates[0].id, scheduledAt: new Date(Date.now() - 3600000),
    participants: { create: [ids.user1, ids.user2, ids.user3].map(userId => ({ userId })) },
  } });
  matchId = match.id;
});
test.afterAll(async () => {
  await db.meal.deleteMany({ where: { id: { in: created }, title: { startsWith: `${E2E_PREFIX}-chat-` } } });
  await db.$disconnect();
});

test('参加者限定・匿名と店舗の部外者を拒否・CSRF対策', async ({ request, playwright }) => {
  const guest = await playwright.request.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } });
  const outsider = await playwright.request.newContext({ baseURL: origin, storageState: statePath('business') });
  try {
    expect((await guest.get(endpoint())).status()).toBe(401);
    expect((await send(guest, '匿名')).status()).toBe(401);
    expect((await outsider.get(endpoint())).status()).toBe(404);
    expect((await send(outsider, '部外者')).status()).toBe(404);
    expect((await request.post(endpoint(), { headers: { Origin: 'https://evil.example' }, data: { body: '不正送信', clientMessageId: randomUUID() } })).status()).toBe(403);
    expect((await request.post(endpoint(), { data: { body: 'Originなし', clientMessageId: randomUUID() } })).status()).toBe(403);
    const response = await request.get(endpoint());
    expect(response.headers()['cache-control']).toBe('private, no-store');
    expect(await response.json()).toEqual({ state: 'OPEN', messages: [] });
  } finally { await guest.dispose(); await outsider.dispose(); }
});

test('文字数制限・再送の重複防止・連投制限・最新50件', async ({ request }) => {
  for (const body of [' \n ', 'あ'.repeat(1001), 'x'.repeat(10000)]) expect((await send(request, body)).status()).toBe(400);
  const clientMessageId = randomUUID();
  const first = await send(request, '  駅前で集合  ', clientMessageId);
  expect(first.status()).toBe(201);
  const message = (await first.json()).message;
  expect(message.body).toBe('駅前で集合');
  expect((await send(request, '連投')).status()).toBe(429);
  const retry = await send(request, '駅前で集合', clientMessageId);
  expect(retry.status()).toBe(200);
  expect((await retry.json()).message.id).toBe(message.id);
  expect(await db.matchChatMessage.count({ where: { matchId } })).toBe(1);
  await db.matchChatMessage.createMany({ data: Array.from({ length: 55 }, (_, index) => ({
    matchId, senderId: ids.user2, clientMessageId: randomUUID(), body: `履歴${index}`,
    createdAt: new Date(new Date(message.createdAt).getTime() - (60 - index) * 1000),
  })) });
  const result = await (await request.get(endpoint())).json();
  expect(result.messages).toHaveLength(50);
  expect(result.messages[0].body).toBe('履歴6');
  expect(result.messages.at(-1).id).toBe(message.id);
  expect(Object.keys(result.messages[0]).sort()).toEqual(['body', 'createdAt', 'id', 'sender', 'senderId']);
});

test('必要人数成立で開く・店舗ユーザーも参加者なら送受信可能・キャンセル後は閉じる', async ({ request, playwright }) => {
  await db.meal.update({ where: { id: mealId }, data: { status: 'OPEN' } });
  expect(await (await request.get(endpoint())).json()).toEqual({ state: 'WAITING', messages: [] });
  expect((await send(request, 'まだ成立前')).status()).toBe(409);
  await db.meal.update({ where: { id: mealId }, data: { status: 'MATCHED' } });
  await db.matchParticipant.create({ data: { matchId, userId: ids.business } });
  const business = await playwright.request.newContext({ baseURL: origin, storageState: statePath('business') });
  try {
    expect((await send(business, 'お店の入口でお待ちしています')).status()).toBe(201);
    expect((await (await request.get(endpoint())).json()).messages[0].senderId).toBe(ids.business);
    await db.match.update({ where: { id: matchId }, data: { status: 'CANCELLED' } });
    expect(await (await business.get(endpoint())).json()).toEqual({ state: 'CLOSED', messages: [] });
    expect((await send(business, '終了後')).status()).toBe(409);
  } finally { await business.dispose(); }
});

test('同時再送でも1通だけ保存・参加権限を失うと履歴も取得不可', async ({ request }) => {
  const clientMessageId = randomUUID();
  const responses = await Promise.all([send(request, '同時再送', clientMessageId), send(request, '同時再送', clientMessageId)]);
  expect(responses.map(response => response.status()).sort()).toEqual([200, 201]);
  expect(await db.matchChatMessage.count({ where: { matchId } })).toBe(1);
  await db.matchParticipant.delete({ where: { matchId_userId: { matchId, userId: ids.user1 } } });
  expect((await request.get(endpoint())).status()).toBe(404);
  expect((await send(request, '脱退後')).status()).toBe(404);
});

test('募集キャンセルでも履歴を返さず新規送信を拒否・リロード後も閉鎖', async ({ request, page }) => {
  expect((await send(request, 'キャンセル前')).status()).toBe(201);
  await db.meal.update({ where: { id: mealId }, data: { status: 'CANCELLED' } });
  expect(await (await request.get(endpoint())).json()).toEqual({ state: 'CLOSED', messages: [] });
  expect((await send(request, 'キャンセル後')).status()).toBe(409);
  await page.goto(`/matches/${matchId}`);
  const chat = page.getByRole('region', { name: '待ち合わせチャット' });
  await expect(chat.getByText('このチャットは終了しました。')).toBeVisible();
  await page.reload();
  await expect(chat.getByText('このチャットは終了しました。')).toBeVisible();
  await expect(chat.getByRole('log')).toHaveCount(0);
});

test('スマホで3人が会話・募集詳細からチャットへ進める', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const context2 = await browser.newContext({ storageState: statePath('user2') });
  const context3 = await browser.newContext({ storageState: statePath('user3') });
  try {
    const page2 = await context2.newPage();
    await Promise.all([page.goto(`/meals/${mealId}`), page2.goto(`/matches/${matchId}`)]);
    await page.getByRole('link', { name: '待ち合わせチャット →' }).click();
    await expect(page).toHaveURL(new RegExp(`/matches/${matchId}#chat$`));
    const chat = page.getByRole('region', { name: '待ち合わせチャット' });
    const chat2 = page2.getByRole('region', { name: '待ち合わせチャット' });
    await chat.getByLabel('メッセージ', { exact: true }).fill('駅の東口で集合しましょう <script>alert(1)</script>');
    await chat.getByRole('button', { name: '送信する' }).click();
    await expect(chat2.getByRole('log')).toContainText('駅の東口で集合しましょう <script>alert(1)</script>');
    await chat2.getByLabel('メッセージ', { exact: true }).fill('青い服が目印です');
    await chat2.getByRole('button', { name: '送信する' }).click();
    expect((await send(context3.request, '3人目も向かっています')).status()).toBe(201);
    await expect(chat.getByRole('log')).toContainText('青い服が目印です');
    await expect(chat.getByRole('log')).toContainText('3人目も向かっています');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context2.close(); await context3.close(); }
});

test('飯終了で双方の画面が閉じ、履歴が消えて送信も拒否される', async ({ page, browser }) => {
  await db.matchChatMessage.create({ data: { matchId, senderId: ids.user1, clientMessageId: randomUUID(), body: '終了前の待ち合わせ連絡' } });
  const context2 = await browser.newContext({ storageState: statePath('user2') });
  try {
    const page2 = await context2.newPage();
    await Promise.all([page.goto(`/matches/${matchId}`), page2.goto(`/matches/${matchId}`)]);
    const chat = page.getByRole('region', { name: '待ち合わせチャット' });
    const chat2 = page2.getByRole('region', { name: '待ち合わせチャット' });
    await expect(chat.getByRole('log')).toContainText('終了前の待ち合わせ連絡');
    await expect(chat2.getByRole('log')).toContainText('終了前の待ち合わせ連絡');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '飯終了', exact: true }).click();
    await expect(chat.getByText('このチャットは終了しました。')).toBeVisible();
    await expect(chat2.getByText('このチャットは終了しました。')).toBeVisible();
    await expect(chat2.getByRole('log')).toHaveCount(0);
    expect((await send(context2.request, '閉鎖後')).status()).toBe(409);
  } finally { await context2.close(); }
});
