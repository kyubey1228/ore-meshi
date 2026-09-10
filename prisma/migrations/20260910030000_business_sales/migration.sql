CREATE TYPE "BusinessType" AS ENUM ('RESTAURANT', 'COMPANY', 'BRAND', 'AGENCY', 'OTHER');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST', 'ARCHIVED');
CREATE TYPE "LeadSource" AS ENUM ('BUSINESS_LP', 'PRICING', 'RESOURCE_DOWNLOAD', 'PARTNER_CAMPAIGN', 'REFERRAL', 'DIRECT', 'OTHER');
CREATE TYPE "OfferType" AS ENUM ('PERCENT', 'FIXED', 'FREE');
CREATE TYPE "TargetProduct" AS ENUM ('SPONSORED_MEAL', 'SEAT_CAMPAIGN', 'BUSINESS_STANDARD', 'BUSINESS_PRO');
CREATE TYPE "ReferralStatus" AS ENUM ('INVITED', 'SIGNED_UP', 'QUALIFIED', 'COMPLETED', 'INVALID');
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'GRANTED', 'REDEEMED', 'CANCELLED');
CREATE TYPE "PartnerCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "BusinessMarketingEventType" AS ENUM ('LP_VIEW', 'PRICING_VIEW', 'CONTACT_STARTED', 'CONTACT_SUBMITTED', 'RESOURCE_REQUESTED', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'CHECKOUT_STARTED', 'CHECKOUT_COMPLETED');

ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BusinessAccount"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "businessType" "BusinessType" NOT NULL DEFAULT 'RESTAURANT',
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "consultation" TEXT,
  ADD COLUMN "purposes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "planOverride" "BusinessPlan",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TABLE "BusinessLead" (
  "id" TEXT NOT NULL, "companyName" TEXT NOT NULL, "contactName" TEXT NOT NULL, "email" TEXT NOT NULL,
  "phone" TEXT, "websiteUrl" TEXT, "businessType" "BusinessType" NOT NULL, "area" TEXT NOT NULL,
  "purpose" TEXT NOT NULL, "monthlyBudgetRange" TEXT, "desiredStartDate" TIMESTAMP(3), "message" TEXT NOT NULL,
  "source" "LeadSource" NOT NULL DEFAULT 'DIRECT', "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "assignedAdminId" TEXT, "businessAccountId" TEXT, "referralCode" TEXT, "partnerCampaignId" TEXT,
  "downloadRequestedAt" TIMESTAMP(3), "internalNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BusinessLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessLeadNote" (
  "id" TEXT NOT NULL, "leadId" TEXT NOT NULL, "adminUserId" TEXT NOT NULL, "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BusinessLeadNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FirstTimeOffer" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "offerType" "OfferType" NOT NULL, "discountPercent" INTEGER,
  "discountAmount" INTEGER, "targetProduct" "TargetProduct" NOT NULL, "stripePromotionCodeId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "maxUses" INTEGER, "usedCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "FirstTimeOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessReferral" (
  "id" TEXT NOT NULL, "referrerBusinessAccountId" TEXT NOT NULL, "referralCode" TEXT NOT NULL,
  "referredBusinessAccountId" TEXT, "status" "ReferralStatus" NOT NULL DEFAULT 'INVITED',
  "rewardStatus" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BusinessReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCampaign" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "area" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "maxPartners" INTEGER, "joinedPartners" INTEGER NOT NULL DEFAULT 0,
  "offerText" TEXT NOT NULL, "status" "PartnerCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCampaignMember" (
  "partnerCampaignId" TEXT NOT NULL, "businessAccountId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerCampaignMember_pkey" PRIMARY KEY ("partnerCampaignId", "businessAccountId")
);

CREATE TABLE "BusinessMarketingEvent" (
  "id" TEXT NOT NULL, "sessionKey" TEXT NOT NULL, "businessAccountId" TEXT, "leadId" TEXT,
  "eventType" "BusinessMarketingEventType" NOT NULL, "source" TEXT, "medium" TEXT, "campaign" TEXT, "content" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BusinessMarketingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BusinessLead_status_createdAt_idx" ON "BusinessLead"("status", "createdAt");
CREATE INDEX "BusinessLead_source_createdAt_idx" ON "BusinessLead"("source", "createdAt");
CREATE INDEX "BusinessLead_email_idx" ON "BusinessLead"("email");
CREATE INDEX "BusinessLead_businessAccountId_idx" ON "BusinessLead"("businessAccountId");
CREATE INDEX "BusinessLeadNote_leadId_createdAt_idx" ON "BusinessLeadNote"("leadId", "createdAt");
CREATE INDEX "BusinessLeadNote_adminUserId_idx" ON "BusinessLeadNote"("adminUserId");
CREATE INDEX "FirstTimeOffer_targetProduct_isActive_startsAt_endsAt_idx" ON "FirstTimeOffer"("targetProduct", "isActive", "startsAt", "endsAt");
CREATE UNIQUE INDEX "BusinessReferral_referralCode_key" ON "BusinessReferral"("referralCode");
CREATE UNIQUE INDEX "BusinessReferral_referredBusinessAccountId_key" ON "BusinessReferral"("referredBusinessAccountId");
CREATE INDEX "BusinessReferral_referrerBusinessAccountId_status_idx" ON "BusinessReferral"("referrerBusinessAccountId", "status");
CREATE UNIQUE INDEX "PartnerCampaign_slug_key" ON "PartnerCampaign"("slug");
CREATE INDEX "PartnerCampaign_status_startsAt_endsAt_idx" ON "PartnerCampaign"("status", "startsAt", "endsAt");
CREATE INDEX "PartnerCampaignMember_businessAccountId_idx" ON "PartnerCampaignMember"("businessAccountId");
CREATE INDEX "BusinessMarketingEvent_eventType_createdAt_idx" ON "BusinessMarketingEvent"("eventType", "createdAt");
CREATE INDEX "BusinessMarketingEvent_sessionKey_createdAt_idx" ON "BusinessMarketingEvent"("sessionKey", "createdAt");
CREATE INDEX "BusinessMarketingEvent_businessAccountId_eventType_idx" ON "BusinessMarketingEvent"("businessAccountId", "eventType");
CREATE INDEX "BusinessMarketingEvent_leadId_idx" ON "BusinessMarketingEvent"("leadId");

ALTER TABLE "BusinessLead" ADD CONSTRAINT "BusinessLead_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessLead" ADD CONSTRAINT "BusinessLead_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessLead" ADD CONSTRAINT "BusinessLead_partnerCampaignId_fkey" FOREIGN KEY ("partnerCampaignId") REFERENCES "PartnerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessLeadNote" ADD CONSTRAINT "BusinessLeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BusinessLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessLeadNote" ADD CONSTRAINT "BusinessLeadNote_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReferral" ADD CONSTRAINT "BusinessReferral_referrerBusinessAccountId_fkey" FOREIGN KEY ("referrerBusinessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessReferral" ADD CONSTRAINT "BusinessReferral_referredBusinessAccountId_fkey" FOREIGN KEY ("referredBusinessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerCampaignMember" ADD CONSTRAINT "PartnerCampaignMember_partnerCampaignId_fkey" FOREIGN KEY ("partnerCampaignId") REFERENCES "PartnerCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerCampaignMember" ADD CONSTRAINT "PartnerCampaignMember_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessMarketingEvent" ADD CONSTRAINT "BusinessMarketingEvent_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessMarketingEvent" ADD CONSTRAINT "BusinessMarketingEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BusinessLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
