import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { BusinessCheckoutButton } from '@/components/business-checkout-button';
import { BusinessEmptyState } from '@/components/business-empty-state';
import { BusinessCampaignForm } from '@/components/business-campaign-form';

const dateTimeLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

export const metadata = { title: 'スポンサー飯' };

export default async function SponsoredMealsList() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [data, catalog] = await Promise.all([getBusinessDashboard(), getBusinessPricingCatalog()]);
  const priceYen = catalog ? catalog.sponsoredMeal.toLocaleString('ja-JP') : '5,000';

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <div className="section-heading">
        <h1>スポンサー飯</h1>
        <Link className="btn" href="/business/sponsored-meals/new">スポンサー飯を出す</Link>
      </div>

      {!data.sponsoredMeals.length && (
        <BusinessEmptyState icon="🍚" message="まだスポンサー飯を出してません。" ctaHref="/business/sponsored-meals/new" ctaLabel="最初のスポンサー飯を出す" />
      )}

      <div className="dashboard-grid">
        {data.sponsoredMeals.map(item => (
          <article className="panel" key={item.id}>
            <BusinessStatusBadge status={item.status} />
            <h2>{item.title}</h2>
            <p className="muted">{item.restaurantName} · {dateTimeLabel(item.startsAt)}</p>
            {item.benefit && <p>{item.benefit}</p>}
            <p className="muted">掲載料 ¥{priceYen}</p>
            {item.status === 'DRAFT' && <BusinessCheckoutButton kind="SPONSORED_MEAL" sponsoredMealId={item.id} label={`${priceYen}円で支払って公開する`} />}
            {item.status !== 'DRAFT' && <Link className="btn secondary" href={`/business/sponsored-meals/${item.id}`}>成果を見る</Link>}
            {item.status === 'ACTIVE' && <Link className="btn secondary" href={`/business/social?kind=SPONSORED_MEAL&id=${item.id}`}>Xで宣伝する</Link>}
          </article>
        ))}
      </div>

      <BusinessCampaignForm businessAccountId={membership.businessAccountId} />
    </section>
  );
}
