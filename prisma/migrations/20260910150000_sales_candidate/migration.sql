-- CreateEnum
CREATE TYPE "SalesCandidateStatus" AS ENUM ('NEW', 'CONTACT_READY', 'CONTACTED', 'REPLIED', 'INTERESTED', 'REGISTERED', 'DECLINED', 'DO_NOT_CONTACT');

-- CreateTable
CREATE TABLE "SalesCandidate" (
  "id" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "genre" TEXT NOT NULL,
  "storeName" TEXT NOT NULL DEFAULT '',
  "opportunityScore" DOUBLE PRECISION NOT NULL,
  "status" "SalesCandidateStatus" NOT NULL DEFAULT 'NEW',
  "lastContactedAt" TIMESTAMP(3),
  "contactCount" INTEGER NOT NULL DEFAULT 0,
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesCandidate_area_genre_storeName_key" ON "SalesCandidate"("area", "genre", "storeName");
CREATE INDEX "SalesCandidate_status_opportunityScore_idx" ON "SalesCandidate"("status", "opportunityScore");
