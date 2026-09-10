import { ImageResponse } from 'next/og';
import { getUgcStyle } from '@/lib/ugc';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const style = getUgcStyle(url.searchParams.get('style'));
  const background = new URL(style.image, url.origin).toString();
  const headers: Record<string, string> = { 'Cache-Control': 'public, max-age=300, s-maxage=3600' };
  if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="ore-meshi-invite-${style.id}.png"`;

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#faf8f3' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={background} alt="" width="1200" height="630" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ width: '54%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '46px 50px', background: 'linear-gradient(90deg, rgba(250,248,243,.98) 0%, rgba(250,248,243,.94) 76%, rgba(250,248,243,0) 100%)' }}>
        <span style={{ color: style.accent, fontSize: 25, fontWeight: 900 }}>🍚 俺は誰かと飯が食いたい！</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: style.accent, fontSize: 56, lineHeight: 1.08, fontWeight: 950 }}>飯の誘いが<br />届いています。</span>
          <span style={{ color: '#39352f', fontSize: 28, lineHeight: 1.4, fontWeight: 800, marginTop: 28 }}>知らない人でも、友達でも。<br />誰かと食べるきっかけを。</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#25231f', fontSize: 23, fontWeight: 850 }}><span>#誰か飯いこ</span><span>募集を見てみる →</span></div>
      </div>
    </div>,
    { width: 1200, height: 630, headers },
  );
}
