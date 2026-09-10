ALTER TABLE "SponsoredMeal" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SeatCampaign" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponRedemption_couponId_userId_key" ON "CouponRedemption"("couponId", "userId");
CREATE INDEX "CouponRedemption_businessAccountId_redeemedAt_idx" ON "CouponRedemption"("businessAccountId", "redeemedAt");
CREATE INDEX "CouponRedemption_userId_redeemedAt_idx" ON "CouponRedemption"("userId", "redeemedAt");

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
