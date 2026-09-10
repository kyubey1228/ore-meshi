import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';
import { appUrl } from '@/lib/social';
import { isUgcStyle } from '@/lib/ugc';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const requestUrl = new URL(request.url);
  const style = isUgcStyle(requestUrl.searchParams.get('ugc_style')) ? requestUrl.searchParams.get('ugc_style')! : 'gag';
  const mealId = requestUrl.searchParams.get('meal')?.slice(0, 100);
  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  const destination = mealId
    ? `${appUrl()}/meals/${encodeURIComponent(mealId)}?ref=${encodeURIComponent(code)}`
    : `${appUrl()}/meals`;
  const image = mealId
    ? `${appUrl()}/api/ugc/meals/${encodeURIComponent(mealId)}?style=${style}`
    : `${appUrl()}/api/ugc/invite?style=${style}`;
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>飯の誘いが届いています。</title><meta name="description" content="誰かと食べるきっかけを。"><meta property="og:title" content="飯の誘いが届いています。"><meta property="og:description" content="誰かと食べるきっかけを。 #誰か飯いこ"><meta property="og:type" content="website"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}"><meta http-equiv="refresh" content="0;url=${destination}"></head><body><p>飯募集へ移動しています。<a href="${destination}">移動しない場合はこちら</a></p></body></html>`;
  const response = new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
  if (!referrer) return response;

  await prisma.referral.create({ data: { referralCode: code, referrerUserId: referrer.id, source: 'invite_link' } });
  await recordGrowthEvent('REFERRAL_LINK_OPENED', { source: 'invite_link' });
  await recordGrowthEvent('INVITE_LINK_OPENED', { source: 'invite_link' });
  response.cookies.set('ore_referral', code, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
