import { ImageResponse } from 'next/og';
import { getMealShareData } from '@/lib/data';
import { candidateLabel } from '@/lib/format';
import { getUgcStyle } from '@/lib/ugc';
import { remainingSlots, truncate } from '@/lib/social';

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
  const background = new URL(style.image, url.origin).toString();
  const headers: Record<string, string> = { 'Cache-Control': 'public, max-age=300, s-maxage=3600' };
  if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="ore-meshi-${id}-${style.id}.png"`;

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#faf8f3' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={background} alt="" width="1200" height="630" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ width: '54%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '46px 50px', background: 'linear-gradient(90deg, rgba(250,248,243,.98) 0%, rgba(250,248,243,.94) 76%, rgba(250,248,243,0) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: style.accent, fontSize: 25, fontWeight: 900 }}><span>🍚 俺は誰かと飯が食いたい！</span></div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: style.accent, fontSize: 43, fontWeight: 950 }}>{headline}</span>
          <span style={{ color: '#25231f', fontSize: 49, lineHeight: 1.15, fontWeight: 950, marginTop: 14 }}>{truncate(meal.title, 32)}</span>
          <span style={{ color: '#39352f', fontSize: 27, fontWeight: 800, marginTop: 24 }}>📍 {truncate(meal.area, 20)}</span>
          <span style={{ color: '#39352f', fontSize: 25, marginTop: 8 }}>{truncate(when, 29)}</span>
          <span style={{ color: '#39352f', fontSize: 23, marginTop: 16 }}>{truncate(meal.host.displayName, 18)}さんの募集 · {meal.status === 'OPEN' ? `あと${remaining}人` : `${meal._count.joinRequests + 1}人で行きます`}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#25231f', fontSize: 23, fontWeight: 850 }}><span>#誰か飯いこ</span><span>詳細を見る →</span></div>
      </div>
    </div>,
    { width: 1200, height: 630, headers },
  );
}
