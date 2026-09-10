import Link from 'next/link';
import { getAdminSalesCandidates, generateSalesCandidates, adminUpdateSalesCandidateStatus, adminUpdateSalesCandidateMemo, generateSalesCopy, getSalesQueue } from '@/server/sales-candidates';
import { getAreaGenreMatrix } from '@/server/business-intelligence';
import { InlineStatusForm } from '@/components/inline-status-form';
import { GenerateCandidatesButton } from '@/components/admin/generate-candidates-button';
import { SalesCandidateMemoForm } from '@/components/admin/sales-candidate-memo-form';
import { dateLabel } from '@/lib/format';

export const metadata = { title: '営業候補・Sales Queue' };

const STATUS_LABEL_JA = { NEW: '新規', CONTACT_READY: '連絡準備OK', CONTACTED: '連絡済み', REPLIED: '返信あり', INTERESTED: '興味あり', REGISTERED: '登録済み', DECLINED: '見送り', DO_NOT_CONTACT: '連絡しない' } as const;
const STATUS_OPTIONS = Object.keys(STATUS_LABEL_JA) as (keyof typeof STATUS_LABEL_JA)[];
const QUEUE_LABEL_JA = { CONTACT_READY: '営業候補', LEAD_FOLLOWUP: 'フォローアップ', BUSINESS_ONBOARDING: 'オンボーディング案内' } as const;

export default async function AdminSales() {
  const [candidates, queue, matrix] = await Promise.all([
    getAdminSalesCandidates(),
    getSalesQueue(10),
    getAreaGenreMatrix(30),
  ]);
  const matrixByKey = new Map(matrix.map(c => [`${c.area}|||${c.genre}`, c]));

  return (
    <section className="section">
      <Link className="text-link" href="/admin/business">← Business Intelligence</Link>
      <div className="section-heading">
        <div><span className="eyebrow orange">ADMIN</span><h1>営業候補・Sales Queue</h1><p className="muted">今日やるべきことが分かるように、営業候補・フォローアップ・オンボーディング案内をまとめて表示します。外部への自動送信は一切行いません。</p></div>
      </div>

      <div className="panel">
        <h2>今日のSales Queue（最大10件）</h2>
        {queue.length ? (
          <div className="dashboard-grid">
            {queue.map(item => (
              <Link className="list-card" href={item.href} key={item.id}>
                <span className="tag">{QUEUE_LABEL_JA[item.kind]}</span>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </Link>
            ))}
          </div>
        ) : <p className="muted">現在、優先度の高いアクションはありません。</p>}
      </div>

      <div className="panel">
        <h2>営業候補を生成</h2>
        <p className="muted">既存のOpportunity Ranking(エリア×ジャンル、需要と供給不足から算出)を元に候補を追加します。既存候補はスコアのみ更新し、ステータスは変更しません。</p>
        <GenerateCandidatesButton action={generateSalesCandidates} />
      </div>

      <div className="section-heading"><h2>候補一覧</h2></div>
      <div className="dashboard-grid">
        {candidates.map(candidate => {
          const cell = matrixByKey.get(`${candidate.area}|||${candidate.genre}`);
          const copy = generateSalesCopy({ area: candidate.area, genre: candidate.genre, demandIntents: cell?.demandIntents ?? 0, activeMeals: cell?.activeMeals ?? 0, days: 30 });
          return (
            <article className="panel" key={candidate.id}>
              <span className="tag">Opportunity {candidate.opportunityScore.toFixed(1)}</span>
              <h3>{candidate.storeName || `${candidate.area} × ${candidate.genre}`}</h3>
              <p className="muted">{candidate.area} · {candidate.genre}{candidate.lastContactedAt ? ` · 最終連絡 ${dateLabel(candidate.lastContactedAt)}（${candidate.contactCount}回）` : ''}</p>
              <InlineStatusForm id={candidate.id} currentStatus={candidate.status} options={STATUS_OPTIONS} labels={STATUS_LABEL_JA} action={adminUpdateSalesCandidateStatus} />
              <SalesCandidateMemoForm id={candidate.id} initialMemo={candidate.memo ?? ''} action={adminUpdateSalesCandidateMemo} />
              <details>
                <summary>営業文を見る{!copy.dataSufficient && '（データ不足のため簡易版）'}</summary>
                <div className="detail-list">
                  <div><dt>問い合わせフォーム向け</dt><dd className="pre-wrap">{copy.contactForm}</dd></div>
                  <div><dt>メール向け</dt><dd className="pre-wrap">{copy.email}</dd></div>
                  <div><dt>Instagram/X DM向け</dt><dd className="pre-wrap">{copy.dm}</dd></div>
                  <div><dt>電話トークスクリプト</dt><dd className="pre-wrap">{copy.phoneScript}</dd></div>
                </div>
              </details>
            </article>
          );
        })}
        {!candidates.length && <p className="muted">まだ営業候補がありません。上のボタンから生成してください。</p>}
      </div>
    </section>
  );
}
