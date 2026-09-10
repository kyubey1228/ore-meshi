import type { BusinessPlan, OrderType, SponsorOrderStatus, SubscriptionStatus } from '@prisma/client';
export type { BusinessCapabilities } from '@/lib/business-capabilities';

export type BillingPrice = {
  plan: Exclude<BusinessPlan, 'FREE'>;
  priceId: string;
  unitAmount: number | null;
  currency: string;
  interval: string | null;
};
export type BusinessPricingCatalog = { sponsoredMeal:number; seatCampaign:number; areaSponsorship:number|null; FREE:0; STANDARD:number; PRO:number; currency:string; discountPercent:{STANDARD:number|null;PRO:number|null} };

export type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

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
