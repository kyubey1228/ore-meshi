'use server';

import { z } from 'zod';
import { ensure, perform, transaction } from '@/server/action';
import { getReferralAttribution } from '@/server/business';

const couponIdSchema = z.string().trim().min(1).max(100);

/**
 * Records a signed-in user's redemption declaration once per coupon.
 * A future QR flow can call the same database transaction after staff confirmation.
 */
export async function redeemCoupon(couponIdInput: unknown) {
  return perform(async (userId) => {
    const couponId = couponIdSchema.parse(couponIdInput);
    const attribution = await getReferralAttribution();
    return transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({ where: { id: couponId }, include: { businessAccount: true } });
      ensure(coupon, 'クーポンが見つかりません。');
      ensure(coupon.businessAccount.status === 'ACTIVE', 'この店舗のクーポンは現在利用できません。');
      ensure(coupon.status === 'ACTIVE' && coupon.expiresAt > new Date(), 'このクーポンは利用期間を終了しています。');
      const redemption = await tx.couponRedemption.create({
        data: { couponId: coupon.id, businessAccountId: coupon.businessAccountId, userId },
      });
      await tx.referralEvent.create({
        data: {
          businessAccountId: coupon.businessAccountId,
          socialPostId: attribution?.socialPostId,
          entityType: 'COUPON',
          entityId: coupon.id,
          eventType: 'COUPON_REDEEMED',
          sourceEventId: attribution?.id,
          conversionEntityId: redemption.id,
          utmSource: attribution?.utmSource,
          utmMedium: attribution?.utmMedium,
          utmCampaign: attribution?.utmCampaign,
        },
      });
    });
  });
}
