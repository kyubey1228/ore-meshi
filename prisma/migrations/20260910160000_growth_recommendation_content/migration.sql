-- AlterEnum
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'GROWTH_RECOMMENDATION_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'GROWTH_RECOMMENDATION_ACTIONED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'CONTENT_DRAFT_CREATED';
ALTER TYPE "GrowthEventType" ADD VALUE IF NOT EXISTS 'CONTENT_DRAFT_POSTED';

-- CreateEnum
CREATE TYPE "SocialContentStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED');
CREATE TYPE "SocialContentChannel" AS ENUM ('X', 'INSTAGRAM', 'TIKTOK', 'THREADS');

-- CreateTable
CREATE TABLE "SocialContentDraft" (
  "id" TEXT NOT NULL,
  "channel" "SocialContentChannel" NOT NULL,
  "body" TEXT NOT NULL,
  "status" "SocialContentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialContentDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SocialContentDraft_status_createdAt_idx" ON "SocialContentDraft"("status", "createdAt");
