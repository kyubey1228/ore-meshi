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

// Repeat Buyer = 期間内にPAID状態の単発スポンサー商品(スポンサー飯/空席スポンサー)を2回以上購入したBusiness。
// PAID状態のSponsorOrderと有効なSubscription同期状態のみを売上のsource of truthとし、Checkout Startedは含めない。
async function computeRetentionStats(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [ordersByBusiness, sponsoredMealOrdersByBusiness, seatCampaignOrdersByBusiness, firstOrderByBusiness] = await Promise.all([
    prisma.sponsorOrder.groupBy({ by: ['businessAccountId'], where: { status: 'PAID', paidAt: { gte: since }, orderType: { in: ['SPONSORED_MEAL', 'SEAT_CAMPAIGN', 'AREA_FEATURED'] } }, _count: { _all: true } }),
    prisma.sponsorOrder.groupBy({ by: ['businessAccountId'], where: { status: 'PAID', paidAt: { gte: since }, orderType: 'SPONSORED_MEAL' }, _count: { _all: true } }),
    prisma.sponsorOrder.groupBy({ by: ['businessAccountId'], where: { status: 'PAID', paidAt: { gte: since }, orderType: 'SEAT_CAMPAIGN' }, _count: { _all: true } }),
    prisma.sponsorOrder.groupBy({ by: ['businessAccountId'], where: { status: 'PAID' }, _min: { paidAt: true } }),
  ]);
  const payingBusinessAccounts = ordersByBusiness.length;
  const repeatBuyers = ordersByBusiness.filter(o => o._count._all >= 2).length;
  const sponsoredMealPayers = sponsoredMealOrdersByBusiness.length;
  const sponsoredMealRepeat = sponsoredMealOrdersByBusiness.filter(o => o._count._all >= 2).length;
  const seatCampaignPayers = seatCampaignOrdersByBusiness.length;
  const seatCampaignRepeat = seatCampaignOrdersByBusiness.filter(o => o._count._all >= 2).length;
  const firstPaidIds = new Set(firstOrderByBusiness.filter(o => o._min.paidAt && o._min.paidAt >= since).map(o => o.businessAccountId));

  return {
    payingBusinessAccounts,
    newPayingBusinessAccounts: firstPaidIds.size,
    repeatBuyers,
    repeatPurchaseRate: payingBusinessAccounts ? repeatBuyers / payingBusinessAccounts : 0,
    sponsoredMealRepeatRate: sponsoredMealPayers ? sponsoredMealRepeat / sponsoredMealPayers : 0,
    seatCampaignRepeatRate: seatCampaignPayers ? seatCampaignRepeat / seatCampaignPayers : 0,
  };
}
export async function getRetentionStats(days: number) {
  await requireAdmin();
  return unstable_cache(computeRetentionStats, ['retention-stats'], { revalidate: 60 })(days);
}

// North Star: スポンサー飯が実際にCompleted(開催確認)まで到達した数。Matchedと混同しない。
async function computeSponsorCompletionStats(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sponsoredMeals = await prisma.sponsoredMeal.findMany({
    where: { status: 'ACTIVE', mealId: { not: null }, createdAt: { gte: since } },
    select: { meal: { select: { matches: { select: { status: true, _count: { select: { participants: true } } } } } } },
  });
  let completedMeals = 0, completedParticipants = 0, matchedMeals = 0;
  for (const s of sponsoredMeals) {
    const match = s.meal?.matches[0];
    if (!match) continue;
    matchedMeals += 1;
    if (match.status === 'COMPLETED') { completedMeals += 1; completedParticipants += match._count.participants; }
  }
  return { sponsoredMealsWithMeal: sponsoredMeals.length, matchedMeals, completedMeals, completedParticipants };
}
export async function getSponsorCompletionStats(days: number) {
  await requireAdmin();
  return unstable_cache(computeSponsorCompletionStats, ['sponsor-completion-stats'], { revalidate: 60 })(days);
}
