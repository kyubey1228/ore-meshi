import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Clock3, CreditCard, Megaphone, Store, UserPlus } from 'lucide-react';
import { BusinessMarketingTracker } from '@/components/business-marketing-tracker';
import { BusinessMarketingLink } from '@/components/business-marketing-link';

export const metadata: Metadata = {
  title: '無料で店舗登録をはじめる',
  description: '決済不要で店舗登録。今日の空席掲載、近隣需要の確認、ユーザーへの告知を無料から始められます。',
  alternates: { canonical: '/business/start' },
};

const benefits = [
  { icon: Store, title: '登録は無料', text: '店舗の基本情報を登録するだけ。初期費用はありません。' },
  { icon: Clock3, title: '今日の空席を掲載', text: '急な空席やキャンセル枠から、飯のきっかけを作れます。' },
  { icon: BarChart3, title: '近隣需要を確認', text: 'エリアやジャンルごとの食事需要を確認できます。' },
  { icon: Megaphone, title: 'ユーザーへ届ける', text: '掲載内容をXで共有し、反応と成果を追えます。' },
  { icon: CreditCard, title: '決済は後から', text: '登録時にStripeやカード情報を要求しません。' },
  { icon: UserPlus, title: '自分で開始できる', text: '営業担当との商談を待たず、オンラインで登録できます。' },
];

export default function BusinessStart() {
  return <section className="section">
    <BusinessMarketingTracker eventType="BUSINESS_LP_VIEW" content="SELF_SERVICE_START" />
    <div className="section-heading"><div><span className="eyebrow orange">BUSINESS SELF-SERVICE</span><h1>今日の空席から、無料で始める。</h1><p>営業を待たずに店舗登録。必要なときだけ飯を呼べます。</p></div></div>
    <div className="business-cta-grid">{benefits.map(({ icon: Icon, title, text }) => <article className="panel business-cta" key={title}><Icon/><strong>{title}</strong><small>{text}</small></article>)}</div>
    <div className="panel"><h2>登録後にできること</h2><ol className="business-flow">{['店舗情報を登録','内容を確認','空席を掲載','Xで共有','反応を確認','必要なら有料機能'].map((step,index)=><li key={step}><small>0{index+1}</small><strong>{step}</strong></li>)}</ol><p className="muted">無料店舗のままでも基本機能を利用できます。有料プランは必要になってから選択できます。</p></div>
    <div className="hero-actions"><BusinessMarketingLink className="btn" href="/business/signup" eventType="BUSINESS_SIGNUP_CTA_CLICK" placement="SELF_SERVICE_START">無料で店舗登録する</BusinessMarketingLink><Link className="btn secondary" href="/business">詳しい機能を見る</Link></div>
  </section>;
}
