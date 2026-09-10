import 'server-only';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';

function groupSizeBucket(n: number) { return n <= 3 ? 'SMALL' : n <= 6 ? 'MEDIUM' : 'LARGE'; }

function jstWeekdayAndHour(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short', hour: '2-digit', hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdayMap[parts.weekday] ?? 0, hour: Number(parts.hour) % 24 };
}

function timeBucket(date: Date) {
  const { weekday, hour } = jstWeekdayAndHour(date);
  const isWeekend = weekday === 0 || weekday === 6;
  const isNight = hour >= 17;
  return `${isWeekend ? 'WEEKEND' : 'WEEKDAY'}_${isNight ? 'NIGHT' : 'DAY'}`;
}

const DELTA = { YES: 1, NEUTRAL: 0.3, NO: -0.5 } as const;

// DiningFeedback(既存モデル、意味は変更しない)から「どんな飯体験を好んだか」だけを、
// 回答した本人の推薦プロフィールへ反映する。他人の評価・ランキングには一切使わない。
export async function updateRecommendationProfile(params: { userId: string; wouldMeetAgain: 'YES' | 'NEUTRAL' | 'NO'; area: string; genre: string | null; groupSize: number; scheduledAt: Date }) {
  try {
    const delta = DELTA[params.wouldMeetAgain];
    const profile = await prisma.userRecommendationProfile.upsert({
      where: { userId: params.userId },
      create: { userId: params.userId },
      update: {},
    });
    const genreWeights = { ...(profile.genreWeights as Record<string, number>) };
    const areaWeights = { ...(profile.areaWeights as Record<string, number>) };
    const groupSizeWeights = { ...(profile.groupSizeWeights as Record<string, number>) };
    const timeWeights = { ...(profile.timeWeights as Record<string, number>) };
    if (params.genre) genreWeights[params.genre] = Math.max(0, (genreWeights[params.genre] ?? 0) + delta);
    areaWeights[params.area] = Math.max(0, (areaWeights[params.area] ?? 0) + delta);
    const gsBucket = groupSizeBucket(params.groupSize);
    groupSizeWeights[gsBucket] = Math.max(0, (groupSizeWeights[gsBucket] ?? 0) + delta);
    const tBucket = timeBucket(params.scheduledAt);
    timeWeights[tBucket] = Math.max(0, (timeWeights[tBucket] ?? 0) + delta);
    await prisma.userRecommendationProfile.update({
      where: { userId: params.userId },
      data: { genreWeights, areaWeights, groupSizeWeights, timeWeights, sampleSize: { increment: 1 } },
    });
    await recordGrowthEvent('RECOMMENDATION_PROFILE_UPDATED', { userId: params.userId, loggedIn: true });
  } catch (error) {
    console.error('updateRecommendationProfile failed', error instanceof Error ? error.name : 'UnknownError');
  }
}

export type RecommendationTopPicks = { genres: string[]; areas: string[] };

export async function getRecommendationTopPicks(userId: string): Promise<RecommendationTopPicks | null> {
  const profile = await prisma.userRecommendationProfile.findUnique({ where: { userId } });
  if (!profile || profile.sampleSize === 0) return null;
  const topKeys = (weights: unknown, n: number) => Object.entries(weights as Record<string, number>).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key]) => key);
  return { genres: topKeys(profile.genreWeights, 3), areas: topKeys(profile.areaWeights, 3) };
}
