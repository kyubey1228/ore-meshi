-- CreateTable
CREATE TABLE "DiningType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiningType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserDiningType" (
    "userId" TEXT NOT NULL,
    "diningTypeId" TEXT NOT NULL,
    CONSTRAINT "UserDiningType_pkey" PRIMARY KEY ("userId","diningTypeId")
);

CREATE TABLE "MealPurpose" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealPurpose_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealPurposeRelation" (
    "mealId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    CONSTRAINT "MealPurposeRelation_pkey" PRIMARY KEY ("mealId","purposeId")
);

CREATE UNIQUE INDEX "DiningType_slug_key" ON "DiningType"("slug");
CREATE INDEX "DiningType_isActive_sortOrder_idx" ON "DiningType"("isActive", "sortOrder");
CREATE INDEX "UserDiningType_diningTypeId_idx" ON "UserDiningType"("diningTypeId");
CREATE UNIQUE INDEX "MealPurpose_slug_key" ON "MealPurpose"("slug");
CREATE INDEX "MealPurpose_isActive_sortOrder_idx" ON "MealPurpose"("isActive", "sortOrder");
CREATE INDEX "MealPurposeRelation_purposeId_idx" ON "MealPurposeRelation"("purposeId");

ALTER TABLE "UserDiningType" ADD CONSTRAINT "UserDiningType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserDiningType" ADD CONSTRAINT "UserDiningType_diningTypeId_fkey" FOREIGN KEY ("diningTypeId") REFERENCES "DiningType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPurposeRelation" ADD CONSTRAINT "MealPurposeRelation_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPurposeRelation" ADD CONSTRAINT "MealPurposeRelation_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "MealPurpose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "DiningType" ("id","slug","label","sortOrder") VALUES
('dt-first-meeting','first-meeting-ok','初対面OK',10),
('dt-food-first','food-first','飯メイン',20),
('dt-talkative','talkative','会話多め',30),
('dt-quiet-ok','quiet-ok','静かでもOK',40),
('dt-drinks-welcome','drinks-welcome','酒あり歓迎',50),
('dt-no-drinks','no-drinks','酒なし歓迎',60),
('dt-otaku-talk','otaku-talk','オタクトーク歓迎',70),
('dt-work-talk','work-talk','仕事トーク歓迎',80),
('dt-late-night','late-night','深夜飯OK',90),
('dt-quick-meal','quick-meal','サク飯派',100),
('dt-long-stay','long-stay','長居OK',110),
('dt-leave-choice','leave-choice','店選び任せたい',120),
('dt-like-choice','like-choice','店選び好き',130);

INSERT INTO "MealPurpose" ("id","slug","label","sortOrder") VALUES
('mp-just-eat','just-eat','ただ飯',10),
('mp-vent','vent','愚痴りたい',20),
('mp-work-talk','work-talk','仕事の話',30),
('mp-love-talk','love-talk','恋バナ',40),
('mp-otaku-talk','otaku-talk','オタク話',50),
('mp-drinks','drinks','飲みたい',60),
('mp-quiet','quiet','静かに食べたい',70),
('mp-new-tokyo','new-tokyo','上京したて',80),
('mp-business-trip','business-trip','出張中',90),
('mp-heartbreak','heartbreak','失恋した',100),
('mp-new-friends','new-friends','友達増やしたい',110),
('mp-free','free','暇',120),
('mp-late-night','late-night','深夜飯',130),
('mp-new-place','new-place','新しい店に行きたい',140);
