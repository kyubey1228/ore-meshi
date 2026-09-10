import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessCompletionStats, getBusinessDashboard, getBusinessMonthlyStats } from '@/server/business';
import { describeCouponRedemptions, describeMealsClosed, describeMonthlyReach, describeReferrals } from '@/features/business-analytics/copy';
import { BusinessEmptyState } from '@/components/business-empty-state';

const labels = { X_VISIT: 'X経由アクセス（Detail Views相当）', MEAL_CREATED: 'Meal作成', JOIN_REQUEST: '参加希望(送客)', MATCHED: 'Matched（人数到達）', COMPLETED: 'Completed（実際に開催）', COUPON_REDEEMED: 'クーポン利用' } as const;

export const metadata = { title: 'Business Analytics' };

export default async function BusinessAnalytics() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [data, monthly, completion] = await Promise.all([
    getBusinessDashboard(),
    getBusinessMonthlyStats(membership.businessAccountId),
    getBusinessCompletionStats(membership.businessAccountId),
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
          <p>実際に開催まで至ったのは{monthly.mealsCompleted}件です（Matchedとは別に計測）。</p>
          <p>{describeReferrals(monthly.referrals)}</p>
          <p>{describeCouponRedemptions(monthly.couponRedemptions)}</p>
        </div>
      )}

      <div className="panel">
        <h2>累計</h2>
        <div className="analytics-grid">
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}><strong>{totalCounts[key] ?? 0}</strong><span>{label}</span></div>
          ))}
          <div><strong>{completion.estimatedParticipants}（推定）</strong><span>Estimated Participants</span></div>
        </div>
        <p className="muted">MatchedとCompletedは別概念です。Matched＝参加人数が募集人数に到達。Completed＝実際に開催されたと参加者が確認。「表示(インプレッション)」はX APIとの連携がないため計測できません。推定参加者数はMatched時点の募集人数の合計であり、実測の出席者数ではありません。</p>
      </div>
    </section>
  );
}
