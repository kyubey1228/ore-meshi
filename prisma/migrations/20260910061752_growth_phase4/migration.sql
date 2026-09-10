-- GrowthEventType: Phase 4追加値
ALTER TYPE "GrowthEventType" ADD VALUE 'DEMAND_CANDIDATE_FOUND';
ALTER TYPE "GrowthEventType" ADD VALUE 'DEMAND_MATCH_NOTIFICATION_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE 'DEMAND_MATCH_NOTIFICATION_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE 'DEMAND_JOIN_STARTED';
ALTER TYPE "GrowthEventType" ADD VALUE 'DEMAND_JOIN_COMPLETED';
ALTER TYPE "GrowthEventType" ADD VALUE 'EMAIL_SENT';
ALTER TYPE "GrowthEventType" ADD VALUE 'EMAIL_DELIVERY_FAILED';
ALTER TYPE "GrowthEventType" ADD VALUE 'EMAIL_LINK_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE 'EMAIL_CONVERSION';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEAL_MATCHED';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEAL_COMPLETION_CONFIRMATION_REQUESTED';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEAL_COMPLETED';
ALTER TYPE "GrowthEventType" ADD VALUE 'MEAL_NOT_COMPLETED';

-- NotificationType: Phase 4追加値
ALTER TYPE "NotificationType" ADD VALUE 'DEMAND_MATCH_FOUND';
ALTER TYPE "NotificationType" ADD VALUE 'MEAL_COMPLETION_CHECK';

-- Match: Matched(必要人数到達)とCompleted(実際の開催確認)を明確に分離するための時刻カラム
ALTER TABLE "Match" ADD COLUMN "completedAt" TIMESTAMP(3);

-- GrowthEvent: UTM medium/campaign(utm_sourceは既存sourceカラムを再利用)
ALTER TABLE "GrowthEvent" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "GrowthEvent" ADD COLUMN "utmCampaign" TEXT;
CREATE INDEX "GrowthEvent_utmCampaign_createdAt_idx" ON "GrowthEvent"("utmCampaign", "createdAt");

-- Notification: メール送信/失敗/クリックの計測
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailFailedAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "emailClickedAt" TIMESTAMP(3);

-- NotificationPreference: トランザクション/マーケティングメールの可否を区別
ALTER TABLE "NotificationPreference" ADD COLUMN "emailTransactionalEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationPreference" ADD COLUMN "emailMarketingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- DemandIntent: 実際に参加した募集への軽量な参照(FK制約なし、Meal.demandClusterKeyと同様の方針)
ALTER TABLE "DemandIntent" ADD COLUMN "matchedMealId" TEXT;
