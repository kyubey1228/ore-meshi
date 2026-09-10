import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';
import { appUrl } from '@/lib/social';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  const response = NextResponse.redirect(`${appUrl()}/meals`, { status: 307 });
  if (!referrer) return response;

  await prisma.referral.create({ data: { referralCode: code, referrerUserId: referrer.id, source: 'invite_link' } });
  await recordGrowthEvent('REFERRAL_LINK_OPENED', { source: 'invite_link' });
  await recordGrowthEvent('INVITE_LINK_OPENED', { source: 'invite_link' });
  response.cookies.set('ore_referral', code, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
