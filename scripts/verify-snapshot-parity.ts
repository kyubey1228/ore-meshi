import { PrismaClient } from '@prisma/client';
import {
  buildAnalyticsSnapshotPayload,
  buildAreaDemandPayloads,
  buildDailyMetricsPayload,
  buildHourlyDemandPayloads,
  createTokyoDayPeriod,
  createTokyoWindowPeriod,
  type AnalyticsPeriod,
  type AnalyticsSourceRows,
} from '../src/lib/analytics-snapshot';

const prisma = new PrismaClient();

type Difference = { metric: string; expected: unknown; actual: unknown };

function comparable(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value.map(item => JSON.parse(comparable(item))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  if (value && typeof value === 'object') {
    return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, JSON.parse(comparable(item))])));
  }
  return JSON.stringify(value);
}

function check(differences: Difference[], metric: string, expected: unknown, actual: unknown) {
  if (comparable(expected) !== comparable(actual)) differences.push({ metric, expected, actual });
}

async function legacyDaily(period: AnalyticsPeriod) {
  const range = { gte: period.start, lt: period.end };
  const eventTypes = [
    'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'JOIN_INTENT_CREATED', 'JOIN_AFTER_SIGNUP_COMPLETED',
    'RECRUITMENT_SHARE_X', 'RECRUITMENT_SHARE_LINE', 'RECRUITMENT_URL_COPIED',
    'REFERRAL_LINK_OPENED', 'REFERRAL_SIGNUP_COMPLETED', 'QUICK_POST_STARTED', 'QUICK_POST_COMPLETED',
  ] as const;
  const [events, mealsCreated, mealsMatched, matchesCompleted, diners, demandCreated, demandMatched, demandRecruitments, demandMealsMatched, notifications] = await prisma.$transaction([
    prisma.growthEvent.findMany({ where: { createdAt: range, eventType: { in: [...eventTypes] } }, select: { eventType: true } }),
    prisma.meal.count({ where: { createdAt: range } }),
    prisma.meal.count({ where: { createdAt: range, status: 'MATCHED' } }),
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: range } }),
    prisma.matchParticipant.findMany({ where: { match: { status: 'COMPLETED', completedAt: range } }, select: { userId: true }, distinct: ['userId'] }),
    prisma.demandIntent.count({ where: { createdAt: range } }),
    prisma.demandIntent.count({ where: { createdAt: range, status: 'MATCHED' } }),
    prisma.meal.count({ where: { createdAt: range, demandClusterKey: { not: null } } }),
    prisma.meal.count({ where: { createdAt: range, demandClusterKey: { not: null }, status: 'MATCHED' } }),
    prisma.notification.findMany({ where: { createdAt: range }, select: { type: true, readAt: true, clickedAt: true } }),
  ]);
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
  const byType: Record<string, { sent: number; opened: number; clicked: number }> = {};
  for (const notification of notifications) {
    const row = byType[notification.type] ?? { sent: 0, opened: 0, clicked: 0 };
    row.sent++; if (notification.readAt) row.opened++; if (notification.clickedAt) row.clicked++;
    byType[notification.type] = row;
  }
  return {
    signupStarted: counts.SIGNUP_STARTED ?? 0,
    signupCompleted: counts.SIGNUP_COMPLETED ?? 0,
    joinIntentCreated: counts.JOIN_INTENT_CREATED ?? 0,
    joinAfterSignupCompleted: counts.JOIN_AFTER_SIGNUP_COMPLETED ?? 0,
    recruitmentShareX: counts.RECRUITMENT_SHARE_X ?? 0,
    recruitmentShareLine: counts.RECRUITMENT_SHARE_LINE ?? 0,
    recruitmentUrlCopied: counts.RECRUITMENT_URL_COPIED ?? 0,
    referralOpened: counts.REFERRAL_LINK_OPENED ?? 0,
    referralSignupCompleted: counts.REFERRAL_SIGNUP_COMPLETED ?? 0,
    quickPostStarted: counts.QUICK_POST_STARTED ?? 0,
    quickPostCompleted: counts.QUICK_POST_COMPLETED ?? 0,
    mealsCreated, mealsMatched, matchesCompleted, uniqueDiners: diners.length,
    demandIntentsCreated: demandCreated, demandIntentsMatched: demandMatched, demandRecruitments, demandMealsMatched,
    notificationsSent: notifications.length,
    notificationsOpened: notifications.filter(row => row.readAt).length,
    notificationsClicked: notifications.filter(row => row.clickedAt).length,
    notificationTypeMetrics: byType,
  };
}

