import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export type AreaStats = {
  activeMeals: number;
  completedMeals30d: number;
  participantsThisWeek: number;
  fillRate: number;
};

async function computeAreaStats(area: string): Promise<AreaStats> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [activeMeals, completedMeals30d, participantsThisWeek, totalMeals30d] = await Promise.all([
    prisma.meal.count({ where: { area, status: 'OPEN' } }),
    prisma.match.count({ where: { status: 'COMPLETED', scheduledAt: { gte: since30 }, meal: { area } } }),
    prisma.matchParticipant.count({ where: { match: { scheduledAt: { gte: weekStart }, meal: { area } } } }),
    prisma.meal.count({ where: { area, createdAt: { gte: since30 } } }),
  ]);
  const fillRate = totalMeals30d ? completedMeals30d / totalMeals30d : 0;
  return { activeMeals, completedMeals30d, participantsThisWeek, fillRate };
}

// エリア別の集計は日次バッチ/専用テーブルまでは用意せず、5分キャッシュの都度集計に留める
// (スケジューラ基盤が無いため。将来的にAreaDailyStats等へ差し替えやすいようインターフェースだけ分離)
export const getAreaStats = unstable_cache(computeAreaStats, ['area-stats'], { revalidate: 300 });

export async function getTopAreas(limit = 5) {
  const rows = await prisma.meal.groupBy({ by: ['area'], where: { status: { in: ['OPEN', 'MATCHED'] } }, _count: { _all: true }, orderBy: { _count: { area: 'desc' } }, take: limit });
  return rows.map(row => ({ area: row.area, count: row._count._all }));
}

// 「今、人が集まりやすいエリア」= 単純な登録者数/募集数順ではなく、実際に成立した実績(completedMeals30d)を優先する。
async function computePopularAreas() {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [mealCounts, activeCounts, completed] = await Promise.all([
    prisma.meal.groupBy({ by: ['area'], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['area'], where: { status: 'OPEN' }, _count: { _all: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', scheduledAt: { gte: since30 } }, select: { meal: { select: { area: true } } } }),
  ]);
  const totals = new Map(mealCounts.map(row => [row.area, row._count._all]));
  const active = new Map(activeCounts.map(row => [row.area, row._count._all]));
  const completedCounts = new Map<string, number>();
  for (const row of completed) completedCounts.set(row.meal.area, (completedCounts.get(row.meal.area) ?? 0) + 1);
  return [...completedCounts].map(([area, completedMeals30d]) => ({ area, completedMeals30d, activeMeals: active.get(area) ?? 0, participantsThisWeek: 0, fillRate: completedMeals30d / (totals.get(area) ?? completedMeals30d) })).sort((a, b) => b.completedMeals30d - a.completedMeals30d);
}
const getCachedPopularAreas = unstable_cache(computePopularAreas, ['popular-areas'], { revalidate: 300 });
export async function getPopularAreas(limit = 5) { try{return (await getCachedPopularAreas()).slice(0, Math.min(Math.max(limit, 1), 20));}catch(error){console.error('Popular areas unavailable',error instanceof Error?error.name:'UnknownError');return[];} }
