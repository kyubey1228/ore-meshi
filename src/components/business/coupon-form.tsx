'use client';
import { ActionForm } from '@/components/action-form';
import { createBusinessCampaign } from '@/server/actions/business';

const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();

export function CouponForm({ businessAccountId, defaultRestaurantName, defaultArea }: { businessAccountId: string; defaultRestaurantName: string; defaultArea: string }) {
  return (
    <div className="panel">
      <ActionForm
        label="クーポン作る"
        action={data => createBusinessCampaign({
          businessAccountId,
          kind: 'COUPON',
          title: data.get('title'),
          restaurantName: data.get('restaurantName'),
          area: data.get('area'),
          benefit: data.get('benefit'),
          startsAt: new Date().toISOString(),
          endsAt: iso(data.get('expiresAt')),
          participantLimit: 1,
          remaining: 1,
        })}
      >
        <label>クーポン名<input name="title" required maxLength={80} placeholder="例:ドリンク1杯無料クーポン" /></label>
        <label>店舗名<input name="restaurantName" required maxLength={80} defaultValue={defaultRestaurantName} /></label>
        <label>エリア<input name="area" maxLength={80} defaultValue={defaultArea} /></label>
        <label>内容<textarea name="benefit" maxLength={120} rows={3} placeholder="例:お会計から500円引き" required /></label>
        <label>有効期限<input name="expiresAt" type="datetime-local" required /></label>
      </ActionForm>
    </div>
  );
}
