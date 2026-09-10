import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { percentiles } from '@/lib/percentile';

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function hoursBetween(a: Date, b: Date) { return (b.getTime() - a.getTime()) / (1000 * 60 * 60); }

export async function getTimeToMatchStats(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
  const [current, previousOnly] = await Promise.all([
    prisma.meal.findMany({ where: { createdAt: { gte: since } }, select: { area: true, genre: true, createdAt: true, firstJoinAt: true, matchedAt: true } }),
    prisma.meal.findMany({ where: { createdAt: { gte: prevSince, lt: since } }, select: { createdAt: true, matchedAt: true } }),
  ]);
  const toJoin = current.map(m => m.firstJoinAt ? hoursBetween(m.createdAt, m.firstJoinAt) : null).filter((v): v is number => v !== null);
  const toMatch = current.map(m => m.matchedAt ? hoursBetween(m.createdAt, m.matchedAt) : null).filter((v): v is number => v !== null);
  const prevToMatch = previousOnly.map(m => m.matchedAt ? hoursBetween(m.createdAt, m.matchedAt) : null).filter((v): v is number => v !== null);

  const byArea = new Map<string, number[]>();
  const byGenre = new Map<string, number[]>();
  for (const m of current) {
    if (!m.matchedAt) continue;
    const h = hoursBetween(m.createdAt, m.matchedAt);
    byArea.set(m.area, [...(byArea.get(m.area) ?? []), h]);
    const g = m.genre ?? '未指定';
    byGenre.set(g, [...(byGenre.get(g) ?? []), h]);
  }
  const toStats = (map: Map<string, number[]>, keyName: string) => [...map.entries()]
    .map(([key, values]) => ({ [keyName]: key, medianHours: median(values), sampleSize: values.length }))
    .filter(row => row.sampleSize >= 3)
    .sort((a, b) => (a.medianHours ?? 0) - (b.medianHours ?? 0));

  return {
    medianTimeToFirstJoinHours: median(toJoin),
    medianTimeToMatchHours: median(toMatch),
    previousMedianTimeToMatchHours: median(prevToMatch),
    sampleSize: current.length,
    firstJoinPercentiles: percentiles(toJoin),
    matchPercentiles: percentiles(toMatch),
    areaStats: toStats(byArea, 'area') as { area: string; medianHours: number | null; sampleSize: number }[],
    genreStats: toStats(byGenre, 'genre') as { genre: string; medianHours: number | null; sampleSize: number }[],
  };
}

// Matched(必要人数到達)とCompleted(実際に開催が確認された)を明確に分離した集計。
// Weekly Completed Meals / Weekly Users Who Actually Dined をNorth Starとして扱う。
export async function getCompletionStats(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyCompletedMeals, weeklyDiners, matchedInPeriod, completedInPeriod, notCompletedInPeriod] = await Promise.all([
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } } }),
    prisma.matchParticipant.findMany({ where: { match: { status: 'COMPLETED', completedAt: { gte: sevenDaysAgo } } }, select: { userId: true }, distinct: ['userId'] }),
    prisma.meal.count({ where: { matchedAt: { gte: since } } }),
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: since } } }),
    prisma.match.count({ where: { status: 'CANCELLED', scheduledAt: { gte: since }, updatedAt: { gte: since } } }),
  ]);
  const totalConfirmed = completedInPeriod + notCompletedInPeriod;
  return {
    weeklyCompletedMeals,
    weeklyUsersWhoActuallyDined: weeklyDiners.length,
    matchedInPeriod,
    completedInPeriod,
    matchToCompletedRate: matchedInPeriod ? completedInPeriod / matchedInPeriod : 0,
    completionConfirmationRate: totalConfirmed ? completedInPeriod / totalConfirmed : 0,
  };
}

