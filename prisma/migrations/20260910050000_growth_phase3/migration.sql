-- AlterEnum
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_SENT';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_OPENED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_CLICKED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_CONVERSION';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DEMAND_INTENT_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DEMAND_INTENT_MATCHED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DEMAND_CLUSTER_VIEWED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DEMAND_RECRUITMENT_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DEMAND_MATCH_COMPLETED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'RECRUITMENT_PREDICTION_VIEWED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'RECRUITMENT_PREDICTION_APPLIED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'DINING_FEEDBACK_SUBMITTED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'RECOMMENDATION_PROFILE_UPDATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'REFERRAL_REWARD_EARNED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'REFERRAL_ACTIVATION_COMPLETED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'REPEAT_JOIN_STARTED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'REPEAT_RECRUITMENT_CREATED';

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN "activatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Meal" ADD COLUMN "firstJoinAt" TIMESTAMP(3),
ADD COLUMN "matchedAt" TIMESTAMP(3),
ADD COLUMN "demandClusterKey" TEXT;

-- CreateIndex
CREATE INDEX "Meal_area_genre_status_idx" ON "Meal"("area", "genre", "status");

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('JOIN_REQUEST_RECEIVED', 'JOIN_REQUEST_ACCEPTED', 'MEAL_MATCHED', 'LAST_SLOT_REACHED', 'DEADLINE_SOON', 'MEAL_TODAY', 'MEAL_STARTING_SOON', 'DEMAND_CLUSTER_READY');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('RECRUITMENT', 'PARTICIPATION', 'RECOMMENDATION');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mealId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "recruitmentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "participationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recommendationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DemandIntentStatus" AS ENUM ('ACTIVE', 'MATCHED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DemandIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "genre" TEXT,
    "timeRange" TEXT,
    "desiredGroupSize" INTEGER NOT NULL DEFAULT 2,
    "status" "DemandIntentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandIntent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DemandIntent_area_genre_status_createdAt_idx" ON "DemandIntent"("area", "genre", "status", "createdAt");
CREATE INDEX "DemandIntent_status_expiresAt_idx" ON "DemandIntent"("status", "expiresAt");
CREATE INDEX "DemandIntent_userId_idx" ON "DemandIntent"("userId");
ALTER TABLE "DemandIntent" ADD CONSTRAINT "DemandIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserRecommendationProfile" (
    "userId" TEXT NOT NULL,
    "genreWeights" JSONB NOT NULL DEFAULT '{}',
    "areaWeights" JSONB NOT NULL DEFAULT '{}',
    "groupSizeWeights" JSONB NOT NULL DEFAULT '{}',
    "timeWeights" JSONB NOT NULL DEFAULT '{}',
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRecommendationProfile_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserRecommendationProfile" ADD CONSTRAINT "UserRecommendationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
