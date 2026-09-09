'use server';
import { z } from 'zod';
import { idSchema, joinSchema, scheduledAt } from '@/validators';
import { perform, transaction, ensure } from '@/server/action';
export async function createJoinRequest(input: unknown) {return perform(async userId=>{
  const data=joinSchema.parse(input);
  await transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id:data.mealId},include:{candidates:true,matches:true}});
    ensure(meal && meal.status==='OPEN','その飯はもう募集が終わっています。');
    ensure(meal.hostId!==userId,'自分の募集には参加希望を送れません。');
    ensure(!meal.deadline || meal.deadline>new Date(),'募集の締切を過ぎています。');
    const candidate=meal.candidates.find(c=>c.id===data.candidateId);
    ensure(candidate,'候補日時を選び直してください。');
    ensure(scheduledAt(candidate.date.toISOString().slice(0,10),candidate.startTime)>new Date(),'この候補日時は過ぎています。');
    ensure(!meal.matches[0] || (meal.matches[0].status==='ACTIVE' && meal.matches[0].candidateId===candidate.id),'飯の日程が決まりました。確定した候補日時を選んでください。');
    ensure(!await tx.joinRequest.findUnique({where:{mealId_userId:{mealId:data.mealId,userId}}}),'すでにこの飯に参加希望を送っています。');
    await tx.joinRequest.create({data:{...data,userId}});
  });
});}
export async function cancelJoinRequest(input: unknown) {return perform(async userId=>{
  const id=idSchema.parse(input);
  await transaction(async tx=>{const request=await tx.joinRequest.findUnique({where:{id}}); ensure(request?.userId===userId);ensure(request.status==='PENDING','この参加希望はすでに処理されています。');await tx.joinRequest.update({where:{id},data:{status:'CANCELLED'}});});
});}
export async function decideJoinRequest(input: unknown) {return perform(async userId=>{
  const {id,mealId,accept}=z.object({id:idSchema,mealId:idSchema,accept:z.boolean()}).parse(input);
  return transaction(async tx=>{
    const meal=await tx.meal.findUnique({where:{id:mealId},include:{matches:{include:{participants:true}}}});ensure(meal?.hostId===userId);
    const request=await tx.joinRequest.findUnique({where:{id},include:{candidate:true}});
    ensure(request && request.mealId===mealId);ensure(request.status==='PENDING','この参加希望はすでに処理されています。');
    if(!accept){await tx.joinRequest.update({where:{id},data:{status:'REJECTED'}});return {};}
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
    if(full) await tx.meal.update({where:{id:mealId},data:{status:'MATCHED'}});
    await tx.joinRequest.updateMany({where:{mealId,status:'PENDING',...(full?{}:{candidateId:{not:request.candidateId}})},data:{status:'REJECTED'}});
    return {href:`/matches/${match.id}`,justMatched:full,matchId:match.id,meal:{title:meal.title,area:meal.area,scheduledAt:start.toISOString(),participantCount}};
  });
});}