export async function getPhase3Overview(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    weeklySuccessfulMeals, mealsInPeriod, matchedInPeriod,
    signupCohort, referralActivatedCount, referralTotal,
  ] = await Promise.all([
    prisma.meal.count({ where: { matchedAt: { gte: sevenDaysAgo } } }),
    prisma.meal.count({ where: { createdAt: { gte: since } } }),
    prisma.meal.count({ where: { createdAt: { gte: since }, status: 'MATCHED' } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { id: true, createdAt: true } }),
    prisma.referral.count({ where: { activatedAt: { not: null } } }),
    prisma.referral.count({ where: { referredUserId: { not: null } } }),
  ]);

  const cohortIds = signupCohort.map(u => u.id);
  const [joinRequests, hostedMeals, matchParticipations] = cohortIds.length ? await Promise.all([
    prisma.joinRequest.findMany({ where: { userId: { in: cohortIds } }, select: { userId: true, createdAt: true } }),
    prisma.meal.findMany({ where: { hostId: { in: cohortIds } }, select: { hostId: true, createdAt: true } }),
    prisma.matchParticipant.findMany({ where: { userId: { in: cohortIds } }, select: { userId: true, createdAt: true } }),
  ]) : [[], [], []];

  let d1Active = 0, d7Active = 0, firstJoinCount = 0, successfulMealCount = 0;
  for (const user of signupCohort) {
    const activityAfter = (rows: { userId?: string; hostId?: string; createdAt: Date }[]) =>
      rows.filter(r => (r.userId ?? r.hostId) === user.id).map(r => r.createdAt);
    const allActivity = [...activityAfter(joinRequests), ...activityAfter(hostedMeals), ...activityAfter(matchParticipations)];
    if (allActivity.some(t => t > user.createdAt && t <= new Date(user.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000))) d1Active++;
    if (allActivity.some(t => t > user.createdAt && t <= new Date(user.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000))) d7Active++;
    if (joinRequests.some(r => r.userId === user.id)) firstJoinCount++;
    if (matchParticipations.some(r => r.userId === user.id)) successfulMealCount++;
  }

  // Second Join Rate / Second Recruitment Rate: 累計で2回以上参加/募集したユーザーの割合(直近作成ユーザーに限らず全体で判定)。
  const [joinCountsRaw, hostCountsRaw] = await Promise.all([
    prisma.joinRequest.groupBy({ by: ['userId'], _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['hostId'], _count: { _all: true } }),
  ]);
  const usersWithJoin = joinCountsRaw.length;
  const usersWithSecondJoin = joinCountsRaw.filter(r => r._count._all >= 2).length;
  const usersWithHost = hostCountsRaw.length;
  const usersWithSecondHost = hostCountsRaw.filter(r => r._count._all >= 2).length;

  return {
    days,
    weeklySuccessfulMeals,
    recruitmentFillRate: mealsInPeriod ? matchedInPeriod / mealsInPeriod : 0,
    signupToFirstJoinRate: signupCohort.length ? firstJoinCount / signupCohort.length : 0,
    signupToSuccessfulMealRate: signupCohort.length ? successfulMealCount / signupCohort.length : 0,
    d1RetentionRate: signupCohort.length ? d1Active / signupCohort.length : 0,
    d7RetentionRate: signupCohort.length ? d7Active / signupCohort.length : 0,
    secondJoinRate: usersWithJoin ? usersWithSecondJoin / usersWithJoin : 0,
    secondRecruitmentRate: usersWithHost ? usersWithSecondHost / usersWithHost : 0,
    referralActivatedUsers: referralActivatedCount,
    referralActivationRate: referralTotal ? referralActivatedCount / referralTotal : 0,
    signupCohortSize: signupCohort.length,
  };
}

