import 'server-only';
import { prisma } from '@/lib/prisma';
import type { NotificationCategory, NotificationType } from '@prisma/client';
import { recordGrowthEvent } from '@/server/growth';

const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  JOIN_REQUEST_RECEIVED: 'PARTICIPATION',
  JOIN_REQUEST_ACCEPTED: 'PARTICIPATION',
  MEAL_MATCHED: 'PARTICIPATION',
  LAST_SLOT_REACHED: 'RECRUITMENT',
  DEADLINE_SOON: 'RECRUITMENT',
  MEAL_TODAY: 'PARTICIPATION',
  MEAL_STARTING_SOON: 'PARTICIPATION',
  DEMAND_CLUSTER_READY: 'RECOMMENDATION',
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  mealId?: string;
  dedupeKey: string;
};

// 冪等: 同じdedupeKeyでの再呼び出しは何もしない(cron等からの重複実行に安全)。
// 通知作成の失敗はメインの業務処理を止めないよう、常にnullを返すだけで例外を投げない。
export async function createNotification(params: CreateNotificationInput) {
  try {
    const category = CATEGORY_BY_TYPE[params.type];
    const preference = await prisma.notificationPreference.findUnique({ where: { userId: params.userId } });
    const enabled = preference
      ? (category === 'RECRUITMENT' ? preference.recruitmentEnabled : category === 'PARTICIPATION' ? preference.participationEnabled : preference.recommendationEnabled)
      : true;
    if (!enabled) return null;
    const notification = await prisma.notification.create({
      data: { userId: params.userId, type: params.type, category, title: params.title, body: params.body, mealId: params.mealId, dedupeKey: params.dedupeKey },
    });
    await recordGrowthEvent('NOTIFICATION_CREATED', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type });
    await recordGrowthEvent('NOTIFICATION_SENT', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type, channel: 'IN_APP' });
    return notification;
  } catch (error) {
    console.error('createNotification failed (likely duplicate, safe to ignore)', error instanceof Error ? error.name : 'UnknownError');
    return null;
  }
}
