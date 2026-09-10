'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

export function ConfirmActionButton({ id, label, confirm, action }: { id: string; label: string; confirm: string; action: (id: string) => Promise<ActionResult> }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  const router = useRouter();

  return (
    <div className="action-form">
      <button
        className="btn"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          start(async () => {
            try {
              const res = await action(id);
              setResult(res);
              if (res.ok) { if (res.href) router.push(res.href); router.refresh(); }
            } catch {
              setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
            }
          });
        }}
      >
        {pending ? '送信中…' : label}
      </button>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </div>
  );
}
