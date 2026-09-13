import Link from 'next/link';
import { currentBusinessMembership, getCampaignShareData, campaignIsShareable } from '@/server/business';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/social';
import { BusinessSharePreview } from '@/components/business-share-preview';
import { BusinessQrPrintPanel } from '@/components/business-qr-print-panel';
import { campaignPath } from '@/features/x-sharing/templates';
import { withUtm } from '@/lib/social';
import type { CampaignKind, CampaignPostType } from '@/features/x-sharing/templates';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
const kinds=new Set<CampaignKind>(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON','DIRECT_AD_CAMPAIGN']);
const postType=(kind:CampaignKind,remaining?:number):CampaignPostType=>kind==='SEAT_CAMPAIGN'?'SEAT_CAMPAIGN':kind==='COUPON'?'COUPON':kind==='DIRECT_AD_CAMPAIGN'?'DIRECT_AD':remaining===1?'LAST_SEAT':'SPONSORED_MEAL';
const labels={X_VISIT:'X経由アクセス',MEAL_CREATED:'Meal作成',JOIN_REQUEST:'参加希望',MATCHED:'Match成立',COUPON_REDEEMED:'Coupon利用'} as const;
export const metadata={title:'Xで飯を呼ぶ'};
export default async function BusinessSocial({searchParams}:{searchParams:Promise<{kind?:string;id?:string}>}){
  const membership = await currentBusinessMembership();
  if(!membership)redirect('/business/onboarding');
  const query=await searchParams;
  const kind=kinds.has(query.kind as CampaignKind)?query.kind as CampaignKind:null;
  const where = { businessAccountId: membership.businessAccountId };
  const [socialAccounts, analytics, recentPosts, campaign] = await Promise.all([
    prisma.businessSocialAccount.findMany({ where, orderBy: { createdAt: 'desc' }, select: { id: true, username: true, status: true } }),
    prisma.referralEvent.groupBy({ by: ['eventType'], where, _count: { _all: true } }),
    prisma.socialPost.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, postType: true, status: true, shareMode: true, createdAt: true } }),
    kind&&query.id?getCampaignShareData(kind,query.id):null,
  ]);
  const allowed=Boolean(campaign?.businessAccountId===membership.businessAccountId&&await campaignIsShareable(campaign));
  const counts=Object.fromEntries(analytics.map(row=>[row.eventType,row._count._all]));
  return <section className="section narrow"><Link className="text-link" href="/business/dashboard">← Business Dashboard</Link><h1>Xで飯を呼ぶ</h1>
    <div className="panel"><h2>X連携状態</h2>{socialAccounts.length?socialAccounts.map(account=><p key={account.id}>@{account.username} · {account.status}</p>):<p className="muted">未連携です。手動シェアはX連携なしで利用できます。</p>}<h3>将来の自動投稿</h3><p className="muted">すべて初期OFFです。X API連携後も、店舗が明示的に有効化するまで投稿されません。</p><div className="tag-pills">{['スポンサー飯','空席','キャンセル枠','残り1席'].map(label=><span className="tag-pill" key={label}>{label}：OFF</span>)}</div></div>
    {campaign&&!allowed&&<p className="error">終了済み、非公開、または別店舗のキャンペーンは共有できません。</p>}
    {campaign&&allowed&&<BusinessSharePreview campaign={campaign} origin={appUrl()} postType={postType(campaign.kind,campaign.remaining)} eventId={randomUUID()}/>}
    {campaign&&allowed&&<BusinessQrPrintPanel url={withUtm(new URL(campaignPath(campaign),appUrl()).toString(),'print','offline','qr')} title={campaign.title} restaurantName={campaign.restaurantName} benefit={campaign.benefit}/>}
    {!campaign&&<div className="notice">Business Dashboardから宣伝するキャンペーンを選んでください。</div>}
    <div className="panel"><h2>X経由の成果</h2><div className="analytics-grid">{Object.entries(labels).map(([key,label])=><div key={key}><strong>{counts[key]??0}</strong><span>{label}</span></div>)}</div></div>
    <div className="panel"><h2>最近の投稿</h2>{recentPosts.length?recentPosts.map(post=><div className="list-card" key={post.id}><strong>{post.postType}</strong><span>{post.status==='PENDING'&&post.shareMode==='MANUAL'?'投稿画面を開いた':post.status} · {new Date(post.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}</span></div>):<p className="muted">投稿履歴はまだありません。</p>}</div>
  </section>;
}
