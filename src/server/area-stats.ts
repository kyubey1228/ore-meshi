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
