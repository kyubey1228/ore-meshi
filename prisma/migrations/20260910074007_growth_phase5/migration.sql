-- BusinessMarketingEventType: Phase 5追加値(収益化ファネル計測)
ALTER TYPE "BusinessMarketingEventType" ADD VALUE 'SPONSOR_PRODUCT_VIEW';
ALTER TYPE "BusinessMarketingEventType" ADD VALUE 'SPONSORED_MEAL_ACTIVATED';
ALTER TYPE "BusinessMarketingEventType" ADD VALUE 'SEAT_CAMPAIGN_ACTIVATED';
ALTER TYPE "BusinessMarketingEventType" ADD VALUE 'SUBSCRIPTION_STARTED';

-- AreaSponsorship: エリア×ジャンル単位の期間限定スポンサー掲載。
-- 決済/失効/ステータス遷移は既存のSponsorOrder(orderType=AREA_FEATURED)をそのまま再利用するため、
-- 専用のstripeOrderId列は持たせない(SponsoredMeal/SeatCampaignと同じ設計方針)。
CREATE TABLE "AreaSponsorship" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "genre" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaSponsorship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AreaSponsorship_area_genre_status_idx" ON "AreaSponsorship"("area", "genre", "status");
CREATE INDEX "AreaSponsorship_status_endsAt_idx" ON "AreaSponsorship"("status", "endsAt");
CREATE INDEX "AreaSponsorship_businessAccountId_createdAt_idx" ON "AreaSponsorship"("businessAccountId", "createdAt");

ALTER TABLE "AreaSponsorship" ADD CONSTRAINT "AreaSponsorship_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 5で使用頻度が増えるGrowthEvent集計向けの追加index。
CREATE INDEX IF NOT EXISTS "GrowthEvent_source_createdAt_idx" ON "GrowthEvent"("source", "createdAt");

-- ReferralEventType: MatchedとCompletedを混同しないための追加値(店舗Business Analytics向け)。
ALTER TYPE "ReferralEventType" ADD VALUE 'COMPLETED';
