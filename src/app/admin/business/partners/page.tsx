import Link from 'next/link';
import { getAdminPartnerCampaigns } from '@/server/admin';
import { getAreaOptions } from '@/lib/data';
import { adminCreatePartnerCampaign, adminUpdatePartnerCampaignStatus } from '@/server/actions/admin-partners';
import { ActionForm } from '@/components/action-form';
import { InlineStatusForm } from '@/components/inline-status-form';
import { AreaDatalist } from '@/components/area-datalist';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import type { BusinessCampaignStatus } from '@/features/business/campaign-status';

export const metadata = { title: '先行パートナー枠管理' };

const STATUS_OPTIONS: BusinessCampaignStatus[] = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'];
const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();
const dateLabel = (date: Date) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(date);

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
        <ActionForm
          label="下書きを作成する"
          action={data => adminCreatePartnerCampaign({
            title: data.get('title'),
            description: data.get('description'),
            area: data.get('area'),
            offerText: data.get('offerText'),
            startsAt: iso(data.get('startsAt')),
            endsAt: iso(data.get('endsAt')),
            maxPartners: data.get('maxPartners') ? Number(data.get('maxPartners')) : null,
          })}
        >
          <label>見出し<input name="title" required maxLength={100} placeholder="例：新宿エリア先行10店舗募集" /></label>
          <label>説明<textarea name="description" required maxLength={500} rows={3} placeholder="例：新宿の飯を一緒に増やす立ち上げパートナー募集です。" /></label>
          <label>エリア<input name="area" list="area-options" required maxLength={80} /></label>
          <AreaDatalist options={areaOptions} />
          <label>特典・オファー文言<input name="offerText" required maxLength={120} placeholder="例：初回空席スポンサー無料" /></label>
          <div className="two-col">
            <label>開始日時<input name="startsAt" type="datetime-local" required /></label>
            <label>終了日時<input name="endsAt" type="datetime-local" required /></label>
          </div>
          <label>募集枠数（任意・空欄なら無制限）<input name="maxPartners" type="number" min={1} max={1000} /></label>
        </ActionForm>
      </div>

      <div className="section-heading"><h2>枠一覧</h2></div>
      <div className="dashboard-grid">
        {campaigns.map(c => (
          <article className="panel" key={c.id}>
            <BusinessStatusBadge status={c.status} />
            <h3>{c.title}</h3>
            <p className="muted">{c.area} · {dateLabel(c.startsAt)} 〜 {dateLabel(c.endsAt)}</p>
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
