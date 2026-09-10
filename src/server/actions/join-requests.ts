'use server';
import { z } from 'zod';
import { idSchema, joinSchema, scheduledAt } from '@/validators';
import { perform, transaction, ensure } from '@/server/action';
import { getReferralAttribution } from '@/server/business';
import { createNotification } from '@/server/notifications';
import { checkReferralActivation } from '@/server/referral-activation';
import { recordGrowthEvent } from '@/server/growth';

export async function createJoinRequest(input: unknown) {return perform(async userId=>{
  const data=joinSchema.parse(input);
  const attribution=await getReferralAttribution();
  const outcome=await transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id:data.mealId},include:{candidates:true,matches:true}});
    ensure(meal && meal.status==='OPEN','その飯はもう募集が終わっています。');
    ensure(meal.hostId!==userId,'自分の募集には参加希望を送れません。');
    ensure(!meal.deadline || meal.deadline>new Date(),'募集の締切を過ぎています。');
    const candidate=meal.candidates.find(c=>c.id===data.candidateId);
    ensure(candidate,'候補日時を選び直してください。');
    ensure(scheduledAt(candidate.date.toISOString().slice(0,10),candidate.startTime)>new Date(),'この候補日時は過ぎています。');
    ensure(!meal.matches[0] || (meal.matches[0].status==='ACTIVE' && meal.matches[0].candidateId===candidate.id),'飯の日程が決まりました。確定した候補日時を選んでください。');
    ensure(!await tx.joinRequest.findUnique({where:{mealId_userId:{mealId:data.mealId,userId}}}),'すでにこの飯に参加希望を送っています。');
    const request=await tx.joinRequest.create({data:{...data,userId}});
    if(!meal.firstJoinAt)await tx.meal.update({where:{id:meal.id},data:{firstJoinAt:new Date()}});
    if(attribution)await tx.referralEvent.create({data:{businessAccountId:attribution.businessAccountId,socialPostId:attribution.socialPostId,entityType:attribution.entityType,entityId:attribution.entityId,eventType:'JOIN_REQUEST',sourceEventId:attribution.id,conversionEntityId:request.id,utmSource:attribution.utmSource,utmMedium:attribution.utmMedium,utmCampaign:attribution.utmCampaign,anonymousId:attribution.anonymousId}});
    return {requestId:request.id,hostId:meal.hostId,mealId:meal.id,mealTitle:meal.title};
  });
  await createNotification({
    userId:outcome.hostId,type:'JOIN_REQUEST_RECEIVED',
    title:'参加申請が届きました',body:`「${outcome.mealTitle}」に参加希望が届きました。`,
    mealId:outcome.mealId,dedupeKey:`JOIN_REQUEST_RECEIVED:${outcome.requestId}`,
  });
  await checkReferralActivation(userId);
});}
export async function cancelJoinRequest(input: unknown) {return perform(async userId=>{
  const id=idSchema.parse(input);
  await transaction(async tx=>{const request=await tx.joinRequest.findUnique({where:{id}}); ensure(request?.userId===userId);ensure(request.status==='PENDING','この参加希望はすでに処理されています。');await tx.joinRequest.update({where:{id},data:{status:'CANCELLED'}});});
});}
export async function decideJoinRequest(input: unknown) {return perform(async userId=>{
  const {id,mealId,accept}=z.object({id:idSchema,mealId:idSchema,accept:z.boolean()}).parse(input);
  const outcome=await transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id:mealId},include:{matches:{include:{participants:true}}}});ensure(meal?.hostId===userId);
    const request=await tx.joinRequest.findUnique({where:{id},include:{candidate:true}});
    ensure(request && request.mealId===mealId);ensure(request.status==='PENDING','この参加希望はすでに処理されています。');
    if(!accept){await tx.joinRequest.update({where:{id},data:{status:'REJECTED'}});return {rejected:true as const};}
    ensure(meal.status==='OPEN','その飯はもう募集が終わっています。');ensure(!meal.deadline || meal.deadline>new Date(),'募集の締切を過ぎています。');
    ensure(request.userId!==userId && request.candidate.mealId===meal.id);
    let match=meal.matches[0];
    const start=scheduledAt(request.candidate.date.toISOString().slice(0,10),request.candidate.startTime);
    ensure(start>new Date(),'候補日時が過ぎています。');
    if(match){ensure(match.status==='ACTIVE','この飯の予定は終了しています。');ensure(match.candidateId===request.candidateId,'確定日と異なる候補です。この希望は承認できません。');ensure(match.participants.length<meal.maxParticipants,'その枠は埋まりました。');ensure(!match.participants.some(p=>p.userId===request.userId),'すでに参加しています。');}
    else {match=await tx.match.create({data:{mealId,candidateId:request.candidateId,scheduledAt:start,participants:{create:{userId}}},include:{participants:true}});}
    await tx.matchParticipant.create({data:{matchId:match.id,userId:request.userId}});
    await tx.joinRequest.update({where:{id},data:{status:'ACCEPTED'}});
    const participantCount=await tx.matchParticipant.count({where:{matchId:match.id}});
    ensure(participantCount<=meal.maxParticipants,'その枠は埋まりました。');
    const full=participantCount===meal.maxParticipants;
    const lastSlot=!full&&participantCount===meal.maxParticipants-1;
    let participantIds:string[]=[];
    if(full){
      await tx.meal.update({where:{id:mealId},data:{status:'MATCHED',matchedAt:new Date()}});
      const participants=await tx.matchParticipant.findMany({where:{matchId:match.id},select:{userId:true}});
      participantIds=participants.map(p=>p.userId);
      const attribution=await tx.referralEvent.findFirst({where:{eventType:'JOIN_REQUEST',conversionEntityId:request.id},orderBy:{createdAt:'desc'}});
      if(attribution)await tx.referralEvent.create({data:{businessAccountId:attribution.businessAccountId,socialPostId:attribution.socialPostId,entityType:attribution.entityType,entityId:attribution.entityId,eventType:'MATCHED',sourceEventId:attribution.id,conversionEntityId:match.id,utmSource:attribution.utmSource,utmMedium:attribution.utmMedium,utmCampaign:attribution.utmCampaign,anonymousId:attribution.anonymousId}});
    }
    await tx.joinRequest.updateMany({where:{mealId,status:'PENDING',...(full?{}:{candidateId:{not:request.candidateId}})},data:{status:'REJECTED'}});
    return {rejected:false as const,href:`/matches/${match.id}`,justMatched:full,matchId:match.id,meal:{title:meal.title,area:meal.area,scheduledAt:start.toISOString(),participantCount},requesterId:request.userId,hostId:userId,mealId,mealTitle:meal.title,mealArea:meal.area,demandClusterKey:meal.demandClusterKey,lastSlot,full,participantIds};
  });
  if(outcome.rejected)return {};
  await createNotification({userId:outcome.requesterId,type:'JOIN_REQUEST_ACCEPTED',title:'参加が承認されました',body:`「${outcome.mealTitle}」への参加が承認されました。`,mealId:outcome.mealId,dedupeKey:`JOIN_REQUEST_ACCEPTED:${id}`});
  if(outcome.lastSlot)await createNotification({userId:outcome.hostId,type:'LAST_SLOT_REACHED',title:'残り1席になりました',body:`「${outcome.mealTitle}」はあと1人で成立します。`,mealId:outcome.mealId,dedupeKey:`LAST_SLOT_REACHED:${outcome.mealId}`});
  if(outcome.full){
    for(const participantId of outcome.participantIds){
      await createNotification({userId:participantId,type:'MEAL_MATCHED',title:'飯、決まりました',body:`「${outcome.mealTitle}」の飯が成立しました。`,mealId:outcome.mealId,dedupeKey:`MEAL_MATCHED:${outcome.mealId}:${participantId}`});
    }
    await checkReferralActivation(outcome.requesterId);
    if(outcome.demandClusterKey)await recordGrowthEvent('DEMAND_MATCH_COMPLETED',{recruitmentId:outcome.mealId,area:outcome.mealArea,loggedIn:true});
  }
  return {href:outcome.href,justMatched:outcome.justMatched,matchId:outcome.matchId,meal:outcome.meal};
});}
