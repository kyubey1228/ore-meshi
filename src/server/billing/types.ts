import type { BusinessPlan, OrderType, SponsorOrderStatus, SubscriptionStatus } from '@prisma/client';

export type BillingPrice = {
  plan: Exclude<BusinessPlan, 'FREE'>;
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
};
export type BusinessPricingCatalog = { sponsoredMeal:number; seatCampaign:number; FREE:0; STANDARD:number; PRO:number; currency:string };

export type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

export type BusinessCapabilities = {
  plan: BusinessPlan;
  canPublishSponsoredMeal: boolean;
  canCreateSeatCampaign: boolean;
  canCreateDirectAd: boolean;
  canViewAdvancedAnalytics: boolean;
  canViewReferralAnalytics: boolean;
  canManageMultipleLocations: boolean;
};

export type BusinessBillingState = {
  businessAccountId: string;
  plan: BusinessPlan;
  subscription: null | {
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  hasBillingCustomer: boolean;
  prices: BillingPrice[];
};

export type SponsorOrderState = {
  id: string;
  status: SponsorOrderStatus;
  paidAt: Date | null;
  orderType: OrderType;
  campaignId: string;
};
