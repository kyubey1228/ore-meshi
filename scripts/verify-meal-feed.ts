// Read-only parity/performance check against the configured DB.
// Bundle using esbuild with server-only mapped to Next's server empty module;
// run the generated .cjs with node --env-file=.env.local. See performance docs.
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { fetchOpenMeals, publicUserSelect } from '../src/server/meal-feed-query';
import { getPublicMealFeed } from '../src/server/public-meal-feed';

async function main() {
try {
  let statement: { query: string; params: string } | undefined;
  prisma.$on('query', event => { if (event.query.trimStart().startsWith('WITH page AS')) statement = event; });
  const started = performance.now();
  const actual = await fetchOpenMeals({}, 13);
  const firstMs = performance.now() - started;
  const expected = await prisma.meal.findMany({
    where: { id: { in: actual.map(meal => meal.id) } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      host: { select: publicUserSelect },
      candidates: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { id: 'asc' }], take: 1 },
      purposes: { where: { purpose: { isActive: true } }, orderBy: { purpose: { sortOrder: 'asc' } }, select: { purpose: { select: { id: true, slug: true, label: true } } } },
      _count: { select: { candidates: true, joinRequests: { where: { status: 'ACCEPTED' } } } },
      sponsoredMeals: { where: { status: 'ACTIVE' }, orderBy: { id: 'asc' }, take: 1, select: { sponsorName: true, benefit: true, businessAccount: { select: { planOverride: true, subscription: { select: { plan: true, status: true, currentPeriodEnd: true } } } } } },
    },
  });
  assert.deepEqual(actual, expected);
  const snapshot = await getPublicMealFeed();
  assert.deepEqual(snapshot.meals, actual);
  const repeat = performance.now();
  await fetchOpenMeals({}, 13);
  console.log(JSON.stringify({ parity: 'PASS', snapshotParity: 'PASS', rows: actual.length, coldQueryMs: Math.round(firstMs), warmConnectionQueryMs: Math.round(performance.now() - repeat) }));
  if (process.env.MEAL_FEED_EXPLAIN === 'true' && statement) {
    const params: unknown[] = JSON.parse(statement.params);
    params[0] = new Date(String(params[0]));
    // SQL is captured only from our own fixed default feed statement, not input.
    const result = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': { 'Planning Time': number; 'Execution Time': number; JIT?: unknown }[] }[]>(`EXPLAIN (ANALYZE, FORMAT JSON) ${statement.query}`, ...params);
    const plan = result[0]['QUERY PLAN'][0];
    console.log(JSON.stringify({ planningMs: plan['Planning Time'], executionMs: plan['Execution Time'], jit: plan.JIT }));
  }
} finally { await prisma.$disconnect(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
