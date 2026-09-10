'use server';
import { feedbackSchema } from '@/validators';
import { perform, transaction, ensure, participantMatch } from '@/server/action';
import { updateRecommendationProfile } from '@/server/recommendation-profile';
import { recordGrowthEvent } from '@/server/growth';
export async function submitDiningFeedback(input: unknown){return perform(async userId=>{
  const data=feedbackSchema.parse(input);
  const match=await transaction(async tx=>{
    const match=await participantMatch(tx,data.matchId,userId);
    ensure(match.status==='COMPLETED','飯が終わってから感想を残せます。');
    ensure(data.toUserId!==userId && match.participants.some(p=>p.userId===data.toUserId));
    await tx.diningFeedback.create({data:{...data,fromUserId:userId}});
    return match;
  });
  await updateRecommendationProfile({userId,wouldMeetAgain:data.wouldMeetAgain,area:match.meal.area,genre:match.meal.genre,groupSize:match.participants.length,scheduledAt:match.scheduledAt});
  await recordGrowthEvent('DINING_FEEDBACK_SUBMITTED',{userId,loggedIn:true,area:match.meal.area,foodCategory:match.meal.genre??undefined});
});}
