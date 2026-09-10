'use client';
import { useState, useTransition } from 'react';
import { createBillingPortalSession } from '@/server/actions/billing';

export function BusinessBillingPortalButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');

  function onClick() {
    if (locked) return;
    setLocked(true);
    setError('');
    start(async () => {
      try {
        const result = await createBillingPortalSession();
        if (!result.success) {
          setError(result.error);
          setLocked(false);
          return;
        }
        window.location.href = result.url;
      } catch {
        setError('決済ページを作れませんでした。もう一度試してください。');
        setLocked(false);
      }
    });
  }

  return (
    <div className="checkout-action">
      <button className="btn secondary" type="button" disabled={disabled || pending || locked} onClick={onClick}>
        {pending ? '決済ページを作っています…' : '支払い・プランを管理する'}
      </button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
