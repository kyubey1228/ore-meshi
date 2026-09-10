'use server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ensure, perform, transaction } from '@/server/action';
import { recordGrowthEvent } from '@/server/growth';
import { idSchema, scheduledAt } from '@/validators';

const INTENT_COOKIE = 'ore_join_intent';
const INTENT_TTL_MS = 30 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };

const createSchema = z.object({
  mealId: idSchema,
  source: z.string().trim().max(100).optional(),
  referrer: z.string().trim().max(300).optional(),
  referralCode: z.string().trim().max(40).optional(),
});

export async function createJoinIntent(input: unknown): Promise<{ ok: boolean }> {
  try {
    const data = createSchema.parse(input);
    const meal = await prisma.meal.findUnique({ where: { id: data.mealId }, select: { id: true, area: true, genre: true, status: true } });
    if (!meal || meal.status !== 'OPEN') return { ok: false };
    const token = randomUUID();
    const jar = await cookies();
    const sessionKey = jar.get('ore_growth_session')?.value ?? randomUUID();
    await prisma.joinIntent.create({
      data: { token, mealId: data.mealId, source: data.source, referrer: data.referrer, referralCode: data.referralCode, sessionKey, expiresAt: new Date(Date.now() + INTENT_TTL_MS) },
    });
    jar.set(INTENT_COOKIE, token, { ...cookieOptions, maxAge: 60 * 30 });
    jar.set('ore_growth_session', sessionKey, { ...cookieOptions, maxAge: 60 * 60 * 24 * 90 });
    await recordGrowthEvent('JOIN_INTENT_CREATED', { recruitmentId: meal.id, area: meal.area, foodCategory: meal.genre ?? undefined, loggedIn: false, source: data.source });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// 未ログイン時はステータスを変えず単に有効な意図があるかだけを返し、ログイン後の初回参照時にRESTOREDへ遷移させる。
export async function resolveJoinIntent(mealId: string, loggedIn: boolean) {
  const jar = await cookies();
  const token = jar.get(INTENT_COOKIE)?.value;
  if (!token) return null;
  const intent = await prisma.joinIntent.findUnique({ where: { token } });
  if (!intent || intent.mealId !== mealId) return null;
  if (intent.status === 'COMPLETED') return null;
  if (intent.expiresAt < new Date()) {
    if (intent.status !== 'EXPIRED') {
      await prisma.joinIntent.update({ where: { id: intent.id }, data: { status: 'EXPIRED' } });
      await recordGrowthEvent('JOIN_INTENT_EXPIRED', { recruitmentId: mealId });
    }
    return null;
  }
  if (loggedIn && intent.status === 'PENDING') {
    await prisma.joinIntent.update({ where: { id: intent.id }, data: { status: 'RESTORED' } });
    await recordGrowthEvent('JOIN_INTENT_RESTORED', { recruitmentId: mealId, loggedIn: true });
  }
  return intent;
}

const confirmSchema = z.object({ token: z.string().min(1), candidateId: idSchema, message: z.string().trim().max(500).optional().default('') });

export async function confirmJoinIntent(input: unknown) {
  return perform(async userId => {
    const data = confirmSchema.parse(input);
    const intent = await prisma.joinIntent.findUnique({ where: { token: data.token } });
    ensure(intent, 'この参加リクエストは無効です。');
    ensure(intent.status !== 'COMPLETED', 'すでに参加済みです。');
    ensure(intent.expiresAt > new Date(), 'この参加リクエストの有効期限が切れています。もう一度参加ボタンを押してください。');
    await transaction(async tx => {
      const candidate = await tx.mealCandidate.findUnique({ where: { id: data.candidateId }, include: { meal: { select: { status: true } } } });
      ensure(candidate?.mealId === intent.mealId && candidate.meal.status === 'OPEN', 'その飯はもう募集が終わっています。');
      ensure(scheduledAt(candidate.date.toISOString().slice(0, 10), candidate.startTime) > new Date(), 'この候補日時は過ぎています。');
      await tx.joinRequest.create({ data: { mealId: intent.mealId, userId, candidateId: data.candidateId, message: data.message || null } });
      await tx.joinIntent.update({ where: { id: intent.id }, data: { status: 'COMPLETED', userId, consumedAt: new Date() } });
    });
    await recordGrowthEvent('JOIN_AFTER_SIGNUP_COMPLETED', { recruitmentId: intent.mealId, loggedIn: true });
    (await cookies()).delete(INTENT_COOKIE);
    return `/meals/${intent.mealId}`;
  });
}
