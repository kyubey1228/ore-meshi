'use server';
import { z } from 'zod';
import { perform } from '@/server/action';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';

const schema = z.object({
  preferredArea: z.string().trim().max(80).optional().default(''),
  preferredGenres: z.array(z.string().trim().max(40)).max(8).optional().default([]),
  skipped: z.coerce.boolean().optional().default(false),
});

export async function completeOnboarding(input: unknown) {
  return perform(async userId => {
    const data = schema.parse(input);
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferredArea: data.preferredArea || null,
        preferredGenres: data.preferredGenres,
        onboardingCompletedAt: new Date(),
      },
    });
    await recordGrowthEvent('ONBOARDING_COMPLETED', { userId, loggedIn: true, area: data.preferredArea || undefined, foodCategory: data.preferredGenres[0] });
    const params = new URLSearchParams();
    if (data.preferredArea) params.set('area', data.preferredArea);
    return `/meals${params.toString() ? `?${params.toString()}` : ''}`;
  });
}
