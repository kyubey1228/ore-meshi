import 'server-only';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
import { ensure } from '@/server/action';
import { isCampaignShareable, type CampaignKind, type CampaignShareData } from '@/features/x-sharing/templates';
import { cookies } from 'next/headers';

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
export async function getBusinessDashboard(){
  const membership=await businessPostingMembership();const id=membership.businessAccountId;const now=new Date();
  const [sponsoredMeals,sponsorCampaigns,seatCampaigns,coupons,directAds,socialAccounts,settings,recentPosts,analytics]=await Promise.all([
    prisma.sponsoredMeal.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.sponsorCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.seatCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.coupon.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.directAdCampaign.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.businessSocialAccount.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'}}),
    prisma.businessSocialPostSetting.findFirst({where:{businessAccountId:id}}),
    prisma.socialPost.findMany({where:{businessAccountId:id},orderBy:{createdAt:'desc'},take:20}),
    prisma.referralEvent.groupBy({by:['eventType'],where:{businessAccountId:id},_count:{_all:true}}),
  ]);
  return {membership,now,sponsoredMeals,sponsorCampaigns,seatCampaigns,coupons,directAds,socialAccounts,settings,recentPosts,analytics};
}

export async function getCampaignShareData(kind:CampaignKind,id:string):Promise<CampaignShareData|null>{
  if(kind==='SPONSORED_MEAL'){const item=await prisma.sponsoredMeal.findUnique({where:{id},include:{businessAccount:true,meal:{select:{maxParticipants:true,_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}}}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,startsAt:item.startsAt,participantLimit:item.participantLimit,remaining:item.meal?Math.max(0,item.meal.maxParticipants-(item.meal._count.joinRequests+1)):item.remainingSlots,benefit:item.benefit,status:item.status};}
  if(kind==='SPONSOR_CAMPAIGN'){const item=await prisma.sponsorCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,startsAt:item.startsAt,participantLimit:item.participantLimit,remaining:item.remainingSlots,benefit:item.benefit,status:item.status};}
  if(kind==='SEAT_CAMPAIGN'){const item=await prisma.seatCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:'今、席空いてます',restaurantName:item.restaurantName,area:item.area,endsAt:item.endsAt,remaining:item.remainingSeats,benefit:item.benefit,status:item.status};}
  if(kind==='COUPON'){const item=await prisma.coupon.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.businessAccount.name,title:item.title,restaurantName:item.restaurantName,area:item.area,endsAt:item.expiresAt,benefit:item.benefit,status:item.status};}
  const item=await prisma.directAdCampaign.findUnique({where:{id},include:{businessAccount:true}});return item&&{id:item.id,kind,businessAccountId:item.businessAccountId,businessName:item.advertiserName,title:item.title,restaurantName:item.businessAccount.name,area:item.businessAccount.area??'',startsAt:item.startsAt,endsAt:item.endsAt,description:item.description,status:item.status};
}

export async function getReferralAttribution(){
  const eventId=(await cookies()).get('ore_business_referral')?.value;if(!eventId)return null;
  return prisma.referralEvent.findFirst({where:{id:eventId,eventType:'X_VISIT',createdAt:{gt:new Date(Date.now()-30*24*60*60*1000)}}});
}

export function campaignIsShareable(data:CampaignShareData,now=new Date()){
  return isCampaignShareable(data,now);
}
