import 'server-only';import{cache}from'react';import{unstable_cache}from'next/cache';import{prisma}from '@/lib/prisma';import{currentUserId}from '@/server/auth';import{ensure}from '@/server/action';import{measurePerformance}from '@/lib/performance';
const getAdmin=cache(async()=>measurePerformance('ADMIN','requireAdmin',async()=>{const userId=await currentUserId();ensure(userId,'ログインしてください。');const user=await prisma.user.findUnique({where:{id:userId},select:{id:true,isAdmin:true}});ensure(user?.isAdmin,'管理者権限が必要です。');return user;}));
export async function requireAdmin(){return getAdmin();}
const computeAdminLeads=()=>prisma.businessLead.findMany({include:{businessAccount:true},orderBy:{createdAt:'desc'},take:200});
// admin限定の閲覧なので30秒キャッシュ(頻繁なリロードのたびに200件+関連の再取得をしない)。
export async function getAdminLeads(){await requireAdmin();return unstable_cache(computeAdminLeads,['admin-leads'],{revalidate:30})();}
export async function getAdminLead(id:string){await requireAdmin();return prisma.businessLead.findUnique({where:{id},include:{businessAccount:true,assignedAdmin:true,partnerCampaign:true,notes:{include:{adminUser:{select:{displayName:true}}},orderBy:{createdAt:'desc'}}}});}
async function computeSalesFunnel(){const [events,leadTotal,won]=await Promise.all([prisma.businessMarketingEvent.groupBy({by:['eventType'],_count:{_all:true}}),prisma.businessLead.count(),prisma.businessLead.count({where:{status:'WON'}})]);const counts:Record<string,number>=Object.fromEntries(events.map(e=>[e.eventType,e._count._all]));const lpViews=(counts.LP_VIEW??0)+(counts.BUSINESS_LP_VIEW??0);return{counts:{...counts,LP_VIEW:lpViews} as Record<string,number>,leadTotal,won,contactRate:lpViews?leadTotal/lpViews:0,signupRate:lpViews?(counts.SIGNUP_COMPLETED??0)/lpViews:0,checkoutRate:(counts.SIGNUP_COMPLETED??0)?(counts.CHECKOUT_STARTED??0)/(counts.SIGNUP_COMPLETED??1):0,paymentRate:(counts.CHECKOUT_STARTED??0)?(counts.CHECKOUT_COMPLETED??0)/(counts.CHECKOUT_STARTED??1):0,leadWinRate:leadTotal?won/leadTotal:0};}
export async function getSalesFunnel(){await requireAdmin();return unstable_cache(computeSalesFunnel,['sales-funnel'],{revalidate:60})();}
const computeAdminBusinessAccounts=()=>prisma.businessAccount.findMany({where:{status:'ACTIVE'},select:{id:true,name:true,area:true},orderBy:{name:'asc'},take:500});
// 施策作成フォームの店舗選択肢用。運用アカウント数はまだ多くないため全件取得で十分。
export async function getAdminBusinessAccounts(){await requireAdmin();return unstable_cache(computeAdminBusinessAccounts,['admin-business-accounts'],{revalidate:60})();}
async function computeAdminCampaigns(){
  const [sponsoredMeals,sponsorCampaigns,seatCampaigns,coupons]=await Promise.all([
    prisma.sponsoredMeal.findMany({orderBy:{createdAt:'desc'},take:30,select:{id:true,title:true,area:true,status:true,createdAt:true,businessAccount:{select:{name:true}}}}),
    prisma.sponsorCampaign.findMany({orderBy:{createdAt:'desc'},take:30,select:{id:true,title:true,area:true,status:true,createdAt:true,businessAccount:{select:{name:true}}}}),
    prisma.seatCampaign.findMany({orderBy:{createdAt:'desc'},take:30,select:{id:true,restaurantName:true,area:true,status:true,createdAt:true,businessAccount:{select:{name:true}}}}),
    prisma.coupon.findMany({orderBy:{createdAt:'desc'},take:30,select:{id:true,title:true,area:true,status:true,createdAt:true,businessAccount:{select:{name:true}}}}),
  ]);
  return [
    ...sponsoredMeals.map(item=>({kind:'SPONSORED_MEAL' as const,id:item.id,title:item.title,area:item.area,status:item.status,createdAt:item.createdAt,businessName:item.businessAccount.name})),
    ...sponsorCampaigns.map(item=>({kind:'SPONSOR_CAMPAIGN' as const,id:item.id,title:item.title,area:item.area,status:item.status,createdAt:item.createdAt,businessName:item.businessAccount.name})),
    ...seatCampaigns.map(item=>({kind:'SEAT_CAMPAIGN' as const,id:item.id,title:`今、席空いてます：${item.restaurantName}`,area:item.area,status:item.status,createdAt:item.createdAt,businessName:item.businessAccount.name})),
    ...coupons.map(item=>({kind:'COUPON' as const,id:item.id,title:item.title,area:item.area,status:item.status,createdAt:item.createdAt,businessName:item.businessAccount.name})),
  ].sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
}
export async function getAdminCampaigns(){await requireAdmin();return unstable_cache(computeAdminCampaigns,['admin-campaigns'],{revalidate:30})();}
const computeAdminPartnerCampaigns=()=>prisma.partnerCampaign.findMany({orderBy:{createdAt:'desc'},take:100,select:{id:true,slug:true,title:true,description:true,area:true,offerText:true,startsAt:true,endsAt:true,maxPartners:true,joinedPartners:true,status:true,createdAt:true,_count:{select:{members:true,leads:true}}}});
// 公開LP(/business, /business/partner)にACTIVE状態のまま出続けるため、DRAFT/ENDED/CANCELLEDも含め全件をadminで見られるようにする。
export async function getAdminPartnerCampaigns(){await requireAdmin();return unstable_cache(computeAdminPartnerCampaigns,['admin-partner-campaigns'],{revalidate:30})();}
