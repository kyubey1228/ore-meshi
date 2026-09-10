'use server';
import { z } from 'zod';
import { mealSchema, idSchema } from '@/validators';
import { perform, transaction, ensure } from '@/server/action';
import { getReferralAttribution } from '@/server/business';
export async function createMeal(input: unknown) { return perform(async userId => {
  const {candidates,deadline,purposeIds,...meal}=mealSchema.parse(input);
  const attribution=await getReferralAttribution();
  return transaction(async tx=>{
    const activePurposes=await tx.mealPurpose.count({where:{id:{in:purposeIds},isActive:true}});
    ensure(activePurposes===new Set(purposeIds).size,'目的タグを選び直してください。');
    const result=await tx.meal.create({data:{...meal,deadline:deadline?new Date(deadline):null,hostId:userId,candidates:{create:candidates.map(c=>({...c,date:new Date(c.date)}))},purposes:{create:purposeIds.map(purposeId=>({purposeId}))}}});
    if(attribution)await tx.referralEvent.create({data:{businessAccountId:attribution.businessAccountId,socialPostId:attribution.socialPostId,entityType:attribution.entityType,entityId:attribution.entityId,eventType:'MEAL_CREATED',sourceEventId:attribution.id,conversionEntityId:result.id,utmSource:attribution.utmSource,utmMedium:attribution.utmMedium,utmCampaign:attribution.utmCampaign,anonymousId:attribution.anonymousId}});
    return `/meals/${result.id}`;
  });
}); }
export async function updateMeal(input: unknown) { return perform(async userId=>{
  const {id,meal:raw}=z.object({id:idSchema,meal:z.unknown()}).parse(input);
  const {candidates,deadline,purposeIds,...data}=mealSchema.parse(raw);
  return transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id},include:{_count:{select:{joinRequests:true,matches:true}}}});
    ensure(meal?.hostId===userId); ensure(meal.status==='OPEN','その飯はもう募集が終わっています。');
    ensure(meal._count.joinRequests===0 && meal._count.matches===0,'参加希望が届いた募集は編集できません。必要なら募集を締めてください。');
    const activePurposes=await tx.mealPurpose.count({where:{id:{in:purposeIds},isActive:true}});
    ensure(activePurposes===new Set(purposeIds).size,'目的タグを選び直してください。');
    await tx.mealCandidate.deleteMany({where:{mealId:id}});
    await tx.mealPurposeRelation.deleteMany({where:{mealId:id}});
    await tx.meal.update({where:{id},data:{...data,deadline:deadline?new Date(deadline):null,candidates:{create:candidates.map(c=>({...c,date:new Date(c.date)}))},purposes:{create:purposeIds.map(purposeId=>({purposeId}))}}});
    return `/meals/${id}`;
  });
}); }
export async function setMealStatus(input: unknown) { return perform(async userId=>{
  const {id,status}=z.object({id:idSchema,status:z.enum(['CLOSED','CANCELLED'])}).parse(input);
  await transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id}}); ensure(meal?.hostId===userId);
    ensure(meal.status!=='CANCELLED','この募集はキャンセル済みです。');
    await tx.meal.update({where:{id},data:{status}});
    await tx.joinRequest.updateMany({where:{mealId:id,status:'PENDING'},data:{status:'REJECTED'}});
    // Existing matches have a separate lifecycle; closing recruitment never cancels dinner.
  });
}); }
