'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBusinessCampaign } from '@/server/actions/business';

type BenefitKind = 'NONE' | 'DRINK' | 'DISCOUNT' | 'CUSTOM';
const BENEFIT_LABEL: Record<BenefitKind, string> = { NONE: 'なし', DRINK: 'ドリンク1杯', DISCOUNT: '500円引き', CUSTOM: '自由入力' };
const SEAT_OPTIONS = [1, 2, 3, 4, 5] as const;
const MINUTES_OPTIONS = [30, 60, 120] as const;

type Props = { businessAccountId: string; restaurantName: string; area: string; priceYen: string };

function minutesFromNow(minutes: number) {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function SeatCampaignWizard({ businessAccountId, restaurantName, area, priceYen }: Props) {
  const [seats, setSeats] = useState<number | null>(null);
  const [isFivePlus, setIsFivePlus] = useState(false);
  const [endsAtTime, setEndsAtTime] = useState('');
  const [benefitKind, setBenefitKind] = useState<BenefitKind | null>(null);
  const [benefitText, setBenefitText] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const benefit = benefitKind === 'NONE' || !benefitKind ? '' : benefitKind === 'CUSTOM' ? benefitText : BENEFIT_LABEL[benefitKind];
  const ready = seats !== null && endsAtTime.length > 0 && benefitKind !== null && (benefitKind !== 'CUSTOM' || benefitText.trim().length > 0);

  function submit() {
    if (!seats) return;
    setError('');
    start(async () => {
      const now = new Date();
      const [hours, minutes] = endsAtTime.split(':').map(Number);
      const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      if (endsAt <= now) endsAt.setDate(endsAt.getDate() + 1);
      const result = await createBusinessCampaign({
        businessAccountId,
        kind: 'SEAT_CAMPAIGN',
        title: '今、席空いてます',
        restaurantName,
        area,
        benefit,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        participantLimit: seats,
        remaining: seats,
      });
      if (!result.ok) { setError(result.message); return; }
      router.push('/business/seats');
      router.refresh();
    });
  }

  return (
    <div className="panel seat-wizard">
      <section>
        <h3>今、何席空いてる?</h3>
        <div className="tap-grid">
          {SEAT_OPTIONS.map(n => (
            <button key={n} type="button" className={`chip ${seats === n && !isFivePlus ? 'selected' : ''}`} onClick={() => { setSeats(n); setIsFivePlus(false); }}>{n}</button>
          ))}
          <button type="button" className={`chip ${isFivePlus ? 'selected' : ''}`} onClick={() => { setIsFivePlus(true); setSeats(5); }}>5+</button>
        </div>
        {isFivePlus && (
          <label>正確な席数<input type="number" min={5} max={100} value={seats ?? 5} onChange={e => setSeats(Number(e.target.value))} /></label>
        )}
      </section>

      {seats !== null && (
        <section>
          <h3>何時まで?</h3>
          <div className="time-grid">
            {MINUTES_OPTIONS.map(m => (
              <button key={m} type="button" className={`chip ${endsAtTime === minutesFromNow(m) ? 'selected' : ''}`} onClick={() => setEndsAtTime(minutesFromNow(m))}>{m < 60 ? `${m}分後` : `${m / 60}時間後`}</button>
            ))}
          </div>
          <label>時刻を指定<input type="time" value={endsAtTime} onChange={e => setEndsAtTime(e.target.value)} /></label>
        </section>
      )}

      {endsAtTime && (
        <section>
          <h3>特典つける?</h3>
          <div className="tag-selector">
            {(Object.keys(BENEFIT_LABEL) as BenefitKind[]).map(kind => (
              <button key={kind} type="button" className={`selectable-chip ${benefitKind === kind ? 'selected' : ''}`} onClick={() => setBenefitKind(kind)}>{BENEFIT_LABEL[kind]}</button>
            ))}
          </div>
          {benefitKind === 'CUSTOM' && <textarea value={benefitText} onChange={e => setBenefitText(e.target.value)} maxLength={120} rows={2} placeholder="例:生ビール半額" />}
        </section>
      )}

      {ready && (
        <section>
          <h3>空席スポンサー ¥{priceYen}</h3>
          <button className="btn wide" type="button" disabled={pending} onClick={submit}>{pending ? '作成しています…' : '今すぐ客を呼ぶ'}</button>
          {error && <p role="alert" className="error">{error}</p>}
          <p className="muted">下書きが作成されます。実際の支払いは次の一覧画面から行います。</p>
        </section>
      )}
    </div>
  );
}
