'use server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireBillingMembership } from '@/server/billing/auth';

const schema = z.object({ businessAccountId: z.string().min(1), activityEnabled: z.boolean(), campaignPerformanceEnabled: z.boolean(), billingEnabled: z.boolean(), growthTipsEnabled: z.boolean() });
export async function updateBusinessNotificationPreference(input: unknown) {
  const data = schema.parse(input);
  const membership = await requireBillingMembership(data.businessAccountId);
  await prisma.businessNotificationPreference.upsert({ where: { businessAccountId: membership.businessAccountId }, create: data, update: data });
  return { ok: true };
}
