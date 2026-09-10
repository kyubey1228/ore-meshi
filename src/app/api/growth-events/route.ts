import { randomUUID } from 'crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROWTH_EVENT_TYPES } from '@/lib/growth-events';

const schema = z.object({
  eventType: z.enum(GROWTH_EVENT_TYPES),
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
  notificationType: z.string().trim().max(40).optional(),
  channel: z.string().trim().max(20).optional(),
  utmMedium: z.string().trim().max(60).optional(),
  utmCampaign: z.string().trim().max(80).optional(),
  utmContent: z.string().trim().max(80).optional(),
  utmTerm: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant, notificationType, channel, utmContent, utmTerm, ...data } = schema.parse(await request.json());
    const metadataEntries = { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant, notificationType, channel, utmContent, utmTerm };
    const hasMetadata = Object.values(metadataEntries).some(v => v !== undefined);
    const cookie = request.headers.get('cookie') ?? '';
    const existing = cookie.match(/(?:^|; )ore_growth_session=([^;]+)/)?.[1];
    const sessionKey = existing ? decodeURIComponent(existing) : randomUUID();
    await prisma.growthEvent.create({ data: { sessionKey, ...data, metadata: hasMetadata ? metadataEntries : undefined } });
    const response = NextResponse.json({ ok: true });
    response.cookies.set('ore_growth_session', sessionKey, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
