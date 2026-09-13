import type { GrowthEventType, Prisma } from '@prisma/client';

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

export type GrowthEventInput = { eventType: GrowthEventType; data?: GrowthEventData };

// Single inserts and batches must keep the same attribution and metadata shape.
export function buildGrowthEventRecord(sessionKey: string, eventType: GrowthEventType, data: GrowthEventData = {}): Prisma.GrowthEventCreateManyInput {
  const { notificationType, channel, metadata, ...rest } = data;
  const mergedMetadata = notificationType || channel
    ? { ...(typeof metadata === 'object' && metadata ? metadata : {}), notificationType, channel }
    : metadata;
  return { sessionKey, eventType, ...rest, metadata: mergedMetadata };
}

export function buildGrowthEventRecords(sessionKey: string, events: readonly GrowthEventInput[]) {
  return events.map(({ eventType, data }) => buildGrowthEventRecord(sessionKey, eventType, data));
}
