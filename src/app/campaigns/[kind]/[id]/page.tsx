import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReferralTracker } from '@/components/referral-tracker';
import { campaignIsShareable, getCampaignShareData } from '@/server/business';
import { appUrl, truncate } from '@/lib/social';
import type { CampaignKind } from '@/features/x-sharing/templates';

const kinds:Record<string,CampaignKind>={'sponsored-meal':'SPONSORED_MEAL','sponsor-campaign':'SPONSOR_CAMPAIGN','seat-campaign':'SEAT_CAMPAIGN','coupon':'COUPON','direct-ad-campaign':'DIRECT_AD_CAMPAIGN'};
type Props={params:Promise<{kind:string;id:string}>;searchParams:Promise<{utm_source?:string;utm_medium?:string;utm_campaign?:string;ref?:string}>};

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {kind:slug,id}=await params;const kind=kinds[slug];const data=kind?await getCampaignShareData(kind,id):null;
  if(!data)return {title:'キャンペーンが見つかりません'};
  const description=truncate(`PR・提供 ${data.restaurantName} ${data.benefit??data.description??''}`,120);
  const image=`${appUrl()}/campaigns/${slug}/${encodeURIComponent(id)}/opengraph-image`;
  return {title:data.title,description,openGraph:{title:data.title,description,images:[{url:image,width:1200,height:630}]},twitter:{card:'summary_large_image',title:data.title,description,images:[image]}};
}

export default async function CampaignPage({params,searchParams}:Props){
  const [{kind:slug,id},query]=await Promise.all([params,searchParams]);
  const kind=kinds[slug];const data=kind?await getCampaignShareData(kind,id):null;if(!data)notFound();
  const active=await campaignIsShareable(data);
  return <section className="section narrow">
    <ReferralTracker kind={data.kind} id={data.id} utmSource={query.utm_source} utmMedium={query.utm_medium} utmCampaign={query.utm_campaign} referralKey={query.ref}/>
    <div className="panel campaign-public"><span className="tag">PR · 提供</span><h1>{data.title}</h1><h2>{data.restaurantName}</h2><p>{data.area}</p>{data.benefit&&<p className="campaign-benefit">{data.benefit}</p>}{typeof data.remaining==='number'&&<p className="last-slot-label">あと{data.remaining}{data.kind==='SEAT_CAMPAIGN'?'席':'人'}</p>}<p className={active?'success':'notice'}>{active?'このキャンペーンは実施中です。':'このキャンペーンは終了しました。'}</p></div>
  </section>;
}
