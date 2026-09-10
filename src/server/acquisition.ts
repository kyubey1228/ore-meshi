import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { classifyChannel, type Channel } from '@/lib/channel';

export { classifyChannel, type Channel };

// signup_completedしたユーザーについて、以降activated/matched/completedへ到達したかをバッチ判定する(N+1回避)。
async function classifyCohort(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { activated: boolean; matched: boolean; completed: boolean }>();
  const [joinRequests, hostedMeals, matched, completed] = await Promise.all([
    prisma.joinRequest.findMany({ where: { userId: { in: userIds } }, select: { userId: true } }),
    prisma.meal.findMany({ where: { hostId: { in: userIds } }, select: { hostId: true } }),
    prisma.matchParticipant.findMany({ where: { userId: { in: userIds } }, select: { userId: true } }),
    prisma.matchParticipant.findMany({ where: { userId: { in: userIds }, match: { status: 'COMPLETED' } }, select: { userId: true } }),
  ]);
  const joinedIds = new Set(joinRequests.map(r => r.userId));
  const hostedIds = new Set(hostedMeals.map(r => r.hostId));
  const matchedIds = new Set(matched.map(r => r.userId));
  const completedIds = new Set(completed.map(r => r.userId));
  const result = new Map<string, { activated: boolean; matched: boolean; completed: boolean }>();
  for (const id of userIds) result.set(id, { activated: joinedIds.has(id) || hostedIds.has(id), matched: matchedIds.has(id), completed: completedIds.has(id) });
  return result;
}

export async function getAcquisitionDashboard(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [signupEvents, referralUserIds, visitorSessions] = await Promise.all([
    prisma.growthEvent.findMany({ where: { eventType: 'SIGNUP_COMPLETED', createdAt: { gte: since }, userId: { not: null } }, select: { userId: true, source: true, referrer: true, utmMedium: true, utmCampaign: true } }),
    prisma.growthEvent.findMany({ where: { eventType: 'REFERRAL_SIGNUP_COMPLETED', createdAt: { gte: since } }, select: { userId: true } }),
    prisma.growthEvent.findMany({ where: { createdAt: { gte: since } }, select: { sessionKey: true }, distinct: ['sessionKey'] }),
  ]);
  const referralIds = new Set(referralUserIds.map(r => r.userId).filter((v): v is string => Boolean(v)));
  const userIds = signupEvents.map(e => e.userId).filter((v): v is string => Boolean(v));
  const cohort = await classifyCohort(userIds);

  const byChannel = new Map<Channel, { signup: number; activated: number; matched: number; completed: number }>();
  for (const e of signupEvents) {
    if (!e.userId) continue;
    const channel = classifyChannel({ source: e.source, referrer: e.referrer, utmMedium: e.utmMedium, utmCampaign: e.utmCampaign, isReferral: referralIds.has(e.userId) });
    const row = byChannel.get(channel) ?? { signup: 0, activated: 0, matched: 0, completed: 0 };
    row.signup++;
    const status = cohort.get(e.userId);
    if (status?.activated) row.activated++;
    if (status?.matched) row.matched++;
    if (status?.completed) row.completed++;
    byChannel.set(channel, row);
  }

  const channels = [...byChannel.entries()].map(([channel, v]) => ({
    channel, ...v,
    signupCvr: v.signup ? v.activated / v.signup : 0,
    completedCvr: v.signup ? v.completed / v.signup : 0,
  })).sort((a, b) => b.signup - a.signup);

  const totalSignupStarted = await prisma.growthEvent.count({ where: { eventType: 'SIGNUP_STARTED', createdAt: { gte: since } } });
  const totals = {
    siteVisitors: visitorSessions.length,
    signupStarted: totalSignupStarted,
    signupCompleted: signupEvents.length,
    activatedUsers: [...cohort.values()].filter(v => v.activated).length,
    matchedUsers: [...cohort.values()].filter(v => v.matched).length,
    completedUsers: [...cohort.values()].filter(v => v.completed).length,
  };
  const bestActivatedChannel = channels.filter(c => c.signup >= 5).sort((a, b) => b.signupCvr - a.signupCvr)[0] ?? null;

  return {
    totals,
    signupCvr: totals.siteVisitors ? totals.signupCompleted / totals.siteVisitors : 0,
    activationCvr: totals.signupCompleted ? totals.activatedUsers / totals.signupCompleted : 0,
    completedCvr: totals.signupCompleted ? totals.completedUsers / totals.signupCompleted : 0,
    channels,
    bestActivatedChannel,
  };
}

export async function getCampaignDashboard(days: number) {
  await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [visits, signups] = await Promise.all([
    prisma.growthEvent.groupBy({ by: ['utmCampaign'], where: { createdAt: { gte: since }, utmCampaign: { not: null } }, _count: { _all: true } }),
    prisma.growthEvent.findMany({ where: { eventType: 'SIGNUP_COMPLETED', createdAt: { gte: since }, utmCampaign: { not: null } }, select: { userId: true, utmCampaign: true } }),
  ]);
  const userIds = signups.map(s => s.userId).filter((v): v is string => Boolean(v));
  const cohort = await classifyCohort(userIds);
  const visitsByCampaign = new Map(visits.map(v => [v.utmCampaign as string, v._count._all]));
  const byCampaign = new Map<string, { signup: number; activated: number; matched: number; completed: number }>();
  for (const s of signups) {
    if (!s.userId || !s.utmCampaign) continue;
    const row = byCampaign.get(s.utmCampaign) ?? { signup: 0, activated: 0, matched: 0, completed: 0 };
    row.signup++;
    const status = cohort.get(s.userId);
    if (status?.activated) row.activated++;
    if (status?.matched) row.matched++;
    if (status?.completed) row.completed++;
    byCampaign.set(s.utmCampaign, row);
  }
  return [...byCampaign.entries()].map(([campaign, v]) => ({
    campaign, visits: visitsByCampaign.get(campaign) ?? 0, ...v,
    conversionRate: v.signup ? v.completed / v.signup : 0,
  })).sort((a, b) => b.visits - a.visits);
}
