import 'server-only';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { currentUserId } from '@/server/auth';
import { businessPostingMembership } from '@/server/business';

const couponIdSchema = z.string().trim().min(1).max(100);

export async function getCouponRedemptionStatus(couponIdInput: unknown) {
  const couponId = couponIdSchema.parse(couponIdInput);
  const userId = await currentUserId();
  if (!userId) return { redeemed: false, redeemedAt: null };
  const redemption = await prisma.couponRedemption.findUnique({
    where: { couponId_userId: { couponId, userId } },
    select: { redeemedAt: true },
  });
  return { redeemed: Boolean(redemption), redeemedAt: redemption?.redeemedAt ?? null };
}

export async function getCouponRedemptionCount(couponIdInput: unknown) {
  const couponId = couponIdSchema.parse(couponIdInput);
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId }, select: { businessAccountId: true } });
  if (!coupon) return null;
  await businessPostingMembership(coupon.businessAccountId);
  return prisma.couponRedemption.count({ where: { couponId, businessAccountId: coupon.businessAccountId } });
}
