import type { BusinessPlan } from '@prisma/client';

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
