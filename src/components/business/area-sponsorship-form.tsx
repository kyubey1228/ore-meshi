'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAreaSponsorship } from '@/server/actions/area-sponsorship';
import { AreaDatalist } from '@/components/area-datalist';

type Props = { businessAccountId: string; defaultArea: string; areaOptions?: string[]; suggestions: { area: string; genre: string }[] };

function isoInJst(dateStr: string) { return new Date(`${dateStr}:00+09:00`).toISOString(); }
const dateTimeLabel = (dateStr: string) => dateStr ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' }).format(new Date(`${dateStr}:00+09:00`)) : '';

export function AreaSponsorshipForm({ businessAccountId, defaultArea, areaOptions = [], suggestions }: Props) {
  const [area, setArea] = useState(defaultArea);
  const [genre, setGenre] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const ready = Boolean(area && startsAt && endsAt);

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
    <div className="preview-split">
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
          <label>エリア<input value={area} onChange={e => setArea(e.target.value)} list="area-options" maxLength={80} required /></label>
          <AreaDatalist options={areaOptions} />
          <label>ジャンル（任意）<input value={genre} onChange={e => setGenre(e.target.value)} maxLength={80} placeholder="例：焼肉" /></label>
          <label>開始日時<input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required /></label>
          <label>終了日時<input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required /></label>
        </fieldset>
      </div>

      <div className="panel">
        <h3>掲載イメージ</h3>
        <div className="x-post-preview">
          <p className="pre-wrap">
            📍 {area || 'エリア未入力'}{genre && ` × ${genre}`}{'\n'}
            この期間、{area || 'このエリア'}{genre ? `の${genre}を探す` : 'で飯を探す'}ユーザーへの掲載順で優先的に表示されます。{'\n'}
            {startsAt && endsAt ? `${dateTimeLabel(startsAt)} 〜 ${dateTimeLabel(endsAt)}` : '開始・終了日時を入力すると期間が表示されます。'}
          </p>
        </div>
        <button className="btn wide" type="button" disabled={!ready || pending} onClick={submit}>{pending ? '作成しています…' : '下書きを作成する'}</button>
        {error && <p role="alert" className="error">{error}</p>}
        <p className="muted">作成後、次の一覧画面から支払いを完了すると公開されます。</p>
      </div>
    </div>
  );
}
