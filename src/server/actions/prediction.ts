'use server';
import { z } from 'zod';
import { predictFillRate, suggestBetterTiming } from '@/server/prediction';
import { recordGrowthEvent } from '@/server/growth';

const schema = z.object({
  area: z.string().trim().min(1).max(80),
  genre: z.string().trim().max(60).optional().default(''),
  weekday: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
});

export async function getPredictionTip(input: unknown) {
  const data = schema.parse(input);
  const genre = data.genre || null;
  const [prediction, tip] = await Promise.all([
    predictFillRate({ area: data.area, genre, weekday: data.weekday, hour: data.hour }),
    suggestBetterTiming({ area: data.area, genre, weekday: data.weekday, hour: data.hour }),
  ]);
  await recordGrowthEvent('RECRUITMENT_PREDICTION_VIEWED', { area: data.area, foodCategory: genre ?? undefined, loggedIn: true });
  return { prediction, tip };
}
