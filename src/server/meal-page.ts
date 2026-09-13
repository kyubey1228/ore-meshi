import 'server-only';
import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { MEAL_PAGE_SIZE, sliceMealPage } from '@/lib/meal-pagination';
import { fetchOpenMeals, isDefaultMealQuery, type MealListFilters } from '@/server/meal-feed-query';
import { getPublicMealFeed } from '@/server/public-meal-feed';

const databaseScope = createHash('sha256').update(process.env.DATABASE_URL ?? '').digest('hex');
const cachedPage = unstable_cache(fetchOpenMeals, ['meal-page-v2', databaseScope], { revalidate: 60 });

export async function getMealPage(filters: MealListFilters, page: number) {
  if (!process.env.DATABASE_URL) return sliceMealPage([] as Awaited<ReturnType<typeof fetchOpenMeals>>);
  if (page === 1 && isDefaultMealQuery(filters)) {
    const feed = await getPublicMealFeed();
    const available = feed.meals.filter(meal => !meal.deadline || meal.deadline > new Date());
    // If deadlines elapsed, refill from DB so the lookahead doesn't hide a page.
    if (available.length === feed.meals.length) return sliceMealPage(available);
    return sliceMealPage(await fetchOpenMeals(filters, MEAL_PAGE_SIZE + 1));
  }
  const rows = await cachedPage(filters, MEAL_PAGE_SIZE + 1, (page - 1) * MEAL_PAGE_SIZE);
  if (rows.some(meal => meal.deadline && new Date(meal.deadline) <= new Date())) {
    return sliceMealPage(await fetchOpenMeals(filters, MEAL_PAGE_SIZE + 1, (page - 1) * MEAL_PAGE_SIZE));
  }
  return sliceMealPage(rows);
}
