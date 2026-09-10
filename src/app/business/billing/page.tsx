import { redirect } from 'next/navigation';
import { currentBusinessMembership } from '@/server/business';
import { getBusinessBillingState } from '@/server/billing';
import { BusinessPricingCards } from '@/components/business-pricing-cards';

export const metadata = { title: '料金プラン' };

export default async function BusinessBilling() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const billing = await getBusinessBillingState(membership.businessAccountId);

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
        <p className="muted">スポンサー飯(1件 ¥5,000)・空席スポンサー(1件 ¥1,000)は月額プランとは別料金です。キャンペーン作成時にその都度お支払いいただきます。</p>
      </div>
    </section>
  );
}
