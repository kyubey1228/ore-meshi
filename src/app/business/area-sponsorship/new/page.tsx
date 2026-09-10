import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { getAreaGenreMatrix, rankOpportunity } from '@/server/business-intelligence';
import { AreaSponsorshipForm } from '@/components/business/area-sponsorship-form';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';

export const metadata = { title: 'エリアスポンサーを出す' };

export default async function NewAreaSponsorship() {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  // Opportunity Rankingの計算そのもの(area/genre/スコアのみ、個人データなし)を営業提案の候補提示として再利用する。
  const cells = await getAreaGenreMatrix(30).catch(() => []);
  const suggestions = rankOpportunity(cells, 5);

  return (
    <section className="section narrow">
      <BusinessMarketingTracker eventType="SPONSOR_PRODUCT_VIEW" content="AREA_FEATURED" />
      <Link className="text-link" href="/business/area-sponsorship">← エリアスポンサー一覧</Link>
      <h1>エリアスポンサーを出す</h1>
      <p className="muted">エリア×ジャンル単位で期間限定の掲載枠を確保できます。金額は次の一覧画面の支払いボタンでご確認いただけます。</p>
      <AreaSponsorshipForm
        businessAccountId={membership.businessAccountId}
        defaultArea={membership.businessAccount.area ?? ''}
        suggestions={suggestions.map(s => ({ area: s.area, genre: s.genre }))}
      />
    </section>
  );
}
