import assert from 'node:assert/strict';
import test from 'node:test';
import nextConfig from '../next.config';
import { hasValidCronSecret, isAllowedBrowserOrigin, readJsonWithLimit } from '../src/lib/security';

test('all routes receive the baseline browser security headers', async () => {
  const rules = await nextConfig.headers?.();
  const headers = new Map(rules?.[0]?.headers.map(header => [header.key, header.value]));
  assert.match(headers.get('Content-Security-Policy') ?? '', /object-src 'none'/);
  assert.match(headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.match(headers.get('Strict-Transport-Security') ?? '', /max-age=31536000/);
  assert.equal(nextConfig.poweredByHeader, false);
});

test('cron authentication requires the dedicated header and rejects query-string secrets', () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'correct-secret';
  try {
    assert.equal(hasValidCronSecret(new Request('https://ore-meshi.com/api/cron/job', { headers: { 'x-cron-secret': 'correct-secret' } })), true);
    assert.equal(hasValidCronSecret(new Request('https://ore-meshi.com/api/cron/job?secret=correct-secret')), false);
    assert.equal(hasValidCronSecret(new Request('https://ore-meshi.com/api/cron/job', { headers: { 'x-cron-secret': 'wrong-secret' } })), false);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test('production browser mutations require a same-origin request', () => {
  const mutableEnv = process.env as unknown as Record<string, string | undefined>;
  const previous = process.env.NODE_ENV;
  mutableEnv.NODE_ENV = 'production';
  try {
    assert.equal(isAllowedBrowserOrigin(new Request('https://ore-meshi.com/api/example', { headers: { origin: 'https://ore-meshi.com' } })), true);
    assert.equal(isAllowedBrowserOrigin(new Request('https://ore-meshi.com/api/example', { headers: { origin: 'https://evil.example' } })), false);
    assert.equal(isAllowedBrowserOrigin(new Request('https://ore-meshi.com/api/example')), false);
  } finally {
    if (previous === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previous;
  }
});

test('JSON parser rejects wrong content types and oversized bodies', async () => {
  await assert.rejects(() => readJsonWithLimit(new Request('https://ore-meshi.com/api/example', { method: 'POST', body: 'x' })), (error: unknown) => error instanceof Response && error.status === 415);
  await assert.rejects(() => readJsonWithLimit(new Request('https://ore-meshi.com/api/example', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'too long' }) }), 8), (error: unknown) => error instanceof Response && error.status === 413);
});
