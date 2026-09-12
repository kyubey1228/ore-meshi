import { MealCard } from '@/components/meal-card';
import type { getMealList } from '@/lib/data';
import { RecommendationTracker } from '@/components/recommendation-tracker';

type Meal = Awaited<ReturnType<typeof getMealList>>[number];
type Item = { meal: Meal; reason: string };

export function RankedMealGrid({ items, personalizationEnabled }: { items: Item[]; personalizationEnabled: boolean }) {
  const trackingItems = items.slice(0, 20).map((item, index) => ({ id: item.meal.id, reason: item.reason, position: index }));
  return (<>
    <RecommendationTracker items={trackingItems} personalizationEnabled={personalizationEnabled} />
    <div className="meal-grid">
      {items.map((item, index) => (
        <div key={item.meal.id} data-recommendation-id={item.meal.id} data-recommendation-position={index} data-recommendation-reason={item.reason}>
          <MealCard meal={item.meal} />
        </div>
      ))}
    </div>
  </>);
}
