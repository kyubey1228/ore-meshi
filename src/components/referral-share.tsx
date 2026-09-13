'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { trackGrowthEvent } from '@/components/growth-tracker';
import { UgcStylePicker } from '@/components/ugc-style-picker';
import { initialUgcStyle, withUgcStyle } from '@/lib/ugc';
import { lineShareUrl } from '@/lib/social';

type Props = { inviteUrl: string; text: string; mealId?: string; heading?: string; description?: string };

export function ReferralShare({ inviteUrl, text, mealId, heading = '友達も誘う', description = '紹介から登録すると、あなたと友達がつながって表示されます。' }: Props) {
  const [copied, setCopied] = useState(false);
  const [ugcStyle, setUgcStyle] = useState(() => initialUgcStyle(mealId ?? inviteUrl));
  const canShare = useSyncExternalStore(() => () => {}, () => typeof navigator.share === 'function', () => false);
  const styledInviteUrl = withUgcStyle(inviteUrl, ugcStyle, mealId);
  const styledText = text.replace(inviteUrl, styledInviteUrl);
  const previewUrl = mealId
    ? `/api/ugc/meals/${encodeURIComponent(mealId)}?style=${ugcStyle}`
    : `/api/ugc/invite?style=${ugcStyle}`;

  useEffect(() => { trackGrowthEvent('REFERRAL_LINK_CREATED', { recruitmentId: mealId, loggedIn: true }); }, [mealId]);

  function share(shareType: 'x' | 'line' | 'email' | 'url_copy') {
    trackGrowthEvent('RECRUITMENT_SHARED', { recruitmentId: mealId, shareType, loggedIn: true });
    if (shareType === 'x' || shareType === 'line') trackGrowthEvent('INVITE_SHARE_CLICKED', { recruitmentId: mealId, shareType, loggedIn: true });
    // メール招待は「送信ボタンを押した」ことしか分からず実送信は確認できないが、招待"送信数"を
    // 計測できる唯一のチャネルとして専用イベントで記録する(K-factor精度向上のため)。
    if (shareType === 'email') trackGrowthEvent('INVITE_EMAIL_SENT', { recruitmentId: mealId, shareType, loggedIn: true });
  }

  async function copyUrl() {
    share('url_copy');
    try {
      await navigator.clipboard.writeText(styledInviteUrl);
      trackGrowthEvent('INVITE_LINK_COPIED', { recruitmentId: mealId, loggedIn: true });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setCopied(false); }
  }

  async function webShare() {
    if (!navigator.share) return;
    trackGrowthEvent('INVITE_SHARE_CLICKED', { recruitmentId: mealId, shareType: 'web_share', loggedIn: true });
    try {
      await navigator.share({ title: '俺は誰かと飯が食いたい！', text: styledText, url: styledInviteUrl });
      trackGrowthEvent('INVITE_SHARE_COMPLETED', { recruitmentId: mealId, shareType: 'web_share', loggedIn: true });
    } catch { /* cancel */ }
  }

  return (
    <div className="panel">
      <h2>{heading}</h2>
      <p className="muted">{description}</p>
      <UgcStylePicker value={ugcStyle} onChange={setUgcStyle} previewUrl={previewUrl} />
      <div className="share-actions">
        <a className="btn dark-btn" href={`https://x.com/intent/tweet?${new URLSearchParams({ text: styledText }).toString()}`} target="_blank" rel="noopener noreferrer" onClick={() => share('x')}>Xで誘う</a>
        <a className="btn line-btn" href={lineShareUrl(styledInviteUrl, styledText)} target="_blank" rel="noopener noreferrer" onClick={() => share('line')}>LINEで誘う</a>
        <a className="btn secondary" href={`mailto:?subject=${encodeURIComponent('一緒に飯行かない？')}&body=${encodeURIComponent(styledText)}`} onClick={() => share('email')}>メールで誘う</a>
        <button className="btn secondary" type="button" onClick={copyUrl}>{copied ? 'コピーしました！' : '招待URLをコピー'}</button>
        {canShare && <button className="btn secondary" type="button" onClick={webShare}>共有する</button>}
        <a className="btn secondary" href={`${previewUrl}&download=1`} download>画像を保存</a>
      </div>
    </div>
  );
}
