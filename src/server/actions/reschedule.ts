'use server';
import { z } from 'zod';
import { idSchema, proposalSchema } from '@/validators';
import { perform, transaction, ensure, participantMatch } from '@/server/action';
export async function createRescheduleProposal(input: unknown){return perform(async userId=>{
  const {matchId,proposedAt}=proposalSchema.parse(input);
  await transaction(async tx=>{
    const match=await participantMatch(tx,matchId,userId);ensure(match.status==='ACTIVE','この飯の予定はすでに終了しています。');
    ensure(!await tx.rescheduleProposal.findFirst({where:{matchId,status:'PENDING'}}),'返事待ちのリスケ提案があります。');
    await tx.rescheduleProposal.create({data:{matchId,proposerId:userId,proposedAt:new Date(proposedAt)}});
  });
});}
export async function decideRescheduleProposal(input: unknown){return perform(async userId=>{
  const {id,decision}=z.object({id:idSchema,decision:z.enum(['ACCEPTED','REJECTED','CANCELLED'])}).parse(input);
  await transaction(async tx=>{
    const proposal=await tx.rescheduleProposal.findUnique({where:{id},include:{votes:true}});ensure(proposal,'提案が見つかりません。');
    const match=await participantMatch(tx,proposal.matchId,userId);ensure(match.status==='ACTIVE' && proposal.status==='PENDING','この提案はすでに終了しています。');
    if(decision==='CANCELLED'){ensure(proposal.proposerId===userId);await tx.rescheduleProposal.update({where:{id},data:{status:'CANCELLED'}});return;}
    ensure(proposal.proposerId!==userId,'ほかの参加者の返事を待ってください。');
    if(decision==='REJECTED'){await tx.rescheduleProposal.update({where:{id},data:{status:'REJECTED'}});return;}
    ensure(proposal.proposedAt>new Date(),'提案日時が過ぎています。');
    ensure(!proposal.votes.some(v=>v.userId===userId),'すでにこの日でOKを送っています。');
    await tx.rescheduleVote.create({data:{proposalId:id,userId}});
    const voters=new Set([...proposal.votes.map(v=>v.userId),userId,proposal.proposerId]);
    if(match.participants.every(p=>voters.has(p.userId))){
      await tx.rescheduleProposal.update({where:{id},data:{status:'ACCEPTED'}});
      await tx.match.update({where:{id:match.id},data:{scheduledAt:proposal.proposedAt}});
      // A changed schedule must not admit users applying to an obsolete candidate.
      if(match.meal.status==='OPEN') await tx.meal.update({where:{id:match.mealId},data:{status:'CLOSED'}});
      await tx.joinRequest.updateMany({where:{mealId:match.mealId,status:'PENDING'},data:{status:'REJECTED'}});
    }
  });
});}
