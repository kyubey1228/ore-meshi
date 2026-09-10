-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredArea" TEXT,
ADD COLUMN     "preferredGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "GrowthEventType" AS ENUM ('SIGNUP_CTA_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'RECRUITMENT_VIEWED', 'RECRUITMENT_JOIN_CLICKED', 'RECRUITMENT_CREATE_CLICKED', 'RECRUITMENT_SHARED', 'RECRUITMENT_SHARE_X', 'RECRUITMENT_SHARE_LINE', 'RECRUITMENT_URL_COPIED', 'ONBOARDING_STARTED', 'ONBOARDING_COMPLETED', 'RECRUITMENT_JOIN_COMPLETED');

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "GrowthEventType" NOT NULL,
    "recruitmentId" TEXT,
    "area" TEXT,
    "foodCategory" TEXT,
    "loggedIn" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "referrer" TEXT,
    "shareType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrowthEvent_eventType_createdAt_idx" ON "GrowthEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_sessionKey_createdAt_idx" ON "GrowthEvent"("sessionKey", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_recruitmentId_idx" ON "GrowthEvent"("recruitmentId");
