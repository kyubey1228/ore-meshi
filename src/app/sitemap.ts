import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/social';
import { getIndexableAreaGenres } from '@/server/genre-seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/meals`, changeFrequency: 'hourly', priority: 0.9 },
  ];

  if (!process.env.DATABASE_URL) return staticRoutes;

  const [meals, areaGenres] = await Promise.all([prisma.meal.findMany({
    where: { status: { in: ['OPEN', 'MATCHED'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, updatedAt: true, area: true },
  }), getIndexableAreaGenres()]);

  const mealRoutes: MetadataRoute.Sitemap = meals.map(meal => ({
    url: `${base}/meals/${meal.id}`,
    lastModified: meal.updatedAt,
    changeFrequency: 'hourly',
    priority: 0.7,
  }));

  const areas = [...new Set(meals.map(meal => meal.area).filter(Boolean))].slice(0, 30);
  const areaRoutes: MetadataRoute.Sitemap = areas.map(area => ({
    url: `${base}/recruitments/${encodeURIComponent(area)}`,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  const genreRoutes: MetadataRoute.Sitemap = areaGenres.map(item => ({ url: `${base}/recruitments/${encodeURIComponent(item.area)}/${encodeURIComponent(item.genre)}`, lastModified: item.generatedAt, changeFrequency: 'daily', priority: 0.65 }));
  return [...staticRoutes, ...areaRoutes, ...genreRoutes, ...mealRoutes];
}
