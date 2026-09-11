import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';
import { appUrl } from '@/lib/social';

// メール本文のリンクはブラウザのJSなしで開かれるため、サーバー側でクリックを記録してからリダイレクトする。
// メールはログインしていない別端末で開かれることもあるため、所有者チェックはせずクリック計測とリダイレクトのみ行う。
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) return NextResponse.redirect(`${appUrl()}/`);
  const now = new Date();
  await prisma.notification.update({ where: { id }, data: { clickedAt: notification.clickedAt ?? now, emailClickedAt: notification.emailClickedAt ?? now } });
  await recordGrowthEvent('EMAIL_LINK_CLICKED', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
  await recordGrowthEvent('NOTIFICATION_CLICKED', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type, channel: 'EMAIL' });
  if (notification.type.startsWith('BUSINESS_')) await recordGrowthEvent('BUSINESS_NOTIFICATION_CLICKED', { loggedIn: true, notificationType: notification.type, channel: 'EMAIL' });
  if (!notification.clickedAt) await recordGrowthEvent('EMAIL_CONVERSION', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
  let target = notification.mealId ? `${appUrl()}/meals/${notification.mealId}` : `${appUrl()}/notifications`;
  if (notification.mealId && ['JOIN_REQUEST_ACCEPTED', 'MEAL_MATCHED', 'MEAL_REMINDER_24H', 'DINING_FEEDBACK_REQUEST', 'MEAL_TODAY'].includes(notification.type)) {
    const match = await prisma.match.findUnique({ where: { mealId: notification.mealId }, select: { id: true } });
    if (match) target = `${appUrl()}/matches/${match.id}`;
  } else if (notification.type === 'JOIN_REQUEST_REJECTED') target = `${appUrl()}/meals`;
  else if (notification.type.startsWith('BUSINESS_')) target = `${appUrl()}/business/dashboard`;
  return NextResponse.redirect(target);
}
