'use client';
import { useState } from 'react';
import { estimateMonthlyPrice, type PricingValues } from '@/features/business/pricing';

const yen = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);

export function BusinessPricingSimulator({ values }: { values: PricingValues }) {
  const [sponsored, setSponsored] = useState(2);
  const [seats, setSeats] = useState(4);
  const [plan, setPlan] = useState<'FREE' | 'STANDARD' | 'PRO'>('STANDARD');
  const cost = estimateMonthlyPrice(values, sponsored, seats, plan);
  const percentOff = plan === 'FREE' ? null : values.discountPercent[plan];
  const hasCoupon = percentOff !== null && percentOff > 0;
  const regularSponsored = values.sponsoredMeal * sponsored;
  const regularSeats = values.seatCampaign * seats;
  const sponsoredSaving = regularSponsored - cost.sponsoredMeals;
  const seatSaving = regularSeats - cost.seatCampaigns;

  return (
    <div className="panel">
      <h2>月の利用イメージ</h2>
      <label>スポンサー飯：{sponsored}回<input type="range" min="0" max="10" value={sponsored} onChange={e => setSponsored(Number(e.target.value))} /></label>
      <label>空席スポンサー：{seats}回<input type="range" min="0" max="20" value={seats} onChange={e => setSeats(Number(e.target.value))} /></label>
      <label>プラン<select value={plan} onChange={e => setPlan(e.target.value as typeof plan)}><option>FREE</option><option>STANDARD</option><option>PRO</option></select></label>
      {hasCoupon && <div className="pricing-coupon" role="status">
        <div className="pricing-coupon-stamp"><strong>{percentOff}%</strong><span>OFF</span></div>
        <div><span className="eyebrow">MEMBER COUPON</span><h3>{plan}会員クーポン適用中</h3><p>スポンサー飯と空席スポンサーが、購入するたびに{percentOff}%OFF。</p></div>
        <strong className="pricing-coupon-saving">今月 −{yen(cost.savings)}</strong>
      </div>}
      <dl className="detail-list">
        <div><dt>月額</dt><dd>{yen(cost.subscription)}</dd></div>
        <div><dt>スポンサー飯{hasCoupon ? <span className="coupon-applied">クーポン適用</span> : ''}</dt><dd>{hasCoupon&&<del>{yen(regularSponsored)}</del>} {yen(cost.sponsoredMeals)}{sponsoredSaving>0&&<small className="coupon-discount-amount">−{yen(sponsoredSaving)}</small>}</dd></div>
        <div><dt>空席スポンサー{hasCoupon ? <span className="coupon-applied">クーポン適用</span> : ''}</dt><dd>{hasCoupon&&<del>{yen(regularSeats)}</del>} {yen(cost.seatCampaigns)}{seatSaving>0&&<small className="coupon-discount-amount">−{yen(seatSaving)}</small>}</dd></div>
        {cost.savings>0&&<div className="coupon-total-row"><dt>クーポン割引 合計</dt><dd>−{yen(cost.savings)}</dd></div>}
        <div><dt>合計</dt><dd>{yen(cost.total)} / 月</dd></div>
      </dl>
      {cost.savings > 0 && <p className="pricing-saving-copy">🎉 クーポンのおかげで、この利用回数なら毎月<strong>{yen(cost.savings)}</strong>お得！</p>}
      <small className="muted">実際の請求額はStripe Checkoutで最終確認できます。</small>
    </div>
  );
}
