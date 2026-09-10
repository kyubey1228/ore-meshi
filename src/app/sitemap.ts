import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/social';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/meals`, changeFrequency: 'hourly', priority: 0.9 },
  ];

  if (!process.env.DATABASE_URL) return staticRoutes;

  const meals = await prisma.meal.findMany({
    where: { status: { in: ['OPEN', 'MATCHED'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, updatedAt: true, area: true },
  });

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

  return [...staticRoutes, ...areaRoutes, ...mealRoutes];
}
