import 'server-only';
import { prisma } from '@/lib/prisma';
import { measurePerformance } from '@/lib/performance';
import {
  buildAnalyticsSnapshotPayload,
  buildAreaDemandPayloads,
  buildDailyMetricsPayload,
  buildHourlyDemandPayloads,
  type AnalyticsPeriod,
  type AnalyticsSourceRows,
} from '@/lib/analytics-snapshot';
export { createTokyoDayPeriod, createTokyoWindowPeriod } from '@/lib/analytics-snapshot';

export async function loadAnalyticsSourceRows(period: AnalyticsPeriod): Promise<AnalyticsSourceRows> {
  const range = { gte: period.start, lt: period.end };
  const [growthEvents, meals, matchedMeals, completedMatches, demandIntents, notifications] = await prisma.$transaction([
    prisma.growthEvent.findMany({ where: { createdAt: range }, select: { eventType: true } }),
    prisma.meal.findMany({ where: { createdAt: range }, select: { area: true, genre: true, status: true, maxParticipants: true, demandClusterKey: true, createdAt: true, firstJoinAt: true, matchedAt: true } }),
    prisma.meal.findMany({ where: { matchedAt: range }, select: { area: true, genre: true, matchedAt: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', completedAt: range }, select: { completedAt: true, meal: { select: { area: true, genre: true } }, participants: { select: { userId: true } } } }),
    prisma.demandIntent.findMany({ where: { createdAt: range }, select: { area: true, genre: true, status: true, createdAt: true } }),
    prisma.notification.findMany({ where: { createdAt: range }, select: { type: true, readAt: true, clickedAt: true } }),
  ]);
  return { growthEvents, meals, matchedMeals: matchedMeals.map(meal => ({ ...meal, matchedAt: meal.matchedAt! })), completedMatches, demandIntents, notifications };
}

export async function generateAnalyticsUpsertPayloads(period: AnalyticsPeriod) {
  return measurePerformance('ADMIN', 'analytics.snapshot.generate', async () => {
    const rows = await loadAnalyticsSourceRows(period);
    const generatedAt = new Date();
    return {
      dailyMetrics: buildDailyMetricsPayload(period, rows, generatedAt),
      areaDemandStats: buildAreaDemandPayloads(period, rows, generatedAt),
      hourlyDemandStats: buildHourlyDemandPayloads(period, rows, generatedAt),
      analyticsSnapshot: buildAnalyticsSnapshotPayload(period, rows, generatedAt),
    };
  });
}
