'use server';
import { z } from 'zod';
import { getMealsByIds } from '@/lib/data';
import { idSchema } from '@/validators';

export async function lookupMeals(input: unknown) {
  const { mealIds } = z.object({ mealIds: z.array(idSchema).max(20) }).parse(input);
  const meals = await getMealsByIds(mealIds);
  return meals.map(meal => ({
    id: meal.id,
    title: meal.title,
    area: meal.area,
    genre: meal.genre,
    maxParticipants: meal.maxParticipants,
    joinRequestCount: meal._count.joinRequests,
  }));
}
