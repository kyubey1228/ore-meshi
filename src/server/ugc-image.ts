import 'server-only';
import type { getUgcStyle } from '@/lib/ugc';

type UgcStyleDefinition = ReturnType<typeof getUgcStyle>;

export async function readUgcImageDataUrl(style: UgcStyleDefinition) {
  // style.imageは固定のUGC_STYLESからのみ渡されるGCSの公開URL。
  const response = await fetch(style.image);
  if (!response.ok) throw new Error(`UGC画像を取得できませんでした: ${style.image}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}
