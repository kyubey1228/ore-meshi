import 'server-only';
import { cookies } from 'next/headers';
import type { GrowthEventType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function growthSessionKey() {
  return (await cookies()).get('ore_growth_session')?.value;
}

export type GrowthEventData = {
  userId?: string;
  recruitmentId?: string;
  area?: string;
  foodCategory?: string;
  loggedIn?: boolean;
  source?: string;
  referrer?: string;
  shareType?: string;
  notificationType?: string;
  channel?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordGrowthEvent(eventType: GrowthEventType, data: GrowthEventData = {}) {
  const { notificationType, channel, metadata, ...rest } = data;
  const mergedMetadata = notificationType || channel ? { ...(typeof metadata === 'object' && metadata ? metadata : {}), notificationType, channel } : metadata;
  const sessionKey = (await growthSessionKey()) ?? 'server';
  return prisma.growthEvent.create({ data: { sessionKey, eventType, ...rest, metadata: mergedMetadata } }).catch(error => {
    console.error('Growth event recording failed', error instanceof Error ? error.name : 'UnknownError');
    return null;
  });
}
