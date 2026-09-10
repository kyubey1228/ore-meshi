import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createTokyoDayPeriod } from '@/lib/analytics-snapshot';
import { generateAnalyticsUpsertPayloads } from '@/server/analytics-snapshots';
import { measurePerformance } from '@/lib/performance';

export const DAILY_METRICS_TIMEZONE = 'Asia/Tokyo';

export function parseMetricDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('dateはYYYY-MM-DD形式で指定してください。');
  const date = new Date(`${value}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) throw new Error('無効な日付です。');
  return date;
}

export function yesterdayInTokyo(now = new Date()): Date {
  return new Date(createTokyoDayPeriod(now).start.getTime() - 1);
}

export async function persistDailyMetrics(target = yesterdayInTokyo()) {
  return measurePerformance('ADMIN', 'daily-metrics.upsert', async () => {
    const period = createTokyoDayPeriod(target);
    const run = await prisma.dailyMetricJobRun.create({ data: { targetDate: period.asOfDate, timezone: period.timezone } });
    try {
      const payloads = await generateAnalyticsUpsertPayloads(period);
      const range = { gte: period.start, lt: period.end };
      const [inviteRows, activatedUsers, businessSignups, businessActivated, orders] = await Promise.all([
        prisma.growthEvent.findMany({
          where: { createdAt: range, eventType: { in: ['INVITE_SHARE_COMPLETED', 'INVITE_LINK_OPENED', 'REFERRAL_SIGNUP_COMPLETED', 'REFERRAL_ACTIVATION_COMPLETED'] } },
          select: { eventType: true, userId: true },
        }),
        prisma.user.count({ where: { onboardingCompletedAt: range } }),
        prisma.businessAccount.count({ where: { createdAt: range } }),
        prisma.businessMarketingEvent.count({ where: { eventType: { in: ['SPONSORED_MEAL_ACTIVATED', 'SEAT_CAMPAIGN_ACTIVATED'] }, createdAt: range } }),
        prisma.sponsorOrder.findMany({ where: { status: 'PAID', paidAt: range }, select: { amount: true } }),
      ]);
      const count = (type: string) => inviteRows.filter(row => row.eventType === type).length;
      const inviteUsers = new Set(inviteRows.filter(row => row.eventType === 'INVITE_SHARE_COMPLETED' && row.userId).map(row => row.userId!));
      const daily = {
        ...payloads.dailyMetrics,
        invitesSent: count('INVITE_SHARE_COMPLETED'),
        uniqueInviters: inviteUsers.size,
        inviteClicks: count('INVITE_LINK_OPENED'),
        inviteSignups: count('REFERRAL_SIGNUP_COMPLETED'),
        inviteActivated: count('REFERRAL_ACTIVATION_COMPLETED'),
        activatedUsers,
        businessSignups,
        businessActivated,
        sponsorPurchases: orders.length,
        revenue: orders.reduce((sum, order) => sum + (order.amount ?? 0), 0),
      };

      await prisma.$transaction(async tx => {
        await tx.dailyMetrics.upsert({
          where: { date_timezone: { date: period.asOfDate, timezone: period.timezone } },
          create: daily,
          update: daily,
        });
        await tx.areaDemandStats.deleteMany({ where: { date: period.asOfDate, timezone: period.timezone } });
        if (payloads.areaDemandStats.length) await tx.areaDemandStats.createMany({ data: payloads.areaDemandStats });
        await tx.hourlyDemandStats.deleteMany({ where: { localDate: period.asOfDate, timezone: period.timezone } });
        if (payloads.hourlyDemandStats.length) await tx.hourlyDemandStats.createMany({ data: payloads.hourlyDemandStats });
        const snapshot = payloads.analyticsSnapshot;
        await tx.analyticsSnapshot.upsert({
          where: { snapshotType_asOfDate_windowDays_schemaVersion: { snapshotType: snapshot.snapshotType, asOfDate: snapshot.asOfDate, windowDays: snapshot.windowDays, schemaVersion: snapshot.schemaVersion } },
          create: { ...snapshot, payload: snapshot.payload as Prisma.InputJsonValue },
          update: { ...snapshot, payload: snapshot.payload as Prisma.InputJsonValue },
        });
      });
      const rowsProcessed = 1 + payloads.areaDemandStats.length + payloads.hourlyDemandStats.length + 1;
      await prisma.dailyMetricJobRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', finishedAt: new Date(), rowsProcessed } });
      return { targetDate: period.asOfDate.toISOString().slice(0, 10), rowsProcessed };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error';
      await prisma.dailyMetricJobRun.update({ where: { id: run.id }, data: { status: 'FAILED', finishedAt: new Date(), errorMessage: message } }).catch(() => null);
      console.error('[DAILY_METRICS] failed', { targetDate: period.asOfDate.toISOString(), error: message });
      throw error;
    }
  });
}
