'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBusinessCampaign } from '@/server/actions/business';
import { generateSponsoredMealPost } from '@/features/x-sharing/templates';

const STEP_COUNT = 4;

type RepeatDefaults = { title: string; restaurantName: string; area: string; genre: string; benefit: string; description: string; participantLimit: number };
type Props = { businessAccountId: string; businessName: string; defaultRestaurantName: string; defaultArea: string; priceYen: string; repeatDefaults?: RepeatDefaults };

export function SponsoredMealWizard({ businessAccountId, businessName, defaultRestaurantName, defaultArea, priceYen, repeatDefaults }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(repeatDefaults?.title ?? '');
  const [restaurantName, setRestaurantName] = useState(repeatDefaults?.restaurantName ?? defaultRestaurantName);
  const [area, setArea] = useState(repeatDefaults?.area ?? defaultArea);
  const [genre, setGenre] = useState(repeatDefaults?.genre ?? '');
  // 日時は「同じ条件でもう一度」でも必ず選び直させる(過去のstartsAtをそのまま使い回さない)。
  const [startsAt, setStartsAt] = useState('');
  const [participantLimit, setParticipantLimit] = useState(repeatDefaults?.participantLimit ?? 4);
  const [benefit, setBenefit] = useState(repeatDefaults?.benefit ?? '');
  const [description, setDescription] = useState(repeatDefaults?.description ?? '');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const canProceedStep1 = title.trim().length > 0 && restaurantName.trim().length > 0 && area.trim().length > 0 && startsAt.length > 0;

  function submit() {
    setError('');
    start(async () => {
      const startDate = new Date(`${startsAt}:00+09:00`);
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      const result = await createBusinessCampaign({
        businessAccountId,
        kind: 'SPONSORED_MEAL',
        title,
        restaurantName,
        area,
        genre,
        benefit,
        description,
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        participantLimit,
        remaining: participantLimit,
      });
      if (!result.ok) { setError(result.message); return; }
      router.push('/business/sponsored-meals');
      router.refresh();
    });
  }

  const previewText = title && startsAt
    ? generateSponsoredMealPost(
        { id: 'preview', kind: 'SPONSORED_MEAL', businessAccountId, businessName, title, restaurantName, area, startsAt: new Date(`${startsAt}:00+09:00`), participantLimit, remaining: participantLimit, benefit, status: 'DRAFT' },
        '（作成後にURLが入ります）',
      )
    : '';

  return (
    <div className="panel">
      <div className="wizard-progress">{Array.from({ length: STEP_COUNT }, (_, i) => <span key={i} className={i < step ? 'done' : ''} />)}</div>
      <p className="muted">ステップ {step} / {STEP_COUNT}</p>

      {step === 1 && (
        <fieldset>
          <label>見出し<input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="例：今日は店長のおごりです" required /></label>
          <label>店舗名<input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} maxLength={80} required /></label>
          <label>エリア<input value={area} onChange={e => setArea(e.target.value)} maxLength={80} required /></label>
          <label>ジャンル（任意）<input value={genre} onChange={e => setGenre(e.target.value)} maxLength={60} placeholder="例：焼肉" /></label>
          <label>開催日時<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></label>
          <label>対象人数<input type="number" min={1} max={100} value={participantLimit} onChange={e => setParticipantLimit(Number(e.target.value))} required /></label>
          <label>特典<textarea value={benefit} onChange={e => setBenefit(e.target.value)} maxLength={120} rows={2} placeholder="例：最初のドリンク無料" /></label>
          <label>説明<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={4} placeholder="お店やイベントの詳しい説明" /></label>
          <button className="btn wide" type="button" disabled={!canProceedStep1} onClick={() => setStep(2)}>プレビューへ</button>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <h3>Xではこんな感じ</h3>
          <div className="x-post-preview"><p className="pre-wrap">{previewText}</p></div>
          <div className="row wrap">
            <button className="btn secondary" type="button" onClick={() => setStep(1)}>戻る</button>
            <button className="btn" type="button" onClick={() => setStep(3)}>料金を見る</button>
          </div>
        </fieldset>
      )}

      {step === 3 && (
        <fieldset>
          <h3>スポンサー飯 掲載料</h3>
          <p className="campaign-benefit">¥{priceYen}</p>
          <p className="muted">含まれるもの:</p>
          <ul>
            <li>俺メシ内スポンサー表示</li>
            <li>PR表示</li>
            <li>X共有カード・OGP</li>
            <li>送客計測</li>
          </ul>
          <div className="row wrap">
            <button className="btn secondary" type="button" onClick={() => setStep(2)}>戻る</button>
            <button className="btn" type="button" onClick={() => setStep(4)}>支払いへ</button>
          </div>
        </fieldset>
      )}

      {step === 4 && (
        <fieldset>
          <h3>内容を確認</h3>
          <dl className="detail-list">
            <div><dt>見出し</dt><dd>{title}</dd></div>
            <div><dt>店舗</dt><dd>{restaurantName}</dd></div>
            <div><dt>エリア</dt><dd>{area}</dd></div>
          </dl>
          <div className="row wrap">
            <button className="btn secondary" type="button" disabled={pending} onClick={() => setStep(3)}>戻る</button>
            <button className="btn" type="button" disabled={pending} onClick={submit}>{pending ? '作成しています…' : `${priceYen}円でスポンサー飯を出す`}</button>
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          <p className="muted">「出す」を押すと下書きが作成されます。実際の支払いは次の一覧画面から行います。</p>
        </fieldset>
      )}
    </div>
  );
}
