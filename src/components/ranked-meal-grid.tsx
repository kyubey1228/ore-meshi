'use client';
import { useEffect, useRef } from 'react';
import { MealCard } from '@/components/meal-card';
import type { getMealList } from '@/lib/data';
import { trackGrowthEvent } from '@/components/growth-tracker';

type Meal = Awaited<ReturnType<typeof getMealList>>[number];
type Item = { meal: Meal; reason: string };

export function RankedMealGrid({ items, personalizationEnabled }: { items: Item[]; personalizationEnabled: boolean }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    items.slice(0, 20).forEach((item, index) => {
      trackGrowthEvent('RECOMMENDATION_IMPRESSION', { recruitmentId: item.meal.id, rankingPosition: index, recommendationReason: item.reason, personalizationEnabled });
    });
  }, [items, personalizationEnabled]);

  function onClickCapture(item: Item, index: number) {
    trackGrowthEvent('RECOMMENDATION_CLICKED', { recruitmentId: item.meal.id, rankingPosition: index, recommendationReason: item.reason, personalizationEnabled });
  }

  return (
    <div className="meal-grid">
      {items.map((item, index) => (
        <div key={item.meal.id} onClickCapture={() => onClickCapture(item, index)}>
          <MealCard meal={item.meal} />
        </div>
      ))}
    </div>
  );
}
