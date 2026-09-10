'use server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';
import { REFERRAL_COOKIE } from '@/server/referral-constants';

const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 };

const schema = z.object({
  referralCode: z.string().trim().min(1).max(40),
  mealId: z.string().trim().max(100).optional(),
  source: z.string().trim().max(60).optional(),
});

export async function recordReferralClick(input: unknown): Promise<{ ok: boolean }> {
  try {
    const data = schema.parse(input);
    const referrer = await prisma.user.findUnique({ where: { referralCode: data.referralCode }, select: { id: true } });
    if (!referrer) return { ok: false };
    const jar = await cookies();
    if (jar.get(REFERRAL_COOKIE)?.value === data.referralCode) return { ok: true };
    await prisma.referral.create({ data: { referralCode: data.referralCode, referrerUserId: referrer.id, mealId: data.mealId, source: data.source } });
    jar.set(REFERRAL_COOKIE, data.referralCode, cookieOptions);
    await recordGrowthEvent('REFERRAL_LINK_OPENED', { recruitmentId: data.mealId, source: data.source });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
