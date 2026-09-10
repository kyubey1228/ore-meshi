import Link from 'next/link';
import { getAdminBusinessAccounts, getAdminCampaigns } from '@/server/admin';
import { getAreaOptions } from '@/lib/data';
import { adminCreateCampaignDraft, adminUpdateCampaignStatus } from '@/server/actions/admin-leads';
import { SponsorCampaignDraftForm } from '@/components/admin/sponsor-campaign-draft-form';
import { InlineStatusForm } from '@/components/inline-status-form';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import type { BusinessCampaignStatus } from '@/features/business/campaign-status';

export const metadata = { title: 'スポンサー施策管理' };

const KIND_LABEL_JA = { SPONSORED_MEAL: 'スポンサー飯', SPONSOR_CAMPAIGN: '全額・企業スポンサー', SEAT_CAMPAIGN: '空席スポンサー', COUPON: 'クーポン' } as const;
const STATUS_OPTIONS: BusinessCampaignStatus[] = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'];

export default async function AdminCampaigns() {
  const [businesses, campaigns, areaOptions] = await Promise.all([
    getAdminBusinessAccounts(),
    getAdminCampaigns(),
    getAreaOptions(),
  ]);

  return (
    <section className="section">
      <Link className="text-link" href="/admin/business">← Business Intelligence</Link>
      <div className="section-heading">
        <div><span className="eyebrow orange">ADMIN</span><h1>スポンサー施策管理</h1><p className="muted">店舗に代わって運営側でスポンサー飯・全額スポンサー・空席スポンサー・クーポンを作成できます。</p></div>
      </div>

      <div className="panel">
        <h2>新しい施策を作る</h2>
        {businesses.length === 0 ? (
          <p className="muted">ACTIVEな店舗アカウントがありません。</p>
        ) : (
          <SponsorCampaignDraftForm action={adminCreateCampaignDraft} businesses={businesses} areaOptions={areaOptions} />
        )}
      </div>

      <div className="section-heading"><h2>最近の施策</h2></div>
      <div className="dashboard-grid">
        {campaigns.map(item => (
          <article className="panel" key={`${item.kind}:${item.id}`}>
            <span className="tag">{KIND_LABEL_JA[item.kind]}</span>
            <BusinessStatusBadge status={item.status} />
            <h3>{item.title}</h3>
            <p className="muted">{item.businessName} · {item.area || 'エリア未設定'}</p>
            <InlineStatusForm id={item.id} currentStatus={item.status} options={STATUS_OPTIONS} action={adminUpdateCampaignStatus} extraFields={{ kind: item.kind }} />
          </article>
        ))}
        {!campaigns.length && <p className="muted">まだ施策がありません。</p>}
      </div>
    </section>
  );
}
