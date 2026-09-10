import Link from 'next/link';
import { getAdminBusinessAccounts, getAdminCampaigns } from '@/server/admin';
import { getAreaOptions } from '@/lib/data';
import { adminCreateCampaignDraft, adminUpdateCampaignStatus } from '@/server/actions/admin-leads';
import { ActionForm } from '@/components/action-form';
import { AreaDatalist } from '@/components/area-datalist';
import { BusinessStatusBadge } from '@/components/business-status-badge';
import type { BusinessCampaignStatus } from '@/features/business/campaign-status';

export const metadata = { title: 'スポンサー施策管理' };

const KIND_LABEL_JA = { SPONSORED_MEAL: 'スポンサー飯', SPONSOR_CAMPAIGN: '全額・企業スポンサー', SEAT_CAMPAIGN: '空席スポンサー', COUPON: 'クーポン' } as const;
const STATUS_OPTIONS: BusinessCampaignStatus[] = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'];

const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();

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
          <ActionForm
            label="下書きを作成する"
            action={data => adminCreateCampaignDraft({
              businessAccountId: data.get('businessAccountId'),
              kind: data.get('kind'),
              title: data.get('title'),
              restaurantName: data.get('restaurantName'),
              area: data.get('area'),
              genre: data.get('genre'),
              benefit: data.get('benefit'),
              startsAt: iso(data.get('startsAt')),
              endsAt: iso(data.get('endsAt')),
              capacity: Number(data.get('capacity')),
            })}
          >
            <label>店舗<select name="businessAccountId" required>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}{b.area ? `（${b.area}）` : ''}</option>)}</select></label>
            <label>種類<select name="kind" required>{Object.entries(KIND_LABEL_JA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>見出し・スポンサー名<input name="title" required maxLength={80} placeholder="例：今日は店長のおごりです" /></label>
            <label>店舗名（表示用）<input name="restaurantName" required maxLength={80} /></label>
            <label>エリア<input name="area" list="area-options" maxLength={80} /></label>
            <AreaDatalist options={areaOptions} />
            <label>ジャンル（任意・スポンサー飯のみ使用）<input name="genre" maxLength={60} placeholder="例：焼肉" /></label>
            <label>特典・提供内容<textarea name="benefit" maxLength={120} rows={2} placeholder="例：最初のドリンク無料" /></label>
            <div className="two-col">
              <label>開始日時<input name="startsAt" type="datetime-local" required /></label>
              <label>終了・有効期限<input name="endsAt" type="datetime-local" required /></label>
            </div>
            <label>募集人数・席数<input name="capacity" type="number" min={1} max={100} defaultValue={4} required /></label>
            <p className="muted">スポンサー飯・空席スポンサーは下書き作成後、店舗側の一覧画面から支払うと公開されます。全額スポンサー・クーポンは作成と同時に公開されます。</p>
          </ActionForm>
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
            <ActionForm label="状態を更新" action={data => adminUpdateCampaignStatus({ kind: item.kind, id: item.id, status: data.get('status') })}>
              <select name="status" defaultValue={item.status}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            </ActionForm>
          </article>
        ))}
        {!campaigns.length && <p className="muted">まだ施策がありません。</p>}
      </div>
    </section>
  );
}
