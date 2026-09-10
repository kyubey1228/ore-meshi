import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOpportunityScore, rankOpportunity, MIN_BUSINESS_SAMPLE_SIZE, generateSalesCopy } from '../src/lib/business-opportunity';

test('computeOpportunityScoreは需要+供給不足×2+実績で算出する', () => {
  assert.equal(computeOpportunityScore({ demandIntents: 10, activeMeals: 4, completedMeals: 2 }), 10 + 6 * 2 + 2);
});

test('computeOpportunityScoreは供給過多でも負のスコアにならない(gapは0でクリップ)', () => {
  assert.equal(computeOpportunityScore({ demandIntents: 2, activeMeals: 10, completedMeals: 0 }), 2 + 0 + 0);
});

test('rankOpportunityはMIN_BUSINESS_SAMPLE_SIZE未満のセルを除外する', () => {
  const cells = [
    { area: 'A', genre: 'g', demandIntents: 1, activeMeals: 1, matchedMeals: 0, completedMeals: 0, estimatedParticipants: 0 },
    { area: 'B', genre: 'g', demandIntents: MIN_BUSINESS_SAMPLE_SIZE, activeMeals: 0, matchedMeals: 0, completedMeals: 0, estimatedParticipants: 0 },
  ];
  const ranked = rankOpportunity(cells, 10);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].area, 'B');
});

test('generateSalesCopyはデータが十分な場合、実数値を埋め込む', () => {
  const copy = generateSalesCopy({ area: '千葉駅', genre: '焼肉', demandIntents: 42, activeMeals: 5, days: 7 });
  assert.equal(copy.dataSufficient, true);
  assert.match(copy.contactForm, /42件/);
  assert.match(copy.email, /千葉駅/);
});

test('generateSalesCopyはデータ不足の場合、数値を出さない', () => {
  const copy = generateSalesCopy({ area: '船橋駅', genre: 'ラーメン', demandIntents: 1, activeMeals: 0, days: 7 });
  assert.equal(copy.dataSufficient, false);
  assert.doesNotMatch(copy.contactForm, /\d+件/);
  assert.match(copy.contactForm, /食事相手を探しているユーザーがいます/);
});
