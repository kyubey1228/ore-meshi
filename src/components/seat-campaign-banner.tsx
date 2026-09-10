import Link from 'next/link';
import { campaignPath } from '@/features/x-sharing/templates';
import type { getActiveSeatCampaigns } from '@/lib/data';

const timeLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

export function SeatCampaignBanner({ items }: { items: Awaited<ReturnType<typeof getActiveSeatCampaigns>> }) {
  if (!items.length) return null;
  return (
    <div className="campaign-banner-row">
      <h2>🔥 今、席空いてます</h2>
      <div className="campaign-banner-scroll">
        {items.map(item => (
          <Link className="panel campaign-banner-card" key={item.id} href={campaignPath({ kind: 'SEAT_CAMPAIGN', id: item.id })}>
            <span className="tag">PR</span>
            <h3>{item.restaurantName}</h3>
            <p className="muted">{item.area}</p>
            <p className="last-slot-label">あと{item.remainingSeats}席 · {timeLabel(item.endsAt)}まで</p>
            {item.benefit && <p>{item.benefit}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
