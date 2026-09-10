import type { BusinessPlan, SubscriptionStatus } from '@prisma/client';

const ENABLED_STATUSES = new Set<SubscriptionStatus>(['ACTIVE', 'TRIALING', 'PAST_DUE']);

// getBusinessPlan()(server/billing/index.ts)と同じ判定ロジックの純粋関数版。
// N+1を避けるため一覧クエリでBusinessAccount+Subscriptionを一括取得した後、行ごとにDB往復せず判定するために使う。
export function effectivePlanFromAccount(planOverride: BusinessPlan | null, subscription: { plan: BusinessPlan; status: SubscriptionStatus; currentPeriodEnd: Date } | null): BusinessPlan {
  if (planOverride) return planOverride;
  if (!subscription || !ENABLED_STATUSES.has(subscription.status) || subscription.currentPeriodEnd <= new Date()) return 'FREE';
  return subscription.plan;
}

// 表示専用のヘルパー(決済金額の計算には使わない。実際の決済金額は常にStripe Checkout Session側で確定する)。
export function discountedPriceYen(baseAmount: number, percentOff: number | null): number | null {
  if (percentOff === null) return null;
  return Math.round((baseAmount * (1 - percentOff / 100)) / 100);
}

export type BusinessCapabilities = {
  plan: BusinessPlan;
  canPublishSponsoredMeal: boolean;
  canCreateSeatCampaign: boolean;
  canCreateDirectAd: boolean;
  canViewAdvancedAnalytics: boolean;
  canViewReferralAnalytics: boolean;
  canManageMultipleLocations: boolean;
  hasExposureBoost: boolean;
};

export function capabilitiesForPlan(plan: BusinessPlan): BusinessCapabilities {
  const standard = plan === 'STANDARD' || plan === 'PRO';
  const pro = plan === 'PRO';
  return {
    plan,
    // スポンサー飯/空席スポンサーの購入自体は全プランで可能(Subscriptionは割引/露出/分析/自動化を提供するものであり、
    // 購入権限そのものを制限しない)。STANDARD/PROは掲載順の露出ブースト・詳細な需要分析(Demand Intelligence)を得る。
    canPublishSponsoredMeal: true,
    canCreateSeatCampaign: true,
    canCreateDirectAd: pro,
    canViewAdvancedAnalytics: pro,
    canViewReferralAnalytics: standard,
    canManageMultipleLocations: pro,
    hasExposureBoost: standard,
  };
}
