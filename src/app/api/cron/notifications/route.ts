import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/server/notifications';
import { recordGrowthEvent } from '@/server/growth';
import { measurePerformance } from '@/lib/performance';

const MAX_BATCH = 200;
const CONCURRENCY = 5;

function jstEndOfTodayUTC(now: Date): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 14, 59, 59, 999));
}

function jstStartOfTodayUTC(now: Date): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), -9, 0, 0, 0));
}

// candidate.dateはJSTの暦日をUTC正午基準で保持しているため、Intlで一度JSTの年月日に戻してから
// startTime(HH:MM, JST)と組み合わせて実際の開始時刻(UTC instant)を復元する。
function candidateStartInstant(candidate: { date: Date; startTime: string }): Date {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(fmt.formatToParts(candidate.date).map(p => [p.type, p.value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${candidate.startTime}:00+09:00`);
}

async function chunks<T>(items: T[], operation: (item: T) => Promise<number>) {
  let completed = 0;
  for (let index = 0; index < items.length; index += CONCURRENCY) {
    const results = await Promise.all(items.slice(index, index + CONCURRENCY).map(operation));
    completed += results.reduce((sum, value) => sum + value, 0);
  }
  return completed;
}

function cursorWhere(cursor: string | null) { return cursor ? { id: { gt: cursor } } : {}; }

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get('x-cron-secret') ?? url.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  return measurePerformance('NOTIFICATION', 'cron batch', async () => {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), MAX_BATCH);
    const mealCursor = url.searchParams.get('mealCursor');
    const matchCursor = url.searchParams.get('matchCursor');
    const completionCursor = url.searchParams.get('completionCursor');
    const staleCursor = url.searchParams.get('staleCursor');
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in2hAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // 開始時刻ちょうどでは閉じないよう猶予を持たせる(開催中の可能性がある)。
    const candidateBufferMs = 6 * 60 * 60 * 1000;

    const [deadlineSoon, todayMatches, soonMatches, awaitingCompletion, expired, staleCandidates] = await Promise.all([
      prisma.meal.findMany({ where: { ...cursorWhere(mealCursor), status: 'OPEN', deadline: { gt: now, lte: in24h } }, select: { id: true, title: true, hostId: true }, orderBy: { id: 'asc' }, take: limit }),
      prisma.match.findMany({ where: { ...cursorWhere(matchCursor), status: 'ACTIVE', scheduledAt: { gte: now, lte: jstEndOfTodayUTC(now) } }, select: { id: true, mealId: true, meal: { select: { title: true } }, participants: { select: { userId: true } } }, orderBy: { id: 'asc' }, take: limit }),
      prisma.match.findMany({ where: { ...cursorWhere(matchCursor), status: 'ACTIVE', scheduledAt: { gt: now, lte: in2h } }, select: { id: true, mealId: true, meal: { select: { title: true } }, participants: { select: { userId: true } } }, orderBy: { id: 'asc' }, take: limit }),
      prisma.match.findMany({ where: { ...cursorWhere(completionCursor), status: 'ACTIVE', scheduledAt: { lte: in2hAgo, gte: sevenDaysAgo } }, select: { id: true, mealId: true, meal: { select: { title: true, area: true } }, participants: { select: { userId: true } } }, orderBy: { id: 'asc' }, take: limit }),
      prisma.demandIntent.updateMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, data: { status: 'EXPIRED' } }),
      // 「全候補日が今日より前」のOPEN Mealだけをまずgross(日単位)にDBで絞り込み、
      // 開始時刻を使った正確な判定はJS側で行う(候補ごとのstartTimeを跨いだ比較はDBクエリだけでは表現できないため)。
      prisma.meal.findMany({ where: { ...cursorWhere(staleCursor), status: 'OPEN', candidates: { every: { date: { lt: jstStartOfTodayUTC(now) } }, some: {} } }, select: { id: true, title: true, hostId: true, candidates: { select: { date: true, startTime: true } } }, orderBy: { id: 'asc' }, take: limit }),
    ]);
    const toClose = staleCandidates.filter(meal => meal.candidates.every(c => candidateStartInstant(c).getTime() + candidateBufferMs < now.getTime()));
    if (toClose.length) await prisma.meal.updateMany({ where: { id: { in: toClose.map(m => m.id) } }, data: { status: 'CLOSED' } });

    let sent = await chunks(deadlineSoon, async meal => Number(Boolean(await createNotification({ userId: meal.hostId, type: 'DEADLINE_SOON', title: '締切が近づいています', body: `「${meal.title}」の募集締切がまもなくです。`, mealId: meal.id, dedupeKey: `DEADLINE_SOON:${meal.id}` }))));
    const todayJobs = todayMatches.flatMap(match => match.participants.map(participant => ({ match, userId: participant.userId })));
    sent += await chunks(todayJobs, async ({ match, userId }) => Number(Boolean(await createNotification({ userId, type: 'MEAL_TODAY', title: '今日、飯の予定があります', body: `「${match.meal.title}」は今日開催です。`, mealId: match.mealId, dedupeKey: `MEAL_TODAY:${match.id}:${userId}` }))));
    const soonJobs = soonMatches.flatMap(match => match.participants.map(participant => ({ match, userId: participant.userId })));
    sent += await chunks(soonJobs, async ({ match, userId }) => Number(Boolean(await createNotification({ userId, type: 'MEAL_STARTING_SOON', title: 'まもなく開催です', body: `「${match.meal.title}」がまもなく始まります。`, mealId: match.mealId, dedupeKey: `MEAL_STARTING_SOON:${match.id}:${userId}` }))));
    sent += await chunks(awaitingCompletion, async match => {
      const results = await chunks(match.participants, async participant => Number(Boolean(await createNotification({ userId: participant.userId, type: 'MEAL_COMPLETION_CHECK', title: 'この飯、開催されましたか？', body: `「${match.meal.title}」の開催結果を教えてください。`, mealId: match.mealId, dedupeKey: `MEAL_COMPLETION_CHECK:${match.id}:${participant.userId}` }))));
      if (results) await recordGrowthEvent('MEAL_COMPLETION_CONFIRMATION_REQUESTED', { recruitmentId: match.mealId, area: match.meal.area, loggedIn: true });
      return results;
    });
    sent += await chunks(toClose, async meal => Number(Boolean(await createNotification({ userId: meal.hostId, type: 'MEAL_AUTO_CLOSED', title: '募集を自動的に終了しました', body: `「${meal.title}」は候補日時をすべて過ぎたため、募集を終了しました。`, mealId: meal.id, dedupeKey: `MEAL_AUTO_CLOSED:${meal.id}` }))));

    return NextResponse.json({ ok: true, notificationsSent: sent, demandIntentsExpired: expired.count, mealsAutoClosed: toClose.length, limit, hasMore: deadlineSoon.length === limit || todayMatches.length === limit || soonMatches.length === limit || awaitingCompletion.length === limit || staleCandidates.length === limit, nextCursor: { mealCursor: deadlineSoon.at(-1)?.id ?? null, matchCursor: todayMatches.at(-1)?.id ?? soonMatches.at(-1)?.id ?? null, completionCursor: awaitingCompletion.at(-1)?.id ?? null, staleCursor: staleCandidates.at(-1)?.id ?? null } });
  });
}
