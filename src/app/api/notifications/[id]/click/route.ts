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
  if (!notification.clickedAt) await recordGrowthEvent('EMAIL_CONVERSION', { recruitmentId: notification.mealId ?? undefined, loggedIn: true, notificationType: notification.type });
  const target = notification.mealId ? `${appUrl()}/meals/${notification.mealId}` : `${appUrl()}/notifications`;
  return NextResponse.redirect(target);
}
