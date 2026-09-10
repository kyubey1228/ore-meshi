'use server';

import type { OrderType } from '@prisma/client';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { UserError, ensure } from '@/server/action';
import { requireBillingMembership } from '@/server/billing/auth';
import { appUrl, getOneTimePriceId, getPlanDiscountCouponId, getSubscriptionPriceId } from '@/server/billing/config';
import { getOrCreateBillingCustomer } from '@/server/billing/customer';
import { getBusinessPlan } from '@/server/billing';
import type { CheckoutResult } from '@/server/billing/types';
import { marketingSessionKey } from '@/server/marketing';
import { getEligibleFirstTimeOffer } from '@/server/sales';

const idSchema = z.string().trim().min(1).max(100);
const planSchema = z.enum(['STANDARD', 'PRO']);

async function checkoutResult(work: () => Promise<string>): Promise<CheckoutResult> {
  try {
    return { success: true, url: await work() };
  } catch (error) {
    if (error instanceof UserError) return { success: false, error: error.message };
    if (error instanceof z.ZodError) return { success: false, error: '入力内容を確認してください。' };
    console.error('Billing action failed', error instanceof Error ? error.name : 'UnknownError');
    return { success: false, error: '決済を開始できませんでした。少し待ってからもう一度お試しください。' };
  }
}

type CampaignOrderType = Extract<OrderType, 'SPONSORED_MEAL' | 'SEAT_CAMPAIGN' | 'AREA_FEATURED'>;
const firstTimeOfferTargets = new Set(['SPONSORED_MEAL', 'SEAT_CAMPAIGN']);

async function campaignCheckout(campaignIdInput: unknown, orderType: CampaignOrderType) {
  return checkoutResult(async () => {
    const campaignId = idSchema.parse(campaignIdInput);
    const campaign = orderType === 'SPONSORED_MEAL'
      ? await prisma.sponsoredMeal.findUnique({ where: { id: campaignId } })
      : orderType === 'SEAT_CAMPAIGN'
      ? await prisma.seatCampaign.findUnique({ where: { id: campaignId } })
      : await prisma.areaSponsorship.findUnique({ where: { id: campaignId } });
    ensure(campaign, 'キャンペーンが見つかりません。');
    const membership = await requireBillingMembership(campaign.businessAccountId);
    ensure(campaign.businessAccountId === membership.businessAccountId);
    ensure(campaign.status === 'DRAFT', 'このキャンペーンは支払い待ちではありません。');
    if ('endsAt' in campaign) ensure(campaign.endsAt > new Date(), '終了済みのキャンペーンは公開できません。');

    const stripePriceId = getOneTimePriceId(orderType);
    const customer = await getOrCreateBillingCustomer(campaign.businessAccountId);
    let order = await prisma.sponsorOrder.findFirst({
      where: { businessAccountId: campaign.businessAccountId, campaignId, orderType, status: { in: ['DRAFT', 'PENDING_PAYMENT'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!order) {
      order = await prisma.sponsorOrder.create({ data: { businessAccountId: campaign.businessAccountId, campaignId, orderType, stripePriceId } });
    } else if (order.stripePriceId !== stripePriceId) {
      order = await prisma.sponsorOrder.update({ where: { id: order.id }, data: { stripePriceId } });
    }

    const sessionKey=await marketingSessionKey();
    const offer=firstTimeOfferTargets.has(orderType)?await getEligibleFirstTimeOffer(campaign.businessAccountId,orderType as 'SPONSORED_MEAL'|'SEAT_CAMPAIGN'):null;
    // 初回オファーがあればそちらを優先し(Stripeは1 Checkout Sessionに1つのdiscountsしか安全に扱えないため併用しない)、
    // 無ければSTANDARD/PROの実割引(Stripe Couponがsource of truth。未設定なら割引なし)を適用する。
    const plan = orderType === 'AREA_FEATURED' ? 'FREE' : await getBusinessPlan(campaign.businessAccountId);
    const planCouponId = !offer && (plan === 'STANDARD' || plan === 'PRO') ? getPlanDiscountCouponId(plan) : undefined;
    const metadata = { businessAccountId: campaign.businessAccountId, campaignId, orderId: order.id, orderType, marketingSessionKey:sessionKey,firstTimeOfferId:offer?.id??'' };
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer: customer.stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: appUrl(`/business/dashboard?checkout=success&order_id=${order.id}&kind=${orderType}`),
      cancel_url: appUrl(`/business/dashboard?checkout=cancelled&kind=${orderType}`),
      metadata,
      payment_intent_data: { metadata },
      ...(offer?.stripePromotionCodeId?{discounts:[{promotion_code:offer.stripePromotionCodeId}]}:planCouponId?{discounts:[{coupon:planCouponId}]}:{}),
    }, { idempotencyKey: `sponsor-checkout:${order.id}:${stripePriceId}` });
    ensure(session.url, 'Stripe Checkout URLを取得できませんでした。');
    await prisma.sponsorOrder.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id, status: 'PENDING_PAYMENT' } });
    await prisma.businessMarketingEvent.create({data:{sessionKey,businessAccountId:campaign.businessAccountId,eventType:'CHECKOUT_STARTED'}});
    return session.url;
  });
}

