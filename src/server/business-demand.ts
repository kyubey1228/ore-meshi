import 'server-only';
import { requireBillingMembership } from '@/server/billing/auth';
import { getBusinessPlan } from '@/server/billing';
import { getAreaGenreMatrix, MIN_BUSINESS_SAMPLE_SIZE, rankOpportunity } from '@/server/business-intelligence';

// Business向けDemand Intelligence。Adminと同じ集計(getAreaGenreMatrix)を再利用しつつ、
// プランに応じて開示範囲を変える(FREE=概要のみ/STANDARD=詳細/PRO=比較まで)。個人データは一切含めない。
export async function getBusinessDemandIntelligence(businessAccountId: string, days: number) {
  const membership = await requireBillingMembership(businessAccountId);
  const plan = await getBusinessPlan(membership.businessAccountId);
  const cells = await getAreaGenreMatrix(days);
  const sufficient = cells.filter(c => c.demandIntents + c.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE);

  if (plan === 'FREE') {
    const top = rankOpportunity(cells, 3);
    return { plan, tier: 'SUMMARY' as const, top, table: [], comparison: [] };
  }

  const table = sufficient
    .map(c => ({ ...c, fillRate: c.activeMeals ? c.matchedMeals / c.activeMeals : 0 }))
    .sort((a, b) => b.demandIntents - a.demandIntents)
    .slice(0, 30);

  if (plan === 'STANDARD') {
    return { plan, tier: 'DETAIL' as const, top: [], table, comparison: [] };
  }

  // PRO: エリア比較・Campaign比較用に、需要/供給/成立を並べたOpportunity上位をより多く返す。
  const comparison = rankOpportunity(cells, 15);
  return { plan, tier: 'ADVANCED' as const, top: [], table, comparison };
}
