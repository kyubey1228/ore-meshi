import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessCompletionStats, getBusinessDashboard, getBusinessMonthlyStats } from '@/server/business';
import { getBusinessPlan, getBusinessPricingCatalog } from '@/server/billing';
import { BusinessPaymentBanner } from '@/components/business-payment-banner';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import type { BusinessCampaignStatus } from '@/features/business/campaign-status';
import { measurePerformance } from '@/lib/performance';

function yenLabel(amount: number | undefined) { return amount === undefined ? '' : `¥${amount.toLocaleString('ja-JP')}`; }

const PLAN_LABEL_JA = { FREE: 'フリープラン', STANDARD: 'スタンダードプラン', PRO: 'PROプラン' } as const;

type RecentItem = { kind: string; id: string; title: string; status: BusinessCampaignStatus; createdAt: Date; href: string };

function recentItems(data: Awaited<ReturnType<typeof getBusinessDashboard>>): RecentItem[] {
  return [
    ...data.sponsoredMeals.map(item => ({ kind: 'スポンサー飯', id: item.id, title: item.title, status: item.status, createdAt: item.createdAt, href: '/business/sponsored-meals' })),
    ...data.seatCampaigns.map(item => ({ kind: '空席スポンサー', id: item.id, title: `今、席空いてます：${item.restaurantName}`, status: item.status, createdAt: item.createdAt, href: '/business/seats' })),
    ...data.coupons.map(item => ({ kind: 'クーポン', id: item.id, title: item.title, status: item.status, createdAt: item.createdAt, href: '/business/coupons' })),
    ...data.directAds.map(item => ({ kind: '企業広告', id: item.id, title: item.title, status: item.status, createdAt: item.createdAt, href: '/business/direct-ads' })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);
}

export const metadata = { title: 'Business Dashboard' };

export default async function BusinessDashboard({ searchParams }: { searchParams: Promise<{ checkout?: string; subscription?: string; order_id?: string; kind?: string }> }) {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  if (membership.businessAccount.status === 'PENDING') return <section className="section narrow"><span className="eyebrow orange">APPLICATION RECEIVED</span><h1>登録を受け付けました。</h1><div className="panel"><h2>いま内容を確認しています。</h2><p>確認が終わると、スポンサー飯や空席スポンサーを作成できるようになります。</p><p className="muted">お急ぎの場合は問い合わせフォームからご連絡ください。</p><Link className="btn secondary" href="/business/contact">相談する</Link></div></section>;
  if (membership.businessAccount.status === 'SUSPENDED') return <section className="section narrow"><h1>店舗管理を一時停止しています。</h1><p className="notice">詳しくは運営へお問い合わせください。</p><Link className="btn" href="/business/contact">問い合わせる</Link></section>;
  const query = await searchParams;
  const [data, plan, monthly, completion, catalog] = await measurePerformance('BUSINESS', 'dashboard aggregates', () => Promise.all([
    getBusinessDashboard(),
    getBusinessPlan(membership.businessAccountId),
    getBusinessMonthlyStats(membership.businessAccountId),
    getBusinessCompletionStats(membership.businessAccountId),
    getBusinessPricingCatalog(),
  ]));
  const recent = recentItems(data);

  return (
    <section className="section">
      <BusinessPaymentBanner query={query} />
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">BUSINESS TABLE</span>
          <h1>{data.membership.businessAccount.name}</h1>
          <p className="muted">{PLAN_LABEL_JA[plan]} · Xで飯を呼ぶ。</p>
        </div>
        <Link className="btn secondary" href="/business/billing">プランを見る</Link>
      </div>

      <div className="panel">
        <h2>今月の成果</h2>
        <div className="analytics-grid">
          <div><strong>{monthly.mealsMatched}</strong><span>Matched（人数到達）</span></div>
          <div><strong>{monthly.mealsCompleted}</strong><span>Completed（実際に開催）</span></div>
          <div><strong>{completion.estimatedParticipants}（推定）</strong><span>推定参加者数</span></div>
          <div><strong>{monthly.referrals}</strong><span>送客</span></div>
          <div><strong>{monthly.couponRedemptions}</strong><span>クーポン利用</span></div>
          <div><strong>{monthly.xVisits}</strong><span>X経由アクセス</span></div>
        </div>
      </div>

      <div className="business-cta-grid">
        <Link className="panel business-cta" href="/business/sponsored-meals/new">🍚 スポンサー飯を出す<small>掲載料 {catalog ? yenLabel(catalog.sponsoredMeal) : '¥5,000'}〜</small></Link>
        <Link className="panel business-cta" href="/business/seats/new">💺 今、席空いてます<small>{catalog ? yenLabel(catalog.seatCampaign) : '¥1,000'}</small></Link>
        <Link className="panel business-cta" href="/business/area-sponsorship/new">📍 エリアスポンサーを出す</Link>
        <Link className="panel business-cta" href="/business/social">🐦 Xで客を呼ぶ</Link>
        <Link className="panel business-cta" href="/business/coupons/new">🎟️ クーポンを作る</Link>
        <Link className="panel business-cta" href="/business/demand">📊 Demand Intelligence</Link>
      </div>

      <div className="section-heading">
        <h2>進行中の掲載</h2>
      </div>
      <div className="dashboard-grid">
        {recent.map(item => (
          <article className="panel" key={`${item.kind}:${item.id}`}>
            <BusinessStatusBadge status={item.status} />
            <h3>{item.title}</h3>
            <p className="muted">{item.kind}</p>
            <Link className="text-link" href={item.href}>もっと見る →</Link>
          </article>
        ))}
        {!recent.length && (
          <div className="empty">
            <span className="empty-icon">🏪</span>
            <p>まだ掲載はありません。まずはスポンサー飯か空席スポンサーを出してみましょう。</p>
          </div>
        )}
      </div>
    </section>
  );
}
