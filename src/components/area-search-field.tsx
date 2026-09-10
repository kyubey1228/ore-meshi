'use client';
import { useState } from 'react';
import { AreaDatalist } from '@/components/area-datalist';

type Grouped = { prefecture: string; cities: string[] }[];

// 「どこ」検索欄。自由入力(datalist補完)はそのまま残しつつ、都道府県タブ→市区町村一覧の
// ピッカーでも選べるようにする(丁目・商店街名などの自由記述を妨げないため、選択後も編集可能)。
export function AreaSearchField({ defaultValue = '', grouped, areaOptions }: { defaultValue?: string; grouped: Grouped; areaOptions: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activePrefecture, setActivePrefecture] = useState(grouped[0]?.prefecture ?? '');
  const activeCities = grouped.find(g => g.prefecture === activePrefecture)?.cities ?? [];

  return (
    <div className="area-search-field">
      <label>どこ
        <div className="area-input-row">
          <input name="area" list="area-options" placeholder="例：新宿" maxLength={80} value={value} onChange={e => setValue(e.target.value)} />
          <button type="button" className="btn secondary small" aria-expanded={open} onClick={() => setOpen(o => !o)}>都道府県から選ぶ</button>
        </div>
      </label>
      <AreaDatalist options={areaOptions} />
      {open && (
        <div className="area-picker">
          <div className="area-picker-tabs">
            {grouped.map(g => (
              <button key={g.prefecture} type="button" className={`tag-pill${activePrefecture === g.prefecture ? ' orange-pill' : ''}`} onClick={() => setActivePrefecture(g.prefecture)}>{g.prefecture}</button>
            ))}
          </div>
          <div className="area-picker-cities">
            {activeCities.map(city => (
              <button key={city} type="button" className="chip" onClick={() => { setValue(city); setOpen(false); }}>{city}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
