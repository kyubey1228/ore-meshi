-- Performance index verification for Supabase SQL Editor.
-- Prerequisite: migration 20260910062000_performance_indexes has been applied.
-- All statements are read-only. ANALYZE executes each SELECT and reports actual timings/buffers.
-- On small tables PostgreSQL may correctly choose Seq Scan; judge with actual rows and buffers.
-- Expected plans:
-- 1 Match(status, scheduledAt): Index/Bitmap Scan for a selective ACTIVE time range, then a small Sort for Prisma's ORDER BY id.
-- 2 Match(status, completedAt): Index/Bitmap Scan for COMPLETED and the period range.
-- 3 Meal(createdAt, status): Index/Bitmap Scan for a sufficiently selective period; status is filtered after the leading createdAt range.
-- 4 Meal(matchedAt): Index Only/Bitmap Scan for a selective non-null period.
-- 5 JoinRequest(userId, createdAt): Index Scan in createdAt order for one user.
-- 6 Notification(type, createdAt): Index/Bitmap Scan when both type and period are constrained.
-- 7 Notification dashboard query: Seq Scan can remain because the current query has no type predicate; this checks that limitation explicitly.

-- 1. prisma.match.findMany({ where: { status: 'ACTIVE', scheduledAt: { gte, lte } }, orderBy: { id: 'asc' }, take: 50 })
-- Example bindings: status='ACTIVE', gte=now(), lte=now()+24 hours, take=50.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT m."id", m."mealId", m."scheduledAt", m."status"
FROM "Match" AS m
WHERE m."status" = 'ACTIVE'
  AND m."scheduledAt" >= CURRENT_TIMESTAMP
  AND m."scheduledAt" <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
ORDER BY m."id" ASC
LIMIT 50;

-- 2. prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: since } } })
-- Example binding: since=now()-30 days.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*)
FROM "Match" AS m
WHERE m."status" = 'COMPLETED'
  AND m."completedAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days';

-- 3. prisma.meal.count({ where: { createdAt: { gte: since }, status: 'MATCHED' } })
-- Example bindings: since=now()-30 days, status='MATCHED'.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*)
FROM "Meal" AS m
WHERE m."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND m."status" = 'MATCHED';

-- 4. prisma.meal.count({ where: { matchedAt: { gte: since } } })
-- Example binding: since=now()-30 days.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*)
FROM "Meal" AS m
WHERE m."matchedAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days';

-- 5. Representative per-user history query for JoinRequest(userId, createdAt).
-- The CTE chooses an existing user, so the file is runnable without replacing an ID.
-- To inspect a specific user, replace the subquery with e.g. 'clxxxxxxxx'::text.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
WITH sample_user AS (
  SELECT jr."userId"
  FROM "JoinRequest" AS jr
  ORDER BY jr."createdAt" DESC
  LIMIT 1
)
SELECT jr."id", jr."userId", jr."mealId", jr."status", jr."createdAt"
FROM "JoinRequest" AS jr
WHERE jr."userId" = (SELECT su."userId" FROM sample_user AS su)
  AND jr."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY jr."createdAt" DESC;

-- 6. Type-level notification analysis supported by Notification(type, createdAt).
-- Example bindings: type='MEAL_TODAY', since=now()-30 days.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT n."type",
       COUNT(*) AS sent,
       COUNT(n."readAt") AS opened,
       COUNT(n."clickedAt") AS clicked
FROM "Notification" AS n
WHERE n."type" = 'MEAL_TODAY'
  AND n."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY n."type";

-- 7. Current getNotificationAnalysis query shape. It filters only by createdAt, so the
-- (type, createdAt) index is not expected to help. A Seq Scan is acceptable while the
-- selected period covers much of the table; this query is a snapshot-migration candidate.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT n."type", n."readAt", n."clickedAt"
FROM "Notification" AS n
WHERE n."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '30 days';
