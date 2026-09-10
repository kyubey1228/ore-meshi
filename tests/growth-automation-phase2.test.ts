import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateKFactor } from '../src/lib/k-factor';
import { isGenreSeoIndexable } from '../src/lib/seo-quality';
import { buildEmptyState } from '../src/lib/empty-state';
import { evaluateBusinessLifecycle } from '../src/lib/business-lifecycle';

test('K-factorは確認済み招待数とActivation率から計算する', () => {
  const result = calculateKFactor({ activatedUsers: 10, invitesSent: 20, uniqueInviters: 6, inviteClicks: 12, inviteSignups: 6, inviteActivated: 4 });
  assert.equal(result.invitesPerActivatedUser, 2); assert.equal(result.inviteActivationRate, .2); assert.equal(result.kFactor, .4); assert.equal(result.sampleIsSmall, false);
});
test('K-factorは母数0でもNaNを返さない', () => assert.equal(calculateKFactor({ activatedUsers: 0, invitesSent: 0, uniqueInviters: 0, inviteClicks: 0, inviteSignups: 0, inviteActivated: 0 }).kFactor, 0));
test('SEO Quality Gateは十分な実データとgenre metadataを要求する', () => {
  assert.equal(isGenreSeoIndexable({ meals30d: 3, demand30d: 0, completed30d: 0, hasGenreMetadata: true }), true);
  assert.equal(isGenreSeoIndexable({ meals30d: 100, demand30d: 0, completed30d: 0, hasGenreMetadata: false }), false);
});
test('Empty Stateの需要数は最低母数未満で公開しない', () => {
  assert.equal(buildEmptyState({ area: '新宿', demandCount: 2, nearbyCount: 0, sampleSize: 0, variant: 'C' }).demandVisible, false);
  assert.match(buildEmptyState({ area: '新宿', demandCount: 3, nearbyCount: 0, sampleSize: 0, variant: 'C' }).headline, /3人/);
});
test('店舗Lifecycleは登録3日後の未掲載と7日以内の終了予定を検出する', () => {
  const now = new Date('2026-09-11T00:00:00Z');
  const result = evaluateBusinessLifecycle({ createdAt: new Date('2026-09-06T00:00:00Z'), campaignCount: 0, subscription: { cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-09-15T00:00:00Z') } }, now);
  assert.deepEqual(result, { needsActivationReminder: true, subscriptionEnding: true });
});
