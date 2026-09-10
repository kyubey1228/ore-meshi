'use server';import{z}from'zod';import{prisma}from '@/lib/prisma';import{perform,ensure,transaction}from '@/server/action';import{requireAdmin}from '@/server/admin';import{randomUUID}from'crypto';
export async function updateLeadStatus(input:unknown){return perform(async()=>{await requireAdmin();const data=z.object({id:z.string().min(1),status:z.enum(['NEW','CONTACTED','QUALIFIED','WON','LOST','ARCHIVED']),returnTo:z.enum(['list','detail']).optional().default('detail')}).parse(input);await prisma.businessLead.update({where:{id:data.id},data:{status:data.status}});return data.returnTo==='list'?'/admin/leads':`/admin/leads/${data.id}`;});}
export async function addLeadNote(input:unknown){return perform(async userId=>{await requireAdmin();const data=z.object({leadId:z.string().min(1),note:z.string().trim().min(1).max(2000)}).parse(input);await prisma.businessLeadNote.create({data:{leadId:data.leadId,adminUserId:userId,note:data.note}});return `/admin/leads/${data.leadId}`;});}
export async function convertLeadToBusiness(input:unknown){return perform(async userId=>{await requireAdmin();const id=z.string().min(1).parse(input);return transaction(async tx=>{const lead=await tx.businessLead.findUnique({where:{id}});ensure(lead,'Leadが見つかりません。');if(lead.businessAccountId){await tx.businessLead.update({where:{id},data:{status:'WON'}});return `/admin/leads/${id}`;}const account=await tx.businessAccount.create({data:{name:lead.companyName,legalName:lead.companyName,slug:`admin-${randomUUID().slice(0,12)}`,businessType:lead.businessType,contactName:lead.contactName,contactEmail:lead.email,websiteUrl:lead.websiteUrl,area:lead.area,consultation:lead.message,status:'PENDING',members:{create:{userId,role:'OWNER',canPostToSocial:true}},socialPostSettings:{create:{}}}});await tx.businessLead.update({where:{id},data:{businessAccountId:account.id,status:'WON'}});return `/admin/leads/${id}`;});});}
// statusのみ/planOverrideのみの部分更新にも対応(片方だけ渡された場合はもう片方は変更しない)。
export async function adminUpdateBusiness(input:unknown){return perform(async()=>{
  await requireAdmin();
  const data=z.object({id:z.string().min(1),status:z.enum(['PENDING','ACTIVE','SUSPENDED']).optional(),planOverride:z.enum(['FREE','STANDARD','PRO']).nullable().optional()}).parse(input);
  await prisma.businessAccount.update({where:{id:data.id},data:{...(data.status?{status:data.status}:{}),...(data.planOverride!==undefined?{planOverride:data.planOverride}:{})}});
  return '/admin/business/accounts';
});}
const draftSchema=z.object({businessAccountId:z.string().min(1),kind:z.enum(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON']),title:z.string().trim().min(1).max(80),restaurantName:z.string().trim().min(1).max(80),area:z.string().trim().max(80),genre:z.string().trim().max(60).optional().default(''),benefit:z.string().trim().max(120).default(''),startsAt:z.iso.datetime({offset:true}),endsAt:z.iso.datetime({offset:true}),capacity:z.number().int().min(1).max(100)});
// SPONSORED_MEAL/SEAT_CAMPAIGNは既存のStripe Checkout(businessPostingMembershipを持つ本人のみ実行可)で
// 店舗自身が支払って公開する前提のためDRAFTで作成する。一方SPONSOR_CAMPAIGN(法人スポンサー枠、請求書ベース)と
// COUPONにはそもそもCheckout導線が存在しない(店舗自身が作る場合も即ACTIVE)ため、adminが作る場合もACTIVEにする。
export async function adminCreateCampaignDraft(input:unknown){return perform(async()=>{await requireAdmin();const data=draftSchema.parse(input),startsAt=new Date(data.startsAt),endsAt=new Date(data.endsAt);ensure(endsAt>startsAt&&endsAt>new Date(),'掲載期間を確認してください。');
  if(data.kind==='SPONSORED_MEAL')await prisma.sponsoredMeal.create({data:{businessAccountId:data.businessAccountId,title:data.title,sponsorName:data.title,restaurantName:data.restaurantName,area:data.area,genre:data.genre||null,benefit:data.benefit,startsAt,participantLimit:data.capacity,remainingSlots:data.capacity,status:'DRAFT'}});
  else if(data.kind==='SPONSOR_CAMPAIGN')await prisma.sponsorCampaign.create({data:{businessAccountId:data.businessAccountId,title:data.title,sponsorName:data.title,restaurantName:data.restaurantName,area:data.area,benefit:data.benefit,startsAt,participantLimit:data.capacity,remainingSlots:data.capacity,status:'ACTIVE'}});
  else if(data.kind==='SEAT_CAMPAIGN')await prisma.seatCampaign.create({data:{businessAccountId:data.businessAccountId,restaurantName:data.restaurantName,area:data.area,benefit:data.benefit,endsAt,remainingSeats:data.capacity,status:'DRAFT'}});
  else await prisma.coupon.create({data:{businessAccountId:data.businessAccountId,title:data.title,restaurantName:data.restaurantName,area:data.area,benefit:data.benefit,expiresAt:endsAt,status:'ACTIVE'}});
  return '/admin/business/campaigns';
});}
const statusUpdateSchema=z.object({kind:z.enum(['SPONSORED_MEAL','SPONSOR_CAMPAIGN','SEAT_CAMPAIGN','COUPON']),id:z.string().min(1),status:z.enum(['DRAFT','ACTIVE','ENDED','CANCELLED'])});
export async function adminUpdateCampaignStatus(input:unknown){return perform(async()=>{await requireAdmin();const data=statusUpdateSchema.parse(input);
  if(data.kind==='SPONSORED_MEAL')await prisma.sponsoredMeal.update({where:{id:data.id},data:{status:data.status}});
  else if(data.kind==='SPONSOR_CAMPAIGN')await prisma.sponsorCampaign.update({where:{id:data.id},data:{status:data.status}});
  else if(data.kind==='SEAT_CAMPAIGN')await prisma.seatCampaign.update({where:{id:data.id},data:{status:data.status}});
  else await prisma.coupon.update({where:{id:data.id},data:{status:data.status}});
  return '/admin/business/campaigns';
});}
