import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentBusinessMembership } from '@/server/business';
import { getSponsoredMealPerformance } from '@/server/sponsor-performance';
import { BusinessStatusBadge } from '@/components/business-status-badge';

export const metadata = { title: 'スポンサー飯の成果' };

function percent(n: number) { return `${Math.round(n * 100)}%`; }

export default async function SponsoredMealDetail({ params }: { params: Promise<{ id: string }> }) {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const { id } = await params;
  const data = await getSponsoredMealPerformance(id);
  if (!data || data.sponsoredMeal.status === 'DRAFT') notFound();
  const { sponsoredMeal, funnel, conversion } = data;

  return (
    <section className="section">
      <Link className="text-link" href="/business/sponsored-meals">← スポンサー飯一覧</Link>
      <div className="section-heading">
        <div>
          <BusinessStatusBadge status={sponsoredMeal.status} />
          <h1>{sponsoredMeal.title}</h1>
          <p className="muted">{sponsoredMeal.area}{sponsoredMeal.genre ? ` × ${sponsoredMeal.genre}` : ''}</p>
        </div>
        {sponsoredMeal.mealId && <Link className="btn secondary small" href={`/meals/${sponsoredMeal.mealId}`}>実際の飯を見る →</Link>}
      </div>

      <div className="panel">
        <h2>成果ファネル</h2>
        <p className="muted">Matched（人数到達）とCompleted（実際に開催されたことを参加者が確認）は別概念です。「来店」と断定できないため、Completedは「開催確認」として表示しています。</p>
        <div className="analytics-grid">
          <div><strong>{funnel.detailViews}</strong><span>詳細閲覧</span></div>
          <div><strong>{funnel.xVisits}</strong><span>X経由アクセス</span></div>
          <div><strong>{funnel.joinRequests}</strong><span>参加希望</span></div>
          <div><strong>{funnel.acceptedParticipants}</strong><span>承認</span></div>
          <div><strong>{funnel.matchedMeals}</strong><span>飯成立(Matched)</span></div>
          <div><strong>{funnel.completedMeals}</strong><span>開催確認(Completed)</span></div>
          <div><strong>{funnel.completedParticipants}（推定）</strong><span>推定参加人数</span></div>
          <div><strong>{funnel.cancellationCount}</strong><span>キャンセル</span></div>
        </div>
        <div className="two-col">
          <p>詳細閲覧 → 参加希望: {percent(conversion.detailToJoin)}</p>
          <p>参加希望 → 承認: {percent(conversion.joinToAccepted)}</p>
          <p>承認 → 成立: {percent(conversion.acceptedToMatched)}</p>
          <p>成立 → 開催確認: {percent(conversion.matchedToCompleted)}</p>
        </div>
      </div>

      <div className="panel">
        <h2>次にやること</h2>
        {funnel.completedMeals > 0
          ? <p>開催確認{funnel.completedMeals}件・推定参加{funnel.completedParticipants}人という実績が出ています。同じ条件でもう一度出してみませんか？</p>
          : <p className="muted">まだ開催確認は取れていません。X共有で参加希望を増やしましょう。</p>}
        <div className="row wrap">
          <Link className="btn" href={`/business/sponsored-meals/new?repeat=${sponsoredMeal.id}`}>同じ条件でもう一度スポンサー飯を出す</Link>
          {sponsoredMeal.status === 'ACTIVE' && <Link className="btn secondary" href={`/business/social?kind=SPONSORED_MEAL&id=${sponsoredMeal.id}`}>Xで宣伝する</Link>}
        </div>
      </div>
    </section>
  );
}
