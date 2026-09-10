import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export type SocialProofHighlight = { text: string };

// 小さすぎる数字をそのまま見せると逆効果なため、最低表示件数を設ける(データ不足時はnullを返し何も表示しない)。
const MIN_DISPLAY_THRESHOLD = 3;

async function computeSocialProof(): Promise<SocialProofHighlight | null> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyCompleted, participantRows, areaRows] = await Promise.all([
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }),
    prisma.matchParticipant.findMany({ where: { match: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }, select: { userId: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } }, select: { meal: { select: { area: true } } } }),
  ]);
  if (weeklyCompleted < MIN_DISPLAY_THRESHOLD) return null;

  const uniqueDiners = new Set(participantRows.map(p => p.userId)).size;
  const areaCounts = new Map<string, number>();
  for (const row of areaRows) areaCounts.set(row.meal.area, (areaCounts.get(row.meal.area) ?? 0) + 1);
  const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const areaPart = topArea ? `特に${topArea}が人気です。` : '';
  return { text: `今週、${weeklyCompleted}件の食事が成立。のべ${uniqueDiners}人が参加しました。${areaPart}` };
}

const getCachedSocialProof = unstable_cache(computeSocialProof, ['social-proof-highlight'], { revalidate: 600 });

export async function getSocialProofHighlight(): Promise<SocialProofHighlight | null> {
  try {
    return await getCachedSocialProof();
  } catch (error) {
    console.error('Social proof unavailable', error instanceof Error ? error.name : 'UnknownError');
    return null;
  }
}
