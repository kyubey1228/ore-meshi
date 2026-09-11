'use server';
import { z } from 'zod';
import { perform, ensure } from '@/server/action';
import { prisma } from '@/lib/prisma';
import { businessPostingMembership, campaignIsShareable, getCampaignShareData } from '@/server/business';

const kindSchema=z.enum(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON','DIRECT_AD_CAMPAIGN']);
const postTypeSchema=z.enum(['SPONSORED_MEAL','SEAT_CAMPAIGN','CANCELLATION_SLOT','LAST_SEAT','COUPON','DIRECT_AD']);
export async function recordManualSocialShare(input:unknown){return perform(async()=>{
  const data=z.object({businessAccountId:z.string().min(1).max(100),entityType:kindSchema,entityId:z.string().min(1).max(100),postType:postTypeSchema,eventId:z.uuid()}).parse(input);
  await businessPostingMembership(data.businessAccountId);
  const campaign=await getCampaignShareData(data.entityType,data.entityId);
  ensure(campaign?.businessAccountId===data.businessAccountId,'投稿対象が見つかりません。');
  ensure(await campaignIsShareable(campaign),'終了または非公開のキャンペーンは共有できません。');
  await prisma.socialPost.upsert({where:{idempotencyKey:`manual:${data.businessAccountId}:${data.eventId}`},create:{businessAccountId:data.businessAccountId,entityType:data.entityType,entityId:data.entityId,postType:data.postType,status:'PENDING',shareMode:'MANUAL',idempotencyKey:`manual:${data.businessAccountId}:${data.eventId}`},update:{}});
});}
