'use server';
import { z } from 'zod';
import { idSchema } from '@/validators';
import { perform, transaction, ensure, participantMatch } from '@/server/action';
import { recordGrowthEvent } from '@/server/growth';
export async function setMatchStatus(input: unknown) {return perform(async userId=>{
  const {id,status}=z.object({id:idSchema,status:z.enum(['COMPLETED','CANCELLED'])}).parse(input);
  const outcome=await transaction(async tx=>{
    const match=await participantMatch(tx,id,userId);ensure(match.status==='ACTIVE','この飯の予定はすでに終了しています。');
    if(status==='COMPLETED') ensure(match.scheduledAt<=new Date(),'飯終了は予定日時を過ぎてから押してください。');
    // 開催予定を過ぎてからのCANCELLEDは「実際には開催されなかった」ことの確認として扱う(専用enumは追加せず既存のCANCELLEDを再利用)。
    const notCompletedAfterSchedule=status==='CANCELLED'&&match.scheduledAt<=new Date();
    await tx.match.update({where:{id},data:{status,completedAt:status==='COMPLETED'?new Date():undefined}});
    await tx.rescheduleProposal.updateMany({where:{matchId:id,status:'PENDING'},data:{status:'CANCELLED'}});
    if(match.meal.status!=='CANCELLED') await tx.meal.update({where:{id:match.mealId},data:{status:'CLOSED'}});
    await tx.joinRequest.updateMany({where:{mealId:match.mealId,status:'PENDING'},data:{status:'REJECTED'}});
    return {area:match.meal.area,notCompletedAfterSchedule};
  });
  if(status==='COMPLETED')await recordGrowthEvent('MEAL_COMPLETED',{area:outcome.area,loggedIn:true});
  else if(outcome.notCompletedAfterSchedule)await recordGrowthEvent('MEAL_NOT_COMPLETED',{area:outcome.area,loggedIn:true});
});}
