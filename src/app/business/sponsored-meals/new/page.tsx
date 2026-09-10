import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { getBusinessPricingCatalog } from '@/server/billing';
import { prisma } from '@/lib/prisma';
import { SponsoredMealWizard } from '@/components/business/sponsored-meal-wizard';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';

export const metadata = { title: 'スポンサー飯を出す' };

export default async function NewSponsoredMeal({ searchParams }: { searchParams: Promise<{ repeat?: string }> }) {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  const { repeat } = await searchParams;
  const [catalog, source] = await Promise.all([
    getBusinessPricingCatalog(),
    // 他社Campaignをコピーできないよう、必ず自分のbusinessAccountId範囲でのみ検索する。
    repeat ? prisma.sponsoredMeal.findFirst({ where: { id: repeat, businessAccountId: membership.businessAccountId } }) : Promise.resolve(null),
  ]);
  return (
    <section className="section narrow">
      <BusinessMarketingTracker eventType="SPONSOR_PRODUCT_VIEW" content="SPONSORED_MEAL" />
      <Link className="text-link" href="/business/sponsored-meals">← スポンサー飯一覧</Link>
      <h1>{source ? '同じ条件でもう一度スポンサー飯を出す' : 'スポンサー飯を出す'}</h1>
      <p className="muted">お店の飯代をスポンサーして、俺メシユーザーを呼び込みます。{source && '開催日時は現在時刻を基準に選び直してください。'}</p>
      <SponsoredMealWizard
        businessAccountId={membership.businessAccountId}
        businessName={membership.businessAccount.name}
        defaultRestaurantName={membership.businessAccount.name}
        defaultArea={membership.businessAccount.area ?? ''}
        priceYen={catalog ? catalog.sponsoredMeal.toLocaleString('ja-JP') : '5,000'}
        repeatDefaults={source ? { title: source.title, restaurantName: source.restaurantName, area: source.area, genre: source.genre ?? '', benefit: source.benefit, description: source.description, participantLimit: source.participantLimit } : undefined}
      />
    </section>
  );
}
