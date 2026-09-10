'use client';
import { useEffect, useState } from 'react';
import { trackGrowthEvent } from '@/components/growth-tracker';

type Props = { inviteUrl: string; text: string; mealId?: string };

export function ReferralShare({ inviteUrl, text, mealId }: Props) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { trackGrowthEvent('REFERRAL_LINK_CREATED', { recruitmentId: mealId, loggedIn: true }); }, [mealId]);

  function share(shareType: 'x' | 'line' | 'url_copy') {
    trackGrowthEvent('RECRUITMENT_SHARED', { recruitmentId: mealId, shareType, loggedIn: true });
  }

  async function copyUrl() {
    share('url_copy');
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  }

  return (
    <div className="panel">
      <h2>友達も誘う</h2>
      <p className="muted">紹介から登録すると、あなたと友達がつながって表示されます。</p>
      <div className="share-actions">
        <a className="btn dark-btn" href={`https://x.com/intent/tweet?${new URLSearchParams({ text }).toString()}`} target="_blank" rel="noopener noreferrer" onClick={() => share('x')}>Xで誘う</a>
        <a className="btn line-btn" href={`https://line.me/R/msg/text/?${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={() => share('line')}>LINEで誘う</a>
        <button className="btn secondary" type="button" onClick={copyUrl}>{copied ? 'コピーしました！' : '招待URLをコピー'}</button>
      </div>
    </div>
  );
}
