export type CampaignKind='SPONSORED_MEAL'|'SPONSOR_CAMPAIGN'|'SEAT_CAMPAIGN'|'COUPON'|'DIRECT_AD_CAMPAIGN';
export type CampaignPostType='SPONSORED_MEAL'|'SEAT_CAMPAIGN'|'CANCELLATION_SLOT'|'LAST_SEAT'|'COUPON'|'DIRECT_AD';
export type CampaignShareData={
  id:string;kind:CampaignKind;businessAccountId:string;businessName:string;title:string;restaurantName:string;area:string;
  startsAt?:Date;endsAt?:Date;participantLimit?:number;remaining?:number;benefit?:string;description?:string;status:'DRAFT'|'ACTIVE'|'ENDED'|'CANCELLED';
};
const compact=(value:string,max:number)=>value.length<=max?value:`${value.slice(0,max-1)}…`;
const dateTime=(date?:Date)=>date?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(date):'';
const time=(date?:Date)=>date?new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(date):'';
const cleanComment=(value?:string)=>value?.trim().replace(/\s+/g,' ').slice(0,60)??'';
const finish=(lines:string[],url:string,comment?:string)=>{
  const extra=cleanComment(comment);const required=[...lines,extra,'#誰か飯いこ',url].filter(Boolean);
  let text=required.join('\n');
  if(text.length>270){text=[...lines.slice(0,-1),extra,'#誰か飯いこ',url].filter(Boolean).join('\n');}
  return text.length<=280?text:`${text.slice(0,Math.max(0,277-url.length))}…\n${url}`;
};
export function campaignPath(data:Pick<CampaignShareData,'kind'|'id'>){return `/campaigns/${data.kind.toLowerCase().replaceAll('_','-')}/${encodeURIComponent(data.id)}`;}
export function isCampaignShareable(data:Pick<CampaignShareData,'kind'|'status'|'endsAt'>,now=new Date()){
  if(data.status!=='ACTIVE')return false;
  return !((data.kind==='SEAT_CAMPAIGN'||data.kind==='COUPON'||data.kind==='DIRECT_AD_CAMPAIGN')&&data.endsAt&&data.endsAt<=now);
}
export function buildTrackedCampaignUrl(origin:string,data:Pick<CampaignShareData,'kind'|'id'>,postType:CampaignPostType,ref?:string){
  const url=new URL(campaignPath(data),origin);url.searchParams.set('utm_source','x');url.searchParams.set('utm_medium','social');url.searchParams.set('utm_campaign',postType.toLowerCase());if(ref)url.searchParams.set('ref',ref);return url.toString();
}
export function generateSponsoredMealPost(data:CampaignShareData,url:string,comment?:string){
  if(data.remaining===1)return finish(['PR','あと1人！',dateTime(data.startsAt),`${compact(data.area,20)}の${compact(data.restaurantName,30)}`,'あと1人で飯決定。',compact(data.benefit??'',50)],url,comment);
  return finish(['PR',`今日は${compact(data.businessName,30)}が飯代をスポンサーします！`,compact(data.restaurantName,35),`${compact(data.area,20)} / ${dateTime(data.startsAt)}`,data.participantLimit?`参加者${data.participantLimit}人まで`:'',compact(data.benefit??'',50),typeof data.remaining==='number'?`あと${data.remaining}人`:''],url,comment);
}
export function generateSeatCampaignPost(data:CampaignShareData,url:string,comment?:string){
  return finish(['PR','今、席空いてます。',compact(data.restaurantName,35),compact(data.area,20),typeof data.remaining==='number'?`あと${data.remaining}席`:'',data.endsAt?`${time(data.endsAt)}まで`:'',compact(data.benefit??'',55),'誰か飯いこ。','#空席飯'],url,comment);
}
export function generateCouponPost(data:CampaignShareData,url:string,comment?:string){
  return finish(['PR','今日この店で飯どう？',compact(data.restaurantName,35),compact(data.area,20),'「俺は誰かと飯が食いたい！」経由で',compact(data.benefit??'',60),data.endsAt?`有効期限 ${dateTime(data.endsAt)}`:''],url,comment);
}
export function generateDirectAdPost(data:CampaignShareData,url:string,comment?:string){
  return finish(['PR / 提供',compact(data.title,45),compact(data.businessName,35),compact(data.description??'',70)],url,comment);
}
export function generateCancellationSlotPost(data:CampaignShareData,url:string,comment?:string){
  return finish(['1席空きました。',dateTime(data.startsAt),compact(data.area,20),compact(data.restaurantName,35),'直前参加OK。',compact(data.benefit??'',50)],url,comment);
}
export function generateCampaignPost(data:CampaignShareData,url:string,postType:CampaignPostType,comment?:string){
  if(postType==='CANCELLATION_SLOT')return generateCancellationSlotPost(data,url,comment);
  if(postType==='SEAT_CAMPAIGN')return generateSeatCampaignPost(data,url,comment);
  if(postType==='COUPON')return generateCouponPost(data,url,comment);
  if(postType==='DIRECT_AD')return generateDirectAdPost(data,url,comment);
  return generateSponsoredMealPost(data,url,comment);
}
