import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireBillingMembership } from '@/server/billing/auth';

// SponsoredMeal.mealIdで直接紐づく実Mealのjoin基準で集計するため、Referral Eventのクリック帰属に頼らず
// 二重計上の余地がない(1 SponsoredMeal = 高々1 Meal = 高々1 Match)。
export async function getSponsoredMealPerformance(sponsoredMealId: string) {
  const sponsoredMeal = await prisma.sponsoredMeal.findUnique({ where: { id: sponsoredMealId } });
  if (!sponsoredMeal) return null;
  await requireBillingMembership(sponsoredMeal.businessAccountId);

  const [detailViews, xVisits, joinRequests, acceptedParticipants, match] = await Promise.all([
    prisma.growthEvent.count({ where: { eventType: 'RECRUITMENT_VIEWED', recruitmentId: sponsoredMeal.mealId ?? '__none__' } }),
    prisma.referralEvent.count({ where: { businessAccountId: sponsoredMeal.businessAccountId, entityType: 'SPONSORED_MEAL', entityId: sponsoredMeal.id, eventType: 'X_VISIT' } }),
    sponsoredMeal.mealId ? prisma.joinRequest.count({ where: { mealId: sponsoredMeal.mealId } }) : Promise.resolve(0),
    sponsoredMeal.mealId ? prisma.joinRequest.count({ where: { mealId: sponsoredMeal.mealId, status: 'ACCEPTED' } }) : Promise.resolve(0),
    sponsoredMeal.mealId ? prisma.match.findUnique({ where: { mealId: sponsoredMeal.mealId }, select: { status: true, completedAt: true, _count: { select: { participants: true } } } }) : Promise.resolve(null),
  ]);

  const matched = Boolean(match);
  const completed = match?.status === 'COMPLETED';
  const matchedParticipants = match?._count.participants ?? 0;
  const completedParticipants = completed ? matchedParticipants : 0;
  const cancelled = match?.status === 'CANCELLED' ? 1 : 0;

  const pct = (num: number, den: number) => den ? num / den : 0;

  return {
    sponsoredMeal: { id: sponsoredMeal.id, title: sponsoredMeal.title, area: sponsoredMeal.area, genre: sponsoredMeal.genre, status: sponsoredMeal.status, mealId: sponsoredMeal.mealId },
    funnel: {
      detailViews,
      xVisits,
      joinRequests,
      acceptedParticipants,
      matchedMeals: matched ? 1 : 0,
      completedMeals: completed ? 1 : 0,
      matchedParticipants,
      completedParticipants,
      cancellationCount: cancelled,
    },
    conversion: {
      detailToJoin: pct(joinRequests, detailViews),
      joinToAccepted: pct(acceptedParticipants, joinRequests),
      acceptedToMatched: pct(matched ? acceptedParticipants : 0, acceptedParticipants),
      matchedToCompleted: pct(completed ? 1 : 0, matched ? 1 : 0),
    },
  };
}
