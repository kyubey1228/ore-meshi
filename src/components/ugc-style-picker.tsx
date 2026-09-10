'use client';

import { Shuffle } from 'lucide-react';
import { RANDOM_UGC_STYLES, UGC_STYLES, type UgcStyle } from '@/lib/ugc';

export function UgcStylePicker({ value, onChange, previewUrl }: {
  value: UgcStyle;
  onChange: (style: UgcStyle) => void;
  previewUrl: string;
}) {
  function randomize() {
    const candidates = RANDOM_UGC_STYLES.filter(style => style.id !== value);
    onChange(candidates[Math.floor(Math.random() * candidates.length)]?.id ?? RANDOM_UGC_STYLES[0].id);
  }

  return (
    <div className="ugc-picker">
      <div className="row between wrap">
        <div><strong>シェア画像を選ぶ</strong><p className="muted">漫画カードがXやLINEのリンクに付きます。</p></div>
        <button className="btn secondary small" type="button" onClick={randomize}><Shuffle size={16} />おまかせで変える</button>
      </div>
      {/* APIが生成する最終OGPをそのまま表示する。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ugc-preview" src={previewUrl} alt="選択中のシェア画像プレビュー" width={600} height={315} />
      <div className="ugc-options" role="radiogroup" aria-label="シェア画像のテイスト">
        {UGC_STYLES.map(style => (
          <button
            key={style.id}
            className={`ugc-option${value === style.id ? ' selected' : ''}`}
            type="button"
            role="radio"
            aria-checked={value === style.id}
            onClick={() => onChange(style.id)}
          >
            <span>{style.label}</span><small>{style.description}</small>
          </button>
        ))}
      </div>
      {(value === 'women-only' || value === 'men-only') && <p className="ugc-restriction">⚠️ この絵は参加条件が一致する募集にだけ使ってください。</p>}
    </div>
  );
}
