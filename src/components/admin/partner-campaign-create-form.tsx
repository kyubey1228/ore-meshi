'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';
import { AreaDatalist } from '@/components/area-datalist';

const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();

type CreateInput = {
  title: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  area: FormDataEntryValue | null;
  offerText: FormDataEntryValue | null;
  startsAt: string;
  endsAt: string;
  maxPartners: number | null;
};

// FormData→入力オブジェクトの変換はこのクライアントコンポーネント内で完結させ、
// Server Componentからはaction(exportされたServer Action本体)とareaOptionsだけを渡す。
export function PartnerCampaignCreateForm({ action, areaOptions }: { action: (input: CreateInput) => Promise<ActionResult>; areaOptions: string[] }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  const router = useRouter();

  return (
    <form
      className="action-form"
      onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(async () => {
          try {
            const res = await action({
              title: data.get('title'),
              description: data.get('description'),
              area: data.get('area'),
              offerText: data.get('offerText'),
              startsAt: iso(data.get('startsAt')),
              endsAt: iso(data.get('endsAt')),
              maxPartners: data.get('maxPartners') ? Number(data.get('maxPartners')) : null,
            });
            setResult(res);
            if (res.ok) { router.refresh(); }
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        });
      }}
    >
      <fieldset disabled={pending}>
        <label>見出し<input name="title" required maxLength={100} placeholder="例：新宿エリア先行10店舗募集" /></label>
        <label>説明<textarea name="description" required maxLength={500} rows={3} placeholder="例：新宿の飯を一緒に増やす立ち上げパートナー募集です。" /></label>
        <label>エリア<input name="area" list="area-options" required maxLength={80} /></label>
        <AreaDatalist options={areaOptions} />
        <label>特典・オファー文言<input name="offerText" required maxLength={120} placeholder="例：初回空席スポンサー無料" /></label>
        <div className="two-col">
          <label>開始日時<input name="startsAt" type="datetime-local" required /></label>
          <label>終了日時<input name="endsAt" type="datetime-local" required /></label>
        </div>
        <label>募集枠数（任意・空欄なら無制限）<input name="maxPartners" type="number" min={1} max={1000} /></label>
        <button className="btn" disabled={pending}>{pending ? '送信中…' : '下書きを作成する'}</button>
      </fieldset>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </form>
  );
}
