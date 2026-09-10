import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { BusinessCheckoutButton } from '@/components/business-checkout-button';
import { BusinessEmptyState } from '@/components/business-empty-state';
import { isSeatCampaignExpired } from '@/features/business/campaign-status';

const timeLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

type Tab = 'ACTIVE' | 'ENDED' | 'CANCELLED' | 'EXPIRED';
const TABS: { key: Tab; label: string }[] = [
  { key: 'ACTIVE', label: '公開中' },
  { key: 'EXPIRED', label: '時間切れ' },
  { key: 'ENDED', label: '過去' },
  { key: 'CANCELLED', label: 'キャンセル' },
];

export const metadata = { title: '空席スポンサー' };

export default async function SeatCampaignsList({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some(t => t.key === tabParam) ? (tabParam as Tab) : 'ACTIVE';
  const [data, catalog] = await Promise.all([getBusinessDashboard(), getBusinessPricingCatalog()]);
  const now = data.now;
  const drafts = data.seatCampaigns.filter(item => item.status === 'DRAFT');
  const priceLabel = catalog ? `${catalog.seatCampaign.toLocaleString('ja-JP')}円で支払って公開する` : '支払って公開する';

  const items = data.seatCampaigns.filter(item => {
    const expired = isSeatCampaignExpired(item.status, item.endsAt, now);
    if (tab === 'EXPIRED') return expired;
    if (tab === 'ACTIVE') return item.status === 'ACTIVE' && !expired;
    return item.status === tab;
  });

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <div className="section-heading">
        <h1>空席スポンサー</h1>
        <Link className="btn" href="/business/seats/new">今すぐ客を呼ぶ</Link>
      </div>

      {drafts.length > 0 && (
        <div className="panel">
          <h2>支払い待ちの下書き</h2>
          {drafts.map(item => (
            <div className="list-card" key={item.id}>
              <strong>{item.restaurantName} · あと{item.remainingSeats}席</strong>
              <BusinessCheckoutButton kind="SEAT_CAMPAIGN" seatCampaignId={item.id} label={priceLabel} />
            </div>
          ))}
        </div>
      )}

      <div className="tag-pills">
        {TABS.map(t => (
          <Link key={t.key} className={`tag-pill ${tab === t.key ? 'orange-pill' : ''}`} href={`/business/seats?tab=${t.key}`}>{t.label}</Link>
        ))}
      </div>

      {!items.length && (
        <BusinessEmptyState icon="💺" message="今は空席スポンサーを出していません。" ctaHref="/business/seats/new" ctaLabel="今すぐ客を呼ぶ" />
      )}

      <div className="dashboard-grid">
        {items.map(item => (
          <article className="panel" key={item.id}>
            <h2>{item.restaurantName}</h2>
            <p className="muted">あと{item.remainingSeats}席 · {timeLabel(item.endsAt)}まで</p>
            {item.benefit && <p>{item.benefit}</p>}
            {item.status === 'DRAFT' && <BusinessCheckoutButton kind="SEAT_CAMPAIGN" seatCampaignId={item.id} label={priceLabel} />}
            {item.status === 'ACTIVE' && <Link className="btn secondary" href={`/business/social?kind=SEAT_CAMPAIGN&id=${item.id}`}>Xで宣伝する</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}
