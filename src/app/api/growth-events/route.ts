import { randomUUID } from 'crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  eventType: z.enum([
    'SIGNUP_CTA_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED',
    'RECRUITMENT_VIEWED', 'RECRUITMENT_JOIN_CLICKED', 'RECRUITMENT_CREATE_CLICKED',
    'RECRUITMENT_SHARED', 'RECRUITMENT_SHARE_X', 'RECRUITMENT_SHARE_LINE', 'RECRUITMENT_URL_COPIED',
    'ONBOARDING_STARTED', 'ONBOARDING_COMPLETED', 'RECRUITMENT_JOIN_COMPLETED',
    'JOIN_INTENT_CREATED', 'JOIN_INTENT_RESTORED', 'JOIN_INTENT_EXPIRED', 'JOIN_AFTER_SIGNUP_COMPLETED',
    'RECOMMENDATION_IMPRESSION', 'RECOMMENDATION_CLICKED',
    'QUICK_FILTER_VIEW', 'QUICK_FILTER_CLICKED',
    'TRUST_BADGE_VIEWED', 'HOST_PROFILE_OPENED',
    'QUICK_POST_STARTED', 'QUICK_POST_COMPLETED', 'QUICK_POST_ABANDONED',
    'MEAL_TEMPLATE_VIEWED', 'MEAL_TEMPLATE_SELECTED',
    'REFERRAL_LINK_CREATED', 'REFERRAL_LINK_OPENED', 'REFERRAL_SIGNUP_STARTED', 'REFERRAL_SIGNUP_COMPLETED',
    'GUEST_FAVORITE_ADDED', 'GUEST_FAVORITE_REMOVED', 'GUEST_FAVORITES_MERGED',
    'EXPERIMENT_EXPOSED', 'EXPERIMENT_CONVERSION',
  ]),
  recruitmentId: z.string().trim().max(100).optional(),
  area: z.string().trim().max(80).optional(),
  foodCategory: z.string().trim().max(80).optional(),
  loggedIn: z.boolean().optional(),
  source: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(300).optional(),
  shareType: z.string().trim().max(30).optional(),
  rankingPosition: z.coerce.number().int().min(0).max(1000).optional(),
  recommendationReason: z.string().trim().max(40).optional(),
  personalizationEnabled: z.boolean().optional(),
  experimentName: z.string().trim().max(60).optional(),
  variant: z.string().trim().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    const { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant, ...data } = schema.parse(await request.json());
    const metadata = rankingPosition !== undefined || recommendationReason || personalizationEnabled !== undefined || experimentName || variant
      ? { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant }
      : undefined;
    const cookie = request.headers.get('cookie') ?? '';
    const existing = cookie.match(/(?:^|; )ore_growth_session=([^;]+)/)?.[1];
    const sessionKey = existing ? decodeURIComponent(existing) : randomUUID();
    await prisma.growthEvent.create({ data: { sessionKey, ...data, metadata } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set('ore_growth_session', sessionKey, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
