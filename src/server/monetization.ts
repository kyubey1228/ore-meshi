import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { getBusinessPricingCatalog } from '@/server/billing';

// 収益系の集計はまとめて1回のPromise.allで取得する(カードごとに個別queryを発行しない)。
// admin限定の閲覧なので60秒キャッシュしても実用上問題ない。
async function computeMonetizationSummary(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [orderCounts, orderRevenue, subscriptionCounts, activeSubscriptions, checkoutEvents, catalog, activeBusinessCount] = await Promise.all([
    prisma.sponsorOrder.groupBy({ by: ['orderType', 'status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.sponsorOrder.groupBy({ by: ['orderType'], where: { status: 'PAID', paidAt: { gte: since } }, _sum: { amount: true } }),
    prisma.businessSubscription.groupBy({ by: ['plan', 'status'], _count: { _all: true } }),
    prisma.businessSubscription.groupBy({ by: ['plan'], where: { status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] }, currentPeriodEnd: { gt: new Date() } }, _count: { _all: true } }),
    prisma.businessMarketingEvent.groupBy({ by: ['eventType'], where: { createdAt: { gte: since }, eventType: { in: ['CHECKOUT_STARTED', 'CHECKOUT_COMPLETED'] } }, _count: { _all: true } }),
    getBusinessPricingCatalog(),
    prisma.businessAccount.count({ where: { status: 'ACTIVE' } }),
  ]);

  const paidByType = (type: string) => orderCounts.filter(o => o.orderType === type && o.status === 'PAID').reduce((sum, o) => sum + o._count._all, 0);
  const revenueByType = (type: string) => orderRevenue.find(r => r.orderType === type)?._sum.amount ?? 0;
  const oneTimeRevenue = orderRevenue.reduce((sum, r) => sum + (r._sum.amount ?? 0), 0);

  const activeStandard = activeSubscriptions.find(s => s.plan === 'STANDARD')?._count._all ?? 0;
  const activePro = activeSubscriptions.find(s => s.plan === 'PRO')?._count._all ?? 0;
  // MRRはStripeを都度呼ばず、キャッシュ済みのプライスカタログを使って概算する(月額サブスクのみ、日割り等は考慮しない単純合計)。
  const mrr = catalog ? activeStandard * catalog.STANDARD / 100 + activePro * catalog.PRO / 100 : null;

  const checkoutStarted = checkoutEvents.find(e => e.eventType === 'CHECKOUT_STARTED')?._count._all ?? 0;
  const checkoutCompleted = checkoutEvents.find(e => e.eventType === 'CHECKOUT_COMPLETED')?._count._all ?? 0;

  return {
    sponsoredMealOrders: paidByType('SPONSORED_MEAL'),
    seatCampaignOrders: paidByType('SEAT_CAMPAIGN'),
    areaSponsorshipOrders: paidByType('AREA_FEATURED'),
    sponsoredMealRevenue: revenueByType('SPONSORED_MEAL') / 100,
    seatCampaignRevenue: revenueByType('SEAT_CAMPAIGN') / 100,
    areaSponsorshipRevenue: revenueByType('AREA_FEATURED') / 100,
    oneTimeRevenue: oneTimeRevenue / 100,
    // FREEはBusinessSubscription行を持たないため、有効な店舗数から有効なSTANDARD/PRO数を差し引いた概算値。
    // planOverride(管理者による手動プラン付与)は考慮していないため、あくまで目安。
    subscriptionCounts: {
      FREE: Math.max(0, activeBusinessCount - activeStandard - activePro),
      STANDARD: subscriptionCounts.filter(s => s.plan === 'STANDARD').reduce((sum, s) => sum + s._count._all, 0),
      PRO: subscriptionCounts.filter(s => s.plan === 'PRO').reduce((sum, s) => sum + s._count._all, 0),
    },
    activeStandard,
    activePro,
    mrr,
    currency: catalog?.currency ?? 'jpy',
    checkoutStarted,
    checkoutCompleted,
    checkoutConversionRate: checkoutStarted ? checkoutCompleted / checkoutStarted : 0,
  };
}
export async function getMonetizationSummary(days: number) {
  await requireAdmin();
  return unstable_cache(computeMonetizationSummary, ['monetization-summary'], { revalidate: 60 })(days);
}
