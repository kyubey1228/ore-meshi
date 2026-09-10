import 'server-only';
import { prisma } from '@/lib/prisma';
import { requirePageUser } from '@/server/auth';
import { intentMatchesMeal } from '@/lib/demand';
import { createNotification } from '@/server/notifications';
import { recordGrowthEvent } from '@/server/growth';

// 新規募集の公開時、既存の有効なDemand Intentと近似一致するものを探し通知する。
// 完全一致だけでなくarea/genre/timeRange/人数のゆるい一致を許容する(Phase 3のクラスタリング基準を再利用)。
export async function notifyMatchingDemandIntents(meal: { mealId: string; area: string; genre: string | null; maxParticipants: number; earliestCandidateDate: Date | null }) {
  const candidates = await prisma.demandIntent.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() }, area: { contains: meal.area, mode: 'insensitive' } },
  });
  for (const intent of candidates) {
    if (!intentMatchesMeal(intent, meal)) continue;
    await recordGrowthEvent('DEMAND_CANDIDATE_FOUND', { recruitmentId: meal.mealId, area: meal.area, foodCategory: meal.genre ?? undefined, loggedIn: true });
    const notification = await createNotification({
      userId: intent.userId,
      type: 'DEMAND_MATCH_FOUND',
      title: '「行きたい」条件に近い募集ができました',
      body: `${meal.area}${meal.genre ? `で${meal.genre}` : ''}の募集が見つかりました。条件に近いので見てみませんか？`,
      mealId: meal.mealId,
      dedupeKey: `DEMAND_MATCH_FOUND:${intent.id}:${meal.mealId}`,
    });
    if (notification) await recordGrowthEvent('DEMAND_MATCH_NOTIFICATION_CREATED', { recruitmentId: meal.mealId, area: meal.area, loggedIn: true });
  }
}

// Demand Intent経由で実際に参加が始まった/完了したことを記録する。
// 呼び出し側は「このユーザーの有効なDemand Intentのうち、このmealと一致するものがあるか」を判定してから呼ぶ。
export async function findMatchingActiveIntent(userId: string, meal: { area: string; genre: string | null; maxParticipants: number; earliestCandidateDate: Date | null }) {
  const intents = await prisma.demandIntent.findMany({ where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } } });
  return intents.find(intent => intentMatchesMeal(intent, meal)) ?? null;
}

export async function getDemandClusters(area?: string) {
  const rows = await prisma.demandIntent.groupBy({
    by: ['area', 'genre', 'timeRange'],
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() }, ...(area ? { area: { contains: area, mode: 'insensitive' } } : {}) },
    _count: { _all: true },
  });
  return rows
    .filter(r => r._count._all >= 2)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 20)
    .map(r => ({ area: r.area, genre: r.genre, timeRange: r.timeRange, count: r._count._all }));
}

export async function getMyDemandIntents() {
  const userId = await requirePageUser();
  return prisma.demandIntent.findMany({ where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
}

export async function getDemandSummary() {
  const [total, matched] = await Promise.all([
    prisma.demandIntent.count(),
    prisma.demandIntent.count({ where: { status: 'MATCHED' } }),
  ]);
  return { total, matched, matchRate: total ? matched / total : 0 };
}
