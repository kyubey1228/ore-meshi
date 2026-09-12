'use client';

import { Shuffle } from 'lucide-react';
import { getUgcStyle, RANDOM_UGC_STYLES, UGC_STYLES, type UgcStyle } from '@/lib/ugc';

export function UgcStylePicker({ value, onChange, previewUrl }: {
  value: UgcStyle;
  onChange: (style: UgcStyle) => void;
  previewUrl: string;
}) {
  const selectedStyle = getUgcStyle(value);

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
      <div className="ugc-preview-frame">
        {/* SNSカードと画像保存に使う生成APIそのものを表示し、見た目の差異を防ぐ。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={previewUrl} src={previewUrl} alt={`「${selectedStyle.label}」のシェア画像プレビュー`} width={1200} height={630} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
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
