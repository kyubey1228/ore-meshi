'use server';
import { z } from 'zod';
import { perform, ensure } from '@/server/action';
import { createMeal } from '@/server/actions/meals';
import { prisma } from '@/lib/prisma';
import { recordGrowthEvent } from '@/server/growth';
import { createNotification } from '@/server/notifications';
import { clusterKey, DEMAND_CLUSTER_THRESHOLD, expiresAtFor, TIME_RANGE_VALUES, timeRangeLabel } from '@/lib/demand';
import { buildCandidateForTimeRange } from '@/lib/quick-post-time';

const createSchema = z.object({
  area: z.string().trim().min(1).max(80),
  genre: z.string().trim().max(60).optional().default(''),
  timeRange: z.enum(TIME_RANGE_VALUES).optional(),
  desiredGroupSize: z.coerce.number().int().min(2).max(20).optional().default(2),
});

export async function createDemandIntent(input: unknown) {
  return perform(async userId => {
    const data = createSchema.parse(input);
    await prisma.demandIntent.create({
      data: { userId, area: data.area, genre: data.genre || null, timeRange: data.timeRange ?? null, desiredGroupSize: data.desiredGroupSize, expiresAt: expiresAtFor(data.timeRange) },
    });
    await recordGrowthEvent('DEMAND_INTENT_CREATED', { userId, loggedIn: true, area: data.area, foodCategory: data.genre || undefined });

    const where = { area: data.area, genre: data.genre || null, timeRange: data.timeRange ?? null, status: 'ACTIVE' as const, expiresAt: { gt: new Date() } };
    const count = await prisma.demandIntent.count({ where });
    if (count >= DEMAND_CLUSTER_THRESHOLD) {
      const members = await prisma.demandIntent.findMany({ where, select: { userId: true } });
      const key = clusterKey(data.area, data.genre || null, data.timeRange ?? null);
      const dayBucket = new Date().toISOString().slice(0, 10);
      for (const member of members) {
        await createNotification({
          userId: member.userId, type: 'DEMAND_CLUSTER_READY',
          title: '募集を作りませんか？',
          body: `${data.area}で${data.genre || 'ごはん'}を食べたい人が${count}人集まりました(${timeRangeLabel(data.timeRange ?? null)})。`,
          dedupeKey: `DEMAND_CLUSTER_READY:${key}:${dayBucket}`,
        });
      }
    }
  });
}

export async function cancelDemandIntent(input: unknown) {
  return perform(async userId => {
    const id = z.string().min(1).parse(input);
    const intent = await prisma.demandIntent.findUnique({ where: { id } });
    ensure(intent?.userId === userId, 'この行きたい登録は操作できません。');
    await prisma.demandIntent.update({ where: { id }, data: { status: 'CANCELLED' } });
  });
}

const fromClusterSchema = z.object({
  area: z.string().trim().min(1).max(80),
  genre: z.string().trim().max(60).optional().default(''),
  timeRange: z.enum(TIME_RANGE_VALUES).optional(),
  desiredGroupSize: z.coerce.number().int().min(2).max(20).optional().default(4),
});

// DemandIntentから募集を作る唯一の入口。既存createMealへ委譲し、成立後にクラスタをMATCHEDへ遷移させる。
// 自動公開はしない(ユーザーがこのアクションを明示的に呼んだ場合のみ作成される)。
export async function createRecruitmentFromDemandCluster(input: unknown) {
  const data = fromClusterSchema.parse(input);
  const candidate = buildCandidateForTimeRange(data.timeRange);
  const title = data.genre ? `${data.genre}食べたい` : '誰かと飯食いたい';
  const result = await createMeal({
    title, area: data.area, budgetMin: 2000, budgetMax: 4000, maxParticipants: data.desiredGroupSize,
    paymentType: 'SPLIT', restaurant: '', description: '', genre: data.genre, alcohol: '', smoking: '', ageCondition: '', deadline: '',
    candidates: [candidate], purposeIds: [],
  });
  if (result.ok && result.href) {
    const mealId = result.href.split('/').pop();
    const where = { area: data.area, genre: data.genre || null, timeRange: data.timeRange ?? null, status: 'ACTIVE' as const };
    const intents = await prisma.demandIntent.findMany({ where });
    if (mealId) {
      await prisma.meal.update({ where: { id: mealId }, data: { demandClusterKey: clusterKey(data.area, data.genre || null, data.timeRange ?? null) } });
      await recordGrowthEvent('DEMAND_RECRUITMENT_CREATED', { recruitmentId: mealId, area: data.area, foodCategory: data.genre || undefined, loggedIn: true });
    }
    await prisma.demandIntent.updateMany({ where, data: { status: 'MATCHED' } });
    for (const intent of intents) await recordGrowthEvent('DEMAND_INTENT_MATCHED', { userId: intent.userId, loggedIn: true, area: data.area, foodCategory: data.genre || undefined });
  }
  return result;
}
