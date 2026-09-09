'use server';
import { feedbackSchema } from '@/validators';
import { perform, transaction, ensure, participantMatch } from '@/server/action';
export async function submitDiningFeedback(input: unknown){return perform(async userId=>{
  const data=feedbackSchema.parse(input);
  await transaction(async tx=>{
    const match=await participantMatch(tx,data.matchId,userId);
    ensure(match.status==='COMPLETED','飯が終わってから感想を残せます。');
    ensure(data.toUserId!==userId && match.participants.some(p=>p.userId===data.toUserId));
    await tx.diningFeedback.create({data:{...data,fromUserId:userId}});
  });
});}
