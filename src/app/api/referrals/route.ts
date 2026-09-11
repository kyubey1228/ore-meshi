import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { campaignIsShareable, getCampaignShareData } from '@/server/business';
const schema=z.object({kind:z.enum(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON','DIRECT_AD_CAMPAIGN']),id:z.string().min(1).max(100),utmSource:z.literal('x'),utmMedium:z.string().max(40).optional(),utmCampaign:z.string().max(80).optional(),ref:z.uuid().optional()});
export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false},{status:400});
  const data=parsed.data;const campaign=await getCampaignShareData(data.kind,data.id);if(!campaign||!await campaignIsShareable(campaign))return NextResponse.json({ok:false},{status:404});
  const socialPost=data.ref?await prisma.socialPost.findUnique({where:{idempotencyKey:`manual:${campaign.businessAccountId}:${data.ref}`},select:{id:true}}):null;
  const event=await prisma.referralEvent.create({data:{businessAccountId:campaign.businessAccountId,socialPostId:socialPost?.id,entityType:data.kind,entityId:data.id,eventType:'X_VISIT',utmSource:data.utmSource,utmMedium:data.utmMedium,utmCampaign:data.utmCampaign,anonymousId:crypto.randomUUID()}});
  const response=NextResponse.json({ok:true});response.cookies.set('ore_business_referral',event.id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:60*60*24*30,path:'/'});return response;
}
