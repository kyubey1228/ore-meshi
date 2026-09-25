import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { appUrl } from '@/lib/social';
import { getPublishedArticles } from '@/server/media';
import { ArticleCard } from '@/components/article-card';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const category = await prisma.articleCategory.findUnique({ where: { slug } }); if (!category) return {}; const canonical = `${appUrl()}/media/category/${slug}`; return { title: category.seoTitle || `${category.name}の記事`, description: category.seoDescription || category.description, alternates: { canonical }, openGraph: { title: category.seoTitle || category.name, description: category.seoDescription || category.description || '', url: canonical } }; }
export default async function CategoryPage({ params, searchParams }: Props) { const { slug } = await params; const category = await prisma.articleCategory.findUnique({ where: { slug } }); if (!category) notFound(); const raw = Number((await searchParams).page ?? 1); const page = Number.isInteger(raw) && raw > 0 ? raw : 1; const data = await getPublishedArticles(page, slug); if (page > data.pages) notFound(); const canonical = `${appUrl()}/media/category/${slug}`; const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'ホーム', item: appUrl() }, { '@type': 'ListItem', position: 2, name: 'メディア', item: `${appUrl()}/media` }, { '@type': 'ListItem', position: 3, name: category.name, item: canonical }] };
  return <section className="section"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }} /><nav className="breadcrumbs"><Link href="/">ホーム</Link> / <Link href="/media">メディア</Link> / {category.name}</nav><h1>{category.name}</h1>{category.description && <p>{category.description}</p>}<div className="media-grid">{data.items.map(article => <ArticleCard key={article.id} article={article} />)}</div>{!data.items.length && <div className="empty">このカテゴリの記事は準備中です。</div>}<nav className="pagination">{page > 1 && <Link href={page === 2 ? `/media/category/${slug}` : `/media/category/${slug}?page=${page - 1}`}>← 前へ</Link>}<span>{page} / {data.pages}</span>{page < data.pages && <Link href={`/media/category/${slug}?page=${page + 1}`}>次へ →</Link>}</nav></section>;
}
