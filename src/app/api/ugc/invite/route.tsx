import { ImageResponse } from 'next/og';
import { getUgcStyle } from '@/lib/ugc';
import { UgcImageCard } from '@/components/ugc-image-card';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const style = getUgcStyle(url.searchParams.get('style'));
  const background = new URL(style.image, url.origin).toString();
  const headers: Record<string, string> = { 'Cache-Control': 'public, max-age=300, s-maxage=3600' };
  if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="ore-meshi-invite-${style.id}.png"`;

  return new ImageResponse(
    <UgcImageCard background={background} style={style} badge="友達から飯のお誘い" title={<>飯の誘いが届いています。</>} action="募集を見る"><span>知らない人でも、友達でも。誰かと食べるきっかけを。</span></UgcImageCard>,
    { width: 1200, height: 630, headers },
  );
}
