import 'server-only';
import type { BusinessPlan } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { requireBillingMembership } from './auth';
import { getOneTimePriceId, getSubscriptionPriceId } from './config';
import type { BillingPrice, BusinessBillingState, BusinessCapabilities, BusinessPricingCatalog, SponsorOrderState } from './types';

const enabledStatuses = new Set(['ACTIVE', 'TRIALING', 'PAST_DUE']);

export async function getBusinessPlan(businessAccountId?: string): Promise<BusinessPlan> {
  const membership = await requireBillingMembership(businessAccountId);
  if (membership.businessAccount.planOverride) return membership.businessAccount.planOverride;
  const subscription = await prisma.businessSubscription.findUnique({ where: { businessAccountId: membership.businessAccountId } });
  if (!subscription || !enabledStatuses.has(subscription.status) || subscription.currentPeriodEnd <= new Date()) return 'FREE';
  return subscription.plan;
}

export function capabilitiesForPlan(plan: BusinessPlan): BusinessCapabilities {
  const standard = plan === 'STANDARD' || plan === 'PRO';
  const pro = plan === 'PRO';
  return {
    plan,
    canPublishSponsoredMeal: standard,
    canCreateSeatCampaign: standard,
    canCreateDirectAd: pro,
    canViewAdvancedAnalytics: pro,
    canViewReferralAnalytics: standard,
    canManageMultipleLocations: pro,
  };
}

export async function getBusinessCapabilities(businessAccountId?: string) {
  return capabilitiesForPlan(await getBusinessPlan(businessAccountId));
}

export async function canPublishSponsoredMeal(businessAccountId?: string) { return (await getBusinessCapabilities(businessAccountId)).canPublishSponsoredMeal; }
export async function canCreateSeatCampaign(businessAccountId?: string) { return (await getBusinessCapabilities(businessAccountId)).canCreateSeatCampaign; }
export async function canCreateDirectAd(businessAccountId?: string) { return (await getBusinessCapabilities(businessAccountId)).canCreateDirectAd; }
export async function canViewAdvancedAnalytics(businessAccountId?: string) { return (await getBusinessCapabilities(businessAccountId)).canViewAdvancedAnalytics; }

export async function getBusinessSubscriptionPrices(): Promise<BillingPrice[]> {
  try {
    const plans = ['STANDARD', 'PRO'] as const;
    return await Promise.all(plans.map(async (plan) => {
      const priceId = getSubscriptionPriceId(plan);
      const price = await getStripe().prices.retrieve(priceId);
      return { plan, priceId, unitAmount: price.unit_amount, currency: price.currency, interval: price.recurring?.interval ?? null };
    }));
  } catch (error) {
    console.error('Stripe prices could not be loaded', error instanceof Error ? error.name : 'UnknownError');
    return [];
  }
}
export async function getBusinessPricingCatalog():Promise<BusinessPricingCatalog|null>{try{const ids=[getOneTimePriceId('SPONSORED_MEAL'),getOneTimePriceId('SEAT_CAMPAIGN'),getSubscriptionPriceId('STANDARD'),getSubscriptionPriceId('PRO')];const prices=await Promise.all(ids.map(id=>getStripe().prices.retrieve(id)));if(prices.some(p=>p.currency!==prices[0].currency||p.unit_amount===null))return null;return{sponsoredMeal:prices[0].unit_amount!,seatCampaign:prices[1].unit_amount!,FREE:0,STANDARD:prices[2].unit_amount!,PRO:prices[3].unit_amount!,currency:prices[0].currency};}catch(error){console.error('Stripe pricing catalog could not be loaded',error instanceof Error?error.name:'UnknownError');return null;}}

export async function getBusinessBillingState(businessAccountId?: string): Promise<BusinessBillingState> {
  const membership = await requireBillingMembership(businessAccountId);
  const [customer, subscription, prices] = await Promise.all([
    prisma.billingCustomer.findUnique({ where: { businessAccountId: membership.businessAccountId }, select: { id: true } }),
    prisma.businessSubscription.findUnique({ where: { businessAccountId: membership.businessAccountId } }),
    getBusinessSubscriptionPrices(),
  ]);
  const plan = membership.businessAccount.planOverride ?? (subscription && enabledStatuses.has(subscription.status) && subscription.currentPeriodEnd > new Date() ? subscription.plan : 'FREE');
  return {
    businessAccountId: membership.businessAccountId,
    plan,
    subscription: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd } : null,
    hasBillingCustomer: Boolean(customer),
    prices,
  };
}

export async function getSponsorOrderStatus(orderId: string): Promise<SponsorOrderState | null> {
  const parsed = z.string().trim().min(1).max(100).safeParse(orderId);
  if(!parsed.success)return null;
  const id=parsed.data;
  const order = await prisma.sponsorOrder.findUnique({ where: { id }, select: { businessAccountId: true } });
  if (!order) return null;
  const membership = await requireBillingMembership(order.businessAccountId);
  return prisma.sponsorOrder.findFirst({
    where: { id, businessAccountId: membership.businessAccountId },
    select: { id: true, status: true, paidAt: true, orderType: true, campaignId: true },
  });
}

export type { CheckoutResult, BillingPrice, BusinessBillingState, BusinessCapabilities, BusinessPricingCatalog, SponsorOrderState } from './types';