// Second Join Rate自体はgetPhase3Overviewに既存。ここでは「初回Completed後の再参加」と「2回目までの日数」を補完する。
export async function getRepeatStats() {
  await requireAdmin();
  const [joinRows, completedFirstJoinUserIds] = await Promise.all([
    prisma.joinRequest.findMany({ select: { userId: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.matchParticipant.findMany({ where: { match: { status: 'COMPLETED' } }, select: { userId: true }, distinct: ['userId'] }),
  ]);
  const byUser = new Map<string, Date[]>();
  for (const r of joinRows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r.createdAt]);
  const daysToSecondJoin: number[] = [];
  for (const dates of byUser.values()) if (dates.length >= 2) daysToSecondJoin.push((dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
  const completedUserIds = new Set(completedFirstJoinUserIds.map(r => r.userId));
  const completedUsersWithSecondJoin = [...completedUserIds].filter(id => (byUser.get(id)?.length ?? 0) >= 2).length;
  return {
    medianDaysToSecondJoin: median(daysToSecondJoin),
    // 「初回Completed後の再参加」の近似値(参加履歴全体で2回目のjoinRequestがあるかで判定。厳密な時系列前後判定ではない)。
    firstCompletedToSecondJoinRate: completedUserIds.size ? completedUsersWithSecondJoin / completedUserIds.size : 0,
    completedUserSampleSize: completedUserIds.size,
  };
}

export async function getNotificationAnalysis(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const notifications = await prisma.notification.findMany({ where: { createdAt: { gte: since } }, select: { type: true, readAt: true, clickedAt: true } });
  const byType = new Map<string, { sent: number; opened: number; clicked: number }>();
  for (const n of notifications) {
    const row = byType.get(n.type) ?? { sent: 0, opened: 0, clicked: 0 };
    row.sent++;
    if (n.readAt) row.opened++;
    if (n.clickedAt) row.clicked++;
    byType.set(n.type, row);
  }
  const total = notifications.length;
  const opened = notifications.filter(n => n.readAt).length;
  const clicked = notifications.filter(n => n.clickedAt).length;
  return {
    total, opened, clicked,
    openRate: total ? opened / total : 0,
    clickRate: total ? clicked / total : 0,
    byType: [...byType.entries()].map(([type, row]) => ({ type, ...row, clickRate: row.sent ? row.clicked / row.sent : 0 })),
  };
}

export async function getDemandDashboard(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [created, matched, byArea, byGenre, recruitmentsCreated] = await Promise.all([
    prisma.demandIntent.count({ where: { createdAt: { gte: since } } }),
    prisma.demandIntent.count({ where: { createdAt: { gte: since }, status: 'MATCHED' } }),
    prisma.demandIntent.groupBy({ by: ['area'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.demandIntent.groupBy({ by: ['genre'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.meal.count({ where: { demandClusterKey: { not: null }, createdAt: { gte: since } } }),
  ]);
  const successfulFromDemand = await prisma.meal.count({ where: { demandClusterKey: { not: null }, createdAt: { gte: since }, status: 'MATCHED' } });
  return {
    created, matched,
    matchRate: created ? matched / created : 0,
    recruitmentsCreated,
    successfulFromDemand,
    byArea: byArea.map(r => ({ area: r.area, count: r._count._all })).sort((a, b) => b.count - a.count).slice(0, 10),
    byGenre: byGenre.map(r => ({ genre: r.genre ?? '未指定', count: r._count._all })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

export async function getSupplyDemandGap() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [demandByArea, mealsByArea, participantsByArea] = await Promise.all([
    prisma.demandIntent.groupBy({ by: ['area'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['area'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.meal.findMany({ where: { createdAt: { gte: since } }, select: { area: true, status: true, _count: { select: { matches: true } } } }),
  ]);
  const mealCountByArea = new Map(mealsByArea.map(r => [r.area, r._count._all]));
  const matchedCountByArea = new Map<string, number>();
  for (const m of participantsByArea) if (m.status === 'MATCHED') matchedCountByArea.set(m.area, (matchedCountByArea.get(m.area) ?? 0) + 1);

  return demandByArea
    .map(r => {
      const activeMeals = mealCountByArea.get(r.area) ?? 0;
      const matched = matchedCountByArea.get(r.area) ?? 0;
      return { area: r.area, demandIntents: r._count._all, activeMeals, fillRate: activeMeals ? matched / activeMeals : 0, gap: r._count._all - activeMeals };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 15);
}
