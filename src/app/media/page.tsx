import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/article-card';
import { GrowthTracker } from '@/components/growth-tracker';
import { getMediaHome, getPublishedArticles } from '@/server/media';
import { appUrl } from '@/lib/social';

export const metadata: Metadata = { title: '食事相手・ご飯友達の探し方メディア', description: '食事相手、ご飯友達、飲み友達の作り方や、安全に一緒にご飯へ行くための情報を紹介します。', alternates: { canonical: `${appUrl()}/media` }, openGraph: { type: 'website', url: `${appUrl()}/media` } };
const VISIBLE_CATEGORY_COUNT = 6;
export default async function MediaHome({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const raw = Number((await searchParams).page ?? 1); const page = Number.isInteger(raw) && raw > 0 ? raw : 1;
  const [{ latest, popular, featured, categories }, paged] = await Promise.all([getMediaHome(), getPublishedArticles(page)]);
  // categoriesはfeatured→trending→name順で取得済みなので、先頭N件が自然と注目/急上昇カテゴリになる。
  const visibleCategories = categories.slice(0, VISIBLE_CATEGORY_COUNT);
  const moreCategories = categories.slice(VISIBLE_CATEGORY_COUNT);
  return <section className="section"><GrowthTracker eventType="MEDIA_VIEW" source="media_home" />
    <div className="section-heading"><div><span className="eyebrow orange">俺メシ MEDIA</span><h1>食事相手・ご飯友達を見つけるヒント</h1><p>誰かと食べたい日に役立つ探し方、安全対策、地域の情報をまとめています。</p></div><Link className="btn" href="/meals">現在の食事相手募集を見る</Link></div>
    {featured.length > 0 && <><h2>おすすめ記事</h2><div className="media-grid">{featured.map(article => <ArticleCard key={article.id} article={article} />)}</div></>}
    <div className="panel"><h2>カテゴリ</h2><div className="tag-pills">{visibleCategories.map(category => <Link className={`tag-pill${category.featured ? ' tag-pill-featured' : ''}${category.trending ? ' tag-pill-trending' : ''}`} key={category.id} href={`/media/category/${category.slug}`}>{category.featured && <span className="tag-pill-badge">注目</span>}{category.trending && <span className="tag-pill-badge">急上昇</span>}{category.name}</Link>)}</div>
      {moreCategories.length > 0 && <details className="tag-pills-more"><summary>さらに表示（{moreCategories.length}）</summary><div className="tag-pills">{moreCategories.map(category => <Link className="tag-pill" key={category.id} href={`/media/category/${category.slug}`}>{category.name}</Link>)}</div></details>}
    </div>
    <h2>最新記事</h2><div className="media-grid">{paged.items.map(article => <ArticleCard key={article.id} article={article} />)}</div>{!latest.length && <div className="empty">公開記事は準備中です。現在の募集はいつでも探せます。</div>}
    <nav className="pagination" aria-label="記事ページ">{page > 1 && <Link href={page === 2 ? '/media' : `/media?page=${page - 1}`}>← 前のページ</Link>}<span>{page} / {paged.pages}</span>{page < paged.pages && <Link href={`/media?page=${page + 1}`}>次のページ →</Link>}</nav>
    {popular.length > 0 && <div className="panel"><h2>人気記事</h2>{popular.map(article => <Link className="list-card" key={article.id} href={`/media/${article.slug}`}>{article.title}</Link>)}</div>}
  </section>;
}
