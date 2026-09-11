import 'server-only';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
import { ensure } from '@/server/action';
import { isCampaignShareable, type CampaignKind, type CampaignShareData } from '@/features/x-sharing/templates';
import { cookies } from 'next/headers';
import { getBusinessPricingCatalog, getPublicBusinessPlan, capabilitiesForPlan } from '@/server/billing';

export async function businessPostingMembership(businessAccountId?:string){
  const userId=await currentUserId();ensure(userId,'Twitter/Xでログインしてください。');
  const membership=await prisma.businessMember.findFirst({where:{userId,...(businessAccountId?{businessAccountId}:{})},include:{businessAccount:true},orderBy:{createdAt:'asc'}});
  ensure(membership,'店舗アカウントに参加していません。');
  ensure(membership.role==='OWNER'||membership.role==='ADMIN'||membership.canPostToSocial,'Xで宣伝する権限がありません。');
  return membership;
}
export async function currentBusinessMembership(){
  const userId=await currentUserId();if(!userId)return null;
  return prisma.businessMember.findFirst({where:{userId,OR:[{role:{in:['OWNER','ADMIN']}},{canPostToSocial:true}]},include:{businessAccount:true},orderBy:{createdAt:'asc'}});
}
export async function getBusinessTeam(businessAccountId:string){
  return prisma.businessMember.findMany({where:{businessAccountId},orderBy:{createdAt:'asc'},include:{user:{select:{displayName:true,twitterUsername:true,image:true}}}});
}
export async function getBusinessDashboard(){
  const membership=await businessPostingMembership();const id=membership.businessAccountId;const now=new Date();
  const [sponsoredMeals,sponsorCampaigns,seatCampaigns,coupons,directAds,socialAccounts,settings,recentPosts,analytics]=await Promise.all([
    prisma.sponsoredMeal.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.sponsorCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.seatCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.coupon.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20,include:{_count:{select:{redemptions:true}}}}),
    prisma.directAdCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.businessSocialAccount.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'}}),
    prisma.businessSocialPostSetting.findFirst({where:{businessAccountId:id}}),
    prisma.socialPost.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.referralEvent.groupBy({by:['eventType'],where:{businessAccountId:id},_count:{_all:true}}),
  ]);
  return {membership,now,sponsoredMeals,sponsorCampaigns,seatCampaigns,coupons,directAds,socialAccounts,settings,recentPosts,analytics};
}

export async function getBusinessMonthlyStats(businessAccountId:string){
  const since=new Date();since.setDate(1);since.setHours(0,0,0,0);
  const rows=await prisma.referralEvent.groupBy({by:['eventType'],where:{businessAccountId,createdAt:{gte:since}},_count:{_all:true}});
  const counts=Object.fromEntries(rows.map(row=>[row.eventType,row._count._all]));
  return {mealsMatched:counts.MATCHED??0,mealsCompleted:counts.COMPLETED??0,referrals:counts.JOIN_REQUEST??0,couponRedemptions:counts.COUPON_REDEEMED??0,xVisits:counts.X_VISIT??0};
}

// Business Activation Funnel(business_signup→...→first_paid_purchase)。
// 新規イベント種別は追加せず、既存のBusinessAccount.status/ReferralEvent/SponsorOrderから
// 「その店舗がこれまでに一度でも到達したか」を全期間で判定する(月次集計のgetBusinessMonthlyStatsとは別)。
export async function getBusinessActivationFunnel(businessAccountId:string){
  const [account,sponsoredMealCount,seatCampaignCount,eventCounts,paidOrderCount]=await Promise.all([
    prisma.businessAccount.findUnique({where:{id:businessAccountId},select:{status:true}}),
    prisma.sponsoredMeal.count({where:{businessAccountId}}),
    prisma.seatCampaign.count({where:{businessAccountId}}),
    prisma.referralEvent.groupBy({by:['eventType'],where:{businessAccountId},_count:{_all:true}}),
    prisma.sponsorOrder.count({where:{businessAccountId,status:'PAID'}}),
  ]);
  const counts=Object.fromEntries(eventCounts.map(row=>[row.eventType,row._count._all]));
  return {
    signedUp:true,
    approved:account?.status==='ACTIVE',
    firstAvailabilityPosted:sponsoredMealCount>0||seatCampaignCount>0,
    firstView:(counts.X_VISIT??0)>0,
    firstUserAction:(counts.JOIN_REQUEST??0)>0,
    firstMatch:(counts.MATCHED??0)>0,
    firstCompleted:(counts.COMPLETED??0)>0,
    firstPaidPurchase:paidOrderCount>0,
  };
}

