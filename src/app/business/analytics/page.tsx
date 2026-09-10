import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard, getBusinessMonthlyStats } from '@/server/business';
import { describeCouponRedemptions, describeMealsClosed, describeMonthlyReach, describeReferrals } from '@/features/business-analytics/copy';
import { BusinessEmptyState } from '@/components/business-empty-state';

const labels = { X_VISIT: 'X経由アクセス', MEAL_CREATED: 'Meal作成', JOIN_REQUEST: '参加希望(送客)', MATCHED: '飯成立', COUPON_REDEEMED: 'クーポン利用' } as const;

export const metadata = { title: 'Business Analytics' };

export default async function BusinessAnalytics() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [data, monthly] = await Promise.all([
    getBusinessDashboard(),
    getBusinessMonthlyStats(membership.businessAccountId),
  ]);
  const totalCounts = Object.fromEntries(data.analytics.map(row => [row.eventType, row._count._all]));
  const hasAnyThisMonth = monthly.mealsMatched + monthly.referrals + monthly.couponRedemptions + monthly.xVisits > 0;

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <h1>Business Analytics</h1>

      {!hasAnyThisMonth && (
        <BusinessEmptyState icon="📊" message="まだ数字がありません。まず1飯呼んでみましょう。" ctaHref="/business/social" ctaLabel="Xで宣伝する" />
      )}

      {hasAnyThisMonth && (
        <div className="panel">
          <h2>今月のハイライト</h2>
          <p>{describeMonthlyReach(monthly.xVisits)}</p>
          <p>{describeMealsClosed(monthly.mealsMatched)}</p>
          <p>{describeReferrals(monthly.referrals)}</p>
          <p>{describeCouponRedemptions(monthly.couponRedemptions)}</p>
        </div>
      )}

      <div className="panel">
        <h2>累計(表示は計測準備中)</h2>
        <div className="analytics-grid">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}><strong>{totalCounts[key] ?? 0}</strong><span>{label}</span></div>
          ))}
        </div>
        <p className="muted">「表示(インプレッション)」はX APIとの連携がないため計測できません。</p>
      </div>
    </section>
  );
}
