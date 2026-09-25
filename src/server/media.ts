import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { ARTICLE_PAGE_SIZE, isPublishedArticle } from '@/lib/media';
import { requireAdmin } from '@/server/admin';
import { getMealList } from '@/lib/data';

const includeArticle = { author: { select: { displayName: true } }, category: true, tags: { include: { tag: true } } } as const;

export async function getPublishedArticles(page = 1, categorySlug?: string) {
  const where = { ...isPublishedArticle(), noindex: false, ...(categorySlug ? { category: { slug: categorySlug } } : {}) };
  const [items, total] = await Promise.all([
    prisma.article.findMany({ where, include: includeArticle, orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }], skip: (page - 1) * ARTICLE_PAGE_SIZE, take: ARTICLE_PAGE_SIZE }),
    prisma.article.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / ARTICLE_PAGE_SIZE)), page };
}

export const getPublishedArticle = cache(async (slug: string) => prisma.article.findFirst({ where: { slug, ...isPublishedArticle() }, include: includeArticle }));

export async function getMediaHome() {
  const [latest, popular, featured, categories] = await Promise.all([
    prisma.article.findMany({ where: { ...isPublishedArticle(), noindex: false }, include: includeArticle, orderBy: { publishedAt: 'desc' }, take: 8 }),
    prisma.article.findMany({ where: { ...isPublishedArticle(), noindex: false }, include: includeArticle, orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }], take: 4 }),
    prisma.article.findMany({ where: { ...isPublishedArticle(), noindex: false, featured: true }, include: includeArticle, orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }], take: 4 }),
    prisma.articleCategory.findMany({ where: { articles: { some: { ...isPublishedArticle(), noindex: false } } }, orderBy: [{ featured: 'desc' }, { trending: 'desc' }, { name: 'asc' }] }),
  ]);
  return { latest, popular, featured, categories };
}

export async function getRelatedMedia(article: { id: string; categoryId: string | null; relatedArea: string | null; relatedGenre: string | null }) {
  const OR = [article.categoryId ? { categoryId: article.categoryId } : null, article.relatedArea ? { relatedArea: article.relatedArea } : null, article.relatedGenre ? { relatedGenre: article.relatedGenre } : null].filter(Boolean) as ({ categoryId: string } | { relatedArea: string } | { relatedGenre: string })[];
  return OR.length ? prisma.article.findMany({ where: { ...isPublishedArticle(), noindex: false, id: { not: article.id }, OR }, include: includeArticle, orderBy: { publishedAt: 'desc' }, take: 4 }) : [];
}

export async function getRelatedMeals(area?: string | null, genre?: string | null) {
  return getMealList({ ...(area ? { area } : {}), ...(genre ? { genre } : {}) }, {}, 4);
}

export async function getArticlesForLanding(area: string, genre?: string) {
  return prisma.article.findMany({ where: { ...isPublishedArticle(), noindex: false, OR: [{ relatedArea: area }, ...(genre ? [{ relatedGenre: genre }] : [])] }, select: { slug: true, title: true, excerpt: true }, orderBy: { publishedAt: 'desc' }, take: 4 });
}

export async function getAdminArticles() { await requireAdmin(); return prisma.article.findMany({ include: includeArticle, orderBy: { updatedAt: 'desc' }, take: 200 }); }
export async function getAdminArticle(id: string) { await requireAdmin(); return prisma.article.findUnique({ where: { id }, include: includeArticle }); }
export async function getAdminMediaOptions() { await requireAdmin(); return Promise.all([prisma.articleCategory.findMany({ orderBy: { name: 'asc' } }), prisma.articleTag.findMany({ orderBy: { name: 'asc' } })]); }

export async function getSeoDashboard() {
  await requireAdmin();
  const now = new Date();
  const [published, drafts, indexable, publicMeals, events, areaCount] = await Promise.all([
    prisma.article.count({ where: { status: 'PUBLISHED', publishedAt: { lte: now } } }),
    prisma.article.count({ where: { status: { in: ['DRAFT', 'SCHEDULED'] } } }),
    prisma.article.count({ where: { status: 'PUBLISHED', publishedAt: { lte: now }, noindex: false } }),
    prisma.meal.count({ where: { status: 'OPEN' } }),
    prisma.growthEvent.groupBy({ by: ['eventType'], where: { eventType: { in: ['MEDIA_VIEW', 'MEDIA_CTA_CLICK', 'MEDIA_RECRUITMENT_CLICK', 'SEO_LANDING_VIEWED', 'SEO_SIGNUP', 'SEO_RECRUITMENT_CREATE'] } }, _count: { _all: true } }),
    prisma.meal.groupBy({ by: ['area'], where: { status: 'OPEN' } }).then(rows => rows.length),
  ]);
  return { published, drafts, indexable, publicMeals, areaCount, events: Object.fromEntries(events.map(row => [row.eventType, row._count._all])) as Record<string, number> };
}
