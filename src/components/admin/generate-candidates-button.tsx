'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

export function GenerateCandidatesButton({ action }: { action: (input: { days: number; limit: number }) => Promise<ActionResult> }) {
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
            const res = await action({ days: 30, limit: 20 });
            setResult(res);
            if (res.ok) { if (res.href) router.push(res.href); router.refresh(); }
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        })}
      >
        {pending ? '生成中…' : '候補を生成する（直近30日のOpportunity Rankingから）'}
      </button>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </div>
  );
}
