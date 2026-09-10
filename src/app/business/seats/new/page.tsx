import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { SeatCampaignWizard } from '@/components/business/seat-campaign-wizard';

export const metadata = { title: '今、席空いてます' };

export default async function NewSeatCampaign() {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  return (
    <section className="section narrow">
      <Link className="text-link" href="/business/seats">← 空席スポンサー一覧</Link>
      <h1>今、席空いてます</h1>
      <SeatCampaignWizard
        businessAccountId={membership.businessAccountId}
        restaurantName={membership.businessAccount.name}
        area={membership.businessAccount.area ?? ''}
      />
    </section>
  );
}
