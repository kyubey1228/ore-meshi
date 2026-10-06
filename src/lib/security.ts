import { createHash, timingSafeEqual } from 'node:crypto';

const DEFAULT_JSON_LIMIT = 32 * 1024;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function equalSecret(left: string, right: string) {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

export function hasValidCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('x-cron-secret');
  return Boolean(expected && supplied && equalSecret(supplied, expected));
}

export function isAllowedBrowserOrigin(request: Request, extraOrigins: string[] = []) {
  const origin = request.headers.get('origin');
  if (!origin) return process.env.NODE_ENV !== 'production';

  const allowed = new Set(['https://ore-meshi.com', ...extraOrigins]);
  for (const value of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]) {
    if (!value) continue;
    try { allowed.add(new URL(value).origin); } catch { /* Invalid deployment configuration is not trusted. */ }
  }
  if (process.env.NODE_ENV !== 'production') {
    allowed.add(new URL(request.url).origin);
    allowed.add('http://localhost:3000');
  }
  return allowed.has(origin);
}

export async function readJsonWithLimit(request: Request, maxBytes = DEFAULT_JSON_LIMIT): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new Response('application/json is required', { status: 415 });
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Response('Request body is too large', { status: 413 });

  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Response('Request body is too large', { status: 413 });
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : null;
}

export function checkRateLimit(request: Request, scope: string, limit: number, windowMs = 60_000) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim();
  const key = `${scope}:${forwarded || 'unknown'}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (rateLimitStore.size > 10_000) {
    for (const [storedKey, value] of rateLimitStore) if (value.resetAt <= now) rateLimitStore.delete(storedKey);
  }
  return { allowed: current.count <= limit, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}
