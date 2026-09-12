'use client';
import { useEffect, useRef } from 'react';
import { trackGrowthEvent, trackGrowthEventsBatch } from '@/components/growth-tracker';

type Item = { id: string; reason: string; position: number };

export function RecommendationTracker({ items, personalizationEnabled }: { items: Item[]; personalizationEnabled: boolean }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackGrowthEventsBatch(items.map(item => ({ eventType: 'RECOMMENDATION_IMPRESSION' as const, payload: { recruitmentId: item.id, rankingPosition: item.position, recommendationReason: item.reason, personalizationEnabled } })));
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-recommendation-id]') : null;
      if (!target?.dataset.recommendationId) return;
      trackGrowthEvent('RECOMMENDATION_CLICKED', { recruitmentId: target.dataset.recommendationId, rankingPosition: Number(target.dataset.recommendationPosition ?? 0), recommendationReason: target.dataset.recommendationReason, personalizationEnabled });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [items, personalizationEnabled]);
  return null;
}
