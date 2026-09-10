'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { perform } from '@/server/action';
import { requireAdmin } from '@/server/admin';
import { getOpportunityRanking } from '@/server/business-intelligence';

// Opportunity Rankingの上位をSalesCandidateへ反映する。既に営業中の候補は
// スコアだけを更新し、手作業で進めたステータスは維持する。
export async function generateSalesCandidates(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = z.object({
      days: z.number().int().min(1).max(90).default(30),
      limit: z.number().int().min(1).max(50).default(20),
    }).parse(input);
    const ranking = await getOpportunityRanking(data.days, data.limit);
    let created = 0;
    let updated = 0;

    for (const cell of ranking) {
      const existing = await prisma.salesCandidate.findUnique({
        where: { area_genre_storeName: { area: cell.area, genre: cell.genre, storeName: '' } },
      });
      if (existing) {
        await prisma.salesCandidate.update({
          where: { id: existing.id },
          data: { opportunityScore: cell.opportunityScore },
        });
        updated += 1;
      } else {
        await prisma.salesCandidate.create({
          data: {
            area: cell.area,
            genre: cell.genre,
            opportunityScore: cell.opportunityScore,
            status: 'NEW',
          },
        });
        created += 1;
      }
    }
    return `/admin/sales?created=${created}&updated=${updated}`;
  });
}

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['NEW', 'CONTACT_READY', 'CONTACTED', 'REPLIED', 'INTERESTED', 'REGISTERED', 'DECLINED', 'DO_NOT_CONTACT']),
});

export async function adminUpdateSalesCandidateStatus(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = statusSchema.parse(input);
    const movingToContacted = data.status === 'CONTACTED';
    await prisma.salesCandidate.update({
      where: { id: data.id },
      data: {
        status: data.status,
        ...(movingToContacted
          ? { lastContactedAt: new Date(), contactCount: { increment: 1 } }
          : {}),
      },
    });
    return '/admin/sales';
  });
}

const memoSchema = z.object({
  id: z.string().min(1),
  memo: z.string().trim().max(2000),
});

export async function adminUpdateSalesCandidateMemo(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = memoSchema.parse(input);
    await prisma.salesCandidate.update({
      where: { id: data.id },
      data: { memo: data.memo || null },
    });
    return '/admin/sales';
  });
}
