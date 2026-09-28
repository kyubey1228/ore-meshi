import Link from 'next/link';
export default function ArticleNotFound() {
  return <section className="section narrow center">
    <span className="empty-icon">📄</span>
    <h1>その記事は見つかりませんでした。</h1>
    <p className="muted">URLが間違っているか、記事のURLが変更された可能性があります。共有する前に記事ページを開き直して、最新のリンクを使ってください。</p>
    <Link className="btn" href="/media">メディアトップへ</Link>
  </section>;
}
