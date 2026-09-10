'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { trackGrowthEvent } from '@/components/growth-tracker';

type Props = { inviteUrl: string; text: string; mealId?: string };

export function ReferralShare({ inviteUrl, text, mealId }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(() => () => {}, () => typeof navigator.share === 'function', () => false);
  useEffect(() => { trackGrowthEvent('REFERRAL_LINK_CREATED', { recruitmentId: mealId, loggedIn: true }); }, [mealId]);

  function share(shareType: 'x' | 'line' | 'url_copy') {
    trackGrowthEvent('RECRUITMENT_SHARED', { recruitmentId: mealId, shareType, loggedIn: true });
    if (shareType === 'x' || shareType === 'line') trackGrowthEvent('INVITE_SHARE_CLICKED', { recruitmentId: mealId, shareType, loggedIn: true });
  }

  async function copyUrl() {
    share('url_copy');
    try { await navigator.clipboard.writeText(inviteUrl); trackGrowthEvent('INVITE_LINK_COPIED', { recruitmentId: mealId, loggedIn: true }); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  }

  async function webShare() {
    if (!navigator.share) return;
    trackGrowthEvent('INVITE_SHARE_CLICKED', { recruitmentId: mealId, shareType: 'web_share', loggedIn: true });
    try {
      await navigator.share({ title: '俺は誰かと飯が食いたい！', text, url: inviteUrl });
      trackGrowthEvent('INVITE_SHARE_COMPLETED', { recruitmentId: mealId, shareType: 'web_share', loggedIn: true });
    } catch { /* cancel */ }
  }

  return (
    <div className="panel">
      <h2>友達も誘う</h2>
      <p className="muted">紹介から登録すると、あなたと友達がつながって表示されます。</p>
      <div className="share-actions">
        <a className="btn dark-btn" href={`https://x.com/intent/tweet?${new URLSearchParams({ text }).toString()}`} target="_blank" rel="noopener noreferrer" onClick={() => share('x')}>Xで誘う</a>
        <a className="btn line-btn" href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={() => share('line')}>LINEで誘う</a>
        <button className="btn secondary" type="button" onClick={copyUrl}>{copied ? 'コピーしました！' : '招待URLをコピー'}</button>
        {canShare && <button className="btn secondary" type="button" onClick={webShare}>共有する</button>}
      </div>
    </div>
  );
}
