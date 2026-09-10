'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/server/action';

type Props = {
  id: string;
  currentStatus: string;
  options: string[];
  labels?: Record<string, string>;
  action: (input: Record<string, unknown>) => Promise<ActionResult>;
  extraFields?: Record<string, string>;
};

// 一覧の行ごとに「状態を選んで確定する」ミニフォーム。
// Server Componentの.map()内でこのpropsを渡す側は、inline closureではなく
// action(実体のexportされたServer Action)とプレーンな値だけを渡すこと。
// (行ごとにinline closureをActionFormへ直接渡す形は、本番で稀にRSCのシリアライズに失敗するため避ける)
export function InlineStatusForm({ id, currentStatus, options, labels, action, extraFields }: Props) {
  const [status, setStatus] = useState(currentStatus);
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
            const res = await action({ id, status, ...extraFields });
            setResult(res);
            if (res.ok) {
              if (res.href) router.push(res.href);
              router.refresh();
            }
          } catch {
            setResult({ ok: false, message: '送信できませんでした。もう一度お試しください。' });
          }
        });
      }}
    >
      <fieldset disabled={pending}>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          {options.map(option => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}
        </select>
        <button className="btn" disabled={pending}>{pending ? '送信中…' : '確定'}</button>
      </fieldset>
      {result && <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'success' : 'error'}>{result.message}</p>}
    </form>
  );
}
