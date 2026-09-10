'use client';
import { useState } from 'react';

type Grouped = { prefecture: string; cities: string[] }[];

// 「どこ」検索欄。都道府県タブ→市区町村一覧のピッカーのみで選ぶ(自由入力欄は無し)。
export function AreaSearchField({ defaultValue = '', grouped }: { defaultValue?: string; grouped: Grouped }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activePrefecture, setActivePrefecture] = useState(grouped[0]?.prefecture ?? '');
  const activeCities = grouped.find(g => g.prefecture === activePrefecture)?.cities ?? [];

  return (
    <div className="area-search-field">
      <label>どこ
        <button type="button" className={`area-picker-trigger${value ? ' selected' : ''}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          {value || 'エリアを選ぶ'}
        </button>
      </label>
      <input type="hidden" name="area" value={value} />
      {open && (
        <div className="area-picker">
          <div className="area-picker-tabs">
            {grouped.map(g => (
              <button key={g.prefecture} type="button" className={`tag-pill${activePrefecture === g.prefecture ? ' orange-pill' : ''}`} onClick={() => setActivePrefecture(g.prefecture)}>{g.prefecture}</button>
            ))}
          </div>
          <div className="area-picker-cities">
            {value && <button type="button" className="chip" onClick={() => { setValue(''); setOpen(false); }}>クリア</button>}
            {activeCities.map(city => (
              <button key={city} type="button" className="chip" onClick={() => { setValue(city); setOpen(false); }}>{city}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
