'use client';
import { useRef, useState } from 'react';
import { MarkdownContent } from '@/components/markdown-content';

const TOOLBAR_ITEMS = [
  { label: '見出し2', before: '## ', after: '' },
  { label: '見出し3', before: '### ', after: '' },
  { label: '太字', before: '**', after: '**' },
  { label: 'リンク', before: '[', after: '](https://)' },
  { label: '画像', before: '![', after: '](https://)' },
  { label: 'リスト', before: '- ', after: '' },
  { label: '引用', before: '> ', after: '' },
] as const;

export function ArticleContentEditor({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);
    const cursor = start + before.length + selected.length + after.length;
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  }

  return <div className="content-editor">
    <div className="content-editor-toolbar">
      {TOOLBAR_ITEMS.map(item => <button type="button" className="btn secondary small" key={item.label} onClick={() => insert(item.before, item.after)}>{item.label}</button>)}
      <button type="button" className="btn secondary small" onClick={() => setShowPreview(v => !v)}>{showPreview ? 'プレビューを閉じる' : 'プレビュー'}</button>
    </div>
    <div className={showPreview ? 'content-editor-split' : ''}>
      <textarea ref={textareaRef} name="content" required minLength={20} rows={22} value={value} onChange={event => setValue(event.target.value)} placeholder={'## 見出し\n本文 **太字** [リンク](/meals)\n\n- リスト'} />
      {showPreview && <div className="content-editor-preview panel"><MarkdownContent content={value} /></div>}
    </div>
  </div>;
}
