import { expect, test } from '@playwright/test';
import { multiMealTitle, statePath } from './fixtures';
import { createMeal } from './helpers';

test.describe.serial('ビジネスと複数個人ユーザー', () => {
  let mealUrl: string;
  test('店舗オーナーが3人募集を作成する', async ({ browser }) => { const c=await browser.newContext({storageState:statePath('business')});const p=await c.newPage();mealUrl=await createMeal(p,multiMealTitle,3);await c.close(); });
  for (const key of ['user1','user2'] as const) test(`${key}が同じ募集へ参加する`, async ({ browser }) => { const c=await browser.newContext({storageState:statePath(key)});const p=await c.newPage();await p.goto(mealUrl);await p.getByRole('button',{name:'この募集に参加する'}).click();await expect(p.getByRole('status')).toContainText('保存しました');await c.close(); });
  test('店舗オーナーが2名を順に承認し満員成立する', async ({ browser }) => { const c=await browser.newContext({storageState:statePath('business')});const p=await c.newPage();await p.goto(mealUrl);const buttons=p.getByRole('button',{name:'一緒に行く'});await buttons.first().click();await expect(buttons).toHaveCount(1,{timeout:20_000});await buttons.first().click();await expect(p.getByRole('heading',{name:'飯、決まった。'})).toBeVisible({timeout:20_000});await c.close(); });
  test('参加者全員から成立済み募集と予定を確認できる', async ({ browser }) => { for(const key of ['business','user1','user2'] as const){const c=await browser.newContext({storageState:statePath(key)});const p=await c.newPage();await p.goto(mealUrl);await expect(p.getByText(/飯、決まった|成立/).first()).toBeVisible();await c.close();} });
});
