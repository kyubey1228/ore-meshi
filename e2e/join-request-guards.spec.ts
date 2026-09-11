import { expect, test } from '@playwright/test';
import { statePath, users } from './fixtures';
import { createMeal } from './helpers';
import { db } from './db';

test.describe.serial('参加申請のガード(自分への応募・締切・キャンセル済み募集)', () => {
  let mealUrl: string;
  let mealId: string;

  test('募集を作成する', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') });
    const page = await context.newPage();
    mealUrl = await createMeal(page, `${users.user1.name}-ガード検証飯-${Date.now()}`, 3);
    mealId = mealUrl.split('/').filter(Boolean).pop()!;
    await context.close();
  });

  test('自分への応募防止: 募集者本人には参加ボタンが表示されない', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    await expect(page.getByRole('button', { name: 'この募集に参加する' })).toHaveCount(0);
    await context.close();
  });

  test('締切後応募防止: 締切を過去に設定すると参加希望が拒否される', async ({ browser }) => {
    await db.meal.update({ where: { id: mealId }, data: { deadline: new Date(Date.now() - 60 * 60 * 1000) } });
    const context = await browser.newContext({ storageState: statePath('user2') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    await page.getByRole('button', { name: 'この募集に参加する' }).click();
    // getByRole('alert')はNext.jsのroute announcer(#__next-route-announcer__)もヒットするため、
    // ActionFormが失敗時に付ける.errorクラスで一意に絞り込む。
    await expect(page.locator('p.error')).toContainText('締切');
    const count = await db.joinRequest.count({ where: { mealId } });
    expect(count).toBe(0);
    await db.meal.update({ where: { id: mealId }, data: { deadline: null } });
    await context.close();
  });

  test('キャンセル済み募集への応募防止: 募集キャンセル後は参加ボタンが表示されない', async ({ browser }) => {
    const hostContext = await browser.newContext({ storageState: statePath('user1') });
    const hostPage = await hostContext.newPage();
    await hostPage.goto(mealUrl);
    hostPage.once('dialog', dialog => dialog.accept());
    await hostPage.getByRole('button', { name: '募集をキャンセル' }).click();
    await expect(hostPage.getByRole('status')).toContainText('保存しました');
    await hostContext.close();

    const guestContext = await browser.newContext({ storageState: statePath('user2') });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(mealUrl);
    await expect(guestPage.getByRole('button', { name: 'この募集に参加する' })).toHaveCount(0);
    await guestContext.close();

    const meal = await db.meal.findUnique({ where: { id: mealId } });
    expect(meal?.status).toBe('CANCELLED');
  });
});

test.describe.serial('参加申請のガード(二重応募・二重承認・他人の承認・キャンセル)', () => {
  let mealUrl: string;
  let mealId: string;
  let user1Id: string;
  let user2Id: string;

  test.beforeAll(async () => {
    user1Id = (await db.user.findUniqueOrThrow({ where: { twitterId: users.user1.twitterId } })).id;
    user2Id = (await db.user.findUniqueOrThrow({ where: { twitterId: users.user2.twitterId } })).id;
  });

  test('募集を作成する', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('business') });
    const page = await context.newPage();
    mealUrl = await createMeal(page, `E2Eガード検証飯2-${Date.now()}`, 3);
    mealId = mealUrl.split('/').filter(Boolean).pop()!;
    await context.close();
  });

  test('二重応募防止: 同じユーザーが同時に2回参加希望を送っても1件しか保存されない', async ({ browser }) => {
    const c1 = await browser.newContext({ storageState: statePath('user1') });
    const c2 = await browser.newContext({ storageState: statePath('user1') });
    const p1 = await c1.newPage();
    const p2 = await c2.newPage();
    await p1.goto(mealUrl);
    await p2.goto(mealUrl);
    await Promise.all([
      p1.getByRole('button', { name: 'この募集に参加する' }).click(),
      p2.getByRole('button', { name: 'この募集に参加する' }).click(),
    ]);
    await Promise.all([
      p1.waitForSelector('[role="status"], [role="alert"]'),
      p2.waitForSelector('[role="status"], [role="alert"]'),
    ]);
    const count = await db.joinRequest.count({ where: { mealId, userId: user1Id } });
    expect(count).toBe(1);
    await c1.close();
    await c2.close();
  });

  test('他人の応募承認防止: 募集者以外には承認ボタンが表示されない', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user2') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    await expect(page.getByRole('button', { name: '一緒に行く' })).toHaveCount(0);
    await context.close();
  });

  test('user2も参加希望を送る', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user2') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    await page.getByRole('button', { name: 'この募集に参加する' }).click();
    await expect(page.getByRole('status')).toContainText('保存しました');
    await context.close();
  });

  test('二重承認防止: 同じ参加希望を同時に2回承認しても1回しか処理されない', async ({ browser }) => {
    const before = await db.joinRequest.findFirstOrThrow({ where: { mealId, userId: user1Id } });
    const c1 = await browser.newContext({ storageState: statePath('business') });
    const c2 = await browser.newContext({ storageState: statePath('business') });
    const p1 = await c1.newPage();
    const p2 = await c2.newPage();
    await p1.goto(mealUrl);
    await p2.goto(mealUrl);
    await Promise.all([
      p1.getByRole('button', { name: '一緒に行く' }).first().click(),
      p2.getByRole('button', { name: '一緒に行く' }).first().click(),
    ]);
    await p1.waitForTimeout(2000);
    const after = await db.joinRequest.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.status).toBe('ACCEPTED');
    const match = await db.match.findUnique({ where: { mealId } });
    const participants = await db.matchParticipant.count({ where: { matchId: match!.id } });
    // maxParticipants=3で募集し、まだuser2の希望は未承認のため参加者はホスト+user1の2人のはず(3人に増えていない=二重処理されていない)。
    expect(participants).toBe(2);
    await c1.close();
    await c2.close();
  });

  test('応募キャンセル: PENDINGの参加希望は取り下げられる', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user2') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    await page.getByRole('button', { name: '参加希望を取り下げる' }).click();
    await expect(page.getByRole('status')).toContainText('保存しました');
    await context.close();
    const request = await db.joinRequest.findFirst({ where: { mealId, userId: user2Id } });
    expect(request?.status).toBe('CANCELLED');
  });
});
