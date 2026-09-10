import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isGenreSeoIndexable } from '@/lib/seo-quality';

async function compute(area: string, genre: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [meals, meals30d, demand30d, completed30d, hourly, related, nearby] = await Promise.all([
    prisma.meal.findMany({ where: { area, genre, status: 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 20, include: { host: { select: { id: true, twitterUsername: true, displayName: true, image: true, bio: true, createdAt: true, diningTypes: { select: { diningType: true } } } }, candidates: true, purposes: { select: { purpose: true } }, _count: { select: { joinRequests: { where: { status: 'ACCEPTED' } } } }, sponsoredMeals: { where: { status: 'ACTIVE' }, take: 1, select: { sponsorName: true, benefit: true, businessAccount: { select: { planOverride: true, subscription: true } } } } } }),
    prisma.meal.count({ where: { area, genre, createdAt: { gte: since } } }),
    prisma.demandIntent.count({ where: { area, genre, createdAt: { gte: since } } }),
    prisma.match.count({ where: { status: 'COMPLETED', completedAt: { gte: since }, meal: { area, genre } } }),
    prisma.hourlyDemandStats.groupBy({ by: ['localHour'], where: { area, genre, bucketStart: { gte: since } }, _sum: { mealsCreated: true }, orderBy: { _sum: { mealsCreated: 'desc' } }, take: 1 }),
    prisma.meal.groupBy({ by: ['genre'], where: { area, genre: { not: null }, createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { genre: 'desc' } }, take: 6 }),
    prisma.meal.groupBy({ by: ['area'], where: { genre, area: { not: area }, status: 'OPEN' }, _count: { _all: true }, orderBy: { _count: { area: 'desc' } }, take: 5 }),
  ]);
  return { meals, meals30d, demand30d, completed30d, popularHour: hourly[0]?._sum.mealsCreated && hourly[0]._sum.mealsCreated >= 3 ? hourly[0].localHour : null, relatedGenres: related.map(row => row.genre!).filter(value => value !== genre), nearbyAreas: nearby.map(row => ({ area: row.area, count: row._count._all })), indexable: isGenreSeoIndexable({ meals30d, demand30d, completed30d, hasGenreMetadata: Boolean(genre.trim()) }) };
}
export const getGenreSeoData = unstable_cache(compute, ['genre-seo'], { revalidate: 300 });

export async function getIndexableAreaGenres(limit = 500) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await prisma.areaDemandStats.groupBy({ by: ['area', 'genre'], where: { date: { gte: since }, genre: { not: '未指定' } }, _sum: { mealsCreated: true, demandIntents: true, matchesCompleted: true }, orderBy: { area: 'asc' }, take: 5000 });
  const generatedAt = new Date();
  return rows.filter(row => (row._sum.mealsCreated ?? 0) >= 3 || (row._sum.demandIntents ?? 0) >= 3 || (row._sum.matchesCompleted ?? 0) >= 3).slice(0, limit).map(row => ({ area: row.area, genre: row.genre, generatedAt }));
}
