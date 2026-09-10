import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// 複雑なAI分析は行わず、既存KPIの前期間比較から「大幅な変化」だけを検出する軽量ルールベース。
// 原因は断定せず、数値の変化のみを指摘する。
export async function getGrowthInsights(days: number): Promise<string[]> {
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

  const insights: string[] = [];
  const signupChange = pctChange(signupsCurrent, signupsPrev);
  const matchedChange = pctChange(matchedCurrent, matchedPrev);
  if (signupChange !== null && matchedChange !== null && Math.abs(signupChange) >= 15 && Math.abs(matchedChange) >= 15 && Math.sign(signupChange) !== Math.sign(matchedChange)) {
    insights.push(`登録数は前期間比${signupChange >= 0 ? '+' : ''}${Math.round(signupChange)}%ですが、成立数は${matchedChange >= 0 ? '+' : ''}${Math.round(matchedChange)}%です。`);
  } else {
    if (signupChange !== null && Math.abs(signupChange) >= 30) insights.push(`登録数が前期間比${signupChange >= 0 ? '+' : ''}${Math.round(signupChange)}%です。`);
    if (matchedChange !== null && Math.abs(matchedChange) >= 30) insights.push(`成立数が前期間比${matchedChange >= 0 ? '+' : ''}${Math.round(matchedChange)}%です。`);
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
      insights.push(`${area}エリアのFill Rateが前期間より${diffPt >= 0 ? '+' : ''}${Math.round(diffPt)}pt${diffPt >= 0 ? '上昇' : '低下'}しています。`);
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
    if (rate < 0.05) insights.push(`招待URLの開封数(${referralOpens})に対して登録完了(${referralSignups})が少なく、紹介経由の転換率が低い状態です。`);
  }
  if (shareEvents === 0 && signupsCurrent > 0) insights.push('この期間、X/LINEシェアの実行数が0件でした。');

  if (insights.length === 0) insights.push('この期間、大きな変化は検出されませんでした。');
  return insights;
}
