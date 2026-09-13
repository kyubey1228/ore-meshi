export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL && process.env.NEXT_PHASE !== 'phase-production-build') {
    const { initializePublicMealFeed } = await import('@/server/public-meal-feed');
    try { await initializePublicMealFeed(); }
    catch (error) {
      // Other public/static routes can still be served during a DB outage. The list
      // will retry rather than presenting fabricated empty or indefinitely stale data.
      console.error('Public meal feed warmup failed', error instanceof Error ? error.name : 'UnknownError');
    }
  }
}
