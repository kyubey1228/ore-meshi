'use client';
import { useState, useSyncExternalStore } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { trackGrowthEvent } from '@/components/growth-tracker';

function subscribeNever() { return () => {}; }
function getWebShareSupport() { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; }

type Props = { mealId: string; area: string; genre: string | null; text: string; url: string };

export function MealShareActions({ mealId, area, genre, text, url }: Props) {
  const [copied, setCopied] = useState(false);
  // navigator.shareの有無はSSR/CSRで結果が異なりうるため、useSyncExternalStoreでサーバーは常にfalseとしハイドレーション不一致を避ける。
  const canWebShare = useSyncExternalStore(subscribeNever, getWebShareSupport, () => false);
  const payload = { recruitmentId: mealId, area, foodCategory: genre ?? undefined };

  function share(shareType: 'x' | 'line' | 'url_copy' | 'web_share') {
    trackGrowthEvent('RECRUITMENT_SHARED', { ...payload, shareType });
    if (shareType === 'x') trackGrowthEvent('RECRUITMENT_SHARE_X', payload);
    if (shareType === 'line') trackGrowthEvent('RECRUITMENT_SHARE_LINE', payload);
    if (shareType === 'url_copy') trackGrowthEvent('RECRUITMENT_URL_COPIED', payload);
  }

  async function copyUrl() {
    share('url_copy');
    try {
      await navigator.clipboard.writeText(url);
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
      await navigator.share({ title: '俺は誰かと飯が食いたい！', text, url });
    } catch {
      // ユーザーがキャンセルした場合は何もしない。
    }
  }

  return (
    <div className="share-actions">
      <a className="btn dark-btn" href={`https://x.com/intent/tweet?${new URLSearchParams({ text }).toString()}`} target="_blank" rel="noopener noreferrer" onClick={() => share('x')}>
        <Share2 size={17} />Xで共有
      </a>
      <a className="btn line-btn" href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={() => share('line')}>
        LINEで送る
      </a>
      <button className="btn secondary" type="button" onClick={copyUrl}>
        <Copy size={17} />{copied ? 'コピーしました！' : 'URLをコピー'}
      </button>
      {canWebShare && (
        <button className="btn secondary" type="button" onClick={webShare}>共有する</button>
      )}
    </div>
  );
}
