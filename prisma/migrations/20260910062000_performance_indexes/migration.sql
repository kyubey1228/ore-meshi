CREATE INDEX IF NOT EXISTS "Match_status_scheduledAt_idx" ON "Match"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Match_status_completedAt_idx" ON "Match"("status", "completedAt");
CREATE INDEX IF NOT EXISTS "Meal_createdAt_status_idx" ON "Meal"("createdAt", "status");
CREATE INDEX IF NOT EXISTS "Meal_matchedAt_idx" ON "Meal"("matchedAt");
CREATE INDEX IF NOT EXISTS "JoinRequest_userId_createdAt_idx" ON "JoinRequest"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");
