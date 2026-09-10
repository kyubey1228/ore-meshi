import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin';
import { getAreaGenreDashboard, getOpportunityRanking, toCsv } from '@/server/business-intelligence';
import { getAcquisitionDashboard, getCampaignDashboard } from '@/server/acquisition';

// 個人情報は一切含めない。エリア×ジャンル×期間の集計値のみをCSV化する。
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
  }
  const { type } = await params;
  const days = Number(new URL(request.url).searchParams.get('days') ?? '30') || 30;

  let csv = '';
  if (type === 'area-genre') {
    const { cells } = await getAreaGenreDashboard(days);
    csv = toCsv(cells.filter(c => c.dataSufficient).map(c => ({ area: c.area, genre: c.genre, demandIntents: c.demandIntents, activeMeals: c.activeMeals, matchedMeals: c.matchedMeals, completedMeals: c.completedMeals, fillRate: Math.round(c.fillRate * 100), estimatedParticipants: c.estimatedParticipants })));
  } else if (type === 'opportunity') {
    const rows = await getOpportunityRanking(days, 50);
    csv = toCsv(rows.map(r => ({ area: r.area, genre: r.genre, demandIntents: r.demandIntents, activeMeals: r.activeMeals, completedMeals: r.completedMeals, opportunityScore: Math.round(r.opportunityScore * 10) / 10 })));
  } else if (type === 'acquisition') {
    const { channels } = await getAcquisitionDashboard(days);
    csv = toCsv(channels.map(c => ({ channel: c.channel, signup: c.signup, activated: c.activated, matched: c.matched, completed: c.completed, signupCvr: Math.round(c.signupCvr * 100), completedCvr: Math.round(c.completedCvr * 100) })));
  } else if (type === 'campaigns') {
    const rows = await getCampaignDashboard(days);
    csv = toCsv(rows.map(r => ({ campaign: r.campaign, visits: r.visits, signup: r.signup, activated: r.activated, matched: r.matched, completed: r.completed, conversionRate: Math.round(r.conversionRate * 100) })));
  } else {
    return NextResponse.json({ ok: false, error: 'unknown export type' }, { status: 400 });
  }

  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${type}-${days}d.csv"` } });
}
