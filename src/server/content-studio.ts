import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { getAreaGenreMatrix, MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';
import type { SocialContentDraft } from '@prisma/client';
import type { ContentStudioAggregates } from '@/lib/content-ideas';
export { generateContentIdeas } from '@/lib/content-ideas';


export async function getContentStudioAggregates(): Promise<ContentStudioAggregates> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyCompleted, participantRows, areaRows, openMeals, matrix] = await Promise.all([
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }),
    prisma.matchParticipant.findMany({ where: { match: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }, select: { userId: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } }, select: { meal: { select: { area: true } } } }),
    prisma.meal.groupBy({ by: ['area'], where: { status: 'OPEN' }, _count: { _all: true }, orderBy: { _count: { area: 'desc' } }, take: 1 }),
    getAreaGenreMatrix(30),
  ]);
  const weeklyUniqueDiners = new Set(participantRows.map(p => p.userId)).size;
  const areaCounts = new Map<string, number>();
  for (const row of areaRows) areaCounts.set(row.meal.area, (areaCounts.get(row.meal.area) ?? 0) + 1);
  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const openMealsTopArea = openMeals[0] && openMeals[0]._count._all >= 3 ? { area: openMeals[0].area, count: openMeals[0]._count._all } : null;
  const highDemandCandidate = matrix
    .filter(c => c.demandIntents >= MIN_BUSINESS_SAMPLE_SIZE && c.demandIntents > c.activeMeals)
    .sort((a, b) => (b.demandIntents - b.activeMeals) - (a.demandIntents - a.activeMeals))[0];
  const highDemandCell = highDemandCandidate
    ? { area: highDemandCandidate.area, genre: highDemandCandidate.genre, demandIntents: highDemandCandidate.demandIntents, activeMeals: highDemandCandidate.activeMeals }
    : null;
  return { weeklyCompleted, weeklyUniqueDiners, topArea, openMealsTopArea, highDemandCell };
}


async function computeAdminContentDrafts(): Promise<SocialContentDraft[]> {
  return prisma.socialContentDraft.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 100 });
}
const getCachedAdminContentDrafts = unstable_cache(computeAdminContentDrafts, ['admin-content-drafts'], { revalidate: 15 });
export async function getAdminContentDrafts() { await requireAdmin(); return getCachedAdminContentDrafts(); }
