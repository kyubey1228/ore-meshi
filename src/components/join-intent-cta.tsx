'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createJoinIntent } from '@/server/actions/join-intent';
import { trackGrowthEvent } from '@/components/growth-tracker';

type Props = { mealId: string; area: string; genre: string | null; label: string; experimentName?: string; variant?: string };

export function JoinIntentCta({ mealId, area, genre, label, experimentName, variant }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  function onClick() {
    setError('');
    start(async () => {
      const payload = { recruitmentId: mealId, area, foodCategory: genre ?? undefined, loggedIn: false, experimentName, variant };
      trackGrowthEvent('RECRUITMENT_JOIN_CLICKED', payload);
      if (experimentName) trackGrowthEvent('EXPERIMENT_CONVERSION', payload);
      const result = await createJoinIntent({ mealId, source: experimentName ? `experiment:${variant}` : undefined, referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined });
      if (!result.ok) {
        setError('この募集は今参加できません。もう一度お試しください。');
        return;
      }
      router.push(`/login?next=${encodeURIComponent(`/meals/${mealId}`)}`);
    });
  }

  return (
    <div className="checkout-action">
      <button className="btn wide" type="button" disabled={pending} onClick={onClick}>{pending ? '準備しています…' : label}</button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
