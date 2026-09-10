'use client';
import { useState, useSyncExternalStore } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { trackGrowthEvent } from '@/components/growth-tracker';
import { withUtm } from '@/lib/social';
import { UgcStylePicker } from '@/components/ugc-style-picker';
import { initialUgcStyle, withUgcStyle } from '@/lib/ugc';

function subscribeNever() { return () => {}; }
function getWebShareSupport() { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; }

type Props = { mealId: string; area: string; genre: string | null; text: string; url: string };

export function MealShareActions({ mealId, area, genre, text, url }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [ugcStyle, setUgcStyle] = useState(() => initialUgcStyle(mealId));
  // navigator.shareの有無はSSR/CSRで結果が異なりうるため、useSyncExternalStoreでサーバーは常にfalseとしハイドレーション不一致を避ける。
  const canWebShare = useSyncExternalStore(subscribeNever, getWebShareSupport, () => false);
  const payload = { recruitmentId: mealId, area, foodCategory: genre ?? undefined };

  const xUrl = withUgcStyle(withUtm(url, 'x', 'social'), ugcStyle);
  const lineUrl = withUgcStyle(withUtm(url, 'line', 'social'), ugcStyle);
  const copyUrl_ = withUgcStyle(withUtm(url, 'share', 'copy'), ugcStyle);
  const webShareUrl = withUgcStyle(withUtm(url, 'share', 'web_share'), ugcStyle);
  const qrUrl = withUgcStyle(withUtm(url, 'share', 'qr'), ugcStyle);
  const previewUrl = `/api/ugc/meals/${encodeURIComponent(mealId)}?style=${ugcStyle}`;
  const xText = text.replace(url, xUrl);
  const lineText = text.replace(url, lineUrl);
  const previewLines = text.split('\n').map(line => line.trim()).filter(Boolean);

  function share(shareType: 'x' | 'line' | 'url_copy' | 'web_share') {
    trackGrowthEvent('RECRUITMENT_SHARED', { ...payload, shareType });
    if (shareType === 'x') trackGrowthEvent('RECRUITMENT_SHARE_X', payload);
    if (shareType === 'line') trackGrowthEvent('RECRUITMENT_SHARE_LINE', payload);
    if (shareType === 'url_copy') trackGrowthEvent('RECRUITMENT_URL_COPIED', payload);
  }

  async function copyUrl() {
    share('url_copy');
    try {
      await navigator.clipboard.writeText(copyUrl_);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function webShare() {
    if (!navigator.share) return;
    share('web_share');
    try {
      await navigator.share({ title: '俺は誰かと飯が食いたい！', text, url: webShareUrl });
    } catch {
      // ユーザーがキャンセルした場合は何もしない。
    }
  }

  return (
    <div className="share-actions-wrap">
      <UgcStylePicker value={ugcStyle} onChange={setUgcStyle} previewTitle={previewLines[0] ?? '誰か、飯いかん？'} previewDetail={previewLines.slice(1, 3).join(' · ') || area} />
      <div className="share-actions">
        <a className="btn dark-btn" href={`https://x.com/intent/tweet?${new URLSearchParams({ text: xText }).toString()}`} target="_blank" rel="noopener noreferrer" onClick={() => share('x')}>
          <Share2 size={17} />Xで共有
        </a>
        <a className="btn line-btn" href={`https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`} target="_blank" rel="noopener noreferrer" onClick={() => share('line')}>
          LINEで送る
        </a>
        <button className="btn secondary" type="button" onClick={copyUrl}>
          <Copy size={17} />{copied ? 'コピーしました！' : 'URLをコピー'}
        </button>
        {canWebShare && (
          <button className="btn secondary" type="button" onClick={webShare}>共有する</button>
        )}
        <button className="btn secondary" type="button" onClick={() => setShowQr(v => !v)} aria-expanded={showQr}>QRコード</button>
        <a className="btn secondary" href={`${previewUrl}&download=1`} download>画像を保存</a>
      </div>
      {showQr && (
        <div className="share-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(qrUrl)}`} alt="この飯の募集ページのQRコード" width={220} height={220} loading="lazy" />
          <p className="muted">読み取るとこの募集ページが開きます。</p>
        </div>
      )}
    </div>
  );
}
