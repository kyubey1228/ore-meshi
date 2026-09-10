import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { calculateKFactor } from '@/lib/k-factor';

async function computeGrowthDashboard(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [events, completedMatches, activatedUsers, inviterRows] = await Promise.all([
    prisma.growthEvent.groupBy({ by: ['eventType'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', scheduledAt: { gte: since } }, select: { meal: { select: { area: true } } } }),
    prisma.user.count({ where: { onboardingCompletedAt: { gte: since } } }),
    prisma.growthEvent.findMany({ where: { eventType: 'INVITE_SHARE_COMPLETED', createdAt: { gte: since }, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries(events.map(e => [e.eventType, e._count._all]));
  const areaCounts = new Map<string, number>();
  for (const match of completedMatches) areaCounts.set(match.meal.area, (areaCounts.get(match.meal.area) ?? 0) + 1);
  const topCompletedAreas = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area, count]) => ({ area, count }));

  const signupStarted = counts.SIGNUP_STARTED ?? 0;
  const signupCompleted = counts.SIGNUP_COMPLETED ?? 0;
  const joinIntentCreated = counts.JOIN_INTENT_CREATED ?? 0;
  const joinAfterSignup = counts.JOIN_AFTER_SIGNUP_COMPLETED ?? 0;
  const shareTotal = (counts.RECRUITMENT_SHARE_X ?? 0) + (counts.RECRUITMENT_SHARE_LINE ?? 0) + (counts.RECRUITMENT_URL_COPIED ?? 0);
  const referralOpens = counts.REFERRAL_LINK_OPENED ?? 0;
  const referralSignups = counts.REFERRAL_SIGNUP_COMPLETED ?? 0;
  const quickPostStarted = counts.QUICK_POST_STARTED ?? 0;
  const quickPostCompleted = counts.QUICK_POST_COMPLETED ?? 0;
  const kFactor = calculateKFactor({
    activatedUsers,
    invitesSent: counts.INVITE_SHARE_COMPLETED ?? 0,
    uniqueInviters: inviterRows.length,
    inviteClicks: counts.INVITE_LINK_OPENED ?? 0,
    inviteSignups: counts.REFERRAL_SIGNUP_COMPLETED ?? 0,
    inviteActivated: counts.REFERRAL_ACTIVATION_COMPLETED ?? 0,
  });

  return {
    days,
    signupStarted,
    signupCompleted,
    signupConversionRate: signupStarted ? signupCompleted / signupStarted : 0,
    joinIntentCreated,
    joinAfterSignup,
    joinAfterSignupRate: joinIntentCreated ? joinAfterSignup / joinIntentCreated : 0,
    shareTotal,
    referralOpens,
    referralSignups,
    referralConversionRate: referralOpens ? referralSignups / referralOpens : 0,
    // Virality(この期間の新規登録のうち紹介経由が占める割合)。招待送信数を計測していないため
    // 厳密なK-factor(招待数×転換率)は出さず、既存データで説明できる比率にとどめる。
    viralShare: signupCompleted ? referralSignups / signupCompleted : 0,
    referralContribution: signupCompleted ? referralSignups / signupCompleted : 0,
    kFactor,
    quickPostStarted,
    quickPostCompleted,
    quickPostCompletionRate: quickPostStarted ? quickPostCompleted / quickPostStarted : 0,
    topCompletedAreas,
    counts,
  };
}
// admin限定の閲覧なので60秒キャッシュ(頻繁なリロードのたびに全件再集計しない)。
export async function getGrowthDashboard(days: number) {
  await requireAdmin();
  return unstable_cache(computeGrowthDashboard, ['growth-dashboard'], { revalidate: 60 })(days);
}

export async function getGrowthHealth() {
  await requireAdmin();
  const [metric, job, businessTotal, businessActive, contentDrafts, seoRows] = await Promise.all([
    prisma.dailyMetrics.findFirst({ orderBy: { generatedAt: 'desc' }, select: { generatedAt: true, date: true } }),
    prisma.dailyMetricJobRun.findFirst({ orderBy: { startedAt: 'desc' }, select: { status: true, startedAt: true, finishedAt: true, errorMessage: true } }),
    prisma.businessAccount.count({ where: { status: 'ACTIVE' } }),
    prisma.businessAccount.count({ where: { status: 'ACTIVE', OR: [{ sponsoredMeals: { some: {} } }, { seatCampaigns: { some: {} } }] } }),
    prisma.socialContentDraft.count(),
    prisma.areaDemandStats.findMany({ where: { genre: { not: '未指定' }, OR: [{ mealsCreated: { gte: 3 } }, { demandIntents: { gte: 3 } }, { matchesCompleted: { gte: 3 } }] }, distinct: ['area', 'genre'], select: { area: true, genre: true } }),
  ]);
  const ageHours = metric ? (Date.now() - metric.generatedAt.getTime()) / 3_600_000 : null;
  return { metric, job, stale: ageHours === null || ageHours > 36, ageHours, businessActivationRate: businessTotal ? businessActive / businessTotal : 0, contentDrafts, seoIndexablePages: seoRows.length };
}
