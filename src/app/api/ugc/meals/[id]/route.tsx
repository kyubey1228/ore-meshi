import { ImageResponse } from 'next/og';
import { getMealShareData } from '@/lib/data';
import { candidateLabel } from '@/lib/format';
import { getUgcStyle } from '@/lib/ugc';
import { remainingSlots, truncate } from '@/lib/social';
import { UgcImageCard } from '@/components/ugc-image-card';
import { readUgcImageDataUrl } from '@/server/ugc-image';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const style = getUgcStyle(url.searchParams.get('style'));
  const meal = await getMealShareData(id);
  if (!meal) return new Response('Not found', { status: 404 });

  const remaining = remainingSlots(meal);
  const when = meal.candidates[0] ? candidateLabel(meal.candidates[0]) : '日時調整中';
  const headline = meal.status === 'MATCHED'
    ? '飯、決まった！'
    : remaining === 1 ? 'あと1人！' : '誰か、飯いかん？';
  const background = await readUgcImageDataUrl(style);
  const headers: Record<string, string> = { 'Cache-Control': 'public, max-age=300, s-maxage=3600' };
  if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="ore-meshi-${id}-${style.id}.png"`;

  return new ImageResponse(
    <UgcImageCard background={background} style={style} badge={headline} title={truncate(meal.title, 32)} action="詳細を見る"><span>📍 {truncate(meal.area, 20)}　{truncate(when, 29)}</span><span style={{ marginTop: 7 }}>{truncate(meal.host.displayName, 18)}さんの募集 · {meal.status === 'OPEN' ? `あと${remaining}人` : `${meal._count.joinRequests + 1}人で行きます`}</span></UgcImageCard>,
    { width: 1200, height: 630, headers },
  );
}
