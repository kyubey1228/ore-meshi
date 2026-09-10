import Link from 'next/link';
import { campaignPath } from '@/features/x-sharing/templates';
import type { getActiveStandaloneSponsoredMeals } from '@/lib/data';

const dateTimeLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

export function SponsoredMealBanner({ items }: { items: Awaited<ReturnType<typeof getActiveStandaloneSponsoredMeals>> }) {
  if (!items.length) return null;
  return (
    <div className="campaign-banner-row">
      <h2>🎁 スポンサー飯</h2>
      <div className="campaign-banner-scroll">
        {items.map(item => (
          <Link className="panel campaign-banner-card" key={item.id} href={campaignPath({ kind: 'SPONSORED_MEAL', id: item.id })}>
            <span className="tag">PR</span>
            <h3>{item.title}</h3>
            <p className="muted">提供:{item.sponsorName} · {item.restaurantName}</p>
            <p className="muted">{item.area} / {dateTimeLabel(item.startsAt)}</p>
            {item.benefit && <p>{item.benefit}</p>}
            <p className="last-slot-label">あと{item.remainingSlots}人</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
