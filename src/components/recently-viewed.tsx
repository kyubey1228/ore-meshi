'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRecentlyViewed } from '@/lib/guest-storage';
import { lookupMeals } from '@/server/actions/meal-lookup';

type LookupMeal = Awaited<ReturnType<typeof lookupMeals>>[number];

export function RecentlyViewedSection({ loggedIn }: { loggedIn: boolean }) {
  const [meals, setMeals] = useState<LookupMeal[]>([]);

  useEffect(() => {
    if (loggedIn) return;
    const ids = getRecentlyViewed();
    if (ids.length === 0) return;
    void lookupMeals({ mealIds: ids }).then(setMeals).catch(() => {});
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
