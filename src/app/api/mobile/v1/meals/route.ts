import { fetchOpenMeals } from '@/server/meal-feed-query';
import { mobileJson, mobileOptions } from '@/lib/mobile-api';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const area = query.get('area')?.trim().slice(0, 80) || undefined;
  const meals = await fetchOpenMeals(area ? { area } : {}, PAGE_SIZE);
  return mobileJson({
    items: meals.map(meal => ({
      id: meal.id,
      title: meal.title,
      description: meal.description,
      area: meal.area,
      restaurant: meal.restaurant,
      genre: meal.genre,
      budgetMin: meal.budgetMin,
      budgetMax: meal.budgetMax,
      paymentType: meal.paymentType,
      maxParticipants: meal.maxParticipants,
      acceptedParticipants: meal._count.joinRequests + 1,
      candidateCount: meal._count.candidates,
      candidate: meal.candidates[0]?.date ? {
        date: meal.candidates[0].date.toISOString(),
        startTime: meal.candidates[0].startTime,
        endTime: meal.candidates[0].endTime,
      } : null,
      purposes: meal.purposes.map(({ purpose }) => purpose),
      host: meal.host,
    })),
  });
}

export const OPTIONS = mobileOptions;
