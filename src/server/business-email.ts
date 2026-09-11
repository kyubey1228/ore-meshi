import 'server-only';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/server/email';
import { appUrl } from '@/lib/social';
import type { BusinessNotification } from '@/server/billing/webhook';
import { buildEmailTemplate } from '@/lib/email-templates';

// 既存Phase4のsendEmail(SMTP)をそのまま再利用する。新しい配信基盤は作らない。
// Webhookのレスポンスを長時間ブロックしないよう、呼び出し側は必ずawaitせずvoidで呼ぶこと。
export async function sendBusinessNotificationEmail(notification: BusinessNotification): Promise<void> {
  try {
    const business = await prisma.businessAccount.findUnique({
      where: { id: notification.businessAccountId },
      select: { name: true, members: { where: { role: { in: ['OWNER', 'ADMIN'] } }, orderBy: { createdAt: 'asc' }, select: { user: { select: { email: true } } } } },
    });
    if (!business) return;
    const recipients = [...new Set(business.members.flatMap(member => member.user.email ? [member.user.email] : []))];
    if (!recipients.length) return;
    const dashboardUrl = `${appUrl()}/business/dashboard`;
    const { subject, body } = buildContent(notification, business.name);
    const template = buildEmailTemplate({ subject, body, ctaLabel: notification.kind === 'PAYMENT_FAILED' ? '契約状況を確認する' : '掲載状況を確認する', ctaUrl: dashboardUrl });
    await Promise.all(recipients.map(to => sendEmail({ to, ...template })));
  } catch (error) {
    console.error('sendBusinessNotificationEmail failed (support処理は継続)', error instanceof Error ? error.name : 'UnknownError');
  }
}

function buildContent(notification: BusinessNotification, businessName: string): { subject: string; body: string } {
  switch (notification.kind) {
    case 'SPONSORED_MEAL_PAID':
      return { subject: 'スポンサー飯のお支払いが完了しました', body: `${businessName} 様\n\nスポンサー飯のお支払いが完了し、募集が公開されました。Xでの宣伝もぜひご活用ください。` };
    case 'SEAT_CAMPAIGN_PAID':
      return { subject: '空席スポンサーのお支払いが完了しました', body: `${businessName} 様\n\n空席スポンサーのお支払いが完了し、今すぐ掲載が開始されました。` };
    case 'AREA_FEATURED_PAID':
      return { subject: 'エリアスポンサーのお支払いが完了しました', body: `${businessName} 様\n\nエリアスポンサーのお支払いが完了し、掲載が開始されました。` };
    case 'SUBSCRIPTION_UPDATED':
      return { subject: 'プランが更新されました', body: `${businessName} 様\n\n${notification.plan}プランが有効になりました。` };
    case 'PAYMENT_FAILED':
      return { subject: 'お支払いを確認できませんでした', body: `${businessName} 様\n\nご利用中のプランについて、お支払いを確認できませんでした。契約状態や支払い情報をご確認ください。` };
  }
}
