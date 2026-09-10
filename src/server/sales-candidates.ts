import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
export { generateSalesCopy } from '@/lib/business-opportunity';

const computeAdminSalesCandidates = () => prisma.salesCandidate.findMany({ orderBy: [{ status: 'asc' }, { opportunityScore: 'desc' }], take: 200 });
// 一覧は営業運用で頻繁に見るため短めのキャッシュ(30秒)に留める。
export async function getAdminSalesCandidates() { await requireAdmin(); return unstable_cache(computeAdminSalesCandidates, ['admin-sales-candidates'], { revalidate: 30 })(); }

// 営業文生成: 生成AI連携は無いため、実データ(需要件数・供給不足数)をテンプレートへ埋め込む方式。
// サンプル数がMIN_BUSINESS_SAMPLE_SIZE未満、または候補がまだ需要データを持たない場合は
// 具体的な数値を出さず「食事相手を探しているユーザーがいます」程度に留める(捏造しない)。

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
