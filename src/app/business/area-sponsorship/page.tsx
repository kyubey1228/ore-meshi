import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { prisma } from '@/lib/prisma';
import { BusinessCheckoutButton } from '@/components/business-checkout-button';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { BusinessEmptyState } from '@/components/business-empty-state';

const dateLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

export const metadata = { title: 'エリアスポンサー' };

export default async function AreaSponsorshipList() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [items, catalog] = await Promise.all([
    prisma.areaSponsorship.findMany({ where: { businessAccountId: membership.businessAccountId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    getBusinessPricingCatalog(),
  ]);
  const priceYen = catalog?.areaSponsorship;

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <div className="section-heading">
        <h1>エリアスポンサー</h1>
        <Link className="btn" href="/business/area-sponsorship/new">エリアスポンサーを出す</Link>
      </div>

      {!items.length && (
        <BusinessEmptyState icon="📍" message="まだエリアスポンサーを出していません。" ctaHref="/business/area-sponsorship/new" ctaLabel="最初のエリアスポンサーを出す" />
      )}

      <div className="dashboard-grid">
        {items.map(item => (
          <article className="panel" key={item.id}>
            <BusinessStatusBadge status={item.status} />
            <h2>{item.area}{item.genre ? ` × ${item.genre}` : ''}</h2>
            <p className="muted">{dateLabel(item.startsAt)} 〜 {dateLabel(item.endsAt)}</p>
            {item.status === 'DRAFT' && (
              <BusinessCheckoutButton kind="AREA_FEATURED" areaSponsorshipId={item.id} label={priceYen ? `${priceYen.toLocaleString('ja-JP')}円で支払って公開する` : '支払って公開する'} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
