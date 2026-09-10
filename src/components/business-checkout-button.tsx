'use client';
import { useState, useTransition } from 'react';
import { createBusinessSubscriptionCheckout, createSeatCampaignCheckout, createSponsoredMealCheckout } from '@/server/actions/billing';

type Props =
  | { kind: 'SPONSORED_MEAL'; sponsoredMealId: string; label: string; disabled?: boolean }
  | { kind: 'SEAT_CAMPAIGN'; seatCampaignId: string; label: string; disabled?: boolean }
  | { kind: 'SUBSCRIPTION'; plan: 'STANDARD' | 'PRO'; label: string; disabled?: boolean };

export function BusinessCheckoutButton(props: Props) {
  const [pending, start] = useTransition();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');

  function onClick() {
    if (locked) return;
    setLocked(true);
    setError('');
    start(async () => {
      try {
        const result =
          props.kind === 'SPONSORED_MEAL' ? await createSponsoredMealCheckout(props.sponsoredMealId)
          : props.kind === 'SEAT_CAMPAIGN' ? await createSeatCampaignCheckout(props.seatCampaignId)
          : await createBusinessSubscriptionCheckout(props.plan);
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
      <button className="btn" type="button" disabled={props.disabled || pending || locked} onClick={onClick}>
        {pending ? '決済ページを作っています…' : props.label}
      </button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
