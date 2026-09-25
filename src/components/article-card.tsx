import Image from 'next/image';
import Link from 'next/link';
import type { Article, ArticleCategory } from '@prisma/client';
import { dateLabel } from '@/lib/format';

export function ArticleCard({ article }: { article: Article & { category: ArticleCategory | null } }) {
  return <article className="panel media-card">
    {article.coverImage && <Link href={`/media/${article.slug}`}><Image src={article.coverImage} alt={article.coverImageAlt || ''} width={article.imageWidth} height={article.imageHeight} sizes="(max-width: 620px) 100vw, 33vw" unoptimized /></Link>}
    {article.category && <Link className="tag" href={`/media/category/${article.category.slug}`}>{article.category.name}</Link>}
    <h2><Link href={`/media/${article.slug}`}>{article.title}</Link></h2>
    <p>{article.excerpt}</p>
    <small>{article.publishedAt ? dateLabel(article.publishedAt) : ''} ・ 約{article.readingTime}分</small>
  </article>;
}
