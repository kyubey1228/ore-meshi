'use client';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="section narrow center"><span className="empty-icon">🍵</span><h1>ちょっと一息。</h1><p>画面を読み込めませんでした。少し待って、もう一度お試しください。</p><button className="btn" onClick={reset}>もう一度読み込む</button></section>; }
