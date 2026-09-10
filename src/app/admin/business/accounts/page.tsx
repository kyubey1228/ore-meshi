import Link from 'next/link';
import { getAdminBusinessAccountsAll } from '@/server/admin';
import { adminUpdateBusiness } from '@/server/actions/admin-leads';
import { InlineStatusForm } from '@/components/inline-status-form';
import { dateLabel } from '@/lib/format';

export const metadata = { title: '店舗アカウント承認' };

const STATUS_LABEL_JA = { PENDING: '承認待ち', ACTIVE: '有効', SUSPENDED: '停止中' } as const;
const STATUS_OPTIONS = Object.keys(STATUS_LABEL_JA) as (keyof typeof STATUS_LABEL_JA)[];

export default async function AdminBusinessAccounts() {
  const accounts = await getAdminBusinessAccountsAll();
  const pendingCount = accounts.filter(a => a.status === 'PENDING').length;

  return (
    <section className="section">
      <Link className="text-link" href="/admin/business">← Business Intelligence</Link>
      <div className="section-heading">
        <div><span className="eyebrow orange">ADMIN</span><h1>店舗アカウント承認</h1><p className="muted">自己登録(/business/signup)された店舗アカウントを確認・承認します。承認前は広告機能が公開されません。</p></div>
      </div>
      {pendingCount > 0 && <p className="notice">承認待ちが{pendingCount}件あります。</p>}

      <div className="dashboard-grid">
        {accounts.map(account => (
          <article className="panel" key={account.id}>
            <span className={`tag status-${account.status === 'PENDING' ? 'warning' : account.status === 'ACTIVE' ? 'success' : 'danger'}`}>{STATUS_LABEL_JA[account.status]}</span>
            <h3>{account.name}</h3>
            <p className="muted">{account.businessType} · {account.area ?? 'エリア未設定'} · {dateLabel(account.createdAt)}登録</p>
            <p className="muted">担当: {account.contactName ?? '—'} / {account.contactEmail ?? '—'}</p>
            {account.consultation && <p className="pre-wrap">{account.consultation}</p>}
            <p className="muted">メンバー{account._count.members}人 · スポンサー飯{account._count.sponsoredMeals}件 · 空席投稿{account._count.seatCampaigns}件</p>
            <InlineStatusForm id={account.id} currentStatus={account.status} options={STATUS_OPTIONS} labels={STATUS_LABEL_JA} action={adminUpdateBusiness} />
          </article>
        ))}
        {!accounts.length && <p className="muted">まだ店舗アカウントがありません。</p>}
      </div>
    </section>
  );
}
