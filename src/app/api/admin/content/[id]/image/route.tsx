import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/server/admin';
import { recordGrowthEvent } from '@/server/growth';

const formats = { ogp: [1200, 630], square: [1080, 1080], portrait: [1080, 1350], story: [1080, 1920] } as const;
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params; const url = new URL(request.url);
  const format = (url.searchParams.get('format') ?? 'square') as keyof typeof formats;
  if (!(format in formats)) return new Response('invalid format', { status: 400 });
  const draft = await prisma.socialContentDraft.findUnique({ where: { id } });
  if (!draft) return new Response('not found', { status: 404 });
  const [width, height] = formats[format];
  const lines = draft.body.split('\n').filter(Boolean); const headline = lines[0]?.slice(0, 64) ?? '誰かと飯を食う';
  const detail = lines.slice(1).join(' ').replace(/#\S+/g, '').trim().slice(0, 100);
  const now = new Date();
  await prisma.socialContentDraft.update({ where: { id }, data: { imageFormat: format, template: 'GROWTH_CARD', generatedAt: now, dataSource: { privacy: 'aggregate-only', headline } } });
  await recordGrowthEvent(url.searchParams.get('download') === '1' ? 'CONTENT_IMAGE_DOWNLOADED' : 'CONTENT_IMAGE_GENERATED', { metadata: { draftId: id, format } });
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#faf8f3', color: '#25231f', padding: width * .065, border: `${Math.max(16, width * .018)}px solid #f05a28` }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: width * .027, fontWeight: 800 }}><span>🍚 俺は誰かと飯が食いたい！</span><span style={{ color: '#b43e14' }}>#誰か飯いこ</span></div><div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ color: '#b43e14', fontSize: width * .034, fontWeight: 800 }}>誰かと食べる、きっかけを。</div><div style={{ fontSize: width * .068, lineHeight: 1.18, fontWeight: 900, marginTop: 24 }}>{headline}</div>{detail && <div style={{ fontSize: width * .032, lineHeight: 1.4, marginTop: 30 }}>{detail}</div>}</div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: width * .025, fontWeight: 700 }}><span>募集を見てみる →</span><span>ore-meshi</span></div></div>, { width, height, headers: url.searchParams.get('download') === '1' ? { 'Content-Disposition': `attachment; filename="ore-meshi-${id}-${format}.png"` } : undefined });
}
