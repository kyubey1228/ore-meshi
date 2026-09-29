import type { NextRequest } from 'next/server';

const LEGACY_HOST = 'ore-meshi.lolipop-now.app';
const CANONICAL_ORIGIN = 'https://ore-meshi.com';

export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname !== LEGACY_HOST) return;

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, CANONICAL_ORIGIN);
  return new Response(null, {
    status: 301,
    headers: { Location: destination.toString() },
  });
}
