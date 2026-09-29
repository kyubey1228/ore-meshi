import { getPublishedArticle } from '@/server/media';
import { articleDescription } from '@/lib/media';
import { mobileJson, mobileOptions, plainArticleText } from '@/lib/mobile-api';

export async function GET(_request: Request, context: RouteContext<'/api/mobile/v1/articles/[slug]'>) {
  const { slug } = await context.params;
  const article = await getPublishedArticle(slug);
  if (!article) return mobileJson({ error: '記事が見つかりません。' }, { status: 404 });

  return mobileJson({ item: {
    id: article.id,
    title: article.title,
    slug: article.slug,
    description: articleDescription(article),
    content: plainArticleText(article.content),
    coverImage: article.coverImage,
    coverImageAlt: article.coverImageAlt,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    updatedAt: article.updatedAt.toISOString(),
    readingTime: article.readingTime,
    category: article.category ? { name: article.category.name, slug: article.category.slug } : null,
    author: { displayName: article.author.displayName },
  } });
}

export const OPTIONS = mobileOptions;
