import { randomUUID } from 'crypto';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROWTH_EVENT_TYPES } from '@/lib/growth-events';
import { currentUserId } from '@/server/auth';

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

const batchSchema = z.object({ events: z.array(schema).min(1).max(30) });

function toRow(sessionKey: string, userId: string | null, parsed: z.infer<typeof schema>) {
  const { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant, notificationType, channel, utmContent, utmTerm, ...data } = parsed;
  const metadataEntries = { rankingPosition, recommendationReason, personalizationEnabled, experimentName, variant, notificationType, channel, utmContent, utmTerm };
  const hasMetadata = Object.values(metadataEntries).some(v => v !== undefined);
  return { sessionKey, userId, ...data, metadata: hasMetadata ? metadataEntries : undefined };
}

// 複数件のイベント(例: 一覧表示時のimpression計測)を1リクエスト・1 DB書き込みにまとめて送るための形。
// クライアント側でカードの数だけfetchを乱発しないよう、必ずこの形を使うこと。
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cookie = request.headers.get('cookie') ?? '';
    const existing = cookie.match(/(?:^|; )ore_growth_session=([^;]+)/)?.[1];
    const sessionKey = existing ? decodeURIComponent(existing) : randomUUID();
    const userId = await currentUserId();

    if (Array.isArray(body?.events)) {
      const { events } = batchSchema.parse(body);
      await prisma.growthEvent.createMany({ data: events.map(e => toRow(sessionKey, userId, e)) });
    } else {
      const parsed = schema.parse(body);
      await prisma.growthEvent.create({ data: toRow(sessionKey, userId, parsed) });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('ore_growth_session', sessionKey, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 90, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
