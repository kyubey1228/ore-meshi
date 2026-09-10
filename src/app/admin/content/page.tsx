import Link from 'next/link';
import { getAdminContentDrafts } from '@/server/content-studio';
import { generateContentDrafts, adminUpdateContentDraftStatus } from '@/server/actions/content-studio';
import { GenerateContentButton } from '@/components/admin/generate-content-button';
import { InlineStatusForm } from '@/components/inline-status-form';
import { CopyTextButton } from '@/components/admin/copy-text-button';
import { dateTimeLabel } from '@/lib/format';

export const metadata = { title: 'Content Studio' };

const STATUS_LABEL_JA = { DRAFT: '下書き', APPROVED: '承認済み', POSTED: '投稿済み' } as const;
const STATUS_OPTIONS = Object.keys(STATUS_LABEL_JA) as (keyof typeof STATUS_LABEL_JA)[];
const CHANNEL_LABEL_JA = { X: 'X', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', THREADS: 'Threads' } as const;

export default async function AdminContent() {
  const drafts = await getAdminContentDrafts();

  return (
    <section className="section">
      <Link className="text-link" href="/admin/growth">← Growth Dashboard</Link>
      <div className="section-heading">
        <div>
          <span className="eyebrow orange">ADMIN</span>
          <h1>Content Studio</h1>
          <p className="muted">匿名の集計値（今週の成立数・エリア別需要など）だけを使ってSNS投稿の下書きを作ります。自動投稿は行いません。内容を確認・編集してから手動で投稿してください。</p>
        </div>
      </div>

      <div className="panel">
        <h2>下書きを生成</h2>
        <p className="muted">直近の成立実績・現在募集中の件数・需要が供給を上回っているエリアから、まだ生成していない下書きを作成します。</p>
        <GenerateContentButton action={generateContentDrafts} />
      </div>

      <div className="section-heading"><h2>下書き一覧</h2></div>
      <div className="dashboard-grid">
        {drafts.map(draft => (
          <article className="panel" key={draft.id}>
            <span className="tag">{CHANNEL_LABEL_JA[draft.channel]}</span>
            <p className="pre-wrap">{draft.body}</p>
            <p className="muted">作成: {dateTimeLabel(draft.createdAt)}</p>
            <InlineStatusForm id={draft.id} currentStatus={draft.status} options={STATUS_OPTIONS} labels={STATUS_LABEL_JA} action={adminUpdateContentDraftStatus} />
            <CopyTextButton text={draft.body} />
            <div className="row wrap"><a className="btn secondary" href={`/api/admin/content/${draft.id}/image?format=square`} target="_blank" rel="noreferrer">画像を生成</a><a className="text-link" href={`/api/admin/content/${draft.id}/image?format=square&download=1`} download>画像を保存</a><a className="text-link" href={`/api/admin/content/${draft.id}/image?format=portrait`} target="_blank" rel="noreferrer">縦長</a><a className="text-link" href={`/api/admin/content/${draft.id}/image?format=story`} target="_blank" rel="noreferrer">ストーリー</a></div>
          </article>
        ))}
        {!drafts.length && <p className="muted">まだ下書きがありません。上のボタンから生成してください。</p>}
      </div>
    </section>
  );
}
