import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { getAreaGenreMatrix, MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';
import type { SocialContentChannel, SocialContentDraft } from '@prisma/client';

export type ContentStudioAggregates = {
  weeklyCompleted: number;
  weeklyUniqueDiners: number;
  topArea: string | null;
  openMealsTopArea: { area: string; count: number } | null;
  highDemandCell: { area: string; genre: string; demandIntents: number; activeMeals: number } | null;
};

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

export type ContentIdea = { channel: SocialContentChannel; body: string };

// 匿名集計値のみを使い、個人が特定できる情報は一切含めない。実データが無いテンプレートは生成しない。
export function generateContentIdeas(data: ContentStudioAggregates): ContentIdea[] {
  const ideas: ContentIdea[] = [];
  const CONTENT_MIN_SAMPLE = 3;

  if (data.weeklyCompleted >= CONTENT_MIN_SAMPLE) {
    const areaPart = data.topArea ? `特に${data.topArea}が盛り上がっています。` : '';
    ideas.push({ channel: 'X', body: `今週、${data.weeklyCompleted}件の食事が成立しました。のべ${data.weeklyUniqueDiners}人が参加。${areaPart}\n\n#俺は誰かと飯が食いたい #ひとりじゃない飯` });
    ideas.push({ channel: 'INSTAGRAM', body: `今週は${data.weeklyCompleted}件の「誰かと飯」が実現しました🍚\n${areaPart}\n\n#俺は誰かと飯が食いたい #飯活 #ひとりごはんより誰かと` });
  }

  if (data.openMealsTopArea) {
    ideas.push({ channel: 'X', body: `今、${data.openMealsTopArea.area}で${data.openMealsTopArea.count}件の飯募集が進行中です。気になる募集に乗っかってみませんか？\n\n#俺は誰かと飯が食いたい` });
  }

  if (data.highDemandCell) {
    const gap = data.highDemandCell.demandIntents - data.highDemandCell.activeMeals;
    ideas.push({ channel: 'X', body: `${data.highDemandCell.area}で${data.highDemandCell.genre}を探している人が増えています（募集より${gap}件多い需要）。お店の方はぜひ掲載してみてください。\n\n#俺は誰かと飯が食いたい` });
    ideas.push({ channel: 'THREADS', body: `${data.highDemandCell.area}で${data.highDemandCell.genre}の「食事相手探してます」が増加中。近くのお店の方はチェックしてみてください。` });
  }

  return ideas.slice(0, 6);
}

async function computeAdminContentDrafts(): Promise<SocialContentDraft[]> {
  return prisma.socialContentDraft.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 100 });
}
const getCachedAdminContentDrafts = unstable_cache(computeAdminContentDrafts, ['admin-content-drafts'], { revalidate: 15 });
export async function getAdminContentDrafts() { await requireAdmin(); return getCachedAdminContentDrafts(); }
