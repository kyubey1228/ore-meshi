'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

export function GenerateContentButton({ action }: { action: () => Promise<ActionResult> }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  const router = useRouter();
  return (
    <div className="action-form">
      <button
        className="btn"
        disabled={pending}
        onClick={() => start(async () => {
          try {
            const res = await action();
            setResult(res);
            if (res.ok) { if (res.href) router.push(res.href); router.refresh(); }
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        })}
      >
        {pending ? '生成中…' : '今のデータから下書きを生成する'}
      </button>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </div>
  );
}
