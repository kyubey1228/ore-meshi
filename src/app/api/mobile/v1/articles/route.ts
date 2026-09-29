import { prisma } from '@/lib/prisma';
import { articleDescription, isPublishedArticle } from '@/lib/media';
import { mobileJson, mobileOptions } from '@/lib/mobile-api';

export async function GET() {
  const articles = await prisma.article.findMany({
    where: isPublishedArticle(),
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take: 20,
    select: {
      id: true, title: true, slug: true, excerpt: true, content: true, coverImage: true,
      coverImageAlt: true, publishedAt: true, readingTime: true,
      category: { select: { name: true, slug: true } },
      author: { select: { displayName: true } },
    },
  });

  return mobileJson({ items: articles.map(article => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    description: articleDescription(article),
    coverImage: article.coverImage,
    coverImageAlt: article.coverImageAlt,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    readingTime: article.readingTime,
    category: article.category,
    author: article.author,
  })) });
}

export const OPTIONS = mobileOptions;
