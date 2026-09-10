import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { getEligibleFirstTimeOffer } from '@/server/sales';
import { SeatCampaignWizard } from '@/components/business/seat-campaign-wizard';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';

export const metadata = { title: '今、席空いてます' };

export default async function NewSeatCampaign() {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  const [catalog, offer] = await Promise.all([
    getBusinessPricingCatalog(),
    getEligibleFirstTimeOffer(membership.businessAccountId, 'SEAT_CAMPAIGN'),
  ]);
  return (
    <section className="section">
      <BusinessMarketingTracker eventType="SPONSOR_PRODUCT_VIEW" content="SEAT_CAMPAIGN" />
      <Link className="text-link" href="/business/seats">← 空席スポンサー一覧</Link>
      <h1>今、席空いてます</h1>
      {offer && <p className="notice">🎉 初回は{offer.offerType === 'FREE' ? '無料' : offer.offerType === 'PERCENT' ? `${offer.discountPercent}%OFF` : `${offer.discountAmount?.toLocaleString('ja-JP')}円OFF`}でお試しいただけます。今日の空席だけ試してみませんか？</p>}
      <SeatCampaignWizard
        businessAccountId={membership.businessAccountId}
        restaurantName={membership.businessAccount.name}
        area={membership.businessAccount.area ?? ''}
        priceYen={catalog ? catalog.seatCampaign.toLocaleString('ja-JP') : '1,000'}
      />
    </section>
  );
}
