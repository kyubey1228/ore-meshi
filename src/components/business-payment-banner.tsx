import Link from 'next/link';
import { getSponsorOrderStatus } from '@/server/billing';

type Query = { checkout?: string; subscription?: string; order_id?: string; kind?: string };

const TARGETS = {
  SEAT_CAMPAIGN: { label: '空席スポンサー', verb: '出ました', href: '/business/seats' },
  AREA_FEATURED: { label: 'エリアスポンサー', verb: '掲載されました', href: '/business/area-sponsorship' },
  SPONSORED_MEAL: { label: 'スポンサー飯', verb: '出ました', href: '/business/sponsored-meals' },
} as const;

export async function BusinessPaymentBanner({ query }: { query: Query }) {
  const order=query.checkout==='success'&&query.order_id?await getSponsorOrderStatus(query.order_id):null;
  const kind=(order?.orderType??query.kind) as keyof typeof TARGETS | undefined;
  const target=TARGETS[kind ?? 'SPONSORED_MEAL'] ?? TARGETS.SPONSORED_MEAL;
  if (query.checkout === 'success') {
    return (
      <div className="success" role="status">
        <p>🎉 {target.label}、{target.verb}。反映まで数分かかる場合があります。</p>
        <div className="row wrap">
          {kind !== 'AREA_FEATURED' && order && <Link className="btn small" href={`/business/social?kind=${kind}&id=${order.campaignId}`}>Xで客を呼ぶ</Link>}
          <Link className="btn small secondary" href={target.href}>{target.label}を見る</Link>
          <Link className="btn small secondary" href="/business/analytics">成果を見る</Link>
        </div>
      </div>
    );
  }
  if (query.checkout === 'cancelled') {
    return (
      <div className="notice" role="status">
        <p>{target.label}の支払いはキャンセルされました。下書きは保存されています。</p>
        <div className="row wrap">
          <Link className="btn small" href={target.href}>{target.label}を見る</Link>
        </div>
      </div>
    );
  }
  if (query.subscription === 'success') {
    return (
      <div className="success" role="status">
        <p>🎉 プランを更新しました。</p>
        <Link className="btn small" href="/business/billing">プランを見る</Link>
      </div>
    );
  }
  if (query.subscription === 'cancelled') {
    return (
      <div className="notice" role="status">
        <p>プラン変更はキャンセルされました。</p>
      </div>
    );
  }
  return null;
}
