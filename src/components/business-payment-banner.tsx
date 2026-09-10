import Link from 'next/link';
import { getSponsorOrderStatus } from '@/server/billing';

type Query = { checkout?: string; subscription?: string; order_id?: string; kind?: string };

export async function BusinessPaymentBanner({ query }: { query: Query }) {
  const order=query.checkout==='success'&&query.order_id?await getSponsorOrderStatus(query.order_id):null;
  const kind=order?.orderType??query.kind;
  const target=kind==='SEAT_CAMPAIGN'?{label:'空席スポンサー',href:'/business/seats'}:{label:'スポンサー飯',href:'/business/sponsored-meals'};
  if (query.checkout === 'success') {
    return (
      <div className="success" role="status">
        <p>🎉 {target.label}のお支払いが完了しました。反映まで数分かかる場合があります。</p>
        <div className="row wrap">
          <Link className="btn small" href={target.href}>{target.label}を見る</Link>
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