async function main() {
  const daysArg = process.argv.find(argument => argument.startsWith('--days='));
  const days = daysArg ? Number(daysArg.slice('--days='.length)) : 1;
  const period = days === 1 ? createTokyoDayPeriod() : createTokyoWindowPeriod(days);
  const range = { gte: period.start, lt: period.end };
  const [growthEvents, meals, matchedMeals, completedMatches, demandIntents, notifications] = await prisma.$transaction([
    prisma.growthEvent.findMany({ where: { createdAt: range }, select: { eventType: true } }),
    prisma.meal.findMany({ where: { createdAt: range }, select: { area: true, genre: true, status: true, maxParticipants: true, demandClusterKey: true, createdAt: true, firstJoinAt: true, matchedAt: true } }),
    prisma.meal.findMany({ where: { matchedAt: range }, select: { area: true, genre: true, matchedAt: true } }),
    prisma.match.findMany({ where: { status: 'COMPLETED', completedAt: range }, select: { completedAt: true, meal: { select: { area: true, genre: true } }, participants: { select: { userId: true } } } }),
    prisma.demandIntent.findMany({ where: { createdAt: range }, select: { area: true, genre: true, status: true, createdAt: true } }),
    prisma.notification.findMany({ where: { createdAt: range }, select: { type: true, readAt: true, clickedAt: true } }),
  ]);
  const rows: AnalyticsSourceRows = { growthEvents, meals, matchedMeals: matchedMeals.map(meal => ({ ...meal, matchedAt: meal.matchedAt! })), completedMatches, demandIntents, notifications };
  const generatedAt = new Date();
  const generated = {
    dailyMetrics: buildDailyMetricsPayload(period, rows, generatedAt),
    areaDemandStats: buildAreaDemandPayloads(period, rows, generatedAt),
    hourlyDemandStats: buildHourlyDemandPayloads(period, rows, generatedAt),
    analyticsSnapshot: buildAnalyticsSnapshotPayload(period, rows, generatedAt),
  };
  const expected = await legacyDaily(period);
  const differences: Difference[] = [];
  const actual = generated.dailyMetrics;
  for (const [metric, expectedValue] of Object.entries(expected)) check(differences, `DailyMetrics.${metric}`, expectedValue, actual[metric as keyof typeof actual]);

  const snapshotTotals = (generated.analyticsSnapshot.payload as { totals: Record<string, unknown> }).totals;
  for (const [metric, expectedValue] of Object.entries(expected)) check(differences, `AnalyticsSnapshot.totals.${metric}`, expectedValue, snapshotTotals[metric]);

  const areaTotals = generated.areaDemandStats.reduce((totals, row) => ({
    demandIntents: totals.demandIntents + row.demandIntents,
    mealsCreated: totals.mealsCreated + row.mealsCreated,
    matchesCompleted: totals.matchesCompleted + row.matchesCompleted,
  }), { demandIntents: 0, mealsCreated: 0, matchesCompleted: 0 });
  check(differences, 'AreaDemandStats.sum.demandIntents', expected.demandIntentsCreated, areaTotals.demandIntents);
  check(differences, 'AreaDemandStats.sum.mealsCreated', expected.mealsCreated, areaTotals.mealsCreated);
  check(differences, 'AreaDemandStats.sum.matchesCompleted', expected.matchesCompleted, areaTotals.matchesCompleted);

  const hourlyTotals = generated.hourlyDemandStats.reduce((totals, row) => ({
    demandIntents: totals.demandIntents + row.demandIntents,
    mealsCreated: totals.mealsCreated + row.mealsCreated,
    mealsMatched: totals.mealsMatched + row.mealsMatched,
    matchesCompleted: totals.matchesCompleted + row.matchesCompleted,
  }), { demandIntents: 0, mealsCreated: 0, mealsMatched: 0, matchesCompleted: 0 });
  check(differences, 'HourlyDemandStats.sum.demandIntents', expected.demandIntentsCreated, hourlyTotals.demandIntents);
  check(differences, 'HourlyDemandStats.sum.mealsCreated', expected.mealsCreated, hourlyTotals.mealsCreated);
  check(differences, 'HourlyDemandStats.sum.mealsMatched', rows.matchedMeals.length, hourlyTotals.mealsMatched);
  check(differences, 'HourlyDemandStats.sum.matchesCompleted', expected.matchesCompleted, hourlyTotals.matchesCompleted);

  if (differences.length) {
    console.error(`Snapshot parity failed: ${differences.length} difference(s)`);
    for (const difference of differences) console.error(`${difference.metric}: expected=${comparable(difference.expected)} actual=${comparable(difference.actual)}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Snapshot parity passed: ${Object.keys(expected).length * 2 + 7} metric comparisons, period ${period.start.toISOString()}..${period.end.toISOString()}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
