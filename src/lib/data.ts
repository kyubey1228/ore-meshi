import 'server-only';
import { prisma } from '@/lib/prisma';
import { currentUserId, requirePageUser } from '@/server/auth';
import { filterSchema, idSchema } from '@/validators';
import type { Prisma } from '@prisma/client';
export const publicUser = { id:true, twitterUsername:true, displayName:true, image:true, bio:true, createdAt:true,diningTypes:{where:{diningType:{isActive:true}},orderBy:{diningType:{sortOrder:'asc'}},select:{diningType:{select:{id:true,slug:true,label:true}}}} } satisfies Prisma.UserSelect;
export async function getCurrentUser(){const id=await currentUserId();return id?prisma.user.findUnique({where:{id},select:publicUser}):null;}
export async function getDiningTypes(){return prisma.diningType.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}});}
export async function getMealPurposes(){return prisma.mealPurpose.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}});}
export async function getMealList(input: unknown = {}) {
  const parsed=filterSchema.safeParse(input); const filters=parsed.success?parsed.data:{};
  if(!process.env.DATABASE_URL) return [];
  const where: Prisma.MealWhereInput={status:'OPEN',AND:[{OR:[{deadline:null},{deadline:{gt:new Date()}}]}],...(filters.area?{area:{contains:filters.area,mode:'insensitive'}}:{}),...(filters.paymentType?{paymentType:filters.paymentType}:{}),...(typeof filters.budget==='number'?{budgetMax:{lte:filters.budget}}:{}),...(filters.date?{candidates:{some:{date:new Date(filters.date)}}}:{}),...(filters.purpose?{purposes:{some:{purpose:{slug:filters.purpose,isActive:true}}}}:{})};
  const meals=await prisma.meal.findMany({where,orderBy:{createdAt:'desc'},take:100,include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
  return meals.sort((a,b)=>{
    const aRemaining=a.maxParticipants-(a._count.joinRequests+1),bRemaining=b.maxParticipants-(b._count.joinRequests+1);
    const boost=Number(bRemaining===1)-Number(aRemaining===1);if(boost)return boost;
    const aDate=a.candidates[0]?.date.getTime()??Number.MAX_SAFE_INTEGER,bDate=b.candidates[0]?.date.getTime()??Number.MAX_SAFE_INTEGER;
    return aDate-bDate||b.createdAt.getTime()-a.createdAt.getTime();
  });
}
export async function getRecentOpenMeals(limit=4){
  if(!process.env.DATABASE_URL) return [];
  return prisma.meal.findMany({where:{status:'OPEN',AND:[{OR:[{deadline:null},{deadline:{gt:new Date()}}]}]},orderBy:{createdAt:'desc'},take:limit,include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
}
export async function getMealById(raw: string){
  const id=idSchema.safeParse(raw); if(!id.success || !process.env.DATABASE_URL)return null;
  const userId=await currentUserId();
  const meal=await prisma.meal.findUnique({where:{id:id.data},include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
  if(!meal)return null;
  // Applicants' messages are visible only to the host and the applicant.
  const requests=userId?await prisma.joinRequest.findMany({where:{mealId:meal.id,...(meal.hostId===userId?{}:{userId})},include:{user:{select:publicUser},candidate:true},orderBy:{createdAt:'asc'}}):[];
  const matches=userId?await prisma.match.findMany({where:{mealId:meal.id,participants:{some:{userId}}},select:{id:true,status:true,scheduledAt:true}}):[];
  return {...meal,joinRequests:requests,matches};
}
export async function getMealShareData(raw:string){
  const id=idSchema.safeParse(raw);if(!id.success||!process.env.DATABASE_URL)return null;
  return prisma.meal.findUnique({where:{id:id.data},select:{id:true,title:true,description:true,area:true,budgetMin:true,budgetMax:true,paymentType:true,maxParticipants:true,status:true,candidates:{orderBy:[{date:'asc'},{startTime:'asc'}],take:1,select:{date:true,startTime:true,endTime:true}},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}});
}
export async function getActiveStandaloneSponsoredMeals(area?: string){
  if(!process.env.DATABASE_URL) return [];
  return prisma.sponsoredMeal.findMany({where:{status:'ACTIVE',mealId:null,startsAt:{gt:new Date()},...(area?{area:{contains:area,mode:'insensitive'}}:{})},orderBy:{startsAt:'asc'},take:12,select:{id:true,title:true,sponsorName:true,restaurantName:true,area:true,startsAt:true,remainingSlots:true,benefit:true}});
}
export async function getActiveSeatCampaigns(area?: string){
  if(!process.env.DATABASE_URL) return [];
  return prisma.seatCampaign.findMany({where:{status:'ACTIVE',endsAt:{gt:new Date()},...(area?{area:{contains:area,mode:'insensitive'}}:{})},orderBy:{endsAt:'asc'},take:12,select:{id:true,restaurantName:true,area:true,remainingSeats:true,endsAt:true,benefit:true}});
}
export async function getUserProfileData(raw: string){
  const parsed=idSchema.safeParse(raw);if(!parsed.success || !process.env.DATABASE_URL)return null;
  const id=parsed.data;const user=await prisma.user.findUnique({where:{id},select:publicUser});if(!user)return null;
  const where: Prisma.MatchWhereInput={status:'COMPLETED',participants:{some:{userId:id}}};
  const [completedMealCount,last]=await Promise.all([prisma.match.count({where}),prisma.match.findFirst({where,orderBy:{scheduledAt:'desc'},select:{scheduledAt:true}})]);
  return {user,completedMealCount,lastDiningDate:last?.scheduledAt??null};
}
export async function getMyPageData(){
  const userId=await requirePageUser();
  const [hostedMeals,joinRequests,matches,businessMembership,currentUser]=await Promise.all([
    prisma.meal.findMany({where:{hostId:userId},orderBy:{createdAt:'desc'},include:{host:{select:publicUser},candidates:true,_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}}),
    prisma.joinRequest.findMany({where:{userId,status:'PENDING'},orderBy:{createdAt:'desc'},include:{meal:true,candidate:true}}),
    prisma.match.findMany({where:{participants:{some:{userId}}},orderBy:{scheduledAt:'desc'},include:{meal:true,participants:{include:{user:{select:publicUser}}}}}),
    prisma.businessMember.findFirst({where:{userId,OR:[{role:{in:['OWNER','ADMIN']}},{canPostToSocial:true}]},select:{businessAccount:{select:{name:true}}}}),
    prisma.user.findUnique({where:{id:userId},select:{isAdmin:true,onboardingCompletedAt:true}})
  ]);
  return {hostedMeals,joinRequests,matches,businessMembership,isAdmin:currentUser?.isAdmin??false,onboardingCompletedAt:currentUser?.onboardingCompletedAt??null,completedMatches:matches.filter(m=>m.status==='COMPLETED')};
}
export async function getMatchById(raw: string){
  const userId=await requirePageUser(); const id=idSchema.safeParse(raw);if(!id.success)return null;
  return prisma.match.findFirst({where:{id:id.data,participants:{some:{userId}}},include:{meal:true,participants:{include:{user:{select:publicUser}}},rescheduleProposals:{orderBy:{createdAt:'desc'},include:{proposer:{select:publicUser},votes:{select:{userId:true}}}},diningFeedbacks:{where:{fromUserId:userId}}}});
}
export async function getDiningHistory(){return (await getMyPageData()).completedMatches;}
