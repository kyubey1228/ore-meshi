import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

async function compute(area?: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [demandCount, nearby, hourly] = await Promise.all([
    area ? prisma.demandIntent.count({ where: { area, status: 'ACTIVE' } }) : Promise.resolve(0),
    prisma.meal.groupBy({ by: ['area'], where: { status: 'OPEN', ...(area ? { area: { not: area } } : {}) }, _count: { _all: true }, orderBy: { _count: { area: 'desc' } }, take: 1 }),
    area ? prisma.hourlyDemandStats.groupBy({ by: ['localHour'], where: { area, bucketStart: { gte: since } }, _sum: { mealsCreated: true }, orderBy: { _sum: { mealsCreated: 'desc' } }, take: 1 }) : Promise.resolve([]),
  ]);
  const popular = hourly[0];
  return { demandCount, nearbyArea: nearby[0]?.area, nearbyCount: nearby[0]?._count._all ?? 0, popularHour: popular?.localHour, sampleSize: popular?._sum.mealsCreated ?? 0 };
}
export const getEmptyStateData = unstable_cache(compute, ['empty-state-growth'], { revalidate: 300 });
