import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { currentUserId, requirePageUser } from '@/server/auth';
import { filterSchema, idSchema } from '@/validators';
import type { Prisma } from '@prisma/client';
import { rankMeals, type RankingContext } from '@/lib/meal-ranking';
import { fetchOpenMeals, isDefaultMealQuery, publicUserSelect as publicUser } from '@/server/meal-feed-query';
import { getPublicMealFeed } from '@/server/public-meal-feed';
import { MEAL_PAGE_SIZE } from '@/lib/meal-pagination';
export { publicUser };
export async function getCurrentUser(){const id=await currentUserId();return id?prisma.user.findUnique({where:{id},select:publicUser}):null;}
export async function getCurrentUserForProfile(userId:string){return prisma.user.findUnique({where:{id:userId},select:{displayName:true,bio:true,email:true,diningTypes:{where:{diningType:{isActive:true}},select:{diningType:{select:{id:true}}}}}});}
// 飯タイプ/目的タグは管理画面がなく、実質デプロイ時にしか変わらない参照データ。
// idは実在のDB行(MealPurpose/DiningType)を指し、募集作成・プロフィール編集で本物のIDかDB側検証を通すため、
// 値を静的にハードコードすることはできない(検証が必ず通るとは限らずデータ不整合の原因になる)。
// そのためrevalidate:falseで「次のデプロイまでキャッシュを使い回す」デフォルト値的な扱いにし、
// DB接続のレイテンシが大きい環境での往復をほぼゼロにする。運用でタグを変えたい場合は再デプロイすれば反映される。
export const getDiningTypes = unstable_cache(
  () => prisma.diningType.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}}),
  ['dining-types'], { revalidate: false },
);
export const getMealPurposes = unstable_cache(
  () => prisma.mealPurpose.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{label:'asc'}],select:{id:true,slug:true,label:true}}),
  ['meal-purposes'], { revalidate: false },
);
// エリア入力欄(募集作成・検索・店舗側の各フォーム)の入力補助候補。都道府県名(「東京都」等)と
// 市区町村名(「渋谷区」等、都道府県プレフィックスなし。既存のarea表記「渋谷」「新宿」等との一貫性のため)を
// どちらも候補に含める。外部キーではなくsuggestion用なので、呼び出し側はここにない値も自由入力できる。
export const getAreaOptions = unstable_cache(
  async () => {
    const [prefectures,cities]=await Promise.all([
      prisma.areaOption.findMany({where:{isActive:true},distinct:['prefecture'],orderBy:[{sortOrder:'asc'}],select:{prefecture:true}}),
      prisma.areaOption.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{city:'asc'}],select:{city:true}}),
    ]);
    return [...prefectures.map(a=>a.prefecture),...cities.map(a=>a.city)];
  },
  ['area-options'], { revalidate: false },
);
// 都道府県タブ→市区町村一覧、のようなピッカーUI用。都道府県ごとに市区町村をグルーピングして返す
// (順序はAreaOptionのsortOrder、つまり北海道〜沖縄の地理的な並び順を保つ)。
export const getAreaOptionsGrouped = unstable_cache(
  async () => {
    const rows = await prisma.areaOption.findMany({where:{isActive:true},orderBy:[{sortOrder:'asc'},{city:'asc'}],select:{prefecture:true,city:true}});
    const grouped: {prefecture:string;cities:string[]}[] = [];
    for(const row of rows){
      const last = grouped[grouped.length-1];
      if(last && last.prefecture===row.prefecture) last.cities.push(row.city);
      else grouped.push({prefecture:row.prefecture,cities:[row.city]});
    }
    return grouped;
  },
  ['area-options-grouped'], { revalidate: false },
);
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
  return pref??{recruitmentEnabled:true,participationEnabled:true,recommendationEnabled:true,emailTransactionalEnabled:true,emailMarketingEnabled:false};
}

// DB接続経路のレイテンシが大きいため(1往復で数百ms〜規模)、一覧の取得自体を短時間キャッシュし、
// 誰が見ても同じ結果になるDB取得部分と、閲覧者ごとに変わる並び替え(rankMeals)を分離する。
const cachedFetchOpenMeals = unstable_cache(fetchOpenMeals, ['open-meals'], { revalidate: 60 });

