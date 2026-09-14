import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'メール通知について（店舗・企業向け）', description: 'メールアドレスを登録すると、契約や掲載の見落としをメールでも防げます。' };

const benefits = [
  ['プラン終了が近づいたら', '契約終了日が近づくと、事前に「プランの終了日が近づいています」とお知らせします。'],
  ['お支払いに問題が起きたら', '決済が確認できなかった場合、早めに気づけるよう知らせます。'],
  ['掲載の反応が少ないとき', '空席スポンサー・スポンサー飯の終了が近いのに閲覧が少ない場合、改善のヒントとして知らせます。'],
  ['はじめての成果が出たら', '掲載から初めて参加や成立につながったタイミングでお知らせします。'],
] as const;

export default function BusinessEmailNotificationsPage() {
  return (
    <section className="section narrow">
      <span className="eyebrow orange">EMAIL</span>
      <h1>メールアドレスを登録すると、こんなに便利。</h1>
      <p>店舗・企業アカウントの通知は管理画面でも確認できますが、メールアドレスを登録しておくと、開かなくても大事なタイミングで気づけます。</p>
      <div className="sales-grid">
        {benefits.map(([title, body]) => (
          <article className="panel" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="panel">
        <h2>誰に届きますか？</h2>
        <p>通知はOWNER・ADMIN権限のメンバーへ届きます。受け取るお知らせの種類は、店舗管理の「通知設定」からいつでも調整できます。</p>
      </div>
      <div className="hero-actions">
        <Link className="btn" href="/profile#email">プロフィールでメールアドレスを登録する →</Link>
        <Link className="text-link" href="/business/dashboard">店舗管理へ戻る</Link>
      </div>
    </section>
  );
}
