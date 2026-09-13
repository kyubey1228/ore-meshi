import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { idSchema } from '@/validators';

const idsSchema = z.array(idSchema).max(20);

// 公開募集の概要だけを返す。Server Actionの実行待ちを使わず、ページ遷移と並列に取得できる。
export async function GET(request: Request) {
  const parsed = idsSchema.safeParse(new URL(request.url).searchParams.getAll('id'));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid meal IDs' }, { status: 400 });
  const ids = [...new Set(parsed.data)];
  const meals = ids.length ? await prisma.meal.findMany({
    where: { id: { in: ids }, status: 'OPEN', OR: [{ deadline: null }, { deadline: { gt: new Date() } }] },
    select: { id: true, title: true, area: true, genre: true },
  }) : [];
  const order = new Map(ids.map((id, index) => [id, index]));
  meals.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return NextResponse.json(meals, { headers: { 'Cache-Control': 'private, no-store' } });
}
