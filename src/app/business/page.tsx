import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentBusinessMembership, getBusinessDashboard } from '@/server/business';
const items=(data:Awaited<ReturnType<typeof getBusinessDashboard>>)=>[
  ...data.sponsoredMeals.map(item=>({kind:'SPONSORED_MEAL',id:item.id,title:item.title,status:item.status})),
  ...data.sponsorCampaigns.map(item=>({kind:'SPONSOR_CAMPAIGN',id:item.id,title:item.title,status:item.status})),
  ...data.seatCampaigns.map(item=>({kind:'SEAT_CAMPAIGN',id:item.id,title:`今、席空いてます：${item.restaurantName}`,status:item.status})),
  ...data.coupons.map(item=>({kind:'COUPON',id:item.id,title:item.title,status:item.status})),
  ...data.directAds.map(item=>({kind:'DIRECT_AD_CAMPAIGN',id:item.id,title:item.title,status:item.status})),
];
export const metadata={title:'Business Dashboard'};
export default async function BusinessDashboard(){
  if(!await currentBusinessMembership())redirect('/business/onboarding');
  const data=await getBusinessDashboard();const campaigns=items(data);
  return <section className="section"><div className="section-heading"><div><span className="eyebrow orange">BUSINESS TABLE</span><h1>{data.membership.businessAccount.name}</h1><p className="muted">Xで飯を呼ぶ。</p></div><Link className="btn" href="/business/social">Xの投稿と成果を見る</Link></div><div className="dashboard-grid">{campaigns.map(item=><article className="panel" key={`${item.kind}:${item.id}`}><span className="tag">PR · {item.status}</span><h2>{item.title}</h2><Link className="btn" href={`/business/social?kind=${item.kind}&id=${item.id}`}>Xで宣伝する</Link></article>)}{!campaigns.length&&<div className="empty"><span className="empty-icon">🏪</span><p>共有できるキャンペーンはまだありません。</p></div>}</div></section>;
}
