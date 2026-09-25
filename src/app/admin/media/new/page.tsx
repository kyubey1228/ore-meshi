import Link from 'next/link';
import { ArticleForm } from '@/components/admin/article-form';
export const metadata = { title: '記事を作成', robots: { index: false, follow: false } };
export default function NewArticle() { return <section className="section"><Link className="text-link" href="/admin/media">← 記事一覧</Link><h1>記事を作成</h1><p className="muted">Markdownで本文を作成します。自由HTMLは実行されません。</p><ArticleForm /></section>; }
