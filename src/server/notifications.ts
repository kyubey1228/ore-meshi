import 'server-only';
import { prisma } from '@/lib/prisma';
import type { NotificationCategory, NotificationType } from '@prisma/client';
import { recordGrowthEvent } from '@/server/growth';
import { sendEmail } from '@/server/email';
import { appUrl } from '@/lib/social';
import { measurePerformance } from '@/lib/performance';

const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  JOIN_REQUEST_RECEIVED: 'PARTICIPATION',
  JOIN_REQUEST_ACCEPTED: 'PARTICIPATION',
  MEAL_MATCHED: 'PARTICIPATION',
  LAST_SLOT_REACHED: 'RECRUITMENT',
  DEADLINE_SOON: 'RECRUITMENT',
  MEAL_TODAY: 'PARTICIPATION',
  MEAL_STARTING_SOON: 'PARTICIPATION',
  DEMAND_CLUSTER_READY: 'RECOMMENDATION',
  DEMAND_MATCH_FOUND: 'RECOMMENDATION',
  MEAL_COMPLETION_CHECK: 'PARTICIPATION',
  MEAL_AUTO_CLOSED: 'RECRUITMENT',
  WIN_BACK_FIRST_ACTION: 'RECOMMENDATION',
  BUSINESS_ACTIVATION_REMINDER: 'BUSINESS',
  BUSINESS_CAMPAIGN_NO_VIEWS: 'BUSINESS',
  BUSINESS_CAMPAIGN_NO_ACTIONS: 'BUSINESS',
  BUSINESS_FIRST_RESULT: 'BUSINESS',
  BUSINESS_SUBSCRIPTION_ENDING: 'BUSINESS',
  BUSINESS_CAMPAIGN_SUMMARY: 'BUSINESS',
};

// 最初にメール化する通知は絞る(全通知を最初からメール化しない)。ここに無い種類はin-appのみ。
const EMAIL_WHITELIST: NotificationType[] = ['JOIN_REQUEST_ACCEPTED', 'MEAL_MATCHED', 'DEMAND_MATCH_FOUND', 'MEAL_TODAY', 'DEADLINE_SOON'];

// body には募集タイトル等のユーザー入力が含まれるため、メールHTMLへの埋め込み前に必ずエスケープする。
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

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
async function createNotificationInternal(params: CreateNotificationInput) {
  try {
    const category = CATEGORY_BY_TYPE[params.type];
    const [preference, user] = await Promise.all([
      prisma.notificationPreference.findUnique({ where: { userId: params.userId } }),
      prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } }),
    ]);
    const enabled = preference
      ? (category === 'RECRUITMENT' ? preference.recruitmentEnabled : category === 'PARTICIPATION' ? preference.participationEnabled : category === 'RECOMMENDATION' ? preference.recommendationEnabled : true)
      : true;
    if (!enabled) return null;
    const notification = await prisma.notification.create({
      data: { userId: params.userId, type: params.type, category, title: params.title, body: params.body, mealId: params.mealId, dedupeKey: params.dedupeKey },
    });
    await recordGrowthEvent('NOTIFICATION_CREATED', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type });
    await recordGrowthEvent('NOTIFICATION_SENT', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type, channel: 'IN_APP' });

    const emailAllowed = (preference?.emailTransactionalEnabled ?? true) && EMAIL_WHITELIST.includes(params.type);
    if (emailAllowed && user?.email) {
      const link = `${appUrl()}/api/notifications/${notification.id}/click`;
      const result = await sendEmail({
        to: user.email,
        subject: params.title,
        text: `${params.body}\n\n${link}`,
        html: `<p>${escapeHtml(params.body)}</p><p><a href="${link}">アプリで見る →</a></p>`,
      });
      if (result.ok) {
        await prisma.notification.update({ where: { id: notification.id }, data: { emailSentAt: new Date() } });
        await recordGrowthEvent('EMAIL_SENT', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type });
      } else {
        await prisma.notification.update({ where: { id: notification.id }, data: { emailFailedAt: new Date() } });
        await recordGrowthEvent('EMAIL_DELIVERY_FAILED', { recruitmentId: params.mealId, loggedIn: true, notificationType: params.type });
      }
    }
    return notification;
  } catch (error) {
    console.error('createNotification failed (likely duplicate, safe to ignore)', error instanceof Error ? error.name : 'UnknownError');
    return null;
  }
}

export async function createNotification(params: CreateNotificationInput) {
  return measurePerformance('NOTIFICATION', params.type, () => createNotificationInternal(params));
}
