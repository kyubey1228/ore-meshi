'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMeal } from '@/server/actions/meals';
import { buildQuickCandidate, type QuickWhen } from '@/lib/quick-post-time';
import { MEAL_TEMPLATES } from '@/lib/meal-templates';
import { trackGrowthEvent } from '@/components/growth-tracker';

const WHEN_OPTIONS: { value: QuickWhen; label: string }[] = [
  { value: 'tonight', label: '今夜' },
  { value: 'tomorrow', label: '明日の夜' },
  { value: 'lunch', label: 'ランチ' },
];

export function QuickPostForm({ defaultArea = '' }: { defaultArea?: string }) {
  const [area, setArea] = useState(defaultArea);
  const [when, setWhen] = useState<QuickWhen>('tonight');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [genre, setGenre] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [pending, start] = useTransition();
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

  function selectTemplate(id: string) {
    touch();
    const template = MEAL_TEMPLATES.find(t => t.id === id);
    setTemplateId(id);
    if (template) setGenre(template.genre);
    trackGrowthEvent('MEAL_TEMPLATE_SELECTED', { foodCategory: template?.genre });
  }

  function submit() {
    setError('');
    touch();
    if (!area.trim()) { setError('エリアを入力してください。'); return; }
    const template = MEAL_TEMPLATES.find(t => t.id === templateId);
    const title = template?.title ?? (genre ? `${genre}食べたい` : '今日誰かと飯食いたい');
    const candidate = buildQuickCandidate(when);
    start(async () => {
      const result = await createMeal({
        title,
        area,
        budgetMin: 2000,
        budgetMax: 4000,
        maxParticipants,
        paymentType: 'SPLIT',
        restaurant: '',
        description: template?.description ?? '',
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
      router.push(result.href);
    });
  }

  return (
    <div className="panel">
      <h2>30秒で募集する</h2>
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
            <button key={o.value} type="button" className={`selectable-chip${when === o.value ? ' selected' : ''}`} onClick={() => { touch(); setWhen(o.value); }}>{o.label}</button>
          ))}
        </div>
      </div>
      <label>ジャンル・お店（任意）<input value={genre} onChange={e => { touch(); setGenre(e.target.value); }} placeholder="例：焼肉" maxLength={60} /></label>
      <label>募集人数<input type="number" min={2} max={20} value={maxParticipants} onChange={e => { touch(); setMaxParticipants(Number(e.target.value)); }} /></label>
      <button className="btn wide" type="button" disabled={pending} onClick={submit}>{pending ? '作成しています…' : 'この内容で募集する'}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
