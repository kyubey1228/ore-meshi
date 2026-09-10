'use client';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';
import { AreaDatalist } from '@/components/area-datalist';

const iso = (value: FormDataEntryValue | null) => new Date(`${String(value)}:00+09:00`).toISOString();
const KIND_LABEL_JA = { SPONSORED_MEAL: 'スポンサー飯', SPONSOR_CAMPAIGN: '全額・企業スポンサー', SEAT_CAMPAIGN: '空席スポンサー', COUPON: 'クーポン' } as const;

type CreateInput = Record<string, unknown>;
type Business = { id: string; name: string; area: string | null };

// FormData→入力オブジェクトの変換はこのクライアントコンポーネント内で完結させ、
// Server Componentからはaction(exportされたServer Action本体)とプレーンなデータだけを渡す。
export function SponsorCampaignDraftForm({ action, businesses, areaOptions }: { action: (input: CreateInput) => Promise<ActionResult>; businesses: Business[]; areaOptions: string[] }) {
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
              businessAccountId: data.get('businessAccountId'),
              kind: data.get('kind'),
              title: data.get('title'),
              restaurantName: data.get('restaurantName'),
              area: data.get('area'),
              genre: data.get('genre'),
              benefit: data.get('benefit'),
              startsAt: iso(data.get('startsAt')),
              endsAt: iso(data.get('endsAt')),
              capacity: Number(data.get('capacity')),
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
        <label>店舗<select name="businessAccountId" required>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}{b.area ? `（${b.area}）` : ''}</option>)}</select></label>
        <label>種類<select name="kind" required>{Object.entries(KIND_LABEL_JA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>見出し・スポンサー名<input name="title" required maxLength={80} placeholder="例：今日は店長のおごりです" /></label>
        <label>店舗名（表示用）<input name="restaurantName" required maxLength={80} /></label>
        <label>エリア<input name="area" list="area-options" maxLength={80} /></label>
        <AreaDatalist options={areaOptions} />
        <label>ジャンル（任意・スポンサー飯のみ使用）<input name="genre" maxLength={60} placeholder="例：焼肉" /></label>
        <label>特典・提供内容<textarea name="benefit" maxLength={120} rows={2} placeholder="例：最初のドリンク無料" /></label>
        <div className="two-col">
          <label>開始日時<input name="startsAt" type="datetime-local" required /></label>
          <label>終了・有効期限<input name="endsAt" type="datetime-local" required /></label>
        </div>
        <label>募集人数・席数<input name="capacity" type="number" min={1} max={100} defaultValue={4} required /></label>
        <button className="btn" disabled={pending}>{pending ? '送信中…' : '下書きを作成する'}</button>
        <p className="muted">スポンサー飯・空席スポンサーは下書き作成後、店舗側の一覧画面から支払うと公開されます。全額スポンサー・クーポンは作成と同時に公開されます。</p>
      </fieldset>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </form>
  );
}
