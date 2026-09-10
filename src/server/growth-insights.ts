import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { getAreaGenreMatrix, MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';
import { getAcquisitionDashboard } from '@/server/acquisition';

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export type GrowthRecommendationCategory =
  | 'AREA_EXPANSION'
  | 'DEMAND_SHORTAGE'
  | 'SUPPLY_SHORTAGE'
  | 'MATCH_RATE_DROP'
  | 'FIRST_JOIN_DROP'
  | 'REFERRAL_ACTIVATION'
  | 'BUSINESS_SALES'
  | 'RETENTION';

export type GrowthRecommendationAction = { label: string; href: string };
export type GrowthInsight = { text: string; category: GrowthRecommendationCategory; actions: GrowthRecommendationAction[] };

// カテゴリごとに「じゃあ何をすればいいか」を既存の管理画面に接続する。
// 新しい画面は作らず、既存のSales Queue/Business Dashboard/Content Studioへ誘導するだけに留める。
function actionsFor(category: GrowthRecommendationCategory): GrowthRecommendationAction[] {
  switch (category) {
    case 'SUPPLY_SHORTAGE':
    case 'BUSINESS_SALES':
      return [{ label: '営業候補・Sales Queueを見る', href: '/admin/sales' }];
    case 'DEMAND_SHORTAGE':
    case 'AREA_EXPANSION':
      return [{ label: 'Business Dashboardで需給を見る', href: '/admin/business' }];
    case 'REFERRAL_ACTIVATION':
      return [{ label: 'Content Studioで訴求コンテンツを作る', href: '/admin/content' }];
    case 'MATCH_RATE_DROP':
    case 'FIRST_JOIN_DROP':
    case 'RETENTION':
      return [];
  }
}

function insight(text: string, category: GrowthRecommendationCategory): GrowthInsight {
  return { text, category, actions: actionsFor(category) };
}

// 複雑なAI分析は行わず、既存KPIの前期間比較から「大幅な変化」だけを検出する軽量ルールベース。
// 原因は断定せず、数値の変化のみを指摘する。カテゴリはあくまで「次にどの管理画面を見るか」の分類であり、
// 変化の良し悪し(悪化/改善)そのものを判定するものではない。
export async function getGrowthInsights(days: number): Promise<GrowthInsight[]> {
  await requireAdmin();
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(now.getTime() - days * 2 * 24 * 60 * 60 * 1000);

  const [signupsCurrent, signupsPrev, matchedCurrent, matchedPrev] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.meal.count({ where: { matchedAt: { gte: since } } }),
    prisma.meal.count({ where: { matchedAt: { gte: prevSince, lt: since } } }),
  ]);

  const insights: GrowthInsight[] = [];
  const signupChange = pctChange(signupsCurrent, signupsPrev);
  const matchedChange = pctChange(matchedCurrent, matchedPrev);
  if (signupChange !== null && matchedChange !== null && Math.abs(signupChange) >= 15 && Math.abs(matchedChange) >= 15 && Math.sign(signupChange) !== Math.sign(matchedChange)) {
    insights.push(insight(`登録数は前期間比${signupChange >= 0 ? '+' : ''}${Math.round(signupChange)}%ですが、成立数は${matchedChange >= 0 ? '+' : ''}${Math.round(matchedChange)}%です。`, 'MATCH_RATE_DROP'));
  } else {
    if (signupChange !== null && Math.abs(signupChange) >= 30) insights.push(insight(`登録数が前期間比${signupChange >= 0 ? '+' : ''}${Math.round(signupChange)}%です。`, 'RETENTION'));
    if (matchedChange !== null && Math.abs(matchedChange) >= 30) insights.push(insight(`成立数が前期間比${matchedChange >= 0 ? '+' : ''}${Math.round(matchedChange)}%です。`, 'MATCH_RATE_DROP'));
  }

  // エリア別FillRateの前期間比較(件数が少ないエリアはノイズが大きいため、一定件数以上のみ対象)。
  const [mealsCurrent, mealsPrev] = await Promise.all([
    prisma.meal.findMany({ where: { createdAt: { gte: since } }, select: { area: true, status: true } }),
    prisma.meal.findMany({ where: { createdAt: { gte: prevSince, lt: since } }, select: { area: true, status: true } }),
  ]);
  const fillRateByArea = (rows: { area: string; status: string }[]) => {
    const byArea = new Map<string, { total: number; matched: number }>();
    for (const r of rows) {
      const b = byArea.get(r.area) ?? { total: 0, matched: 0 };
      b.total++; if (r.status === 'MATCHED') b.matched++;
      byArea.set(r.area, b);
    }
    return byArea;
  };
  const currentByArea = fillRateByArea(mealsCurrent);
  const prevByArea = fillRateByArea(mealsPrev);
  for (const [area, cur] of currentByArea) {
    const prev = prevByArea.get(area);
    if (!prev || cur.total < 5 || prev.total < 5) continue;
    const curRate = cur.matched / cur.total;
    const prevRate = prev.matched / prev.total;
    const diffPt = (curRate - prevRate) * 100;
    if (Math.abs(diffPt) >= 14) {
      insights.push(insight(`${area}エリアのFill Rateが前期間より${diffPt >= 0 ? '+' : ''}${Math.round(diffPt)}pt${diffPt >= 0 ? '上昇' : '低下'}しています。`, diffPt >= 0 ? 'AREA_EXPANSION' : 'SUPPLY_SHORTAGE'));
    }
  }

  // シェア経由の登録率とActivated Rate(簡易版): GrowthEventのソース別に大まかな傾向のみ。
  const [shareEvents, referralOpens, referralSignups] = await Promise.all([
    prisma.growthEvent.count({ where: { eventType: { in: ['RECRUITMENT_SHARE_X', 'RECRUITMENT_SHARE_LINE'] }, createdAt: { gte: since } } }),
    prisma.growthEvent.count({ where: { eventType: 'REFERRAL_LINK_OPENED', createdAt: { gte: since } } }),
    prisma.growthEvent.count({ where: { eventType: 'REFERRAL_SIGNUP_COMPLETED', createdAt: { gte: since } } }),
  ]);
  if (referralOpens >= 10) {
    const rate = referralSignups / referralOpens;
    if (rate < 0.05) insights.push(insight(`招待URLの開封数(${referralOpens})に対して登録完了(${referralSignups})が少なく、紹介経由の転換率が低い状態です。`, 'REFERRAL_ACTIVATION'));
  }
  if (shareEvents === 0 && signupsCurrent > 0) insights.push(insight('この期間、X/LINEシェアの実行数が0件でした。', 'REFERRAL_ACTIVATION'));

  // Business視点: エリア×ジャンルのDemand/Supply Ratio、チャネル別Completed Rateの差。因果は断定せず数値のみ提示する。
  const cells = await getAreaGenreMatrix(days);
  const highRatio = cells
    .filter(c => c.demandIntents + c.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE && c.activeMeals > 0)
    .map(c => ({ ...c, ratio: c.demandIntents / c.activeMeals }))
    .sort((a, b) => b.ratio - a.ratio)[0];
  if (highRatio && highRatio.ratio >= 3) insights.push(insight(`${highRatio.area}の${highRatio.genre}はDemand/Supply Ratioが${highRatio.ratio.toFixed(1)}倍と高い状態です（Demand Intent${highRatio.demandIntents}件に対し募集${highRatio.activeMeals}件）。`, 'SUPPLY_SHORTAGE'));

  const acquisition = await getAcquisitionDashboard(days);
  const eligible = acquisition.channels.filter(c => c.signup >= 10);
  if (eligible.length >= 2) {
    const bySignup = [...eligible].sort((a, b) => b.signup - a.signup)[0];
    const byCompletedRate = [...eligible].sort((a, b) => b.completedCvr - a.completedCvr)[0];
    if (bySignup.channel !== byCompletedRate.channel) {
      insights.push(insight(`${bySignup.channel}経由の登録は最多（${bySignup.signup}件）ですが、Completed Rateは${percentText(bySignup.completedCvr)}で、${byCompletedRate.channel}（${percentText(byCompletedRate.completedCvr)}）より低い状態です。`, 'FIRST_JOIN_DROP'));
    }
  }

  if (insights.length === 0) insights.push(insight('この期間、大きな変化は検出されませんでした。', 'RETENTION'));
  return insights;
}

function percentText(n: number) { return `${Math.round(n * 100)}%`; }
