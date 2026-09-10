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

export function appUrl(path = '') {
  const base = z.string().url().parse(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL);
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}

