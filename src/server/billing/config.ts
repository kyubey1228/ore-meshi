import 'server-only';
import { z } from 'zod';
import type { BusinessPlan, OrderType } from '@prisma/client';

const priceId = z.string().trim().min(1).startsWith('price_');

const priceEnvironment: Record<Exclude<OrderType, 'OTHER'>, string> = {
  SPONSORED_MEAL: 'STRIPE_PRICE_SPONSORED_MEAL',
  SEAT_CAMPAIGN: 'STRIPE_PRICE_SEAT_CAMPAIGN',
  AREA_FEATURED: 'STRIPE_PRICE_AREA_FEATURED',
  DIRECT_AD: 'STRIPE_PRICE_DIRECT_AD',
};

export function getOneTimePriceId(type: OrderType) {
  if (type === 'OTHER') throw new Error('OTHER requires an explicit server-side price mapping');
  const name = priceEnvironment[type];
  return priceId.parse(process.env[name]);
}

export function getSubscriptionPriceId(plan: Exclude<BusinessPlan, 'FREE'>) {
  const name = plan === 'STANDARD' ? 'STRIPE_PRICE_BUSINESS_STANDARD' : 'STRIPE_PRICE_BUSINESS_PRO';
  return priceId.parse(process.env[name]);
}

// STANDARD/PROはスポンサー飯・空席スポンサーの単発購入に割引を受けられる(Subscriptionが割引/露出/分析/
// 自動化を提供するという既存方針)。割引はStripe Coupon(運用でダッシュボードから作成)をsource of truthにし、
// 未設定の場合は単に割引なしとして扱う(グレースフルデグレード、既存のAREA_FEATURED価格取得と同じ方針)。
export function getPlanDiscountCouponId(plan: Exclude<BusinessPlan, 'FREE'>): string | undefined {
  const name = plan === 'STANDARD' ? 'STRIPE_COUPON_STANDARD' : 'STRIPE_COUPON_PRO';
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function appUrl(path = '') {
  const base = z.string().url().parse(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL);
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

