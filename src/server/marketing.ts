import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { BusinessMarketingEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function marketingSessionKey() {
  return (await cookies()).get('ore_business_marketing')?.value ?? randomUUID();
}

export async function recordBusinessMarketingEvent(eventType: BusinessMarketingEventType, data: { businessAccountId?: string; leadId?: string } = {}) {
  return prisma.businessMarketingEvent.create({ data: { sessionKey: await marketingSessionKey(), eventType, ...data } });
}
