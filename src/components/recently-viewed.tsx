'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentlyViewed } from '@/lib/guest-storage';
import type { Meal } from '@prisma/client';

type LookupMeal = Pick<Meal, 'id' | 'title' | 'area' | 'genre'>;

export function RecentlyViewedSection({ loggedIn }: { loggedIn: boolean }) {
  const [meals, setMeals] = useState<LookupMeal[]>([]);

  useEffect(() => {
    if (loggedIn) return;
    const ids = getRecentlyViewed();
    if (ids.length === 0) return;
    const controller = new AbortController();
    const query = new URLSearchParams(ids.slice(0, 20).map(id => ['id', id]));
    void fetch(`/api/meals/lookup?${query}`, { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<LookupMeal[]> : [])
      .then(results => { if (!controller.signal.aborted) setMeals(results); })
      .catch(() => {});
    return () => controller.abort();
  }, [loggedIn]);

  if (meals.length === 0) return null;
  const [first, ...rest] = meals;

  return (
    <div className="recently-viewed">
      <div className="notice">
        この前見ていた「{first.title}」、まだ参加できます。 <Link className="text-link" href={`/meals/${first.id}`}>見る →</Link>
      </div>
      {rest.length > 0 && (
        <>
          <div className="section-heading"><h2>最近見た募集</h2></div>
          <div className="meal-grid">
            {rest.map(meal => (
              <Link className="list-card" key={meal.id} href={`/meals/${meal.id}`}>
                <strong>{meal.title}</strong>
                <span>{meal.area}{meal.genre ? ` · ${meal.genre}` : ''}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
