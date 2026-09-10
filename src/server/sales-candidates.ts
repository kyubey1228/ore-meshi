import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { perform } from '@/server/action';
import { getOpportunityRanking, MIN_BUSINESS_SAMPLE_SIZE } from '@/server/business-intelligence';

const computeAdminSalesCandidates = () => prisma.salesCandidate.findMany({ orderBy: [{ status: 'asc' }, { opportunityScore: 'desc' }], take: 200 });
// 一覧は営業運用で頻繁に見るため短めのキャッシュ(30秒)に留める。
export async function getAdminSalesCandidates() { await requireAdmin(); return unstable_cache(computeAdminSalesCandidates, ['admin-sales-candidates'], { revalidate: 30 })(); }

// Opportunity Ranking(エリア×ジャンル単位、既存のbusiness-intelligence.tsをそのまま利用)の上位を
// SalesCandidateへ反映する。外部店舗データのスクレイピングは行わず、内部データのみで完結させる。
// 既に営業が進んでいる候補(NEW以外)はopportunityScoreだけ更新し、ステータスは上書きしない。
export async function generateSalesCandidates(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = z.object({ days: z.number().int().min(1).max(90).default(30), limit: z.number().int().min(1).max(50).default(20) }).parse(input);
    const ranking = await getOpportunityRanking(data.days, data.limit);
    let created = 0, updated = 0;
    for (const cell of ranking) {
      const existing = await prisma.salesCandidate.findUnique({ where: { area_genre_storeName: { area: cell.area, genre: cell.genre, storeName: '' } } });
      if (existing) {
        await prisma.salesCandidate.update({ where: { id: existing.id }, data: { opportunityScore: cell.opportunityScore } });
        updated += 1;
      } else {
        await prisma.salesCandidate.create({ data: { area: cell.area, genre: cell.genre, opportunityScore: cell.opportunityScore, status: 'NEW' } });
        created += 1;
      }
    }
    return `/admin/sales?created=${created}&updated=${updated}`;
  });
}

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(['NEW', 'CONTACT_READY', 'CONTACTED', 'REPLIED', 'INTERESTED', 'REGISTERED', 'DECLINED', 'DO_NOT_CONTACT']) });
export async function adminUpdateSalesCandidateStatus(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = statusSchema.parse(input);
    const movingToContacted = data.status === 'CONTACTED';
    await prisma.salesCandidate.update({
      where: { id: data.id },
      data: { status: data.status, ...(movingToContacted ? { lastContactedAt: new Date(), contactCount: { increment: 1 } } : {}) },
    });
    return '/admin/sales';
  });
}

const memoSchema = z.object({ id: z.string().min(1), memo: z.string().trim().max(2000) });
export async function adminUpdateSalesCandidateMemo(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = memoSchema.parse(input);
    await prisma.salesCandidate.update({ where: { id: data.id }, data: { memo: data.memo || null } });
    return '/admin/sales';
  });
}

// 営業文生成: 生成AI連携は無いため、実データ(需要件数・供給不足数)をテンプレートへ埋め込む方式。
// サンプル数がMIN_BUSINESS_SAMPLE_SIZE未満、または候補がまだ需要データを持たない場合は
// 具体的な数値を出さず「食事相手を探しているユーザーがいます」程度に留める(捏造しない)。
export type SalesCopyInput = { area: string; genre: string; demandIntents: number; activeMeals: number; days: number };

function hasSufficientData(input: SalesCopyInput) {
  return input.demandIntents + input.activeMeals >= MIN_BUSINESS_SAMPLE_SIZE;
}

export function generateSalesCopy(input: SalesCopyInput) {
  const gap = Math.max(0, input.demandIntents - input.activeMeals);
  const sufficient = hasSufficientData(input);
  const dataLine = sufficient
    ? `直近${input.days}日間、${input.area}エリアでは${input.genre}カテゴリの食事需要が${input.demandIntents}件ありました(現在の募集は${input.activeMeals}件、不足${gap}件)。`
    : `${input.area}エリアで${input.genre}を含む食事相手を探しているユーザーがいます。`;

  const contactForm = [`「俺は誰かと飯が食いたい！」と申します。${dataLine}`, '貴店を無料で掲載できます。まずは今日の空席だけ掲載して試すこともできます。', 'よろしければ詳細をお送りします。'].join('\n');
  const email = [`件名: ${input.area}エリアでの集客・空席対策のご案内`, '', 'はじめまして、「俺は誰かと飯が食いたい！」運営です。', '', dataLine, '', '無料で店舗ページを作成でき、有料機能は後から選べます。今日の空席だけ掲載して試すこともできます。', '', 'ご興味があれば、下記より無料登録いただけます。', '(登録URLはここに挿入)'].join('\n');
  const dm = [`【${input.area}】${dataLine}`, '無料で店舗ページを作成できます。今日の空席だけ掲載して試すこともできます。よければDMでご案内します。'].join('\n');
  const phoneScript = [`お忙しいところ失礼します。「俺は誰かと飯が食いたい！」という飲食店向け集客サービスの者です。`, dataLine, '無料で登録でき、今日の空席だけ掲載して試すこともできます。1分ほどお時間よろしいでしょうか？'].join('\n');

  return { contactForm, email, dm, phoneScript, dataSufficient: sufficient };
}

// Priority F: Sales Queue。開発者が考えなくても「今日何をすればいいか」がAdminを開くだけで
// 分かる状態にする。新規テーブルは増やさず、既存3つのデータソースを束ねるだけに留める。
export async function getSalesQueue(limit = 10) {
  await requireAdmin();
  const staleBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [readyCandidates, staleLeads, inactiveBusinesses] = await Promise.all([
    prisma.salesCandidate.findMany({ where: { status: 'CONTACT_READY' }, orderBy: { opportunityScore: 'desc' }, take: limit }),
    prisma.businessLead.findMany({ where: { status: 'CONTACTED', updatedAt: { lte: staleBefore } }, orderBy: { updatedAt: 'asc' }, take: limit, select: { id: true, companyName: true, area: true, updatedAt: true } }),
    prisma.businessAccount.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, name: true, area: true, createdAt: true, _count: { select: { sponsoredMeals: true, seatCampaigns: true } } } }),
  ]);

  const queue: { id: string; kind: 'CONTACT_READY' | 'LEAD_FOLLOWUP' | 'BUSINESS_ONBOARDING'; title: string; detail: string; href: string }[] = [];
  for (const c of readyCandidates) queue.push({ id: `candidate:${c.id}`, kind: 'CONTACT_READY', title: `${c.area} × ${c.genre}`, detail: `Opportunity Score ${c.opportunityScore.toFixed(1)} · 連絡推奨`, href: '/admin/sales' });
  for (const l of staleLeads) queue.push({ id: `lead:${l.id}`, kind: 'LEAD_FOLLOWUP', title: l.companyName, detail: `${l.area} · ${Math.floor((Date.now() - l.updatedAt.getTime()) / (24 * 60 * 60 * 1000))}日前に連絡`, href: `/admin/leads/${l.id}` });
  for (const b of inactiveBusinesses) {
    if (b._count.sponsoredMeals === 0 && b._count.seatCampaigns === 0) {
      queue.push({ id: `business:${b.id}`, kind: 'BUSINESS_ONBOARDING', title: b.name, detail: `${b.area ?? 'エリア未設定'} · 登録済みだが空席/スポンサー飯未投稿`, href: '/admin/business/accounts' });
    }
  }
  return queue.slice(0, limit);
}
