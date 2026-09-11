import { expect, test } from '@playwright/test';
import { statePath, users } from './fixtures';
import { createMeal } from './helpers';
import { db } from './db';
import { waitForCondition } from './wait';

test.describe.serial('Capacity境界・reload後の状態維持・成立通知', () => {
  let mealUrl: string;
  let mealId: string;
  let user3Id: string;

  test.beforeAll(async () => {
    user3Id = (await db.user.findUniqueOrThrow({ where: { twitterId: users.user3.twitterId } })).id;
  });

  test('募集を作成し、3人が参加希望を送る', async ({ browser }) => {
    const hostContext = await browser.newContext({ storageState: statePath('business') });
    const hostPage = await hostContext.newPage();
    mealUrl = await createMeal(hostPage, `E2E容量境界飯-${Date.now()}`, 3);
    mealId = mealUrl.split('/').filter(Boolean).pop()!;
    await hostContext.close();

    for (const key of ['user1', 'user2', 'user3'] as const) {
      const context = await browser.newContext({ storageState: statePath(key) });
      const page = await context.newPage();
      await page.goto(mealUrl);
      await page.getByRole('button', { name: 'この募集に参加する' }).click();
      await expect(page.getByRole('status')).toContainText('保存しました');
      await context.close();
    }
  });

  test('Capacity境界: 定員を満たすまで承認すると、残りのPENDINGは自動的にREJECTEDになる', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('business') });
    const page = await context.newPage();
    await page.goto(mealUrl);
    // maxParticipants=3で3人が応募しているため、1人承認した時点では残り2件がPENDINGのまま
    // (host+1人=2人でまだ定員に満たない)。2人目を承認した時点で定員に達しMATCHEDになる。
    const buttons = page.getByRole('button', { name: '一緒に行く' });
    await buttons.first().click();
    await expect(buttons).toHaveCount(2, { timeout: 20_000 });
    await buttons.first().click();
    await expect(page.getByRole('heading', { name: '飯、決まった。' })).toBeVisible({ timeout: 20_000 });
    await context.close();

    const meal = await db.meal.findUniqueOrThrow({ where: { id: mealId } });
    expect(meal.status).toBe('MATCHED');
    const remainingRequest = await db.joinRequest.findFirstOrThrow({ where: { mealId, userId: user3Id } });
    expect(remainingRequest.status).toBe('REJECTED');
    const match = await db.match.findUniqueOrThrow({ where: { mealId } });
    const participantCount = await db.matchParticipant.count({ where: { matchId: match.id } });
    expect(participantCount).toBe(3);
  });

  test('reload後の状態維持: リロードしても成立表示が保たれる', async ({ browser }) => {
    for (const key of ['business', 'user1', 'user2'] as const) {
      const context = await browser.newContext({ storageState: statePath(key) });
      const page = await context.newPage();
      await page.goto(mealUrl);
      await expect(page.getByText(/飯、決まった|成立/).first()).toBeVisible();
      await page.reload();
      await expect(page.getByText(/飯、決まった|成立/).first()).toBeVisible();
      await context.close();
    }
  });

  test('成立通知: 参加者に未読のMEAL_MATCHED通知が届き、既読状態がreload後も維持される', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') });
    const page = await context.newPage();
    await page.goto('/notifications');
    const row = page.locator('.notification-item.unread', { hasText: '飯、決まりました' });
    await expect(row).toBeVisible();
    await row.click();
    await page.waitForURL(/\/meals\//);
    await page.goto('/notifications');
    await expect(page.locator('.notification-item.unread', { hasText: '飯、決まりました' })).toHaveCount(0);
    await context.close();
  });
});

test.describe.serial('Completed(二重終了防止)とDiningFeedback(重複防止)', () => {
  let matchId: string;
  let hostId: string;
  let guestId: string;

  test.beforeAll(async () => {
    hostId = (await db.user.findUniqueOrThrow({ where: { twitterId: users.user1.twitterId } })).id;
    guestId = (await db.user.findUniqueOrThrow({ where: { twitterId: users.user2.twitterId } })).id;
  });

  test('募集を作成し成立させ、成立日時を過去に書き換える(Completed操作を可能にするため)', async ({ browser }) => {
    const hostContext = await browser.newContext({ storageState: statePath('user1') });
    const hostPage = await hostContext.newPage();
    const mealUrl = await createMeal(hostPage, `E2E完了検証飯-${Date.now()}`, 2);
    const mealId = mealUrl.split('/').filter(Boolean).pop()!;
    await hostContext.close();

    const guestContext = await browser.newContext({ storageState: statePath('user2') });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(mealUrl);
    await guestPage.getByRole('button', { name: 'この募集に参加する' }).click();
    await expect(guestPage.getByRole('status')).toContainText('保存しました');
    await guestContext.close();

    const approveContext = await browser.newContext({ storageState: statePath('user1') });
    const approvePage = await approveContext.newPage();
    await approvePage.goto(mealUrl);
    await approvePage.getByRole('button', { name: '一緒に行く' }).click();
    await expect(approvePage.getByRole('heading', { name: '飯、決まった。' })).toBeVisible({ timeout: 20_000 });
    await approveContext.close();

    const match = await db.match.findUniqueOrThrow({ where: { mealId } });
    await db.match.update({ where: { id: match.id }, data: { scheduledAt: new Date(Date.now() - 60 * 60 * 1000) } });
    matchId = match.id;
  });

  test('二重Complete防止: 2人が同時に「飯終了」を押しても1回しか処理されない', async ({ browser }) => {
    const c1 = await browser.newContext({ storageState: statePath('user1') });
    const c2 = await browser.newContext({ storageState: statePath('user2') });
    const p1 = await c1.newPage();
    const p2 = await c2.newPage();
    await p1.goto(`/matches/${matchId}`);
    await p2.goto(`/matches/${matchId}`);
    await Promise.all([
      p1.getByRole('button', { name: '飯終了' }).click(),
      p2.getByRole('button', { name: '飯終了' }).click(),
    ]);
    const match = await waitForCondition(
      () => db.match.findUniqueOrThrow({ where: { id: matchId } }),
      value => value.status !== 'ACTIVE',
    );
    expect(match.status).toBe('COMPLETED');
    await c1.close();
    await c2.close();
  });

  test('Completed後は「飯終了」ボタンが表示されない(UIからの再実行不可)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') });
    const page = await context.newPage();
    await page.goto(`/matches/${matchId}`);
    await expect(page.getByRole('button', { name: '飯終了' })).toHaveCount(0);
    await context.close();
  });

  test('DiningFeedback: 感想を送るとUIに反映され、再送は防止される', async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath('user1') });
    const page = await context.newPage();
    await page.goto(`/matches/${matchId}`);
    await page.getByRole('button', { name: 'この人への感想を送る' }).click();
    await expect(page.getByRole('status')).toContainText('保存しました');
    await page.reload();
    await expect(page.getByText('感想を送りました。')).toBeVisible();
    await expect(page.getByRole('button', { name: 'この人への感想を送る' })).toHaveCount(0);
    await context.close();

    const count = await db.diningFeedback.count({ where: { matchId, fromUserId: hostId, toUserId: guestId } });
    expect(count).toBe(1);
  });

  test('Recommendation: DiningFeedbackが推薦プロフィール学習(UserRecommendationProfile)へ反映される', async () => {
    const profile = await db.userRecommendationProfile.findUnique({ where: { userId: hostId } });
    expect(profile, 'submitDiningFeedback後にUserRecommendationProfileが作られていない').toBeTruthy();
  });
});
