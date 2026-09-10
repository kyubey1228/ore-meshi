'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMeal } from '@/server/actions/meals';
import { getPredictionTip } from '@/server/actions/prediction';
import { buildQuickCandidate, parseFreeTextWhen, type QuickWhen } from '@/lib/quick-post-time';
import { MEAL_TEMPLATES } from '@/lib/meal-templates';
import { trackGrowthEvent } from '@/components/growth-tracker';

const WHEN_OPTIONS: { value: QuickWhen; label: string }[] = [
  { value: 'tonight', label: '今夜' },
  { value: 'tomorrow', label: '明日の夜' },
  { value: 'lunch', label: 'ランチ' },
];

type RepeatDefaults = { area: string; genre: string; maxParticipants: number; description: string };
type FrequentPattern = { label: string; weekday: number; hour: number };
type Tip = { prediction: { fillRate: number | null; sampleSize: number; fallbackLevel: string }; tip: string | null };

export function QuickPostForm({ defaultArea = '', repeatDefaults, frequentPattern }: { defaultArea?: string; repeatDefaults?: RepeatDefaults; frequentPattern?: FrequentPattern | null }) {
  const [area, setArea] = useState(repeatDefaults?.area ?? defaultArea);
  const [when, setWhen] = useState<QuickWhen>('tonight');
  const [freeText, setFreeText] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [genre, setGenre] = useState(repeatDefaults?.genre ?? '');
  const [maxParticipants, setMaxParticipants] = useState(repeatDefaults?.maxParticipants ?? 4);
  const [pending, start] = useTransition();
  const [tipPending, startTip] = useTransition();
  const [tip, setTip] = useState<Tip | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const started = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    trackGrowthEvent('MEAL_TEMPLATE_VIEWED');
    return () => {
      if (started.current && !completed.current) trackGrowthEvent('QUICK_POST_ABANDONED', { area });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function touch() {
    if (!started.current) { started.current = true; trackGrowthEvent('QUICK_POST_STARTED'); }
  }

  function currentCandidate() {
    const parsed = freeText.trim() ? parseFreeTextWhen(freeText) : null;
    return parsed ?? buildQuickCandidate(when);
  }

  function selectTemplate(id: string) {
    touch();
    const template = MEAL_TEMPLATES.find(t => t.id === id);
    setTemplateId(id);
    if (template) setGenre(template.genre);
    trackGrowthEvent('MEAL_TEMPLATE_SELECTED', { foodCategory: template?.genre });
  }

  function checkTendency() {
    if (!area.trim()) { setError('エリアを入力してください。'); return; }
    setError('');
    const candidate = currentCandidate();
    const weekday = new Date(`${candidate.date}T00:00:00Z`).getUTCDay();
    const hour = Number(candidate.startTime.slice(0, 2));
    startTip(async () => {
      const result = await getPredictionTip({ area, genre, weekday, hour });
      setTip(result);
      if (result.tip) trackGrowthEvent('RECRUITMENT_PREDICTION_APPLIED', { area, foodCategory: genre || undefined });
    });
  }

  function submit() {
    setError('');
    touch();
    if (!area.trim()) { setError('エリアを入力してください。'); return; }
    const template = MEAL_TEMPLATES.find(t => t.id === templateId);
    const title = template?.title ?? (genre ? `${genre}食べたい` : '今日誰かと飯食いたい');
    const candidate = currentCandidate();
    start(async () => {
      const result = await createMeal({
        title,
        area,
        budgetMin: 2000,
        budgetMax: 4000,
        maxParticipants,
        paymentType: 'SPLIT',
        restaurant: '',
        description: repeatDefaults?.description ?? template?.description ?? '',
        genre,
        alcohol: '',
        smoking: '',
        ageCondition: '',
        deadline: '',
        candidates: [candidate],
        purposeIds: [],
      });
      if (!result.ok || !result.href) { setError(result.message); return; }
      completed.current = true;
      trackGrowthEvent('QUICK_POST_COMPLETED', { area, foodCategory: genre });
      if (repeatDefaults) trackGrowthEvent('REPEAT_RECRUITMENT_CREATED', { area, foodCategory: genre });
      router.push(result.href);
    });
  }

  return (
    <div className="panel">
      <h2>30秒で募集する</h2>
      {repeatDefaults && <p className="notice">前回と同じ条件を入力済みです。日時だけ選び直してください。</p>}
      <div className="field-group">
        <strong>テンプレートから選ぶ（任意）</strong>
        <div className="tag-selector">
          {MEAL_TEMPLATES.map(t => (
            <button key={t.id} type="button" className={`selectable-chip${templateId === t.id ? ' selected' : ''}`} onClick={() => selectTemplate(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>
      <label>エリア<input value={area} onChange={e => { touch(); setArea(e.target.value); }} placeholder="例：渋谷" maxLength={80} required /></label>
      <div className="field-group">
        <strong>いつ？</strong>
        <div className="tag-selector">
          {WHEN_OPTIONS.map(o => (
            <button key={o.value} type="button" className={`selectable-chip${!freeText && when === o.value ? ' selected' : ''}`} onClick={() => { touch(); setWhen(o.value); setFreeText(''); }}>{o.label}</button>
          ))}
          {frequentPattern && (
            <button type="button" className="selectable-chip" onClick={() => { touch(); setFreeText(`${'日月火水木金土'[frequentPattern.weekday]}曜${frequentPattern.hour}時`); }}>いつもの: {frequentPattern.label}</button>
          )}
        </div>
        <label>自由入力（任意・例：金曜20時、今週末、平日夜）<input value={freeText} onChange={e => { touch(); setFreeText(e.target.value); }} maxLength={40} placeholder="今日19時 / 明日夜 / 金曜20時" /></label>
      </div>
      <label>ジャンル・お店（任意）<input value={genre} onChange={e => { touch(); setGenre(e.target.value); }} placeholder="例：焼肉" maxLength={60} /></label>
      <label>募集人数<input type="number" min={2} max={20} value={maxParticipants} onChange={e => { touch(); setMaxParticipants(Number(e.target.value)); }} /></label>
      <button className="btn secondary" type="button" disabled={tipPending} onClick={checkTendency}>{tipPending ? '確認しています…' : 'このエリア・時間の傾向を見る'}</button>
      {tip && (
        <p className="muted">
          {tip.prediction.fallbackLevel === 'NONE' ? 'まだ十分なデータがありません。' : `過去のデータでは約${Math.round((tip.prediction.fillRate ?? 0) * 100)}%の募集が成立しています（参考値・サンプル${tip.prediction.sampleSize}件）。`}
          {tip.tip && <><br />{tip.tip}</>}
        </p>
      )}
      <button className="btn wide" type="button" disabled={pending} onClick={submit}>{pending ? '作成しています…' : 'この内容で募集する'}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
