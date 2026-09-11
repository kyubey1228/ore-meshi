import { effectivePlanFromAccount } from './business-capabilities';
import type { BusinessPlan, SubscriptionStatus } from '@prisma/client';

export type RankableMeal = {
  id: string;
  area: string;
  genre: string | null;
  maxParticipants: number;
  createdAt: Date;
  host: { createdAt: Date; bio: string | null; image: string | null; diningTypes: unknown[] };
  candidates: { date: Date }[];
  _count: { joinRequests: number };
  sponsoredMeals?: { businessAccount: { planOverride: BusinessPlan | null; subscription: { plan: BusinessPlan; status: SubscriptionStatus; currentPeriodEnd: Date } | null } }[];
};

function timestamp(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export type RankingContext = {
  preferredArea?: string | null;
  preferredGenres?: string[];
  recommendationProfile?: { genres: string[]; areas: string[] } | null;
  now?: Date;
};

export type RankedMeal<T extends RankableMeal = RankableMeal> = {
  meal: T;
  score: number;
  reason: 'LAST_SLOT' | 'AREA_MATCH' | 'GENRE_MATCH' | 'UPCOMING' | 'POPULAR' | 'NEW';
};

function hostQualityBonus(host: RankableMeal['host'], now: Date) {
  const ageDays = (now.getTime() - timestamp(host.createdAt)) / (1000 * 60 * 60 * 24);
  let bonus = 0;
  if (host.bio) bonus += 4;
  if (host.image) bonus += 3;
  if (host.diningTypes.length > 0) bonus += 4;
  if (ageDays >= 7) bonus += 4;
  return bonus;
}

export function scoreMeal<T extends RankableMeal>(meal: T, context: RankingContext = {}): RankedMeal<T> {
  const now = context.now ?? new Date();
  const remaining = Math.max(0, meal.maxParticipants - (meal._count.joinRequests + 1));
  const nextCandidate = meal.candidates[0];
  const hoursUntil = nextCandidate ? (timestamp(nextCandidate.date) - now.getTime()) / (1000 * 60 * 60) : null;

  const areaMatch = Boolean(context.preferredArea) && meal.area.toLowerCase().includes(String(context.preferredArea).toLowerCase()) ? 30 : 0;
  const genreMatch = Boolean(meal.genre) && (context.preferredGenres ?? []).some(g => g.toLowerCase() === meal.genre?.toLowerCase()) ? 20 : 0;
  const participantCount = (meal._count.joinRequests + 1) * 2;
  const lastSlotBonus = remaining === 1 ? 50 : remaining === 2 ? 15 : 0;
  const upcomingBonus = hoursUntil !== null && hoursUntil > 0 ? Math.max(0, 40 - hoursUntil / 2) : 0;
  const hostTrustBonus = hostQualityBonus(meal.host, now);
  const recencyBonus = Math.max(0, 10 - (now.getTime() - timestamp(meal.createdAt)) / (1000 * 60 * 60 * 24));
  // DiningFeedbackから導出した「好みそうな体験」の軽い加点(最大10)。他人の評価は一切影響しない自分専用の重み。
  const feedbackBonus =
    (context.recommendationProfile?.areas.some(a => a.toLowerCase() === meal.area.toLowerCase()) ? 5 : 0) +
    (meal.genre && context.recommendationProfile?.genres.some(g => g.toLowerCase() === meal.genre?.toLowerCase()) ? 5 : 0);

  // スポンサーBoost: 「PROだから常に1位」にならないよう、既存の関連性シグナル(エリア一致/ジャンル一致/残り1人)が
  // 実際に成立している場合のみ加点する(説明可能・状態に応じて自然に増減するため専用のcooldown機構は設けていない)。
  const sponsorship = meal.sponsoredMeals?.[0]?.businessAccount;
  const sponsorPlan = sponsorship ? effectivePlanFromAccount(sponsorship.planOverride, sponsorship.subscription) : null;
  let sponsorBonus = 0;
  if (sponsorPlan) {
    sponsorBonus += 15; // 基本のスポンサー露出加点(控えめ、他の関連性ボーナスより小さい)
    if (sponsorPlan === 'STANDARD' || sponsorPlan === 'PRO') {
      sponsorBonus += areaMatch > 0 ? 10 : 0; // Area Boost: 実際にエリアが一致する場合のみ
      sponsorBonus += genreMatch > 0 ? 8 : 0; // Purpose/Genre Boost: 実際にジャンルが一致する場合のみ
    }
    if (sponsorPlan === 'PRO' && remaining === 1) sponsorBonus += 25; // Last Seat Boost: 本当にあと1人の場合のみ
  }

  const score = areaMatch + genreMatch + participantCount + lastSlotBonus + upcomingBonus + hostTrustBonus + recencyBonus + feedbackBonus + sponsorBonus;

  const reason: RankedMeal['reason'] =
    lastSlotBonus >= 50 ? 'LAST_SLOT'
    : areaMatch > 0 ? 'AREA_MATCH'
    : genreMatch > 0 ? 'GENRE_MATCH'
    : upcomingBonus > 20 ? 'UPCOMING'
    : participantCount >= 4 ? 'POPULAR'
    : 'NEW';

  return { meal, score, reason };
}

export function rankMeals<T extends RankableMeal>(meals: T[], context: RankingContext = {}): RankedMeal<T>[] {
  return meals.map(meal => scoreMeal(meal, context)).sort((a, b) => b.score - a.score);
}
