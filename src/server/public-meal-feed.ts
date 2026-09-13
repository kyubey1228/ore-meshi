import 'server-only';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createRefreshingCache } from '@/lib/refreshing-cache';
import { buildOpenMealsQuery, hydrateJsonMeals, type JsonMealRow } from '@/server/meal-feed-query';
import { MEAL_PAGE_SIZE } from '@/lib/meal-pagination';
import { databaseJsonDate } from '@/lib/database-json';
import { databaseTable } from '@/server/database-table';

async function loadPublicMetadata(now: Date) {
  // These are public, small, independent lists. One SQL envelope avoids opening
  // five pooled transactions just to prepare the first screen. Explicit columns
  // prevent new private model fields from leaking into this shared read model.
  type Metadata = {
    meals: JsonMealRow[];
    purposes: { id: string; slug: string; label: string }[];
    areas: { prefecture: string; city: string }[];
    sponsoredMeals: { id: string; title: string; sponsorName: string; restaurantName: string; area: string; startsAt: string; remainingSlots: number; benefit: string }[];
    seatCampaigns: { id: string; restaurantName: string; area: string; remainingSeats: number; endsAt: string; benefit: string }[];
    nearby: { area: string; count: number }[];
  };
  const [row] = await prisma.$queryRaw<Metadata[]>`
    SELECT
      COALESCE((SELECT jsonb_agg(m) FROM (${buildOpenMealsQuery({}, MEAL_PAGE_SIZE + 1, 0, now)}) m), '[]'::jsonb) AS meals,
      COALESCE((SELECT jsonb_agg(p) FROM (
        SELECT id, slug, label FROM ${databaseTable('MealPurpose')} WHERE "isActive" ORDER BY "sortOrder", label
      ) p), '[]'::jsonb) AS purposes,
      COALESCE((SELECT jsonb_agg(a) FROM (
        SELECT prefecture, city FROM ${databaseTable('AreaOption')} WHERE "isActive" ORDER BY "sortOrder", city
      ) a), '[]'::jsonb) AS areas,
      COALESCE((SELECT jsonb_agg(s) FROM (
        SELECT id, title, "sponsorName", "restaurantName", area, "startsAt", "remainingSlots", benefit
        FROM ${databaseTable('SponsoredMeal')} WHERE status = 'ACTIVE' AND "mealId" IS NULL AND "startsAt" > ${now}
        ORDER BY "startsAt" LIMIT 12
      ) s), '[]'::jsonb) AS "sponsoredMeals",
      COALESCE((SELECT jsonb_agg(s) FROM (
        SELECT id, "restaurantName", area, "remainingSeats", "endsAt", benefit
        FROM ${databaseTable('SeatCampaign')} WHERE status = 'ACTIVE' AND "endsAt" > ${now}
        ORDER BY "endsAt" LIMIT 12
      ) s), '[]'::jsonb) AS "seatCampaigns",
      COALESCE((SELECT jsonb_agg(n) FROM (
        SELECT area, count(*)::int AS count FROM ${databaseTable('Meal')} WHERE status = 'OPEN'
        GROUP BY area ORDER BY count(*) DESC LIMIT 1
      ) n), '[]'::jsonb) AS nearby
  `;
  // Prisma DateTime columns use timestamp without time zone, serialized by
  // PostgreSQL JSON without an offset; interpret them as UTC, like Prisma does.
  return { ...row,
    meals: hydrateJsonMeals(row.meals),
    sponsoredMeals: row.sponsoredMeals.map(item => ({ ...item, startsAt: databaseJsonDate(item.startsAt) })),
    seatCampaigns: row.seatCampaigns.map(item => ({ ...item, endsAt: databaseJsonDate(item.endsAt) })),
  };
}

async function loadFeed() {
  const now = new Date();
  const { meals, purposes, areas, sponsoredMeals, seatCampaigns, nearby } = await loadPublicMetadata(now);
  const areaOptionsGrouped: { prefecture: string; cities: string[] }[] = [];
  for (const area of areas) {
    const last = areaOptionsGrouped.at(-1);
    if (last?.prefecture === area.prefecture) last.cities.push(area.city);
    else areaOptionsGrouped.push({ prefecture: area.prefecture, cities: [area.city] });
  }
  return {
    meals, purposes, areaOptionsGrouped, sponsoredMeals, seatCampaigns,
    emptyData: { demandCount: 0, nearbyArea: nearby[0]?.area, nearbyCount: nearby[0]?.count ?? 0, popularHour: undefined as number | undefined, sampleSize: 0 },
  };
}

function createFeed() {
  return createRefreshingCache({ load: loadFeed, maxAgeMs: 60_000, refreshEveryMs: 20_000,
    onError: error => console.error('Public meal feed refresh failed', error instanceof Error ? error.name : 'UnknownError'),
  });
}

// Instrumentation and RSC have different module graphs. Share only this public read
// model across them; authentication and preferences never enter the snapshot.
const state = globalThis as typeof globalThis & { orePublicMealFeed?: { key: string; cache: ReturnType<typeof createFeed> } };
function feedCache() {
  const key = createHash('sha256').update(process.env.DATABASE_URL ?? '').digest('hex');
  if (state.orePublicMealFeed?.key !== key) {
    state.orePublicMealFeed?.cache.stop();
    state.orePublicMealFeed = { key, cache: createFeed() };
  }
  return state.orePublicMealFeed.cache;
}

export async function initializePublicMealFeed() {
  const started = performance.now();
  await feedCache().start();
  console.info(`[PERF] MEALS readiness warmup ${Math.round(performance.now() - started)}ms`);
}

export async function getPublicMealFeed() {
  const started = performance.now();
  const feed = await feedCache().get();
  if (process.env.PERF_LOG_ALL === 'true') console.info(`[PERF] MEALS public data ${(performance.now() - started).toFixed(2)}ms`);
  return feed;
}

export async function refreshPublicMealFeed() { await feedCache().refresh(); }
