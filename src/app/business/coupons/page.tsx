import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard } from '@/server/business';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { BusinessEmptyState } from '@/components/business-empty-state';

const dateLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(date);

export const metadata = { title: 'クーポン' };

export default async function CouponsList() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const data = await getBusinessDashboard();

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <div className="section-heading">
        <h1>クーポン</h1>
        <Link className="btn" href="/business/coupons/new">クーポン作る</Link>
      </div>

      {!data.coupons.length && (
        <BusinessEmptyState icon="🎟️" message="クーポンはまだありません。" ctaHref="/business/coupons/new" ctaLabel="クーポンを作る" />
      )}

      <div className="dashboard-grid">
        {data.coupons.map(item => (
          <article className="panel" key={item.id}>
            <BusinessStatusBadge status={item.status} />
            <h2>{item.title}</h2>
            <p className="muted">{item.restaurantName}</p>
            <p>{item.benefit}</p>
            <p className="muted">有効期限 {dateLabel(item.expiresAt)}まで</p>
            <p className="muted">利用数 {item._count.redemptions}件</p>
            {item.status === 'ACTIVE' && <Link className="btn secondary" href={`/business/social?kind=COUPON&id=${item.id}`}>Xで宣伝する</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}
