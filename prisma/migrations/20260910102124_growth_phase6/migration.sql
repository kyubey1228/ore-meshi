-- SponsoredMeal: 実際のMeal作成時にジャンルを引き継げるようにする(任意項目)。
ALTER TABLE "SponsoredMeal" ADD COLUMN "genre" TEXT;

-- 期間別の売上集計(status='PAID' AND paidAt範囲)で使用するindex。
CREATE INDEX "SponsorOrder_status_paidAt_idx" ON "SponsorOrder"("status", "paidAt");
