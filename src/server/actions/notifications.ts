'use server';
import { z } from 'zod';
import { perform } from '@/server/action';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';

export async function markNotificationRead(input: unknown) {
  return perform(async userId => {
    const id = z.string().min(1).parse(input);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) return;
    if (!notification.readAt) {
      await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
      await recordGrowthEvent('NOTIFICATION_OPENED', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
    }
  });
}

export async function markNotificationClicked(input: unknown) {
  return perform(async userId => {
    const id = z.string().min(1).parse(input);
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) return notification?.mealId ? `/meals/${notification.mealId}` : '/notifications';
    const data: { readAt?: Date; clickedAt?: Date } = {};
    if (!notification.readAt) data.readAt = new Date();
    if (!notification.clickedAt) data.clickedAt = new Date();
    if (Object.keys(data).length) await prisma.notification.update({ where: { id }, data });
    await recordGrowthEvent('NOTIFICATION_CLICKED', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
    await recordGrowthEvent('NOTIFICATION_CONVERSION', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
    if (notification.type === 'DEMAND_MATCH_FOUND') await recordGrowthEvent('DEMAND_MATCH_NOTIFICATION_CLICKED', { recruitmentId: notification.mealId ?? undefined, loggedIn: true });
    return notification.mealId ? `/meals/${notification.mealId}` : '/notifications';
  });
}

export async function markAllNotificationsRead() {
  return perform(async userId => {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  });
}

const preferenceSchema = z.object({ recruitmentEnabled: z.coerce.boolean(), participationEnabled: z.coerce.boolean(), recommendationEnabled: z.coerce.boolean(), emailTransactionalEnabled: z.coerce.boolean(), emailMarketingEnabled: z.coerce.boolean() });

export async function updateNotificationPreference(input: unknown) {
  return perform(async userId => {
    const data = preferenceSchema.parse(input);
    await prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  });
}
