'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

export function SalesCandidateMemoForm({ id, initialMemo, action }: { id: string; initialMemo: string; action: (input: { id: string; memo: string }) => Promise<ActionResult> }) {
  const [memo, setMemo] = useState(initialMemo);
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
            const res = await action({ id, memo });
            setResult(res);
            if (res.ok) router.refresh();
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        });
      }}
    >
      <fieldset disabled={pending}>
        <label>メモ<textarea value={memo} onChange={event => setMemo(event.target.value)} maxLength={2000} rows={2} /></label>
        <button className="btn secondary small" disabled={pending}>{pending ? '保存中…' : 'メモを保存'}</button>
      </fieldset>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </form>
  );
}
