ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'INVITE_SHARE_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'INVITE_SHARE_COMPLETED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'INVITE_LINK_COPIED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'INVITE_QR_DISPLAYED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'INVITE_LINK_OPENED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'EMPTY_STATE_VIEWED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'EMPTY_STATE_CTA_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'SEO_LANDING_VIEWED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'CONTENT_IMAGE_GENERATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'CONTENT_IMAGE_DOWNLOADED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'BUSINESS_NOTIFICATION_SENT';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'BUSINESS_NOTIFICATION_OPENED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'BUSINESS_NOTIFICATION_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'BUSINESS_LIFECYCLE_TRIGGERED';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_ACTIVATION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_CAMPAIGN_NO_VIEWS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_CAMPAIGN_NO_ACTIONS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_FIRST_RESULT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_SUBSCRIPTION_ENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BUSINESS_CAMPAIGN_SUMMARY';
ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'BUSINESS';

ALTER TABLE "SocialContentDraft"
  ADD COLUMN "template" TEXT,
  ADD COLUMN "dataSource" JSONB,
  ADD COLUMN "imageFormat" TEXT,
  ADD COLUMN "generatedAt" TIMESTAMP(3),
  ADD COLUMN "postedAt" TIMESTAMP(3),
  ADD COLUMN "utmCampaign" TEXT;

ALTER TABLE "DailyMetrics"
  ADD COLUMN "invitesSent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "uniqueInviters" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inviteClicks" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inviteSignups" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "inviteActivated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "activatedUsers" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "businessSignups" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "businessActivated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sponsorPurchases" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "revenue" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "DailyMetricJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TABLE "DailyMetricJobRun" (
  "id" TEXT NOT NULL,
  "targetDate" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
  "status" "DailyMetricJobStatus" NOT NULL DEFAULT 'RUNNING',
  "errorMessage" TEXT,
  CONSTRAINT "DailyMetricJobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DailyMetricJobRun_targetDate_startedAt_idx" ON "DailyMetricJobRun"("targetDate", "startedAt");
CREATE INDEX "DailyMetricJobRun_status_startedAt_idx" ON "DailyMetricJobRun"("status", "startedAt");

CREATE TABLE "BusinessNotificationPreference" (
  "businessAccountId" TEXT NOT NULL,
  "activityEnabled" BOOLEAN NOT NULL DEFAULT true,
  "campaignPerformanceEnabled" BOOLEAN NOT NULL DEFAULT true,
  "billingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "growthTipsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessNotificationPreference_pkey" PRIMARY KEY ("businessAccountId")
);
CREATE TABLE "BusinessNotificationLog" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "notificationType" "NotificationType" NOT NULL,
  "triggerKey" TEXT NOT NULL,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessNotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessNotificationLog_triggerKey_key" ON "BusinessNotificationLog"("triggerKey");
CREATE INDEX "BusinessNotificationLog_businessAccountId_createdAt_idx" ON "BusinessNotificationLog"("businessAccountId", "createdAt");
CREATE INDEX "BusinessNotificationLog_notificationType_createdAt_idx" ON "BusinessNotificationLog"("notificationType", "createdAt");
ALTER TABLE "BusinessNotificationPreference" ADD CONSTRAINT "BusinessNotificationPreference_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessNotificationLog" ADD CONSTRAINT "BusinessNotificationLog_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
