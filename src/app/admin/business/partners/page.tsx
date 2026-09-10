import Link from 'next/link';
import { getAdminPartnerCampaigns } from '@/server/admin';
import { getAreaOptions } from '@/lib/data';
import { adminCreatePartnerCampaign, adminUpdatePartnerCampaignStatus } from '@/server/actions/admin-partners';
import { PartnerCampaignCreateForm } from '@/components/admin/partner-campaign-create-form';
import { InlineStatusForm } from '@/components/inline-status-form';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import { dateTimeLabel } from '@/lib/format';
import type { BusinessCampaignStatus } from '@/features/business/campaign-status';

export const metadata = { title: '先行パートナー枠管理' };

const STATUS_OPTIONS: BusinessCampaignStatus[] = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'];

export default async function AdminPartnerCampaigns() {
  const [campaigns, areaOptions] = await Promise.all([getAdminPartnerCampaigns(), getAreaOptions()]);

  return (
    <section className="section">
      <Link className="text-link" href="/admin/business">← Business Intelligence</Link>
      <div className="section-heading">
        <div><span className="eyebrow orange">ADMIN</span><h1>先行パートナー枠管理</h1><p className="muted">/business・/business/partnerに表示される先行パートナー募集枠を作成・公開管理します。作成直後は下書きのため公開されません。</p></div>
      </div>

      <div className="panel">
        <h2>新しい枠を作る</h2>
        <PartnerCampaignCreateForm action={adminCreatePartnerCampaign} areaOptions={areaOptions} />
      </div>

      <div className="section-heading"><h2>枠一覧</h2></div>
      <div className="dashboard-grid">
        {campaigns.map(c => (
          <article className="panel" key={c.id}>
            <BusinessStatusBadge status={c.status} />
            <h3>{c.title}</h3>
            <p className="muted">{c.area} · {dateTimeLabel(c.startsAt)} 〜 {dateTimeLabel(c.endsAt)}</p>
            <p>{c.description}</p>
            <p className="muted">特典：{c.offerText}</p>
            <p className="muted">参加 {c.joinedPartners}{c.maxPartners !== null ? ` / ${c.maxPartners}` : ''}店舗 · Lead {c._count.leads}件</p>
            <InlineStatusForm id={c.id} currentStatus={c.status} options={STATUS_OPTIONS} action={adminUpdatePartnerCampaignStatus} />
          </article>
        ))}
        {!campaigns.length && <p className="muted">まだ先行パートナー枠がありません。</p>}
      </div>
    </section>
  );
}
