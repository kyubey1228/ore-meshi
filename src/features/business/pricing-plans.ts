import type { BusinessPlan } from '@prisma/client';

export type PricingPlanCopy = { plan: BusinessPlan; title: string; features: string[] };

export const PRICING_PLAN_COPY: PricingPlanCopy[] = [
  { plan: 'FREE', title: 'FREE', features: ['店舗プロフィール', '基本クーポン'] },
  { plan: 'STANDARD', title: 'STANDARD', features: ['スポンサー飯', '空席スポンサー', 'クーポン複数', '送客分析'] },
  { plan: 'PRO', title: 'PRO', features: ['STANDARDの全機能', '直接広告(Direct Ad)', '複数店舗', '詳細分析', '優先掲載'] },
];
