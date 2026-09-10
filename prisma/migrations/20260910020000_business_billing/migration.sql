CREATE TYPE "BusinessAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "BusinessPlan" AS ENUM ('FREE', 'STANDARD', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID', 'TRIALING');
CREATE TYPE "OrderType" AS ENUM ('SPONSORED_MEAL', 'SEAT_CAMPAIGN', 'AREA_FEATURED', 'DIRECT_AD', 'OTHER');
CREATE TYPE "SponsorOrderStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

ALTER TABLE "BusinessAccount" ADD COLUMN "status" "BusinessAccountStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "BillingCustomer" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessSubscription" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "plan" "BusinessPlan" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsorOrder" (
  "id" TEXT NOT NULL,
  "businessAccountId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "orderType" "OrderType" NOT NULL,
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripePriceId" TEXT NOT NULL,
  "amount" INTEGER,
  "currency" TEXT,
  "status" "SponsorOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SponsorOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeWebhookEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_businessAccountId_key" ON "BillingCustomer"("businessAccountId");
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");
CREATE UNIQUE INDEX "BusinessSubscription_businessAccountId_key" ON "BusinessSubscription"("businessAccountId");
CREATE UNIQUE INDEX "BusinessSubscription_stripeSubscriptionId_key" ON "BusinessSubscription"("stripeSubscriptionId");
CREATE INDEX "BusinessSubscription_status_currentPeriodEnd_idx" ON "BusinessSubscription"("status", "currentPeriodEnd");
CREATE UNIQUE INDEX "SponsorOrder_stripeCheckoutSessionId_key" ON "SponsorOrder"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "SponsorOrder_stripePaymentIntentId_key" ON "SponsorOrder"("stripePaymentIntentId");
CREATE INDEX "SponsorOrder_businessAccountId_createdAt_idx" ON "SponsorOrder"("businessAccountId", "createdAt");
CREATE INDEX "SponsorOrder_orderType_campaignId_status_idx" ON "SponsorOrder"("orderType", "campaignId", "status");
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SponsorOrder" ADD CONSTRAINT "SponsorOrder_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
