'use server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { perform, ensure } from '@/server/action';
import { requireAdmin } from '@/server/admin';

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  area: z.string().trim().min(1).max(80),
  offerText: z.string().trim().min(1).max(120),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  maxPartners: z.number().int().min(1).max(1000).nullable(),
});

// 作成直後は公開LP(/business, /business/partner)に出さないようDRAFTで作る。
// 一覧画面のステータス変更でACTIVEにして初めて表示される。
export async function adminCreatePartnerCampaign(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = createSchema.parse(input);
    const startsAt = new Date(data.startsAt), endsAt = new Date(data.endsAt);
    ensure(endsAt > startsAt, '終了日時は開始日時より後にしてください。');
    await prisma.partnerCampaign.create({
      data: {
        slug: `partner-${randomUUID().slice(0, 12)}`,
        title: data.title,
        description: data.description,
        area: data.area,
        offerText: data.offerText,
        startsAt,
        endsAt,
        maxPartners: data.maxPartners,
        status: 'DRAFT',
      },
    });
    return '/admin/business/partners';
  });
}

const statusSchema = z.object({ id: z.string().min(1), status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']) });
export async function adminUpdatePartnerCampaignStatus(input: unknown) {
  return perform(async () => {
    await requireAdmin();
    const data = statusSchema.parse(input);
    await prisma.partnerCampaign.update({ where: { id: data.id }, data: { status: data.status } });
    return '/admin/business/partners';
  });
}
