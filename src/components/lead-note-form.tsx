'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

// Server Componentからinline closureをそのまま渡さず、exportされたServer Action本体を
// propsとして渡し、入力オブジェクトの組み立てはクライアント側で行う(admin一覧のクラッシュ対策と同じ方針)。
export function LeadNoteForm({ leadId, action }: { leadId: string; action: (input: { leadId: string; note: string }) => Promise<ActionResult> }) {
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  const router = useRouter();

  return (
    <form
      className="action-form"
      onSubmit={event => {
        event.preventDefault();
        start(async () => {
          try {
            const res = await action({ leadId, note });
            setResult(res);
            if (res.ok) { setNote(''); router.refresh(); }
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        });
      }}
    >
      <fieldset disabled={pending}>
        <label>内部メモ<textarea value={note} onChange={event => setNote(event.target.value)} required maxLength={2000} /></label>
        <button className="btn" disabled={pending}>{pending ? '送信中…' : '内部メモを追加'}</button>
      </fieldset>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </form>
  );
}
