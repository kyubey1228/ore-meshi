'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDemandIntent } from '@/server/actions/demand-intent';
import { TIME_RANGES, type TimeRange } from '@/lib/demand';

export function DemandIntentForm() {
  const [area, setArea] = useState('');
  const [genre, setGenre] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('TONIGHT');
  const [desiredGroupSize, setDesiredGroupSize] = useState(2);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  function submit() {
    setError('');
    if (!area.trim()) { setError('エリアを入力してください。'); return; }
    start(async () => {
      const result = await createDemandIntent({ area, genre, timeRange, desiredGroupSize });
      if (!result.ok) { setError(result.message); return; }
      setDone(true);
      router.refresh();
    });
  }

  if (done) return <p className="success">登録しました。同じ条件の人が集まったらお知らせします。</p>;

  return (
    <div className="panel">
      <h2>行きたい登録</h2>
      <p className="muted">募集がまだ無くても「食べたい」気持ちだけ登録できます。例：「渋谷で焼肉食べたい」</p>
      <label>エリア<input value={area} onChange={e => setArea(e.target.value)} placeholder="例：渋谷" maxLength={80} /></label>
      <label>食べたいジャンル（任意）<input value={genre} onChange={e => setGenre(e.target.value)} placeholder="例：焼肉" maxLength={60} /></label>
      <div className="field-group">
        <strong>いつ頃？</strong>
        <div className="tag-selector">
          {TIME_RANGES.map(t => <button key={t.value} type="button" className={`selectable-chip${timeRange === t.value ? ' selected' : ''}`} onClick={() => setTimeRange(t.value)}>{t.label}</button>)}
        </div>
      </div>
      <label>希望人数<input type="number" min={2} max={20} value={desiredGroupSize} onChange={e => setDesiredGroupSize(Number(e.target.value))} /></label>
      <button className="btn wide" type="button" disabled={pending} onClick={submit}>{pending ? '登録しています…' : '行きたいを登録する'}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