// MatchedとCompletedを混同しないための集計。参加人数は「Match成立時点の募集人数」の合計であり、
// 実測の出席者数ではないため常に「推定」として扱う。
export async function getBusinessCompletionStats(businessAccountId:string){
  const matchedEvents=await prisma.referralEvent.findMany({where:{businessAccountId,eventType:'MATCHED'},select:{conversionEntityId:true}});
  const matchIds=matchedEvents.map(e=>e.conversionEntityId).filter((id):id is string=>Boolean(id));
  if(matchIds.length===0)return {estimatedParticipants:0};
  const matches=await prisma.match.findMany({where:{id:{in:matchIds}},select:{meal:{select:{maxParticipants:true}}}});
  return {estimatedParticipants:matches.reduce((sum,m)=>sum+m.meal.maxParticipants,0)};
}

// 実際に支払った金額(SponsorOrder.amount、Stripeが確定した実額)と、現在のカタログ通常価格の差から
// 「今月いくら得したか」を計算する。架空値ではなく実購入履歴のみを使う。
export async function getBusinessSavingsThisMonth(businessAccountId:string){
  const since=new Date();since.setDate(1);since.setHours(0,0,0,0);
  const [orders,catalog]=await Promise.all([
    prisma.sponsorOrder.findMany({where:{businessAccountId,status:'PAID',paidAt:{gte:since},orderType:{in:['SPONSORED_MEAL','SEAT_CAMPAIGN']}},select:{orderType:true,amount:true}}),
    getBusinessPricingCatalog(),
  ]);
  if(!catalog||orders.length===0)return {sponsoredMealCount:0,seatCampaignCount:0,savingsYen:0};
  let savings=0,sponsoredMealCount=0,seatCampaignCount=0;
  for(const order of orders){
    const base=order.orderType==='SPONSORED_MEAL'?catalog.sponsoredMeal:order.orderType==='SEAT_CAMPAIGN'?catalog.seatCampaign:null;
    if(base===null||order.amount===null)continue;
    savings+=Math.max(0,base-order.amount);
    if(order.orderType==='SPONSORED_MEAL')sponsoredMealCount++;else seatCampaignCount++;
  }
  return {sponsoredMealCount,seatCampaignCount,savingsYen:savings};
}

export async function getCampaignShareData(kind:CampaignKind,id:string):Promise<CampaignShareData|null>{
  if(kind==='SPONSORED_MEAL'){const item=await prisma.sponsoredMeal.findUnique({where:{id},include:{businessAccount:true,meal:{select:{maxParticipants:true,_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}}}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,startsAt:item.startsAt,participantLimit:item.participantLimit,remaining:item.meal?Math.max(0,item.meal.maxParticipants-(item.meal._count.joinRequests+1)):item.remainingSlots,benefit:item.benefit,description:item.description,status:item.status};}
  if(kind==='SPONSOR_CAMPAIGN'){const item=await prisma.sponsorCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,startsAt:item.startsAt,participantLimit:item.participantLimit,remaining:item.remainingSlots,benefit:item.benefit,status:item.status};}
  if(kind==='SEAT_CAMPAIGN'){const item=await prisma.seatCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:'今、席空いてます',restaurantName:item.restaurantName,area:item.area,endsAt:item.endsAt,remaining:item.remainingSeats,benefit:item.benefit,description:item.description,status:item.status};}
  if(kind==='COUPON'){const item=await prisma.coupon.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,endsAt:item.expiresAt,benefit:item.benefit,status:item.status};}
  const item=await prisma.directAdCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.advertiserName,title:item.title,restaurantName:item.businessAccount.name,area:item.businessAccount.area??'',startsAt:item.startsAt,endsAt:item.endsAt,description:item.description,status:item.status};
}

export async function getReferralAttribution(){
  const eventId=(await cookies()).get('ore_business_referral')?.value;if(!eventId)return null;
  return prisma.referralEvent.findFirst({where:{id:eventId,eventType:'X_VISIT',createdAt:{gt:new Date(Date.now()-30*24*60*60*1000)}}});
}

// DIRECT_AD_CAMPAIGNは決済フローを持たず、作成時にcanCreateDirectAd(PRO等)を確認して即ACTIVEになる
// (サブスクの「特典」であり単発購入ではない)。作成後にサブスクが失効しても既存レコードのstatusは
// 自動では変わらないため、公開ページで表示するたびに「今も」その特典を持っているかを再確認する
// (支払い権限を失ったBusinessの有料露出が一般ユーザーに見え続けるのを防ぐ)。
export async function campaignIsShareable(data:CampaignShareData,now=new Date()){
  if(!isCampaignShareable(data,now))return false;
  if(data.kind==='DIRECT_AD_CAMPAIGN'){
    const plan=await getPublicBusinessPlan(data.businessAccountId);
    if(!capabilitiesForPlan(plan).canCreateDirectAd)return false;
  }
  return true;
}
