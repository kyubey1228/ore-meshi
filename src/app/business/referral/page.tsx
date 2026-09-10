import Link from 'next/link';
import { getBusinessReferral } from '@/server/sales';
import { appUrl } from '@/server/billing/config';
import { ReferralShare } from '@/components/referral-share';
export const metadata={title:'店舗紹介制度'};
export default async function Referral(){const referral=await getBusinessReferral();const url=referral?appUrl(`/business/signup?ref=${referral.referralCode}`):null;return <section className="section narrow"><span className="eyebrow orange">BUSINESS REFERRAL</span><h1>いつもの店を、俺メシへ。</h1><p>紹介した店舗と紹介された店舗の双方に、将来スポンサー飯の割引を付与できる紹介制度です。現金報酬はありません。</p>{url?<><div className="panel"><h2>あなたの紹介URL</h2><p className="break-all">{url}</p><p className="muted">紹介特典の提供開始時期・条件は運営からお知らせします。</p></div><ReferralShare inviteUrl={url} heading="この店を漫画で誘う" description="好きな漫画カードを選んで、店舗仲間へ送れます。" text={`いつもの店を「俺は誰かと飯が食いたい！」に誘いませんか？\n\n${url}`} /></>:<div className="empty">紹介コードを準備中です。</div>}<Link className="btn secondary" href="/business/dashboard">店舗管理へ</Link></section>}
