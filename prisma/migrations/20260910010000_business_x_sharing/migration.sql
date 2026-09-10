-- CreateEnum
CREATE TYPE "BusinessMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "BusinessCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('X');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SocialEntityType" AS ENUM ('SPONSORED_MEAL', 'SPONSOR_CAMPAIGN', 'SEAT_CAMPAIGN', 'COUPON', 'DIRECT_AD_CAMPAIGN');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialPostType" AS ENUM ('SPONSORED_MEAL', 'SEAT_CAMPAIGN', 'CANCELLATION_SLOT', 'LAST_SEAT', 'COUPON', 'DIRECT_AD');

-- CreateEnum
CREATE TYPE "SocialShareMode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "ReferralEventType" AS ENUM ('X_VISIT', 'MEAL_CREATED', 'JOIN_REQUEST', 'MATCHED', 'COUPON_REDEEMED');

-- CreateTable
CREATE TABLE "BusinessAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "businessAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BusinessMemberRole" NOT NULL DEFAULT 'STAFF',
    "canPostToSocial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("businessAccountId","userId")
);

-- CreateTable
CREATE TABLE "SponsoredMeal" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "mealId" TEXT,
    "title" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "participantLimit" INTEGER NOT NULL,
    "remainingSlots" INTEGER NOT NULL,
    "benefit" TEXT NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorCampaign" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "participantLimit" INTEGER NOT NULL,
    "remainingSlots" INTEGER NOT NULL,
    "benefit" TEXT NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatCampaign" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "remainingSeats" INTEGER NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "benefit" TEXT NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectAdCampaign" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "advertiserName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "BusinessCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectAdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSocialAccount" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "profileImageUrl" TEXT,
    "status" "SocialConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSocialPostSetting" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "autoPostSponsoredMeal" BOOLEAN NOT NULL DEFAULT false,
    "autoPostSeatCampaign" BOOLEAN NOT NULL DEFAULT false,
    "autoPostCancellationSlot" BOOLEAN NOT NULL DEFAULT false,
    "autoPostLastSeat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSocialPostSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "entityType" "SocialEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "postType" "SocialPostType" NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING',
    "shareMode" "SocialShareMode" NOT NULL DEFAULT 'MANUAL',
    "idempotencyKey" TEXT NOT NULL,
    "externalPostId" TEXT,
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "socialPostId" TEXT,
    "entityType" "SocialEntityType",
    "entityId" TEXT,
    "eventType" "ReferralEventType" NOT NULL,
    "sourceEventId" TEXT,
    "conversionEntityId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "anonymousId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessAccount_slug_key" ON "BusinessAccount"("slug");

-- CreateIndex
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");

-- CreateIndex
CREATE INDEX "SponsoredMeal_businessAccountId_status_startsAt_idx" ON "SponsoredMeal"("businessAccountId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "SponsorCampaign_businessAccountId_status_startsAt_idx" ON "SponsorCampaign"("businessAccountId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "SeatCampaign_businessAccountId_status_endsAt_idx" ON "SeatCampaign"("businessAccountId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Coupon_businessAccountId_status_expiresAt_idx" ON "Coupon"("businessAccountId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "DirectAdCampaign_businessAccountId_status_endsAt_idx" ON "DirectAdCampaign"("businessAccountId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "BusinessSocialAccount_businessAccountId_status_idx" ON "BusinessSocialAccount"("businessAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSocialAccount_provider_providerAccountId_key" ON "BusinessSocialAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "BusinessSocialPostSetting_socialAccountId_idx" ON "BusinessSocialPostSetting"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSocialPostSetting_businessAccountId_key" ON "BusinessSocialPostSetting"("businessAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_idempotencyKey_key" ON "SocialPost"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SocialPost_businessAccountId_createdAt_idx" ON "SocialPost"("businessAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "SocialPost_entityType_entityId_idx" ON "SocialPost"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ReferralEvent_businessAccountId_eventType_createdAt_idx" ON "ReferralEvent"("businessAccountId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralEvent_socialPostId_eventType_idx" ON "ReferralEvent"("socialPostId", "eventType");

-- CreateIndex
CREATE INDEX "ReferralEvent_sourceEventId_idx" ON "ReferralEvent"("sourceEventId");

-- CreateIndex
CREATE INDEX "ReferralEvent_conversionEntityId_idx" ON "ReferralEvent"("conversionEntityId");

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredMeal" ADD CONSTRAINT "SponsoredMeal_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorCampaign" ADD CONSTRAINT "SponsorCampaign_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatCampaign" ADD CONSTRAINT "SeatCampaign_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectAdCampaign" ADD CONSTRAINT "DirectAdCampaign_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSocialAccount" ADD CONSTRAINT "BusinessSocialAccount_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSocialPostSetting" ADD CONSTRAINT "BusinessSocialPostSetting_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSocialPostSetting" ADD CONSTRAINT "BusinessSocialPostSetting_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "BusinessSocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "BusinessSocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
