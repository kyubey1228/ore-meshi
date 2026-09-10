CREATE INDEX "SponsoredMeal_mealId_idx" ON "SponsoredMeal"("mealId");

ALTER TABLE "SponsoredMeal"
ADD CONSTRAINT "SponsoredMeal_mealId_fkey"
FOREIGN KEY ("mealId") REFERENCES "Meal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
