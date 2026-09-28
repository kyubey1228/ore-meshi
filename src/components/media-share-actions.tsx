'use client';
import { useState, useSyncExternalStore } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { trackGrowthEvent } from '@/components/growth-tracker';
import { lineShareUrl, withUtm, xIntent } from '@/lib/social';

function subscribeNever() { return () => {}; }
function webShareSupported() { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; }

export function MediaShareActions({ title, url, slug }: { title: string; url: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const canWebShare = useSyncExternalStore(subscribeNever, webShareSupported, () => false);
  const xUrl = withUtm(url, 'x', 'social', `media_${slug}`);
  const lineUrl = withUtm(url, 'line', 'social', `media_${slug}`);
  const copyUrl = withUtm(url, 'share', 'copy', `media_${slug}`);
  const nativeUrl = withUtm(url, 'share', 'web_share', `media_${slug}`);
  const text = `${title}｜俺は誰かと飯が食いたい！`;

  function track(channel: string) {
    trackGrowthEvent('MEDIA_CTA_CLICK', { source: `article_share_${channel}`, utmCampaign: `media_${slug}` });
  }

  async function copy() {
    track('copy');
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setCopied(false); }
  }

  async function nativeShare() {
    if (!navigator.share) return;
    track('native');
    try { await navigator.share({ title: text, text, url: nativeUrl }); }
    catch { /* キャンセル時は何もしない */ }
  }

  return <aside className="media-share" aria-label="この記事を共有">
    <strong>この記事をシェア</strong>
    <div className="share-actions">
      <a className="btn dark-btn" href={xIntent(`${text}\n${xUrl}`)} target="_blank" rel="noopener noreferrer" onClick={() => track('x')}><Share2 size={17}/>Xで共有</a>
      <a className="btn line-btn" href={lineShareUrl(lineUrl, text)} target="_blank" rel="noopener noreferrer" onClick={() => track('line')}>LINEで送る</a>
      <button className="btn secondary" type="button" onClick={copy}><Copy size={17}/>{copied ? 'コピーしました！' : 'URLをコピー'}</button>
      {canWebShare && <button className="btn secondary" type="button" onClick={nativeShare}><Share2 size={17}/>共有する</button>}
    </div>
  </aside>;
}
