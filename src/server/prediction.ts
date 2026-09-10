import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { measurePerformance } from '@/lib/performance';

const MIN_SAMPLE = 5;
const WINDOW_DAYS = 30;

type Row = { genre: string | null; status: string; weekday: number; timeOfDay: 'DAY' | 'NIGHT' };

async function fetchAreaMeals(area: string): Promise<Row[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const meals = await prisma.meal.findMany({
    where: { area: { contains: area, mode: 'insensitive' }, createdAt: { gte: since } },
    select: { genre: true, status: true, candidates: { orderBy: { date: 'asc' }, take: 1, select: { date: true, startTime: true } } },
    take: 300,
  });
  return meals.filter(m => m.candidates[0]).map(m => {
    const c = m.candidates[0];
    const hour = Number(c.startTime.slice(0, 2));
    return { genre: m.genre, status: m.status, weekday: c.date.getUTCDay(), timeOfDay: hour >= 17 ? 'NIGHT' : 'DAY' };
  });
}

// エリア単位で30分キャッシュし、genre/曜日/時間帯の絞り込みはメモリ上で行う(N+1・都度全件集計を避ける)。
const getCachedAreaMeals = unstable_cache(fetchAreaMeals, ['prediction-area-meals'], { revalidate: 1800 });

export type PredictionResult = {
  fillRate: number | null;
  sampleSize: number;
  fallbackLevel: 'EXACT' | 'AREA_GENRE' | 'AREA_TIME' | 'AREA_ONLY' | 'NONE';
};

function fillRateOf(rows: Row[]): { fillRate: number; sampleSize: number } {
  const matched = rows.filter(r => r.status === 'MATCHED').length;
  return { fillRate: rows.length ? matched / rows.length : 0, sampleSize: rows.length };
}

export async function predictFillRate(params: { area: string; genre: string | null; weekday: number; hour: number }): Promise<PredictionResult> {
  const rows = await measurePerformance('MATCH_SCORE', 'predictFillRate dataset', () => getCachedAreaMeals(params.area));
  const timeOfDay: 'DAY' | 'NIGHT' = params.hour >= 17 ? 'NIGHT' : 'DAY';

  const exact = rows.filter(r => r.genre === params.genre && r.weekday === params.weekday && r.timeOfDay === timeOfDay);
  if (exact.length >= MIN_SAMPLE) return { ...fillRateOf(exact), fallbackLevel: 'EXACT' };

  const byGenre = rows.filter(r => r.genre === params.genre);
  if (byGenre.length >= MIN_SAMPLE) return { ...fillRateOf(byGenre), fallbackLevel: 'AREA_GENRE' };

  const byTime = rows.filter(r => r.weekday === params.weekday && r.timeOfDay === timeOfDay);
  if (byTime.length >= MIN_SAMPLE) return { ...fillRateOf(byTime), fallbackLevel: 'AREA_TIME' };

  if (rows.length >= MIN_SAMPLE) return { ...fillRateOf(rows), fallbackLevel: 'AREA_ONLY' };

  return { fillRate: null, sampleSize: rows.length, fallbackLevel: 'NONE' };
}

// 「この曜日・時間帯の方が集まりやすい」という軽い提案。強制はしない。
export async function suggestBetterTiming(params: { area: string; genre: string | null; weekday: number; hour: number }): Promise<string | null> {
  const rows = await measurePerformance('RECOMMENDATION', 'suggestBetterTiming dataset', () => getCachedAreaMeals(params.area));
  const byGenre = params.genre ? rows.filter(r => r.genre === params.genre) : rows;
  if (byGenre.length < MIN_SAMPLE * 2) return null;
  const buckets = new Map<string, { total: number; matched: number }>();
  for (const r of byGenre) {
    const key = `${r.weekday}_${r.timeOfDay}`;
    const b = buckets.get(key) ?? { total: 0, matched: 0 };
    b.total += 1;
    if (r.status === 'MATCHED') b.matched += 1;
    buckets.set(key, b);
  }
  const currentKey = `${params.weekday}_${params.hour >= 17 ? 'NIGHT' : 'DAY'}`;
  const currentRate = buckets.get(currentKey);
  let best: { key: string; rate: number; total: number } | null = null;
  for (const [key, b] of buckets) {
    if (b.total < MIN_SAMPLE) continue;
    const rate = b.matched / b.total;
    if (!best || rate > best.rate) best = { key, rate, total: b.total };
  }
  if (!best || best.key === currentKey) return null;
  if (currentRate && currentRate.total >= MIN_SAMPLE && best.rate - currentRate.matched / currentRate.total < 0.15) return null;
  const [weekdayStr, timeOfDay] = best.key.split('_');
  const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
  return `このエリアでは${WEEKDAY_LABEL[Number(weekdayStr)]}曜${timeOfDay === 'NIGHT' ? '夜' : '昼'}の方が集まりやすい傾向があります。`;
}
