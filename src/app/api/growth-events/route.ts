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
  ]),
  recruitmentId: z.string().trim().max(100).optional(),
  area: z.string().trim().max(80).optional(),
  foodCategory: z.string().trim().max(80).optional(),
  loggedIn: z.boolean().optional(),
  source: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(300).optional(),
  shareType: z.string().trim().max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    const cookie = request.headers.get('cookie') ?? '';
    const existing = cookie.match(/(?:^|; )ore_growth_session=([^;]+)/)?.[1];
    const sessionKey = existing ? decodeURIComponent(existing) : randomUUID();
    await prisma.growthEvent.create({ data: { sessionKey, ...data } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set('ore_growth_session', sessionKey, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
