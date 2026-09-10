import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { getUgcStyle } from '@/lib/ugc';

type UgcStyleDefinition = ReturnType<typeof getUgcStyle>;

export async function readUgcImageDataUrl(style: UgcStyleDefinition) {
  // style.imageは固定のUGC_STYLESからのみ渡されるため、利用者入力をファイルパスへ使わない。
  const relativePath = style.image.replace(/^\//, '');
  const bytes = await readFile(path.join(process.cwd(), 'public', relativePath));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}