export async function createSponsoredMealCheckout(campaignId: unknown): Promise<CheckoutResult> {
  return campaignCheckout(campaignId, 'SPONSORED_MEAL');
}

export async function createSeatCampaignCheckout(campaignId: unknown): Promise<CheckoutResult> {
  return campaignCheckout(campaignId, 'SEAT_CAMPAIGN');
}

export async function createAreaSponsorshipCheckout(campaignId: unknown): Promise<CheckoutResult> {
  return campaignCheckout(campaignId, 'AREA_FEATURED');
}

export async function createBusinessSubscriptionCheckout(planInput: unknown): Promise<CheckoutResult> {
  return checkoutResult(async () => {
    const plan = planSchema.parse(planInput);
    const membership = await requireBillingMembership();
    const priceId = getSubscriptionPriceId(plan);
    const customer = await getOrCreateBillingCustomer(membership.businessAccountId);
    const current = await prisma.businessSubscription.findUnique({ where: { businessAccountId: membership.businessAccountId } });
    ensure(!current || !['ACTIVE', 'TRIALING', 'PAST_DUE'].includes(current.status), '契約中のプランは「プランを管理する」から変更してください。');
    const sessionKey=await marketingSessionKey();const offer=await getEligibleFirstTimeOffer(membership.businessAccountId,plan==='STANDARD'?'BUSINESS_STANDARD':'BUSINESS_PRO');
    const metadata = { businessAccountId: membership.businessAccountId, plan, marketingSessionKey:sessionKey,firstTimeOfferId:offer?.id??'' };
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customer.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: appUrl('/business/dashboard?subscription=success'),
      cancel_url: appUrl('/business/dashboard?subscription=cancelled'),
      metadata,
      subscription_data: { metadata },
      ...(offer?.stripePromotionCodeId?{discounts:[{promotion_code:offer.stripePromotionCodeId}]}:{}),
    }, { idempotencyKey: `subscription-checkout:${membership.businessAccountId}:${plan}:${priceId}` });
    ensure(session.url, 'Stripe Checkout URLを取得できませんでした。');
    await prisma.businessMarketingEvent.create({data:{sessionKey,businessAccountId:membership.businessAccountId,eventType:'CHECKOUT_STARTED'}});
    return session.url;
  });
}

export async function createBillingPortalSession(): Promise<CheckoutResult> {
  return checkoutResult(async () => {
    const membership = await requireBillingMembership();
    const customer = await prisma.billingCustomer.findUnique({ where: { businessAccountId: membership.businessAccountId } });
    ensure(customer, '先にプランまたはスポンサー決済を開始してください。');
    const session = await getStripe().billingPortal.sessions.create({ customer: customer.stripeCustomerId, return_url: appUrl('/business/dashboard') });
    return session.url;
  });
}
