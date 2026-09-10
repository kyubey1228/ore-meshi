'use client';
import { ActionForm } from '@/components/action-form';
import { createBusinessCampaign } from '@/server/actions/business';

const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();

export function BusinessDirectAdForm({ businessAccountId }: { businessAccountId: string }) {
  return (
    <div className="panel">
      <h2>企業広告を出稿する</h2>
      <ActionForm
        label="広告を登録"
        action={data => createBusinessCampaign({
          businessAccountId,
          kind: 'DIRECT_AD_CAMPAIGN',
          title: data.get('title'),
          restaurantName: data.get('advertiserName'),
          area: '',
          benefit: '',
          description: data.get('description'),
          startsAt: iso(data.get('startsAt')),
          endsAt: iso(data.get('endsAt')),
          participantLimit: 1,
          remaining: 1,
        })}
      >
        <label>広告タイトル<input name="title" required maxLength={80} /></label>
        <label>広告主名<input name="advertiserName" required maxLength={80} /></label>
        <label>説明<textarea name="description" maxLength={120} rows={3} /></label>
        <div className="two-col">
          <label>開始日時<input name="startsAt" type="datetime-local" required /></label>
          <label>終了日時<input name="endsAt" type="datetime-local" required /></label>
        </div>
      </ActionForm>
    </div>
  );
}
