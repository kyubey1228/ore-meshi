import Link from 'next/link';
import { getActiveCoupons, getAreaOptions } from '@/lib/data';
import { campaignPath } from '@/features/x-sharing/templates';
import { AreaDatalist } from '@/components/area-datalist';

export const metadata = { title: 'クーポン一覧' };

const dateTimeLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const [coupons, areaOptions] = await Promise.all([getActiveCoupons(area), getAreaOptions()]);

  return (
    <section className="section">
      <div className="section-heading">
        <div><span className="eyebrow orange">COUPONS</span><h1>お店のクーポン</h1><p className="muted">俺メシに掲載中のクーポンです。お店を訪れる前にチェック。</p></div>
      </div>
      <form className="filter-bar">
        <label>どこ<input name="area" list="area-options" placeholder="例：新宿" maxLength={80} defaultValue={area} /></label>
        <AreaDatalist options={areaOptions} />
        <button className="btn">絞り込む</button>
        <Link className="text-link" href="/coupons">リセット</Link>
      </form>
      <p className="muted">{coupons.length}件のクーポン</p>
      {coupons.length ? (
        <div className="dashboard-grid">
          {coupons.map(coupon => (
            <Link className="panel" key={coupon.id} href={campaignPath({ kind: 'COUPON', id: coupon.id })}>
              <span className="tag">PR</span>
              <h2>{coupon.title}</h2>
              <p className="muted">{coupon.restaurantName} · {coupon.area}</p>
              <p>{coupon.benefit}</p>
              <p className="muted">有効期限 {dateTimeLabel(coupon.expiresAt)}まで</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">🎟️</span>
          <p>{area ? `${area}では現在クーポンがありません。` : '今は掲載中のクーポンがありません。'}</p>
        </div>
      )}
    </section>
  );
}
