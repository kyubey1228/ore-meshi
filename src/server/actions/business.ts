'use server';
import { z } from 'zod';
import { ensure, perform, transaction } from '@/server/action';
import { businessPostingMembership } from '@/server/business';
import { prisma } from '@/lib/prisma';
export async function createBusinessAccount(input:unknown){return perform(async userId=>{
  const data=z.object({name:z.string().trim().min(1).max(80),slug:z.string().trim().min(3).max(50).regex(/^[a-z0-9-]+$/),area:z.string().trim().max(80).optional().default('')}).parse(input);
  return transaction(async tx=>{await tx.businessAccount.create({data:{...data,members:{create:{userId,role:'OWNER',canPostToSocial:true}},socialPostSettings:{create:{}}}});return '/business';});
});}
const campaignSchema=z.object({businessAccountId:z.string().min(1).max(100),kind:z.enum(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON','DIRECT_AD_CAMPAIGN']),title:z.string().trim().min(1).max(80),restaurantName:z.string().trim().min(1).max(80),area:z.string().trim().max(80).default(''),benefit:z.string().trim().max(120).default(''),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),participantLimit:z.coerce.number().int().min(1).max(100),remaining:z.coerce.number().int().min(0).max(100)});
export async function createBusinessCampaign(input:unknown){return perform(async()=>{
  const data=campaignSchema.parse(input);await businessPostingMembership(data.businessAccountId);
  const startsAt=new Date(data.startsAt),endsAt=new Date(data.endsAt);
  ensure(endsAt>new Date(),'終了日時はこれからの日時にしてください。');
  ensure(endsAt>startsAt,'終了日時は開始日時より後にしてください。');
  ensure(data.remaining<=data.participantLimit,'残り人数は募集人数以下にしてください。');
  if(data.kind==='SPONSORED_MEAL')await prisma.sponsoredMeal.create({data:{businessAccountId:data.businessAccountId,title:data.title,sponsorName:data.title,restaurantName:data.restaurantName,area:data.area,startsAt,participantLimit:data.participantLimit,remainingSlots:data.remaining,benefit:data.benefit,status:'ACTIVE'}});
  else if(data.kind==='SPONSOR_CAMPAIGN')await prisma.sponsorCampaign.create({data:{businessAccountId:data.businessAccountId,title:data.title,sponsorName:data.title,restaurantName:data.restaurantName,area:data.area,startsAt,participantLimit:data.participantLimit,remainingSlots:data.remaining,benefit:data.benefit,status:'ACTIVE'}});
  else if(data.kind==='SEAT_CAMPAIGN')await prisma.seatCampaign.create({data:{businessAccountId:data.businessAccountId,restaurantName:data.restaurantName,area:data.area,remainingSeats:data.remaining,endsAt,benefit:data.benefit,status:'ACTIVE'}});
  else if(data.kind==='COUPON')await prisma.coupon.create({data:{businessAccountId:data.businessAccountId,title:data.title,restaurantName:data.restaurantName,area:data.area,benefit:data.benefit,expiresAt:endsAt,status:'ACTIVE'}});
  else await prisma.directAdCampaign.create({data:{businessAccountId:data.businessAccountId,title:data.title,advertiserName:data.restaurantName,description:data.benefit,startsAt,endsAt,status:'ACTIVE'}});
  return '/business';
});}
