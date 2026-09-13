import { randomUUID } from 'crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
const schema=z.object({eventType:z.enum(['LP_VIEW','BUSINESS_BANNER_IMPRESSION','BUSINESS_BANNER_CLICK','BUSINESS_LP_VIEW','SPONSORED_MEAL_SECTION_VIEW','SEAT_CAMPAIGN_SECTION_VIEW','PRICING_CTA_CLICK','CONTACT_CTA_CLICK','BUSINESS_SIGNUP_CTA_CLICK','PARTNER_CTA_CLICK','PRICING_VIEW','CONTACT_STARTED','SIGNUP_STARTED','SPONSOR_PRODUCT_VIEW']),source:z.string().trim().max(100).optional(),medium:z.string().trim().max(100).optional(),campaign:z.string().trim().max(150).optional(),content:z.string().trim().max(150).optional(),referralCode:z.string().trim().max(50).optional()});
const batchSchema = z.object({ events: z.array(schema).min(1).max(30) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = Array.isArray(body?.events) ? batchSchema.parse(body).events : [schema.parse(body)];
    const cookie = request.headers.get('cookie') ?? '';
    const existing = cookie.match(/(?:^|; )ore_business_marketing=([^;]+)/)?.[1];
    const sessionKey = existing ? decodeURIComponent(existing) : randomUUID();
    await prisma.businessMarketingEvent.createMany({
      data: events.map(event => ({ sessionKey, eventType: event.eventType, source: event.source, medium: event.medium, campaign: event.campaign, content: event.content })),
    });
    const response = NextResponse.json({ ok: true });
    const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' };
    response.cookies.set('ore_business_marketing', sessionKey, cookieOptions);
    // Preserve the last referral in a batch, matching chronological single-event writes.
    const referralCode = events.map(event => event.referralCode).filter(Boolean).at(-1);
    if (referralCode) response.cookies.set('ore_business_ref', referralCode, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
