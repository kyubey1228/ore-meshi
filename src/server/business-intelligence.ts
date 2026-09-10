import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { toCsv } from '@/lib/csv';

export { toCsv };

// 店舗営業に使う集計は、極端に少数の行動から個人が推測できないよう、この件数未満は「データ不足」として抑制する。
export const MIN_BUSINESS_SAMPLE_SIZE = 5;

function genreKey(g: string | null) { return g ?? '未指定'; }
function cellKey(area: string, genre: string | null) { return `${area}|||${genreKey(genre)}`; }

type Cell = { area: string; genre: string; demandIntents: number; activeMeals: number; matchedMeals: number; completedMeals: number; estimatedParticipants: number };

async function computeAreaGenreMatrix(days: number): Promise<Cell[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [demand, meals, matched, completedMatches] = await Promise.all([
    prisma.demandIntent.groupBy({ by: ['area', 'genre'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['area', 'genre'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['area', 'genre'], where: { createdAt: { gte: since }, matchedAt: { not: null } }, _count: { _all: true }, _sum: { maxParticipants: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', completedAt: { gte: since } }, select: { meal: { select: { area: true, genre: true } } } }),
  ]);
  const byKey = new Map<string, Cell>();
  const get = (area: string, genre: string | null) => {
    const key = cellKey(area, genre);
    let cell = byKey.get(key);
    if (!cell) { cell = { area, genre: genreKey(genre), demandIntents: 0, activeMeals: 0, matchedMeals: 0, completedMeals: 0, estimatedParticipants: 0 }; byKey.set(key, cell); }
    return cell;
  };
  for (const row of demand) get(row.area, row.genre).demandIntents += row._count._all;
  for (const row of meals) get(row.area, row.genre).activeMeals += row._count._all;
  for (const row of matched) { const cell = get(row.area, row.genre); cell.matchedMeals += row._count._all; cell.estimatedParticipants += row._sum.maxParticipants ?? 0; }
  for (const m of completedMatches) get(m.meal.area, m.meal.genre).completedMeals += 1;
  return [...byKey.values()];
}

// 30分キャッシュの都度集計(専用の日次バッチテーブルは現状のデータ量では不要と判断し見送り)。
export const getAreaGenreMatrix = unstable_cache(computeAreaGenreMatrix, ['business-area-genre-matrix'], { revalidate: 1800 });

export async function getAreaGenreDashboard(days: number) {
  await requireAdmin();
  const cells = await getAreaGenreMatrix(days);
  const suppressed = cells.map(c => ({
    ...c,
    fillRate: c.activeMeals ? c.matchedMeals / c.activeMeals : 0,
    dataSufficient: c.demandIntents + c.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE,
  }));
  const areas = [...new Set(suppressed.map(c => c.area))];
  const genres = [...new Set(suppressed.map(c => c.genre))];
  return { cells: suppressed, areas, genres };
}

// Opportunity Score = 需要件数 + 供給不足分(需要-供給の不足)×2 + 過去の成立実績×1。
// 複雑なAIモデルは使わず、この加重和のみで説明可能にしている。
function opportunityScore(c: { demandIntents: number; activeMeals: number; completedMeals: number }) {
  const gap = Math.max(0, c.demandIntents - c.activeMeals);
  return c.demandIntents * 1 + gap * 2 + c.completedMeals * 1;
}

export async function getOpportunityRanking(days: number, limit = 10) {
  await requireAdmin();
  const cells = await getAreaGenreMatrix(days);
  return cells
    .filter(c => c.demandIntents + c.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE)
    .map(c => ({ ...c, fillRate: c.activeMeals ? c.matchedMeals / c.activeMeals : 0, opportunityScore: opportunityScore(c) }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, limit);
}

export async function getSalesSummary(days: number) {
  await requireAdmin();
  const [current, previous] = await Promise.all([getAreaGenreMatrix(days), computeAreaGenreMatrix(days * 2)]);
  const prevOnly = new Map<string, Cell>();
  for (const c of previous) prevOnly.set(cellKey(c.area, c.genre), c);
  // previousは「過去2期間分」の集計のため、前期間だけの値は 全体-当期間 で概算する。
  const top = current
    .filter(c => c.demandIntents + c.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE)
    .map(c => ({ ...c, opportunityScore: opportunityScore(c) }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5);
  return top.map(c => {
    const twoPeriod = prevOnly.get(cellKey(c.area, c.genre));
    const prevDemand = twoPeriod ? Math.max(0, twoPeriod.demandIntents - c.demandIntents) : null;
    const prevCompleted = twoPeriod ? Math.max(0, twoPeriod.completedMeals - c.completedMeals) : null;
    const demandChangePct = prevDemand ? Math.round(((c.demandIntents - prevDemand) / prevDemand) * 100) : null;
    const completedChangePct = prevCompleted ? Math.round(((c.completedMeals - prevCompleted) / prevCompleted) * 100) : null;
    return {
      area: c.area, genre: c.genre,
      text: `${c.area}×${c.genre}：直近${days}日でDemand Intent${c.demandIntents}件、募集${c.activeMeals}件、Completed Meals ${c.completedMeals}件、推定参加者${c.estimatedParticipants}人`,
      demandIntents: c.demandIntents, activeMeals: c.activeMeals, completedMeals: c.completedMeals, estimatedParticipants: c.estimatedParticipants,
      demandChangePct, completedChangePct,
    };
  });
}
