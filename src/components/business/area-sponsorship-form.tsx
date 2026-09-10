'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAreaSponsorship } from '@/server/actions/area-sponsorship';

type Props = { businessAccountId: string; defaultArea: string; suggestions: { area: string; genre: string }[] };

function isoInJst(dateStr: string) { return new Date(`${dateStr}:00+09:00`).toISOString(); }

export function AreaSponsorshipForm({ businessAccountId, defaultArea, suggestions }: Props) {
  const [area, setArea] = useState(defaultArea);
  const [genre, setGenre] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  function submit() {
    setError('');
    start(async () => {
      const result = await createAreaSponsorship({ businessAccountId, area, genre, startsAt: isoInJst(startsAt), endsAt: isoInJst(endsAt) });
      if (!result.ok) { setError(result.message); return; }
      router.push('/business/area-sponsorship');
      router.refresh();
    });
  }

  return (
    <div className="panel">
      {suggestions.length > 0 && (
        <div className="field-group">
          <strong>需要が高いエリア×ジャンル</strong>
          <div className="tag-pills">
            {suggestions.map(s => (
              <button key={`${s.area}-${s.genre}`} type="button" className="tag-pill" onClick={() => { setArea(s.area); setGenre(s.genre === '未指定' ? '' : s.genre); }}>
                {s.area} × {s.genre}
              </button>
            ))}
          </div>
        </div>
      )}
      <fieldset disabled={pending}>
        <label>エリア<input value={area} onChange={e => setArea(e.target.value)} maxLength={80} required /></label>
        <label>ジャンル（任意）<input value={genre} onChange={e => setGenre(e.target.value)} maxLength={80} placeholder="例：焼肉" /></label>
        <label>開始日時<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></label>
        <label>終了日時<input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required /></label>
        <button className="btn wide" type="button" disabled={!area || !startsAt || !endsAt} onClick={submit}>{pending ? '作成しています…' : '下書きを作成する'}</button>
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <p className="muted">作成後、次の一覧画面から支払いを完了すると公開されます。</p>
    </div>
  );
}
