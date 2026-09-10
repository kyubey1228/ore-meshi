CREATE TABLE "AreaOption" (
  "id" TEXT NOT NULL,
  "prefecture" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AreaOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AreaOption_prefecture_city_key" ON "AreaOption"("prefecture", "city");
CREATE INDEX "AreaOption_isActive_sortOrder_idx" ON "AreaOption"("isActive", "sortOrder");
