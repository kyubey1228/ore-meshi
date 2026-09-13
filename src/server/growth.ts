import 'server-only';
import { cookies } from 'next/headers';
import type { GrowthEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { buildGrowthEventRecord, buildGrowthEventRecords, type GrowthEventData, type GrowthEventInput } from '@/lib/growth-event-records';

export type { GrowthEventData } from '@/lib/growth-event-records';

export async function growthSessionKey() {
  return (await cookies()).get('ore_growth_session')?.value;
}

export async function recordGrowthEvent(eventType: GrowthEventType, data: GrowthEventData = {}) {
  const sessionKey = (await growthSessionKey()) ?? 'server';
  return prisma.growthEvent.create({ data: buildGrowthEventRecord(sessionKey, eventType, data) }).catch(error => {
    console.error('Growth event recording failed', error instanceof Error ? error.name : 'UnknownError');
    return null;
  });
}

export async function recordGrowthEvents(events: readonly GrowthEventInput[]) {
  if (!events.length) return { count: 0 };
  try {
    const sessionKey = (await growthSessionKey()) ?? 'server';
    return await prisma.growthEvent.createMany({ data: buildGrowthEventRecords(sessionKey, events) });
  } catch (error) {
    console.error('Growth event recording failed', error instanceof Error ? error.name : 'UnknownError');
    return null;
  }
}
