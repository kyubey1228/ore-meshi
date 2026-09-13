import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '空席スポンサー 掲載規約', description: '空席スポンサー（当日・短時間の個別出稿商品）の掲載に関する規約です。' };

const articles = [
  ['第1条（商品概要）', '空席スポンサー（空席飯）は、店舗・企業が当日発生した空席やキャンセル枠を埋めるため、特典を提供して短時間掲載する個別出稿商品です。'],
  ['第2条（申し込みと掲載開始）', 'お申し込み内容の作成後、Stripe Checkoutでの決済が完了した時点で掲載が開始されます。決済前の下書き状態であれば、いつでも取りやめることができます。'],
  ['第3条（掲載期間）', '掲載は、お申し込み時に設定した終了時刻をもって終了します。空席スポンサーはその日・その時間帯に限られた集客を目的とする商品のため、延長は新規のお申し込みとして扱います。'],
  ['第4条（広告表示）', '一般ユーザーに対して広告であることが分かるよう、PR表記および提供元（店舗・企業名）を明示します。実際の特典内容と異なる表示はできません。'],
  ['第5条（キャンセル・返金）', '決済完了後の、お申し込み者側の都合によるキャンセル・返金は原則お受けしておりません。システム障害など運営側の事情により掲載を提供できなかった場合は、運営の判断により返金その他の対応を行うことがあります。'],
  ['第6条（禁止事項）', '実態と異なる特典・条件の表示、他者の権利を侵害する内容の掲載、法令に違反する内容の掲載を禁止します。これらに該当すると判断した場合、掲載を停止することがあります。'],
  ['第7条（規約の変更）', '本規約は、サービスの運用状況に応じて変更されることがあります。重要な変更がある場合は、本ページまたは店舗管理画面でお知らせします。'],
  ['第8条（お問い合わせ）', 'ご不明点は、Business問い合わせフォームからご連絡ください。'],
] as const;

export default function SeatCampaignTermsPage() {
  return (
    <section className="section narrow">
      <span className="eyebrow orange">TERMS</span>
      <h1>空席スポンサー 掲載規約</h1>
      <p className="muted">最終更新日は今後の改定時にここへ記載します。</p>
      {articles.map(([title, body]) => (
        <div className="panel" key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </div>
      ))}
      <div className="hero-actions">
        <Link className="btn secondary" href="/business/terms">Business利用条件トップへ</Link>
        <Link className="text-link" href="/business/contact">問い合わせる →</Link>
      </div>
    </section>
  );
}
