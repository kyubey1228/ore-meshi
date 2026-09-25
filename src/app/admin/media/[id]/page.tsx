import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleForm } from '@/components/admin/article-form';
import { getAdminArticle } from '@/server/media';
export const metadata = { title: '記事を編集', robots: { index: false, follow: false } };
export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) { const article = await getAdminArticle((await params).id); if (!article) notFound(); return <section className="section"><Link className="text-link" href="/admin/media">← 記事一覧</Link><div className="section-heading"><h1>記事を編集</h1>{article.status === 'PUBLISHED' && <Link className="btn secondary" href={`/media/${article.slug}`}>公開ページをPreview</Link>}</div><ArticleForm article={article} /></section>; }
