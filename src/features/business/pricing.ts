import { discountedPriceYen } from '@/lib/business-capabilities';

export type PricingValues = { sponsoredMeal: number; seatCampaign: number; FREE: number; STANDARD: number; PRO: number; discountPercent: { STANDARD: number | null; PRO: number | null } };

export function estimateMonthlyPrice(values: PricingValues, sponsoredMeals: number, seatCampaigns: number, plan: 'FREE' | 'STANDARD' | 'PRO') {
  const percentOff = plan === 'FREE' ? null : values.discountPercent[plan];
  const sponsoredMealUnit = discountedPriceYen(values.sponsoredMeal, percentOff) ?? values.sponsoredMeal;
  const seatCampaignUnit = discountedPriceYen(values.seatCampaign, percentOff) ?? values.seatCampaign;
  const sponsoredMealsCost = sponsoredMealUnit * sponsoredMeals;
  const seatCampaignsCost = seatCampaignUnit * seatCampaigns;
  const total = values[plan] + sponsoredMealsCost + seatCampaignsCost;
  const totalWithoutDiscount = values[plan] + values.sponsoredMeal * sponsoredMeals + values.seatCampaign * seatCampaigns;
  return { subscription: values[plan], sponsoredMeals: sponsoredMealsCost, seatCampaigns: seatCampaignsCost, total, savings: Math.max(0, totalWithoutDiscount - total) };
}