export async function getMealCandidates(input: unknown = {}, limit = 40) {
  const parsed=filterSchema.safeParse(input); const filters=parsed.success?parsed.data:{};
  if(!process.env.DATABASE_URL) return [];
  let meals;
  try{
    const take=Math.min(Math.max(limit,1),100);
    meals=isDefaultMealQuery(filters)&&take<=MEAL_PAGE_SIZE+1
      ? (await getPublicMealFeed()).meals.filter(meal=>!meal.deadline||meal.deadline>new Date()).slice(0,take)
      : await cachedFetchOpenMeals(filters,take);
  }catch(error){console.error('Meal list unavailable',error instanceof Error?error.name:'UnknownError');if(isDefaultMealQuery(filters))throw error;return[];}
  return meals;
}
export async function getRankedMealList(input: unknown = {}, context: RankingContext = {}, limit = 40) {
  const meals=await getMealCandidates(input,limit);
  return rankMeals(meals,{...context,now:new Date()});
}
export async function getMealList(input: unknown = {}, context: RankingContext = {}, limit = 40) {
  return (await getRankedMealList(input,context,limit)).map(result=>result.meal);
}
const cachedRecentOpenMeals = unstable_cache(
  (limit: number) => prisma.meal.findMany({where:{status:'OPEN',AND:[{OR:[{deadline:null},{deadline:{gt:new Date()}}]}]},orderBy:{createdAt:'desc'},take:limit,include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}],take:1},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{candidates:true,joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}}),
  ['recent-open-meals'], { revalidate: 60 },
);
export async function getRecentOpenMeals(limit=4){
  if(!process.env.DATABASE_URL) return [];
  return cachedRecentOpenMeals(limit);
}
export async function getMealsByIds(ids: string[]){
  if(!process.env.DATABASE_URL || ids.length===0) return [];
  const safeIds=ids.filter(id=>idSchema.safeParse(id).success).slice(0,20);
  if(!safeIds.length) return [];
  const meals=await prisma.meal.findMany({where:{id:{in:safeIds},status:'OPEN'},include:{host:{select:publicUser},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}],take:1},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{candidates:true,joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
  const order=new Map(safeIds.map((id,index)=>[id,index]));
  return meals.sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0));
}
export async function getUserPreferences(userId: string){
  const user=await prisma.user.findUnique({where:{id:userId},select:{preferredArea:true,preferredGenres:true}});
  return {preferredArea:user?.preferredArea??null,preferredGenres:user?.preferredGenres??[]};
}
const WEEKDAY_LABEL_JA=['日','月','火','水','木','金','土'];
export async function getFrequentPostingPattern(userId: string){
  const meals=await prisma.meal.findMany({where:{hostId:userId},orderBy:{createdAt:'desc'},take:20,select:{candidates:{orderBy:{date:'asc'},take:1,select:{date:true,startTime:true}}}});
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
  const [referrals,referredMatchCount]=await Promise.all([
    prisma.referral.aggregate({where:{referrerUserId:userId},_count:{_all:true,referredUserId:true,activatedAt:true}}),
    prisma.match.count({where:{participants:{some:{user:{referralsReceived:{some:{referrerUserId:userId}}}}}}}),
  ]);
  // 「紹介経由成立人数」はactivatedCount(=初回参加/成立まで到達した被紹介者の人数)とは別に、
  // 被紹介者が実際に成立させたMatch件数(延べ)を見る指標として分けて出す。
  return {invitedCount:referrals._count._all,signupCount:referrals._count.referredUserId,activatedCount:referrals._count.activatedAt,referredMatchCount};
}
// The detail page streams these profile tags separately from the actionable meal.
// Query the tag table directly so fetching labels does not need a second relation roundtrip.
export const getUserDiningTypes=cache(async (userId: string)=>{
  if(!process.env.DATABASE_URL)return [];
  return prisma.diningType.findMany({where:{isActive:true,users:{some:{userId}}},orderBy:{sortOrder:'asc'},select:{id:true,slug:true,label:true}});
});
export async function getHostTrustStats(hostId: string){
  if(!process.env.DATABASE_URL) return {hostedCount:0,completedCount:0,diningTypeCount:0};
  const [hostedCount,completedCount,diningTypes]=await Promise.all([
    prisma.meal.count({where:{hostId,status:{in:['OPEN','MATCHED','CLOSED']}}}),
    prisma.match.count({where:{status:'COMPLETED',meal:{hostId}}}),
    getUserDiningTypes(hostId),
  ]);
  return {hostedCount,completedCount,diningTypeCount:diningTypes.length};
}
export async function getFavoriteMealIds(userId: string){
  if(!process.env.DATABASE_URL) return [];
  const favorites=await prisma.favorite.findMany({where:{userId},select:{mealId:true},orderBy:{createdAt:'desc'}});
  return favorites.map(f=>f.mealId);
}
export async function isFavoriteMeal(userId: string, mealId: string){
  if(!process.env.DATABASE_URL)return false;
  return Boolean(await prisma.favorite.findUnique({where:{userId_mealId:{userId,mealId}},select:{id:true}}));
}
// Metadata and page rendering share this public lookup only within the current request.
// Applicant messages and viewer-specific matches never enter a shared data cache.
export const getPublicMealById=cache(async (raw: string)=>{
  const id=idSchema.safeParse(raw); if(!id.success || !process.env.DATABASE_URL)return null;
  return prisma.meal.findUnique({where:{id:id.data},include:{host:{select:{id:true,twitterUsername:true,displayName:true,image:true,bio:true}},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}]},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{id:true,slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}},sponsoredMeals:{where:{status:'ACTIVE'},take:1,select:{sponsorName:true,benefit:true}}}});
});
export async function getMealById(raw: string){
  const [meal,userId]=await Promise.all([getPublicMealById(raw),currentUserId()]);
  if(!meal)return null;
  // Applicants' messages are visible only to the host and the applicant.
  const [requests,matches]=userId?await Promise.all([prisma.joinRequest.findMany({where:{mealId:meal.id,...(meal.hostId===userId?{}:{userId})},include:{user:{select:{displayName:true,twitterUsername:true,image:true,diningTypes:publicUser.diningTypes}},candidate:true},orderBy:{createdAt:'asc'}}),prisma.match.findMany({where:{mealId:meal.id,participants:{some:{userId}}},select:{id:true,status:true,scheduledAt:true}})]):[[],[]];
  return {...meal,joinRequests:requests,matches};
}
export async function getMealShareData(raw:string){
  const id=idSchema.safeParse(raw);if(!id.success||!process.env.DATABASE_URL)return null;
  return prisma.meal.findUnique({where:{id:id.data},select:{id:true,title:true,description:true,area:true,budgetMin:true,budgetMax:true,paymentType:true,maxParticipants:true,status:true,host:{select:{displayName:true,twitterUsername:true,image:true}},candidates:{orderBy:[{date:'asc'},{startTime:'asc'}],take:1,select:{date:true,startTime:true,endTime:true}},purposes:{where:{purpose:{isActive:true}},orderBy:{purpose:{sortOrder:'asc'}},select:{purpose:{select:{slug:true,label:true}}}},_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}});
}
// 残席/残枠はある程度リアルタイム性が必要なため短いTTL(30秒)に留める。
const cachedActiveStandaloneSponsoredMeals = unstable_cache(
  (area: string) => prisma.sponsoredMeal.findMany({where:{status:'ACTIVE',mealId:null,startsAt:{gt:new Date()},...(area?{area:{contains:area,mode:'insensitive'}}:{})},orderBy:{startsAt:'asc'},take:12,select:{id:true,title:true,sponsorName:true,restaurantName:true,area:true,startsAt:true,remainingSlots:true,benefit:true}}),
  ['active-sponsored-meals'], { revalidate: 30 },
);
export async function getActiveStandaloneSponsoredMeals(area?: string){
  if(!process.env.DATABASE_URL) return [];
  return cachedActiveStandaloneSponsoredMeals(area??'');
}
const cachedActiveSeatCampaigns = unstable_cache(
  (area: string) => prisma.seatCampaign.findMany({where:{status:'ACTIVE',endsAt:{gt:new Date()},...(area?{area:{contains:area,mode:'insensitive'}}:{})},orderBy:{endsAt:'asc'},take:12,select:{id:true,restaurantName:true,area:true,remainingSeats:true,endsAt:true,benefit:true}}),
  ['active-seat-campaigns'], { revalidate: 30 },
);
export async function getActiveSeatCampaigns(area?: string){
  if(!process.env.DATABASE_URL) return [];
  return cachedActiveSeatCampaigns(area??'');
}
const cachedActiveCoupons = unstable_cache(
  (area: string) => prisma.coupon.findMany({where:{status:'ACTIVE',expiresAt:{gt:new Date()},...(area?{area:{contains:area,mode:'insensitive'}}:{})},orderBy:{expiresAt:'asc'},take:24,select:{id:true,title:true,restaurantName:true,area:true,benefit:true,expiresAt:true}}),
  ['active-coupons'], { revalidate: 30 },
);
export async function getActiveCoupons(area?: string){
  if(!process.env.DATABASE_URL) return [];
  return cachedActiveCoupons(area??'');
}
export async function getUserProfileData(raw: string){
  const parsed=idSchema.safeParse(raw);if(!parsed.success || !process.env.DATABASE_URL)return null;
  const id=parsed.data;
  const where: Prisma.MatchWhereInput={status:'COMPLETED',participants:{some:{userId:id}}};
  const [user,history]=await Promise.all([
    prisma.user.findUnique({where:{id},select:publicUser}),
    prisma.match.aggregate({where,_count:{_all:true},_max:{scheduledAt:true}}),
  ]);
  return user?{user,completedMealCount:history._count._all,lastDiningDate:history._max.scheduledAt}:null;
}
async function fetchMyPageData(userId: string){
  const [hostedMeals,joinRequests,matches,completedMatches,currentUser]=await Promise.all([
    prisma.meal.findMany({where:{hostId:userId},orderBy:{createdAt:'desc'},select:{id:true,title:true,status:true,area:true,genre:true,maxParticipants:true,_count:{select:{joinRequests:{where:{status:'ACCEPTED'}}}}}}),
    prisma.joinRequest.findMany({where:{userId,status:'PENDING'},orderBy:{createdAt:'desc'},select:{id:true,mealId:true,status:true,meal:{select:{title:true}},candidate:{select:{startTime:true}}}}),
    prisma.match.findMany({where:{status:'ACTIVE',participants:{some:{userId}}},orderBy:{scheduledAt:'desc'},select:{id:true,status:true,scheduledAt:true,meal:{select:{title:true}}}}),
    prisma.match.findMany({where:{status:'COMPLETED',participants:{some:{userId}}},orderBy:{scheduledAt:'desc'},take:5,select:{id:true,scheduledAt:true,meal:{select:{title:true,area:true,paymentType:true}},participants:{select:{user:{select:{id:true,image:true,displayName:true}}}}}}),
    prisma.user.findUnique({where:{id:userId},select:{isAdmin:true,onboardingCompletedAt:true,businessMemberships:{where:{OR:[{role:{in:['OWNER','ADMIN']}},{canPostToSocial:true}]},take:1,select:{businessAccount:{select:{name:true}}}}}})
  ]);
  return {hostedMeals,joinRequests,matches,completedMatches,businessMembership:currentUser?.businessMemberships[0]??null,isAdmin:currentUser?.isAdmin??false,onboardingCompletedAt:currentUser?.onboardingCompletedAt??null};
}
// requirePageUser()はcookies()を使う動的APIのため、unstable_cache対象の外側で呼ぶ必要がある。
// DB接続のレイテンシが大きいため、同じユーザーの短時間の再訪問・リロードではDBへ往復しないよう15秒キャッシュする。
const cachedFetchMyPageData = unstable_cache(fetchMyPageData, ['my-page-data', 'summary-v2'], { revalidate: 15 });
export async function getMyPageData(userId?: string){
  const uid = userId ?? await requirePageUser();
  const data = await cachedFetchMyPageData(uid);
  return {userId: uid, ...data};
}
export async function getMatchById(raw: string){
  const userId=await requirePageUser(); const id=idSchema.safeParse(raw);if(!id.success)return null;
  return prisma.match.findFirst({where:{id:id.data,participants:{some:{userId}}},select:{id:true,mealId:true,status:true,scheduledAt:true,meal:{select:{title:true,area:true,restaurant:true,hostId:true,status:true}},participants:{select:{userId:true,user:{select:publicUser}}},rescheduleProposals:{orderBy:{createdAt:'desc'},select:{id:true,proposedAt:true,proposerId:true,status:true,proposer:{select:{displayName:true}},votes:{select:{userId:true}}}},diningFeedbacks:{where:{fromUserId:userId},select:{toUserId:true}}}});
}
export async function getDiningHistory(){
  const userId=await requirePageUser();
  return prisma.match.findMany({where:{status:'COMPLETED',participants:{some:{userId}}},orderBy:{scheduledAt:'desc'},select:{id:true,scheduledAt:true,meal:{select:{title:true,area:true,paymentType:true}},participants:{select:{user:{select:{id:true,displayName:true,image:true,twitterUsername:true,diningTypes:publicUser.diningTypes}}}}}});
}
