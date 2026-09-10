import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard } from '@/server/business';
import { getBusinessCapabilities } from '@/server/billing';
import { BusinessDirectAdForm } from '@/components/business-direct-ad-form';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { BusinessEmptyState } from '@/components/business-empty-state';

export const metadata = { title: '企業広告(Direct Ad)' };

export default async function BusinessDirectAds() {
  const membership = await currentBusinessMembership();
  if (!membership) redirect('/business/onboarding');
  const [data, capabilities] = await Promise.all([
    getBusinessDashboard(),
    getBusinessCapabilities(membership.businessAccountId),
  ]);

  return (
    <section className="section">
      <Link className="text-link" href="/business/dashboard">← Business Dashboard</Link>
      <h1>企業広告(Direct Ad)</h1>

      {!capabilities.canCreateDirectAd && (
        <div className="panel">
          <p>企業広告(Direct Ad)はPROプランでご利用いただけます。</p>
          <Link className="btn" href="/business/billing">PROを見る</Link>
        </div>
      )}
      {capabilities.canCreateDirectAd && <BusinessDirectAdForm businessAccountId={membership.businessAccountId} />}

      {!data.directAds.length && (
        <BusinessEmptyState icon="📢" message="企業広告はまだありません。" />
      )}
      <div className="dashboard-grid">
        {data.directAds.map(ad => (
          <article className="panel" key={ad.id}>
            <BusinessStatusBadge status={ad.status} />
            <h2>{ad.title}</h2>
            <p className="muted">{ad.advertiserName}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
