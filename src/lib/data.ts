import 'server-only';
import { prisma } from '@/lib/prisma';
import { currentUserId, requirePageUser } from '@/server/auth';
import { filterSchema, idSchema } from '@/validators';
import type { Prisma } from '@prisma/client';
import { rankMeals, type RankingContext } from '@/lib/meal-ranking';
export const publicUser = { id:true, twitterUsername:true, displayName:true, image:true, bio:true, createdAt:true,diningTypes:{where:{diningType:{isActive:true}},orderBy:{diningType:{sortOrder:'asc'}},select:{diningType:{select:{id:true,slug:true,label:true}}}} } satisfies Prisma.UserSelect;
export async function getCurrentUser(){const id=await currentUserId();return id?prisma.user.findUnique({where:{id},select:publicUser}):null;}
export async function getDiningTypes(){return prisma.diningType.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}});}
export async function getMealPurposes(){return prisma.mealPurpose.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}});}
export async function getNotifications(limit=30){
  const userId=await requirePageUser();
  return prisma.notification.findMany({where:{userId},orderBy:{createdAt:'desc'},take:limit});
}
export async function getUnreadNotificationCount(){
  const userId=await currentUserId();if(!userId)return 0;
  return prisma.notification.count({where:{userId,readAt:null}});
}
export async function getNotificationPreference(userId:string){
  const pref=await prisma.notificationPreference.findUnique({where:{userId}});
  return pref??{recruitmentEnabled:true,participationEnabled:true,recommendationEnabled:true};
}
function whenWhere(when: string | undefined): Prisma.MealWhereInput {
  if (!when) return {};
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  if (when === 'today') return { candidates: { some: { date: { gte: todayStart, lt: todayEnd } } } };
  if (when === 'tonight') return { candidates: { some: { date: { gte: todayStart, lt: todayEnd }, startTime: { gte: '18:00' } } } };
  if (when === 'soon') return { candidates: { some: { date: { gte: todayStart, lt: todayEnd } } } };
  return {};
}

function withinHours(meal: { candidates: { date: Date; startTime: string }[] }, hours: number, now: Date) {
  return meal.candidates.some(c => {
    const [h, m] = c.startTime.split(':').map(Number);
    const at = new Date(c.date); at.setHours(h, m, 0, 0);
    const diffH = (at.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffH >= 0 && diffH <= hours;
  });
}

export async function getMealList(input: unknown = {}, context: RankingContext = {}) {
  const parsed=filterSchema.safeParse(input); const filters=parsed.success?parsed.data:{};
  if(!process.env.DATABASE_URL) return [];
  const where: Prisma.MealWhereInput={status:'OPEN',AND:[{OR:[{deadline:null},{deadline:{gt:new Date()}}]}],...(filters.area?{area:{contains:filters.area,mode:'insensitive'}}:{}),...(filters.paymentType?{paymentType:filters.paymentType}:{}),...(typeof filters.budget==='number'?{budgetMax:{lte:filters.budget}}:{}),...(filters.date?{candidates:{some:{date:new Date(filters.date)}}}:{}),...(filters.purpose?{purposes:{some:{purpose:{slug:filters.purpose,isActive:true}}}}:{}),...whenWhere(filters.when)};
  const meals=await prisma.meal.findMany({where,orderBy:{createdAt:'desc'},take:100,include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
  const now=new Date();
  const soonFiltered=filters.when==='soon'?meals.filter(meal=>withinHours(meal,3,now)):meals;
  const remainingFiltered=filters.remaining?soonFiltered.filter(meal=>meal.maxParticipants-(meal._count.joinRequests+1)===filters.remaining):soonFiltered;
  return rankMeals(remainingFiltered,{...context,now}).map(r=>r.meal);
}
export async function getRecentOpenMeals(limit=4){
  if(!process.env.DATABASE_URL) return [];
  return prisma.meal.findMany({where:{status:'OPEN',AND:[{OR:[{deadline:null},{deadline:{gt:new Date()}}]}]},orderBy:{createdAt:'desc'},take:limit,include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
}
export async function getMealsByIds(ids: string[]){
  if(!process.env.DATABASE_URL || ids.length===0) return [];
  const safeIds=ids.filter(id=>idSchema.safeParse(id).success).slice(0,20);
  if(!safeIds.length) return [];
  const meals=await prisma.meal.findMany({where:{id:{in:safeIds},status:'OPEN'},include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
  const order=new Map(safeIds.map((id,index)=>[id,index]));
  return meals.sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0));
}
export async function getUserPreferences(userId: string){
  const user=await prisma.user.findUnique({where:{id:userId},select:{preferredArea:true,preferredGenres:true}});
  return {preferredArea:user?.preferredArea??null,preferredGenres:user?.preferredGenres??[]};
}
const WEEKDAY_LABEL_JA=['日','月','火','水','木','金','土'];
export async function getFrequentPostingPattern(userId: string){
  const meals=await prisma.meal.findMany({where:{hostId:userId},orderBy:{createdAt:'desc'},take:20,include:{candidates:{orderBy:{date:'asc'},take:1}}});
  const buckets=new Map<string,number>();
  for(const meal of meals){
    const c=meal.candidates[0];if(!c)continue;
    const key=`${c.date.getUTCDay()}:${c.startTime.slice(0,2)}`;
    buckets.set(key,(buckets.get(key)??0)+1);
  }
  const top=[...buckets.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(!top||top[1]<2)return null;
  const [dowStr,hourStr]=top[0].split(':');
  return {label:`${WEEKDAY_LABEL_JA[Number(dowStr)]}曜${hourStr}時頃`,weekday:Number(dowStr),hour:Number(hourStr)};
}
export async function getReferralStats(userId: string){
  const [invitedCount,activatedCount]=await Promise.all([
    prisma.referral.count({where:{referrerUserId:userId,referredUserId:{not:null}}}),
    prisma.referral.count({where:{referrerUserId:userId,activatedAt:{not:null}}}),
  ]);
  return {invitedCount,activatedCount};
}
export async function getHostTrustStats(hostId: string){
  if(!process.env.DATABASE_URL) return {hostedCount:0,completedCount:0};
  const [hostedCount,completedCount]=await Promise.all([
    prisma.meal.count({where:{hostId,status:{in:['OPEN','MATCHED','CLOSED']}}}),
    prisma.match.count({where:{status:'COMPLETED',meal:{hostId}}}),
  ]);
  return {hostedCount,completedCount};
}
export async function getFavoriteMealIds(userId: string){
  if(!process.env.DATABASE_URL) return [];
  const favorites=await prisma.favorite.findMany({where:{userId},select:{mealId:true},orderBy:{createdAt:'desc'}});
  return favorites.map(f=>f.mealId);
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
  return {userId,hostedMeals,joinRequests,matches,businessMembership,isAdmin:currentUser?.isAdmin??false,onboardingCompletedAt:currentUser?.onboardingCompletedAt??null,completedMatches:matches.filter(m=>m.status==='COMPLETED')};
}
export async function getMatchById(raw: string){
  const userId=await requirePageUser(); const id=idSchema.safeParse(raw);if(!id.success)return null;
  return prisma.match.findFirst({where:{id:id.data,participants:{some:{userId}}},include:{meal:true,participants:{include:{user:{select:publicUser}}},rescheduleProposals:{orderBy:{createdAt:'desc'},include:{proposer:{select:publicUser},votes:{select:{userId:true}}}},diningFeedbacks:{where:{fromUserId:userId}}}});
}
export async function getDiningHistory(){return (await getMyPageData()).completedMatches;}
