export type RankableMeal = {
  id: string;
  area: string;
  genre: string | null;
  maxParticipants: number;
  createdAt: Date;
  host: { createdAt: Date; bio: string | null; image: string | null; diningTypes: unknown[] };
  candidates: { date: Date }[];
  _count: { joinRequests: number };
};

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
  const ageDays = (now.getTime() - host.createdAt.getTime()) / (1000 * 60 * 60 * 24);
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
  const hoursUntil = nextCandidate ? (nextCandidate.date.getTime() - now.getTime()) / (1000 * 60 * 60) : null;

  const areaMatch = Boolean(context.preferredArea) && meal.area.toLowerCase().includes(String(context.preferredArea).toLowerCase()) ? 30 : 0;
  const genreMatch = Boolean(meal.genre) && (context.preferredGenres ?? []).some(g => g.toLowerCase() === meal.genre?.toLowerCase()) ? 20 : 0;
  const participantCount = (meal._count.joinRequests + 1) * 2;
  const lastSlotBonus = remaining === 1 ? 50 : remaining === 2 ? 15 : 0;
  const upcomingBonus = hoursUntil !== null && hoursUntil > 0 ? Math.max(0, 40 - hoursUntil / 2) : 0;
  const hostTrustBonus = hostQualityBonus(meal.host, now);
  const recencyBonus = Math.max(0, 10 - (now.getTime() - meal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  // DiningFeedbackから導出した「好みそうな体験」の軽い加点(最大10)。他人の評価は一切影響しない自分専用の重み。
  const feedbackBonus =
    (context.recommendationProfile?.areas.some(a => a.toLowerCase() === meal.area.toLowerCase()) ? 5 : 0) +
    (meal.genre && context.recommendationProfile?.genres.some(g => g.toLowerCase() === meal.genre?.toLowerCase()) ? 5 : 0);

  const score = areaMatch + genreMatch + participantCount + lastSlotBonus + upcomingBonus + hostTrustBonus + recencyBonus + feedbackBonus;

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
