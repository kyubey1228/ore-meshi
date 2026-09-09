import Link from 'next/link';
export default function NotFound() { return <section className="section narrow center"><span className="empty-icon">🍙</span><h1>その飯は見つかりませんでした。</h1><Link className="btn" href="/meals">飯を探す</Link></section>; }
