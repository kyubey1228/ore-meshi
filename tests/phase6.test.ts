import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivePlanFromAccount, discountedPriceYen } from '../src/lib/business-capabilities';
import { scoreMeal, type RankableMeal } from '../src/lib/meal-ranking';

test('effectivePlanFromAccountはplanOverrideを最優先する', () => {
  assert.equal(effectivePlanFromAccount('PRO', null), 'PRO');
});

test('effectivePlanFromAccountはSubscriptionが期限切れならFREEを返す', () => {
  const expired = { plan: 'STANDARD' as const, status: 'ACTIVE' as const, currentPeriodEnd: new Date(Date.now() - 1000) };
  assert.equal(effectivePlanFromAccount(null, expired), 'FREE');
});

test('effectivePlanFromAccountは有効なSubscriptionのプランを返す', () => {
  const active = { plan: 'PRO' as const, status: 'ACTIVE' as const, currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24) };
  assert.equal(effectivePlanFromAccount(null, active), 'PRO');
});

test('discountedPriceYenは未設定(null)ならnullを返す(割引なし)', () => {
  assert.equal(discountedPriceYen(5000, null), null);
});

test('discountedPriceYenはパーセント割引後の円額を計算する(JPYはzero-decimalなので/100換算しない)', () => {
  assert.equal(discountedPriceYen(5000, 10), 4500);
});

function baseMeal(overrides: Partial<RankableMeal> = {}): RankableMeal {
  return {
    id: 'meal-1', area: '渋谷', genre: '焼肉', maxParticipants: 4, createdAt: new Date(),
    host: { createdAt: new Date(), bio: null, image: null, diningTypes: [] },
    candidates: [], _count: { joinRequests: 1 },
    ...overrides,
  };
}

test('スポンサーMealでなければsponsor boostは加点されない', () => {
  const withoutSponsor = scoreMeal(baseMeal());
  const withEmptySponsor = scoreMeal(baseMeal({ sponsoredMeals: [] }));
  assert.equal(withoutSponsor.score, withEmptySponsor.score);
});

test('FREEプランのスポンサーは基本ボーナスのみで、PROのようなLast Seat Boostは付かない', () => {
  const account = { planOverride: 'FREE' as const, subscription: null };
  const scored = scoreMeal(baseMeal({ maxParticipants: 2, _count: { joinRequests: 0 }, sponsoredMeals: [{ businessAccount: account }] }));
  const unsponsored = scoreMeal(baseMeal({ maxParticipants: 2, _count: { joinRequests: 0 } }));
  assert.equal(scored.score - unsponsored.score, 15);
});

test('PROプランかつ残り1人の場合のみLast Seat Boostが加点される(PROでも満席でなければ加点されない)', () => {
  const account = { planOverride: 'PRO' as const, subscription: null };
  const lastSlot = scoreMeal(baseMeal({ maxParticipants: 2, _count: { joinRequests: 0 }, sponsoredMeals: [{ businessAccount: account }] }));
  const notLastSlot = scoreMeal(baseMeal({ maxParticipants: 4, _count: { joinRequests: 0 }, sponsoredMeals: [{ businessAccount: account }] }));
  // lastSlot: remaining=1 → lastSlotBonus(50) + sponsorBonus(15+25=40)。notLastSlot: remaining=3 → sponsorBonus(15)のみ。
  assert.equal(lastSlot.score - notLastSlot.score, 50 + 40 - 15);
});

test('PROの店舗Boostはareaが実際に一致する場合のみ加点される(無条件の1位固定にはならない)', () => {
  const account = { planOverride: 'STANDARD' as const, subscription: null };
  const matchingArea = scoreMeal(baseMeal({ sponsoredMeals: [{ businessAccount: account }] }), { preferredArea: '渋谷' });
  const nonMatchingArea = scoreMeal(baseMeal({ sponsoredMeals: [{ businessAccount: account }] }), { preferredArea: '新宿' });
  assert.ok(matchingArea.score > nonMatchingArea.score);
});
