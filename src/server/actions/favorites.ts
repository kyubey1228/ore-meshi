'use server';
import { z } from 'zod';
import { perform } from '@/server/action';
import { prisma } from '@/lib/prisma';
import { idSchema } from '@/validators';

export async function addFavorite(input: unknown) {
  return perform(async userId => {
    const { mealId } = z.object({ mealId: idSchema }).parse(input);
    await prisma.favorite.upsert({ where: { userId_mealId: { userId, mealId } }, create: { userId, mealId }, update: {} });
  });
}

export async function removeFavorite(input: unknown) {
  return perform(async userId => {
    const { mealId } = z.object({ mealId: idSchema }).parse(input);
    await prisma.favorite.deleteMany({ where: { userId, mealId } });
  });
}

export async function mergeGuestFavorites(input: unknown) {
  return perform(async userId => {
    const { mealIds } = z.object({ mealIds: z.array(idSchema).max(50) }).parse(input);
    if (mealIds.length === 0) return;
    const existingMeals = await prisma.meal.findMany({ where: { id: { in: mealIds } }, select: { id: true } });
    await prisma.favorite.createMany({
      data: existingMeals.map(meal => ({ userId, mealId: meal.id })),
      skipDuplicates: true,
    });
  });
}
