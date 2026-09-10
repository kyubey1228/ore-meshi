'use client';
import { useEffect } from 'react';
import { trackGrowthEvent } from '@/components/growth-tracker';
import type { TrustBadge } from '@/lib/host-trust';

export function TrustBadges({ badges, mealId }: { badges: TrustBadge[]; mealId: string }) {
  useEffect(() => {
    if (badges.length > 0) trackGrowthEvent('TRUST_BADGE_VIEWED', { recruitmentId: mealId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId]);
  if (badges.length === 0) return null;
  return (
    <div className="tag-pills">
      {badges.map(badge => <span className="tag-pill" key={badge.label}>{badge.icon} {badge.label}</span>)}
    </div>
  );
}
