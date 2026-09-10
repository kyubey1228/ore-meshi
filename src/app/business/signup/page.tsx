import { redirect } from 'next/navigation';
import { requireBusinessPageUser } from '@/server/auth';
import { currentBusinessMembership } from '@/server/business';
import { BusinessSignupForm } from '@/components/business-signup-form';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';
import type { Metadata } from 'next';
import { appUrl } from '@/lib/social';
import { isUgcStyle } from '@/lib/ugc';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ ugc_style?: string }> }): Promise<Metadata> {
  const query = await searchParams;
  const image = isUgcStyle(query.ugc_style) ? `${appUrl()}/api/ugc/invite?style=${query.ugc_style}` : undefined;
  return { title: '店舗・企業登録', ...(image ? { openGraph: { images: [image] }, twitter: { card: 'summary_large_image', images: [image] } } : {}) };
}

export default async function Signup({ searchParams }: { searchParams: Promise<{ ref?: string; partner?: string }> }) {
  await requireBusinessPageUser('/business/signup');
  if (await currentBusinessMembership()) redirect('/business/dashboard');
  const q = await searchParams;
  return (
    <section className="section narrow">
      <BusinessMarketingTracker eventType="SIGNUP_STARTED" referralCode={q.ref} />
      <span className="eyebrow orange">BUSINESS SIGNUP</span>
      <h1>飯を呼ぶ準備をはじめよう。</h1>
      <ul className="tag-pills">
        <li className="tag-pill">登録は無料</li>
        <li className="tag-pill">今日の空席をすぐ掲載できる</li>
        <li className="tag-pill">近隣の食事需要を確認できる</li>
        <li className="tag-pill">有料プランは後から選べる</li>
      </ul>
      <p className="muted">登録後は簡単な内容確認を行います。確認前に決済を求めることはありません。</p>
      <BusinessSignupForm partnerCampaignId={q.partner} referralCode={q.ref} />
    </section>
  );
}
