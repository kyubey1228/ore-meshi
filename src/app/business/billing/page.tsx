import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessSavingsThisMonth } from '@/server/business';
import { getBusinessBillingState, getBusinessPricingCatalog, discountedPriceYen } from '@/server/billing';
import { BusinessPricingCards } from '@/components/business-pricing-cards';

export const metadata = { title: '料金プラン' };

function yen(n: number) { return `¥${n.toLocaleString('ja-JP')}`; }

export default async function BusinessBilling() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [billing, catalog, savings] = await Promise.all([getBusinessBillingState(membership.businessAccountId), getBusinessPricingCatalog(), getBusinessSavingsThisMonth(membership.businessAccountId)]);
  const myPlan = billing.plan;
  const myDiscount = catalog && (myPlan === 'STANDARD' || myPlan === 'PRO') ? catalog.discountPercent[myPlan] : null;
  const sponsoredMealDiscounted = catalog ? discountedPriceYen(catalog.sponsoredMeal, myDiscount) : null;
  const seatCampaignDiscounted = catalog ? discountedPriceYen(catalog.seatCampaign, myDiscount) : null;

  return (
    <section className="section narrow">
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">BUSINESS PLAN</span>
          <h1>料金プラン</h1>
          <p className="muted">店舗の規模に合わせてプランを選べます。</p>
        </div>
      </div>
      <BusinessPricingCards billing={billing} />
      <div className="panel">
        <h2>従量課金メニュー</h2>
        <p className="muted">スポンサー飯・空席スポンサーは月額プランとは別料金です。キャンペーン作成時にその都度お支払いいただきます。</p>
        <div className="two-col">
          <div>
            <h3>スポンサー飯</h3>
            <p>通常 {yen(catalog?.sponsoredMeal ?? 5000)}</p>
            {sponsoredMealDiscounted !== null && <p className="orange">{myPlan}価格 {yen(sponsoredMealDiscounted)}（{yen((catalog?.sponsoredMeal ?? 0) - sponsoredMealDiscounted)}お得）</p>}
          </div>
          <div>
            <h3>空席スポンサー</h3>
            <p>通常 {yen(catalog?.seatCampaign ?? 1000)}</p>
            {seatCampaignDiscounted !== null && <p className="orange">{myPlan}価格 {yen(seatCampaignDiscounted)}（{yen((catalog?.seatCampaign ?? 0) - seatCampaignDiscounted)}お得）</p>}
          </div>
        </div>
        {myPlan === 'FREE' && <p className="muted">STANDARD/PROに加入すると割引が適用されます。</p>}
      </div>
      {(savings.sponsoredMealCount > 0 || savings.seatCampaignCount > 0) && (
        <div className="panel">
          <h2>今月このプランでいくら得したか</h2>
          <p className="muted">実際の購入履歴から計算した実額です。</p>
          <div className="analytics-grid">
            <div><strong>{savings.sponsoredMealCount}</strong><span>スポンサー飯 利用回数</span></div>
            <div><strong>{savings.seatCampaignCount}</strong><span>空席スポンサー 利用回数</span></div>
            <div><strong>{yen(savings.savingsYen)}</strong><span>通常価格との差額</span></div>
          </div>
        </div>
      )}
    </section>
  );
}
