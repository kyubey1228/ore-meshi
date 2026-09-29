import { getPublicMealById } from '@/lib/data';
import { mobileJson, mobileOptions } from '@/lib/mobile-api';

export async function GET(_request: Request, context: RouteContext<'/api/mobile/v1/meals/[id]'>) {
  const { id } = await context.params;
  const meal = await getPublicMealById(id);
  if (!meal) return mobileJson({ error: '募集が見つかりません。' }, { status: 404 });

  return mobileJson({
    item: {
      id: meal.id,
      title: meal.title,
      description: meal.description,
      area: meal.area,
      restaurant: meal.restaurant,
      genre: meal.genre,
      alcohol: meal.alcohol,
      smoking: meal.smoking,
      ageCondition: meal.ageCondition,
      deadline: meal.deadline?.toISOString() ?? null,
      budgetMin: meal.budgetMin,
      budgetMax: meal.budgetMax,
      paymentType: meal.paymentType,
      maxParticipants: meal.maxParticipants,
      acceptedParticipants: meal._count.joinRequests + 1,
      status: meal.status,
      candidates: meal.candidates.map(candidate => ({
        id: candidate.id,
        date: candidate.date.toISOString(),
        startTime: candidate.startTime,
        endTime: candidate.endTime,
      })),
      purposes: meal.purposes.map(({ purpose }) => purpose),
      host: meal.host,
      sponsor: meal.sponsoredMeals[0] ?? null,
    },
  });
}

export const OPTIONS = mobileOptions;
