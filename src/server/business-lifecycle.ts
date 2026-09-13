import 'server-only';
import type { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/server/notifications';
import { recordGrowthEvent } from '@/server/growth';
import { evaluateBusinessLifecycle, evaluateCampaignWindow } from '@/lib/business-lifecycle';

type PreferenceKey = 'activityEnabled' | 'campaignPerformanceEnabled' | 'billingEnabled' | 'growthTipsEnabled';
type LifecycleMessage = { type: NotificationType; preference: PreferenceKey; triggerKey: string; title: string; body: string };

export async function notifyBusiness(businessAccountId: string, message: LifecycleMessage) {
  const [preference, existing, members] = await Promise.all([
    prisma.businessNotificationPreference.findUnique({ where: { businessAccountId } }),
    prisma.businessNotificationLog.findUnique({ where: { triggerKey: message.triggerKey } }),
    prisma.businessMember.findMany({ where: { businessAccountId, role: { in: ['OWNER', 'ADMIN'] } }, select: { userId: true } }),
  ]);
  if (existing || preference?.[message.preference] === false || members.length === 0) return 0;
  const results = await Promise.all(members.map(member => createNotification({
    userId: member.userId, type: message.type, title: message.title, body: message.body,
    dedupeKey: `BUSINESS:${message.triggerKey}:${member.userId}`, businessEmailAllowed: true,
  })));
  const recipientCount = results.filter(Boolean).length;
  await prisma.businessNotificationLog.create({ data: { businessAccountId, notificationType: message.type, triggerKey: message.triggerKey, recipientCount } }).catch(() => null);
  await recordGrowthEvent('BUSINESS_LIFECYCLE_TRIGGERED', { metadata: { businessAccountId, notificationType: message.type } });
  if (recipientCount) await recordGrowthEvent('BUSINESS_NOTIFICATION_SENT', { metadata: { businessAccountId, notificationType: message.type, recipientCount } });
  return recipientCount;
}

export async function processBusinessLifecycleBatch(cursor: string | null, limit: number, now = new Date()) {
  const dayAgo = new Date(now.getTime() - 24 * 3_600_000);
  const accounts = await prisma.businessAccount.findMany({
    where: { ...(cursor ? { id: { gt: cursor } } : {}), status: 'ACTIVE' }, orderBy: { id: 'asc' }, take: limit,
    select: {
      id: true, name: true, createdAt: true,
      _count: { select: { sponsoredMeals: true, seatCampaigns: true, coupons: true } },
      subscription: { select: { currentPeriodEnd: true, cancelAtPeriodEnd: true, status: true } },
      sponsoredMeals: { where: { startsAt: { gte: dayAgo, lte: new Date(now.getTime() + 48 * 3_600_000) }, status: { in: ['ACTIVE', 'ENDED'] } }, select: { id: true, startsAt: true }, take: 10 },
      seatCampaigns: { where: { endsAt: { gte: dayAgo, lte: new Date(now.getTime() + 48 * 3_600_000) }, status: { in: ['ACTIVE', 'ENDED'] } }, select: { id: true, endsAt: true }, take: 10 },
      areaSponsorships: { where: { endsAt: { gt: now, lte: new Date(now.getTime() + 48 * 3_600_000) }, status: 'ACTIVE' }, select: { id: true, area: true, endsAt: true }, take: 10 },
    },
  });
  const accountIds = accounts.map(account => account.id);
  const recentViews = accountIds.length ? await prisma.businessMarketingEvent.groupBy({
    by: ['businessAccountId'], where: { businessAccountId: { in: accountIds }, eventType: 'SPONSOR_PRODUCT_VIEW', createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } }, _count: { _all: true },
  }) : [];
  const viewCount = new Map(recentViews.map(row => [row.businessAccountId, row._count._all]));
  const referralCounts = accountIds.length ? await prisma.referralEvent.groupBy({ by: ['businessAccountId', 'eventType'], where: { businessAccountId: { in: accountIds } }, _count: { _all: true } }) : [];
  const referralCount = (id: string, types: string[]) => referralCounts.filter(row => row.businessAccountId === id && types.includes(row.eventType)).reduce((sum, row) => sum + row._count._all, 0);
  let sent = 0;
  for (const account of accounts) {
    const totalCampaigns = account._count.sponsoredMeals + account._count.seatCampaigns + account._count.coupons;
    const lifecycle = evaluateBusinessLifecycle({ createdAt: account.createdAt, campaignCount: totalCampaigns, subscription: account.subscription }, now);
    if (lifecycle.needsActivationReminder) {
      sent += await notifyBusiness(account.id, { type: 'BUSINESS_ACTIVATION_REMINDER', preference: 'growthTipsEnabled', triggerKey: `activation-reminder:${account.id}`, title: 'まず今日の空席を掲載してみませんか？', body: `${account.name}の最初の掲載を作ると、近くで飯を探している人に届けられます。` });
    }
    const subscription = account.subscription;
    if (subscription && lifecycle.subscriptionEnding) {
      const date = subscription.currentPeriodEnd.toISOString().slice(0, 10);
      sent += await notifyBusiness(account.id, { type: 'BUSINESS_SUBSCRIPTION_ENDING', preference: 'billingEnabled', triggerKey: `subscription-ending:${account.id}:${date}`, title: 'プランの終了日が近づいています', body: `現在のプランは${date}に終了予定です。契約状態をご確認ください。` });
    }
    const actions = referralCount(account.id, ['JOIN_REQUEST', 'MATCHED', 'COMPLETED', 'COUPON_REDEEMED']);
    const allViews = referralCount(account.id, ['X_VISIT']);
    if (allViews >= 5 && actions === 0) sent += await notifyBusiness(account.id, { type: 'BUSINESS_CAMPAIGN_NO_ACTIONS', preference: 'campaignPerformanceEnabled', triggerKey: `views-no-actions:${account.id}`, title: '掲載が見られています', body: `${allViews}件のX経由アクセスがありましたが、まだ参加などの反応はありません。特典や投稿内容を見直してみましょう。` });
    // 初めての成果(参加希望・成立・完了・クーポン利用のいずれか)が出たら一度だけ知らせる。
    // triggerKeyがbusinessAccountId単位で固定のため、BusinessNotificationLogの一意制約により生涯で1回だけ送られる。
    if (actions >= 1) sent += await notifyBusiness(account.id, { type: 'BUSINESS_FIRST_RESULT', preference: 'campaignPerformanceEnabled', triggerKey: `first-result:${account.id}`, title: 'はじめての成果が出ました', body: `${account.name}経由で、参加や成立につながる動きがありました。この調子で掲載を続けてみましょう。` });
    for (const campaign of account.seatCampaigns) {
      const window = evaluateCampaignWindow({ endsAt: campaign.endsAt, views: viewCount.get(account.id) ?? 0 }, now);
      if (window.noViews) sent += await notifyBusiness(account.id, { type: 'BUSINESS_CAMPAIGN_NO_VIEWS', preference: 'campaignPerformanceEnabled', triggerKey: `seat-no-views:${campaign.id}`, title: '空席掲載の終了が近づいています', body: 'まだ閲覧がありません。時間帯や内容を調整すると見られやすくなる可能性があります。' });
      if (window.summary) {
        const views = viewCount.get(account.id) ?? 0;
        sent += await notifyBusiness(account.id, { type: 'BUSINESS_CAMPAIGN_SUMMARY', preference: 'campaignPerformanceEnabled', triggerKey: `seat-summary:${campaign.id}`, title: '空席掲載が終了しました', body: views > 0 ? `掲載期間中に${views}件閲覧されました。次の掲載改善にお使いください。` : '掲載期間が終了しました。今回は計測できた閲覧がありませんでした。' });
      }
    }
    for (const campaign of account.seatCampaigns.filter(item => item.endsAt > new Date(now.getTime() + 24 * 3_600_000) && item.endsAt <= new Date(now.getTime() + 48 * 3_600_000))) {
      sent += await notifyBusiness(account.id, { type: 'BUSINESS_SPONSOR_ENDING', preference: 'campaignPerformanceEnabled', triggerKey: `seat-ending:${campaign.id}`, title: 'スポンサー掲載がまもなく終了します', body: `空席スポンサー掲載は${campaign.endsAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}に終了予定です。掲載状況をご確認ください。` });
    }
    // スポンサー飯は「開催日時(startsAt)」が実質的な掲載終了に相当する(開催後は宣伝価値が無くなるため)。
    // 空席スポンサーと同じ閲覧指標(SPONSOR_PRODUCT_VIEW)・同じ間近判定を流用する。
    for (const campaign of account.sponsoredMeals) {
      const window = evaluateCampaignWindow({ endsAt: campaign.startsAt, views: viewCount.get(account.id) ?? 0 }, now);
      if (window.noViews) sent += await notifyBusiness(account.id, { type: 'BUSINESS_CAMPAIGN_NO_VIEWS', preference: 'campaignPerformanceEnabled', triggerKey: `sponsored-no-views:${campaign.id}`, title: 'スポンサー飯の開催が近づいています', body: 'まだ閲覧がありません。内容や告知のタイミングを見直すと見られやすくなる可能性があります。' });
      if (window.summary) {
        const views = viewCount.get(account.id) ?? 0;
        sent += await notifyBusiness(account.id, { type: 'BUSINESS_CAMPAIGN_SUMMARY', preference: 'campaignPerformanceEnabled', triggerKey: `sponsored-summary:${campaign.id}`, title: 'スポンサー飯の開催期間が終了しました', body: views > 0 ? `開催までの期間に${views}件閲覧されました。次の掲載改善にお使いください。` : '開催までの期間、計測できた閲覧がありませんでした。' });
      }
    }
    for (const campaign of account.sponsoredMeals.filter(item => item.startsAt > new Date(now.getTime() + 24 * 3_600_000) && item.startsAt <= new Date(now.getTime() + 48 * 3_600_000))) {
      sent += await notifyBusiness(account.id, { type: 'BUSINESS_SPONSOR_ENDING', preference: 'campaignPerformanceEnabled', triggerKey: `sponsored-ending:${campaign.id}`, title: 'スポンサー飯の開催がまもなく終了します', body: `スポンサー飯は${campaign.startsAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}に開催予定です。掲載状況をご確認ください。` });
    }
    for (const campaign of account.areaSponsorships) {
      sent += await notifyBusiness(account.id, { type: 'BUSINESS_SPONSOR_ENDING', preference: 'campaignPerformanceEnabled', triggerKey: `area-ending:${campaign.id}`, title: 'スポンサー掲載がまもなく終了します', body: `${campaign.area}のエリアスポンサー掲載は${campaign.endsAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}に終了予定です。` });
    }
  }
  return { processed: accounts.length, sent, cursor: accounts.at(-1)?.id ?? null, hasMore: accounts.length === limit };
}
