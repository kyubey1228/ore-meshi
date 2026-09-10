import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesForPlan } from '../src/lib/business-capabilities';

test('FREEプランでもスポンサー飯・空席スポンサーの購入(下書き作成)は可能', () => {
  const caps = capabilitiesForPlan('FREE');
  assert.equal(caps.canPublishSponsoredMeal, true);
  assert.equal(caps.canCreateSeatCampaign, true);
  assert.equal(caps.hasExposureBoost, false);
  assert.equal(caps.canCreateDirectAd, false);
});

test('STANDARDプランは露出ブースト・Referral分析を得るが、DirectAdやPRO専用機能は不可', () => {
  const caps = capabilitiesForPlan('STANDARD');
  assert.equal(caps.hasExposureBoost, true);
  assert.equal(caps.canViewReferralAnalytics, true);
  assert.equal(caps.canCreateDirectAd, false);
  assert.equal(caps.canViewAdvancedAnalytics, false);
});

test('PROプランはすべての上位capabilityを持つ', () => {
  const caps = capabilitiesForPlan('PRO');
  assert.equal(caps.canCreateDirectAd, true);
  assert.equal(caps.canViewAdvancedAnalytics, true);
  assert.equal(caps.canManageMultipleLocations, true);
  assert.equal(caps.hasExposureBoost, true);
});
