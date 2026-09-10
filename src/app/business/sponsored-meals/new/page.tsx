import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { SponsoredMealWizard } from '@/components/business/sponsored-meal-wizard';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';

export const metadata = { title: 'スポンサー飯を出す' };

export default async function NewSponsoredMeal() {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  const catalog = await getBusinessPricingCatalog();
  return (
    <section className="section narrow">
      <BusinessMarketingTracker eventType="SPONSOR_PRODUCT_VIEW" content="SPONSORED_MEAL" />
      <Link className="text-link" href="/business/sponsored-meals">← スポンサー飯一覧</Link>
      <h1>スポンサー飯を出す</h1>
      <p className="muted">お店の飯代をスポンサーして、俺メシユーザーを呼び込みます。</p>
      <SponsoredMealWizard
        businessAccountId={membership.businessAccountId}
        businessName={membership.businessAccount.name}
        defaultRestaurantName={membership.businessAccount.name}
        defaultArea={membership.businessAccount.area ?? ''}
        priceYen={catalog ? catalog.sponsoredMeal.toLocaleString('ja-JP') : '5,000'}
      />
    </section>
  );
}
