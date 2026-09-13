import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Business利用条件' };

export default function Terms() {
  return (
    <section className="section narrow">
      <h1>Business利用条件</h1>
      <p>店舗・企業の皆さまにご利用いただく各商品には、それぞれ掲載規約があります。</p>
      <div className="sales-grid">
        <article className="panel">
          <h2>スポンサー飯</h2>
          <p>募集連動型の個別出稿商品です。</p>
          <Link className="text-link" href="/business/terms/sponsored-meal">掲載規約を見る →</Link>
        </article>
        <article className="panel">
          <h2>空席スポンサー</h2>
          <p>当日・短時間の個別出稿商品です。</p>
          <Link className="text-link" href="/business/terms/seats">掲載規約を見る →</Link>
        </article>
      </div>
      <p className="notice">STANDARD / PROの月額プランに関する規約、および全体のBusiness利用規約は公開前に法務確認のうえ追って掲載します。</p>
      <Link className="text-link" href="/business/email-notifications">メール通知について見る →</Link>
    </section>
  );
}
