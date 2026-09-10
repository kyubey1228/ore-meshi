'use client';

export function BusinessQrPrintPanel({ url, title, restaurantName, benefit }: { url: string; title: string; restaurantName: string; benefit?: string }) {
  return (
    <div className="panel qr-print-sheet">
      <h2>印刷用QR（店頭掲示）</h2>
      <p className="muted">レジ横やテーブルに置いて、お客様にスマホで読み取ってもらってください。「俺は誰かと飯が食いたい！」経由のアクセスとして計測されます。</p>
      <div className="qr-print-card">
        <p className="qr-print-eyebrow">PR · 提供 {restaurantName}</p>
        <h3>{title}</h3>
        {benefit && <p>{benefit}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(url)}`} alt="QRコード" width={280} height={280} />
        <p className="muted break-all">{url}</p>
      </div>
      <button type="button" className="btn" onClick={() => window.print()}>印刷する</button>
    </div>
  );
}
