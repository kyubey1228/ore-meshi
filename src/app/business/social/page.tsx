import Link from 'next/link';
import { currentBusinessMembership, getBusinessDashboard, getCampaignShareData, campaignIsShareable } from '@/server/business';
import { appUrl } from '@/lib/social';
import { BusinessSharePreview } from '@/components/business-share-preview';
import type { CampaignKind, CampaignPostType } from '@/features/x-sharing/templates';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
const kinds=new Set<CampaignKind>(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON','DIRECT_AD_CAMPAIGN']);
const postType=(kind:CampaignKind,remaining?:number):CampaignPostType=>kind==='SEAT_CAMPAIGN'?'SEAT_CAMPAIGN':kind==='COUPON'?'COUPON':kind==='DIRECT_AD_CAMPAIGN'?'DIRECT_AD':remaining===1?'LAST_SEAT':'SPONSORED_MEAL';
const labels={X_VISIT:'X経由アクセス',MEAL_CREATED:'Meal作成',JOIN_REQUEST:'参加希望',MATCHED:'Match成立',COUPON_REDEEMED:'Coupon利用'} as const;
export const metadata={title:'Xで飯を呼ぶ'};
export default async function BusinessSocial({searchParams}:{searchParams:Promise<{kind?:string;id?:string}>}){
  if(!await currentBusinessMembership())redirect('/business/onboarding');
  const query=await searchParams;const data=await getBusinessDashboard();
  const kind=kinds.has(query.kind as CampaignKind)?query.kind as CampaignKind:null;
  const campaign=kind&&query.id?await getCampaignShareData(kind,query.id):null;
  const allowed=campaign?.businessAccountId===data.membership.businessAccountId&&campaignIsShareable(campaign);
  const counts=Object.fromEntries(data.analytics.map(row=>[row.eventType,row._count._all]));
  return <section className="section narrow"><Link className="text-link" href="/business/dashboard">← Business Dashboard</Link><h1>Xで飯を呼ぶ</h1>
    <div className="panel"><h2>X連携状態</h2>{data.socialAccounts.length?data.socialAccounts.map(account=><p key={account.id}>@{account.username} · {account.status}</p>):<p className="muted">未連携です。手動シェアはX連携なしで利用できます。</p>}<h3>将来の自動投稿</h3><p className="muted">すべて初期OFFです。X API連携後も、店舗が明示的に有効化するまで投稿されません。</p><div className="tag-pills">{['スポンサー飯','空席','キャンセル枠','残り1席'].map(label=><span className="tag-pill" key={label}>{label}：OFF</span>)}</div></div>
    {campaign&&!allowed&&<p className="error">終了済み、非公開、または別店舗のキャンペーンは共有できません。</p>}
    {campaign&&allowed&&<BusinessSharePreview campaign={campaign} origin={appUrl()} postType={postType(campaign.kind,campaign.remaining)} eventId={randomUUID()}/>}
    {!campaign&&<div className="notice">Business Dashboardから宣伝するキャンペーンを選んでください。</div>}
    <div className="panel"><h2>X経由の成果</h2><div className="analytics-grid">{Object.entries(labels).map(([key,label])=><div key={key}><strong>{counts[key]??0}</strong><span>{label}</span></div>)}</div></div>
    <div className="panel"><h2>最近の投稿</h2>{data.recentPosts.length?data.recentPosts.map(post=><div className="list-card" key={post.id}><strong>{post.postType}</strong><span>{post.status==='PENDING'&&post.shareMode==='MANUAL'?'投稿画面を開いた':post.status} · {new Date(post.createdAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}</span></div>):<p className="muted">投稿履歴はまだありません。</p>}</div>
  </section>;
}
