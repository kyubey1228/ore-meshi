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
    { url: `${base}/media`, changeFrequency: 'daily', priority: 0.85 },
    { url: `${base}/business/start`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/business`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  if (!process.env.DATABASE_URL) return staticRoutes;

  const [meals, areaGenres, articles, categories] = await Promise.all([prisma.meal.findMany({
    where: { status: { in: ['OPEN', 'MATCHED'] } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, updatedAt: true, area: true },
  }), getIndexableAreaGenres(), prisma.article.findMany({ where: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, noindex: false }, select: { slug: true, updatedAt: true } }), prisma.articleCategory.findMany({ where: { articles: { some: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, noindex: false } } }, select: { slug: true, updatedAt: true } })]);

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
  const articleRoutes: MetadataRoute.Sitemap = articles.map(item => ({ url: `${base}/media/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly', priority: 0.75 }));
  const categoryRoutes: MetadataRoute.Sitemap = categories.map(item => ({ url: `${base}/media/category/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'weekly', priority: 0.6 }));
  return [...staticRoutes, ...areaRoutes, ...genreRoutes, ...mealRoutes, ...categoryRoutes, ...articleRoutes];
}
