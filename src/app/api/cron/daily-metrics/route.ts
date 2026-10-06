import { NextResponse } from 'next/server';
import { parseMetricDate, persistDailyMetrics, yesterdayInTokyo } from '@/server/daily-metrics';
import { hasValidCronSecret } from '@/lib/security';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!hasValidCronSecret(request)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try {
    const target = url.searchParams.get('date');
    const result = await persistDailyMetrics(target ? parseMetricDate(target) : yesterdayInTokyo());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : '集計に失敗しました。' }, { status: 500 });
  }
}
