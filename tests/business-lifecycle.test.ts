import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBusinessLifecycle, evaluateCampaignWindow } from '../src/lib/business-lifecycle';

test('evaluateBusinessLifecycleは掲載0件・3〜10日経過でneedsActivationReminderをtrueにする', () => {
  const now = new Date('2026-01-11T00:00:00Z');
  const account = { createdAt: new Date('2026-01-05T00:00:00Z'), campaignCount: 0, subscription: null };
  assert.equal(evaluateBusinessLifecycle(account, now).needsActivationReminder, true);
});

test('evaluateBusinessLifecycleは掲載が1件でもあればneedsActivationReminderをfalseにする', () => {
  const now = new Date('2026-01-11T00:00:00Z');
  const account = { createdAt: new Date('2026-01-05T00:00:00Z'), campaignCount: 1, subscription: null };
  assert.equal(evaluateBusinessLifecycle(account, now).needsActivationReminder, false);
});

test('evaluateBusinessLifecycleはcancelAtPeriodEndかつ終了7日以内でsubscriptionEndingをtrueにする', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const account = { createdAt: new Date('2025-01-01T00:00:00Z'), campaignCount: 3, subscription: { cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-01-05T00:00:00Z') } };
  assert.equal(evaluateBusinessLifecycle(account, now).subscriptionEnding, true);
});

test('evaluateBusinessLifecycleはcancelAtPeriodEndがfalseならsubscriptionEndingをfalseにする(自動更新継続中)', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const account = { createdAt: new Date('2025-01-01T00:00:00Z'), campaignCount: 3, subscription: { cancelAtPeriodEnd: false, currentPeriodEnd: new Date('2026-01-05T00:00:00Z') } };
  assert.equal(evaluateBusinessLifecycle(account, now).subscriptionEnding, false);
});

test('evaluateCampaignWindowは終了2時間より前ならnoViews/summaryとも出さない', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const result = evaluateCampaignWindow({ endsAt: new Date('2026-01-01T03:00:00Z'), views: 0 }, now);
  assert.deepEqual(result, { noViews: false, summary: false });
});

test('evaluateCampaignWindowは終了2時間以内かつ閲覧0件ならnoViewsを出す', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const result = evaluateCampaignWindow({ endsAt: new Date('2026-01-01T01:00:00Z'), views: 0 }, now);
  assert.deepEqual(result, { noViews: true, summary: false });
});

test('evaluateCampaignWindowは終了2時間以内でも閲覧があればnoViewsを出さない', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const result = evaluateCampaignWindow({ endsAt: new Date('2026-01-01T01:00:00Z'), views: 3 }, now);
  assert.deepEqual(result, { noViews: false, summary: false });
});

// 回帰テスト: 修正前は外側のfilterが`endsAt > now`を要求していたため、endsAt <= nowを見るsummary分岐が
// 実際には一度も真にならない死んだコードになっていた。
test('evaluateCampaignWindowは終了済み(endsAt<=now)ならsummaryを出す(noViewsは出さない)', () => {
  const now = new Date('2026-01-01T02:00:00Z');
  const result = evaluateCampaignWindow({ endsAt: new Date('2026-01-01T01:00:00Z'), views: 5 }, now);
  assert.deepEqual(result, { noViews: false, summary: true });
});
