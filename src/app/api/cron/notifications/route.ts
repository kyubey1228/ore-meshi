import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/server/notifications';

// JST基準の「今日の終わり」を絶対時刻として求める(サーバーのローカルTZに依存しないようIntlで算出)。
function jstEndOfTodayUTC(now: Date): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  // JSTの23:59:59 = UTCでは同日14:59:59
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 14, 59, 59, 999));
}

// このルートは冪等(dedupeKeyの一意制約)で、外部スケジューラから定期的に叩かれる前提。
// このホスティング環境にはCron基盤が無いため、実際の定期実行設定は運用側で行う必要がある。
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const todayEnd = jstEndOfTodayUTC(now);
  let sent = 0;

  const deadlineSoon = await prisma.meal.findMany({ where: { status: 'OPEN', deadline: { gt: now, lte: in24h } }, select: { id: true, title: true, hostId: true } });
  for (const meal of deadlineSoon) {
    if (await createNotification({ userId: meal.hostId, type: 'DEADLINE_SOON', title: '締切が近づいています', body: `「${meal.title}」の募集締切がまもなくです。`, mealId: meal.id, dedupeKey: `DEADLINE_SOON:${meal.id}` })) sent++;
  }

  const todayMatches = await prisma.match.findMany({ where: { status: 'ACTIVE', scheduledAt: { gte: now, lte: todayEnd } }, include: { meal: true, participants: true } });
  for (const match of todayMatches) {
    for (const p of match.participants) {
      if (await createNotification({ userId: p.userId, type: 'MEAL_TODAY', title: '今日、飯の予定があります', body: `「${match.meal.title}」は今日開催です。`, mealId: match.mealId, dedupeKey: `MEAL_TODAY:${match.id}:${p.userId}` })) sent++;
    }
  }

  const soonMatches = await prisma.match.findMany({ where: { status: 'ACTIVE', scheduledAt: { gt: now, lte: in2h } }, include: { meal: true, participants: true } });
  for (const match of soonMatches) {
    for (const p of match.participants) {
      if (await createNotification({ userId: p.userId, type: 'MEAL_STARTING_SOON', title: 'まもなく開催です', body: `「${match.meal.title}」がまもなく始まります。`, mealId: match.mealId, dedupeKey: `MEAL_STARTING_SOON:${match.id}:${p.userId}` })) sent++;
    }
  }

  const expired = await prisma.demandIntent.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } });

  return NextResponse.json({ ok: true, notificationsSent: sent, demandIntentsExpired: expired.count });
}
