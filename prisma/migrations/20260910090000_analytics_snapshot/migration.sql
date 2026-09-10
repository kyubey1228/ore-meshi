CREATE TYPE "AnalyticsSnapshotType" AS ENUM ('GROWTH_DASHBOARD', 'BUSINESS_DASHBOARD', 'GROWTH_INSIGHTS');

CREATE TABLE "AnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "snapshotType" "AnalyticsSnapshotType" NOT NULL,
  "asOfDate" DATE NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyMetrics" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "signupStarted" INTEGER NOT NULL DEFAULT 0,
  "signupCompleted" INTEGER NOT NULL DEFAULT 0,
  "joinIntentCreated" INTEGER NOT NULL DEFAULT 0,
  "joinAfterSignupCompleted" INTEGER NOT NULL DEFAULT 0,
  "recruitmentShareX" INTEGER NOT NULL DEFAULT 0,
  "recruitmentShareLine" INTEGER NOT NULL DEFAULT 0,
  "recruitmentUrlCopied" INTEGER NOT NULL DEFAULT 0,
  "referralOpened" INTEGER NOT NULL DEFAULT 0,
  "referralSignupCompleted" INTEGER NOT NULL DEFAULT 0,
  "quickPostStarted" INTEGER NOT NULL DEFAULT 0,
  "quickPostCompleted" INTEGER NOT NULL DEFAULT 0,
  "mealsCreated" INTEGER NOT NULL DEFAULT 0,
  "mealsMatched" INTEGER NOT NULL DEFAULT 0,
  "matchesCompleted" INTEGER NOT NULL DEFAULT 0,
  "uniqueDiners" INTEGER NOT NULL DEFAULT 0,
  "demandIntentsCreated" INTEGER NOT NULL DEFAULT 0,
  "demandIntentsMatched" INTEGER NOT NULL DEFAULT 0,
  "demandRecruitments" INTEGER NOT NULL DEFAULT 0,
  "demandMealsMatched" INTEGER NOT NULL DEFAULT 0,
  "notificationsSent" INTEGER NOT NULL DEFAULT 0,
  "notificationsOpened" INTEGER NOT NULL DEFAULT 0,
  "notificationsClicked" INTEGER NOT NULL DEFAULT 0,
  "notificationTypeMetrics" JSONB NOT NULL DEFAULT '{}',
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AreaDemandStats" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "area" TEXT NOT NULL,
  "genre" TEXT NOT NULL DEFAULT '未指定',
  "demandIntents" INTEGER NOT NULL DEFAULT 0,
  "mealsCreated" INTEGER NOT NULL DEFAULT 0,
  "mealsMatched" INTEGER NOT NULL DEFAULT 0,
  "matchesCompleted" INTEGER NOT NULL DEFAULT 0,
  "estimatedParticipants" INTEGER NOT NULL DEFAULT 0,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AreaDemandStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HourlyDemandStats" (
  "id" TEXT NOT NULL,
  "bucketStart" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  "localDate" DATE NOT NULL,
  "localWeekday" INTEGER NOT NULL,
  "localHour" INTEGER NOT NULL,
  "area" TEXT NOT NULL,
  "genre" TEXT NOT NULL DEFAULT '未指定',
  "demandIntents" INTEGER NOT NULL DEFAULT 0,
  "mealsCreated" INTEGER NOT NULL DEFAULT 0,
  "mealsMatched" INTEGER NOT NULL DEFAULT 0,
  "matchesCompleted" INTEGER NOT NULL DEFAULT 0,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HourlyDemandStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsSnapshot_snapshotType_asOfDate_windowDays_schemaVersion_key" ON "AnalyticsSnapshot"("snapshotType", "asOfDate", "windowDays", "schemaVersion");
CREATE INDEX "AnalyticsSnapshot_snapshotType_generatedAt_idx" ON "AnalyticsSnapshot"("snapshotType", "generatedAt");
CREATE UNIQUE INDEX "DailyMetrics_date_timezone_key" ON "DailyMetrics"("date", "timezone");
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");
CREATE UNIQUE INDEX "AreaDemandStats_date_timezone_area_genre_key" ON "AreaDemandStats"("date", "timezone", "area", "genre");
CREATE INDEX "AreaDemandStats_area_date_idx" ON "AreaDemandStats"("area", "date");
CREATE INDEX "AreaDemandStats_area_genre_date_idx" ON "AreaDemandStats"("area", "genre", "date");
CREATE UNIQUE INDEX "HourlyDemandStats_bucketStart_timezone_area_genre_key" ON "HourlyDemandStats"("bucketStart", "timezone", "area", "genre");
CREATE INDEX "HourlyDemandStats_localDate_area_idx" ON "HourlyDemandStats"("localDate", "area");
CREATE INDEX "HourlyDemandStats_localWeekday_localHour_area_genre_idx" ON "HourlyDemandStats"("localWeekday", "localHour", "area", "genre");
