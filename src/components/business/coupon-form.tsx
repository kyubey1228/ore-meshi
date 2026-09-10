'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBusinessCampaign } from '@/server/actions/business';
import { generateCouponPost } from '@/features/x-sharing/templates';
import { AreaDatalist } from '@/components/area-datalist';

type Props = { businessAccountId: string; defaultRestaurantName: string; defaultArea: string; areaOptions?: string[] };

export function CouponForm({ businessAccountId, defaultRestaurantName, defaultArea, areaOptions = [] }: Props) {
  const [title, setTitle] = useState('');
  const [restaurantName, setRestaurantName] = useState(defaultRestaurantName);
  const [area, setArea] = useState(defaultArea);
  const [benefit, setBenefit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const ready = title.trim().length > 0 && restaurantName.trim().length > 0 && benefit.trim().length > 0 && expiresAt.length > 0;

  function submit() {
    setError('');
    start(async () => {
      const expires = new Date(`${expiresAt}:00+09:00`);
      const result = await createBusinessCampaign({
        businessAccountId,
        kind: 'COUPON',
        title,
        restaurantName,
        area,
        benefit,
        startsAt: new Date().toISOString(),
        endsAt: expires.toISOString(),
        participantLimit: 1,
        remaining: 1,
      });
      if (!result.ok) { setError(result.message); return; }
      router.push('/business/coupons');
      router.refresh();
    });
  }

  const previewText = title && restaurantName && benefit
    ? generateCouponPost(
        { id: 'preview', kind: 'COUPON', businessAccountId, businessName: restaurantName, title, restaurantName, area, endsAt: expiresAt ? new Date(`${expiresAt}:00+09:00`) : undefined, benefit, status: 'DRAFT' },
        '（作成後にURLが入ります）',
      )
    : 'クーポン名・特典を入力すると、X投稿イメージがリアルタイムに更新されます。';

  return (
    <div className="preview-split">
      <div className="panel">
        <fieldset disabled={pending}>
          <label>クーポン名<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={80} placeholder="例:ドリンク1杯無料クーポン" /></label>
          <label>店舗名<input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} required maxLength={80} /></label>
          <label>エリア<input value={area} onChange={e => setArea(e.target.value)} list="area-options" maxLength={80} /></label>
          <AreaDatalist options={areaOptions} />
          <label>内容<textarea value={benefit} onChange={e => setBenefit(e.target.value)} maxLength={120} rows={3} placeholder="例:お会計から500円引き" required /></label>
          <label>有効期限<input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} required /></label>
        </fieldset>
      </div>

      <div className="panel">
        <h3>Xではこんな感じ</h3>
        <div className="x-post-preview"><p className="pre-wrap">{previewText}</p></div>
        <button className="btn wide" type="button" disabled={!ready || pending} onClick={submit}>{pending ? '作成しています…' : 'クーポン作る'}</button>
        {error && <p role="alert" className="error">{error}</p>}
        <p className="muted">作成すると、すぐに公開されます(決済は不要です)。</p>
      </div>
    </div>
  );
}
