'use server';import{z}from'zod';import{requireAdmin}from '@/server/admin';import{recordGrowthEvent}from '@/server/growth';
const CATEGORIES=['AREA_EXPANSION','DEMAND_SHORTAGE','SUPPLY_SHORTAGE','MATCH_RATE_DROP','FIRST_JOIN_DROP','REFERRAL_ACTIVATION','BUSINESS_SALES','RETENTION']as const;
// 管理者がGrowth Dashboardの推奨アクションリンクを踏んだ回数のみを記録する(スパム対策の自動送信は一切行わない)。
export async function recordGrowthRecommendationAction(category:string){
  const parsed=z.enum(CATEGORIES).safeParse(category);
  if(!parsed.success)return;
  await requireAdmin();
  await recordGrowthEvent('GROWTH_RECOMMENDATION_ACTIONED',{metadata:{category:parsed.data}});
}
