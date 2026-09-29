import type { NextRequest } from 'next/server';

const LEGACY_HOST = 'ore-meshi.lolipop-now.app';
const CANONICAL_ORIGIN = 'https://ore-meshi.com';

// CloudFront等のCDN/リバースプロキシがoriginへ転送する際にHostヘッダーを
// 書き換えていると、request.nextUrl.hostnameが公開ドメインと一致しないことがある。
// nextUrl.hostname、Hostヘッダー、X-Forwarded-Hostのいずれかが一致すれば判定する。
function requestHost(request: NextRequest) {
  return [request.nextUrl.hostname, request.headers.get('host'), request.headers.get('x-forwarded-host')]
    .filter((value): value is string => Boolean(value))
    .map(value => value.split(':')[0]);
}

export function proxy(request: NextRequest) {
  if (!requestHost(request).includes(LEGACY_HOST)) return;

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_ORIGIN);
  return new Response(null, {
    status: 301,
    headers: { Location: destination.toString() },
  });
}
