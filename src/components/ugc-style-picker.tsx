'use client';

import { Shuffle } from 'lucide-react';
import { getUgcStyle, RANDOM_UGC_STYLES, UGC_STYLES, type UgcStyle } from '@/lib/ugc';

export function UgcStylePicker({ value, onChange, previewTitle = '飯の誘いが届いています。', previewDetail = '誰かと食べるきっかけを。' }: {
  value: UgcStyle;
  onChange: (style: UgcStyle) => void;
  previewTitle?: string;
  previewDetail?: string;
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
      <div className="ugc-preview-frame" style={{ backgroundImage: `linear-gradient(180deg,transparent 20%,rgba(16,12,9,.88)),url(${selectedStyle.image})` }} role="img" aria-label={`「${selectedStyle.label}」のシェア画像プレビュー`}>
        <span className="ugc-preview-brand" style={{ backgroundColor: selectedStyle.accent }}>🍚 俺は誰かと飯が食いたい！</span>
        <div className="ugc-preview-copy" style={{ borderColor: selectedStyle.accent }}><strong>{previewTitle}</strong><span>{previewDetail}</span></div>
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
