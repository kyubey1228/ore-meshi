import assert from 'node:assert/strict';
import test from 'node:test';
import { createRefreshingCache } from '../src/lib/refreshing-cache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('cold readers wait for real data and share one DB load', async () => {
  const pending = deferred<string[]>(); let calls = 0;
  const cache = createRefreshingCache({ load: () => { calls++; return pending.promise; }, maxAgeMs: 60_000, refreshEveryMs: 20_000 });
  const a = cache.get(); const b = cache.get();
  await Promise.resolve();
  assert.equal(calls, 1); assert.equal(a, b); assert.equal(cache.ageMs(), null);
  pending.resolve(['real-meal']);
  assert.deepEqual(await a, ['real-meal']);
  assert.deepEqual(await cache.get(), ['real-meal']); assert.equal(calls, 1);
});

test('healthy snapshot stays immediately available during a slow refresh', async () => {
  const pending = deferred<string[]>(); let calls = 0;
  const cache = createRefreshingCache({ load: () => ++calls === 1 ? Promise.resolve(['old']) : pending.promise, maxAgeMs: 60_000, refreshEveryMs: 20_000 });
  await cache.get();
  const refresh = cache.refresh();
  assert.deepEqual(await cache.get(), ['old']);
  pending.resolve(['new']); await refresh;
  assert.deepEqual(await cache.get(), ['new']);
});

test('failed refresh keeps last good data only within the freshness bound', async () => {
  let now = 0; let fail = false;
  const cache = createRefreshingCache({ load: async () => { if (fail) throw new Error('DB unavailable'); return ['real']; }, now: () => now, maxAgeMs: 60_000, refreshEveryMs: 20_000 });
  await cache.get(); fail = true;
  await assert.rejects(cache.refresh());
  now = 59_999; assert.deepEqual(await cache.get(), ['real']);
  now = 60_000; await assert.rejects(cache.get(), /DB unavailable/);
});

test('snapshot age includes DB load time, not just time since response', async () => {
  let now = 0; let calls = 0;
  const cache = createRefreshingCache({ load: async () => { calls++; now += 5_000; return calls; }, now: () => now, maxAgeMs: 60_000, refreshEveryMs: 20_000 });
  assert.equal(await cache.get(), 1); assert.equal(cache.ageMs(), 5_000);
  now = 60_000;
  assert.equal(await cache.get(), 2);
});

test('expired readers join an existing refresh rather than return expired data', async () => {
  let now = 0; let calls = 0; const pending = deferred<number>();
  const cache = createRefreshingCache({ load: () => ++calls === 1 ? Promise.resolve(1) : pending.promise, now: () => now, maxAgeMs: 60_000, refreshEveryMs: 20_000 });
  await cache.get(); now = 60_000;
  const refresh = cache.refresh(); const read = cache.get();
  assert.equal(read, refresh);
  pending.resolve(2); assert.equal(await read, 2); assert.equal(calls, 2);
});

test('readiness starts the periodic refresh and stop releases its timer', async () => {
  let calls = 0;
  const refreshed = deferred<void>();
  const cache = createRefreshingCache({ load: async () => { if (++calls === 2) refreshed.resolve(); return calls; }, maxAgeMs: 60_000, refreshEveryMs: 10 });
  // Keep the test process alive while testing the deliberately unref-ed service timer.
  const deadline = setTimeout(() => refreshed.reject(new Error('refresh timer did not run')), 2_000);
  try { assert.equal(await cache.start(), 1); await refreshed.promise; assert.ok(calls >= 2); }
  finally { cache.stop(); clearTimeout(deadline); }
});
