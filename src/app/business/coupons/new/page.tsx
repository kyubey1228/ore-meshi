import Link from 'next/link';
import { redirect } from 'next/navigation';
import { businessPostingMembership } from '@/server/business';
import { CouponForm } from '@/components/business/coupon-form';

export const metadata = { title: 'クーポンを作る' };

export default async function NewCoupon() {
  const membership = await businessPostingMembership().catch(() => null);
  if (!membership) redirect('/business/onboarding');
  return (
    <section className="section narrow">
      <Link className="text-link" href="/business/coupons">← クーポン一覧</Link>
      <h1>クーポンを作る</h1>
      <p className="muted">支払いは不要です。作成するとすぐ公開されます。</p>
      <CouponForm
        businessAccountId={membership.businessAccountId}
        defaultRestaurantName={membership.businessAccount.name}
        defaultArea={membership.businessAccount.area ?? ''}
      />
    </section>
  );
}
