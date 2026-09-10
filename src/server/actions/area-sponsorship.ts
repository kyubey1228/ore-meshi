'use server';
import { z } from 'zod';
import { ensure, perform, transaction } from '@/server/action';
import { businessPostingMembership } from '@/server/business';

const schema = z.object({
  businessAccountId: z.string().min(1).max(100),
  area: z.string().trim().min(1).max(80),
  genre: z.string().trim().max(80).optional().default(''),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
});

// エリア×ジャンル単位のスポンサー掲載を下書き(DRAFT)として作成する。公開はStripe決済確定後のみ(webhook経由)。
export async function createAreaSponsorship(input: unknown) {
  return perform(async () => {
    const data = schema.parse(input);
    await businessPostingMembership(data.businessAccountId);
    const startsAt = new Date(data.startsAt), endsAt = new Date(data.endsAt);
    ensure(endsAt > new Date(), '終了日時はこれからの日時にしてください。');
    ensure(endsAt > startsAt, '終了日時は開始日時より後にしてください。');
    return transaction(async tx => {
      const created = await tx.areaSponsorship.create({
        data: { businessAccountId: data.businessAccountId, area: data.area, genre: data.genre || null, startsAt, endsAt, status: 'DRAFT' },
      });
      return `/business/area-sponsorship?created=${created.id}`;
    });
  });
}

export async function cancelAreaSponsorship(input: unknown) {
  return perform(async () => {
    const id = z.string().min(1).parse(input);
    await transaction(async tx => {
      const sponsorship = await tx.areaSponsorship.findUnique({ where: { id } });
      ensure(sponsorship, '掲載が見つかりません。');
      await businessPostingMembership(sponsorship.businessAccountId);
      ensure(sponsorship.status !== 'CANCELLED', 'すでにキャンセル済みです。');
      await tx.areaSponsorship.update({ where: { id }, data: { status: 'CANCELLED' } });
    });
  });
}
