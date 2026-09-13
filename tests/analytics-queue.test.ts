import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalyticsQueue, type AnalyticsEndpoint } from '../src/lib/analytics-queue';
import { buildGrowthEvent } from '../src/lib/growth-events';

const growth: AnalyticsEndpoint = '/api/growth-events';
const marketing: AnalyticsEndpoint = '/api/business-marketing';

test('long inbound attribution is bounded without changing event identity or ranking fields', () => {
  const event = buildGrowthEvent('RECOMMENDATION_CLICKED', { source: 'explicit', rankingPosition: 3, loggedIn: true }, {
    source: 'default', referrer: `https://example.test/${'a'.repeat(500)}`, utmCampaign: 'b'.repeat(200),
  });
  assert.equal(event.eventType, 'RECOMMENDATION_CLICKED');
  assert.equal(event.source, 'explicit');
  assert.equal(event.rankingPosition, 3);
  assert.equal(event.loggedIn, true);
  assert.equal((event.referrer as string).length, 300);
  assert.equal((event.utmCampaign as string).length, 80);
});

test('a burst waits for one flush and preserves each event payload', async () => {
  const requests: { endpoint: string; body: string }[] = [];
  let schedules = 0;
  let cancellations = 0;
  const queue = createAnalyticsQueue({
    schedule: () => { schedules++; return () => { cancellations++; }; },
    send: async (endpoint, body) => { requests.push({ endpoint, body }); },
  });
  const event = { eventType: 'RECOMMENDATION_CLICKED', area: '新宿' };
  queue.enqueue(growth, event);
  event.area = '渋谷';
  queue.enqueue(growth, { eventType: 'RECRUITMENT_VIEWED' });
  assert.equal(schedules, 1);
  assert.equal(requests.length, 0);
  await queue.flush();
  await queue.flush();
  assert.equal(cancellations, 1);
  assert.equal(requests.length, 1);
  assert.deepEqual(JSON.parse(requests[0].body).events, [
    { eventType: 'RECOMMENDATION_CLICKED', area: '新宿' },
    { eventType: 'RECRUITMENT_VIEWED' },
  ]);
});

test('batches are limited to 30 and the next request waits for the session-cookie response', async () => {
  const requests: { endpoint: string; events: { index: number }[] }[] = [];
  let releaseFirst!: () => void;
  const firstResponse = new Promise<void>(resolve => { releaseFirst = resolve; });
  const queue = createAnalyticsQueue({
    schedule: () => () => {},
    send: async (endpoint, body) => {
      requests.push({ endpoint, events: JSON.parse(body).events });
      if (requests.length === 1) await firstResponse;
    },
  });
  for (let index = 0; index < 65; index++) queue.enqueue(growth, { index });
  queue.enqueue(marketing, { index: 66 });
  const flushing = queue.flush();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].events.length, 30);
  queue.enqueue(marketing, { index: 67 });
  void queue.flush();
  assert.equal(requests.length, 1);
  releaseFirst();
  await flushing;
  assert.deepEqual(requests.map(request => request.events.length), [30, 30, 5, 2]);
  assert.deepEqual(requests.flatMap(request => request.events).map(event => event.index), [...Array.from({ length: 65 }, (_, index) => index), 66, 67]);
});

test('UTF-8 byte size limits Japanese payloads below the keepalive quota', async () => {
  const bodies: string[] = [];
  const queue = createAnalyticsQueue({ schedule: () => () => {}, send: async (_, body) => { bodies.push(body); } });
  for (let index = 0; index < 4; index++) queue.enqueue(growth, { index, content: '飯'.repeat(9000) });
  queue.enqueue(growth, { content: '飯'.repeat(30000) });
  await queue.flush();
  assert.equal(bodies.length, 2);
  assert.ok(bodies.every(body => Buffer.byteLength(body) < 64 * 1024));
  assert.deepEqual(bodies.flatMap(body => JSON.parse(body).events).map(event => event.index), [0, 1, 2, 3]);
});

test('only events waiting behind an in-flight request are restored after navigation', async () => {
  let persisted: Parameters<NonNullable<Parameters<typeof createAnalyticsQueue>[0]['persist']>>[0] = [];
  let release!: () => void;
  const response = new Promise<void>(resolve => { release = resolve; });
  const queue = createAnalyticsQueue({
    schedule: () => () => {},
    persist: events => { persisted = structuredClone(events); },
    send: () => response,
  });
  queue.enqueue(growth, { eventType: 'RECRUITMENT_VIEWED' });
  queue.enqueue(marketing, { eventType: 'SIGNUP_STARTED', referralCode: 'partner-1' });
  const flushing = queue.flush();
  assert.equal(persisted.length, 1);
  const restoredBodies: string[] = [];
  const restoredQueue = createAnalyticsQueue({
    initial: persisted,
    schedule: () => () => {},
    send: async (_, body) => { restoredBodies.push(body); },
  });
  await restoredQueue.flush();
  assert.deepEqual(JSON.parse(restoredBodies[0]).events, [{ eventType: 'SIGNUP_STARTED', referralCode: 'partner-1' }]);
  release();
  await flushing;
});

test('a failed endpoint does not block events for the other endpoint', async () => {
  const endpoints: string[] = [];
  const queue = createAnalyticsQueue({
    schedule: () => () => {},
    send: async endpoint => { endpoints.push(endpoint); if (endpoint === growth) throw new Error('offline'); },
  });
  queue.enqueue(growth, { eventType: 'RECRUITMENT_VIEWED' });
  queue.enqueue(marketing, { eventType: 'BUSINESS_LP_VIEW' });
  await queue.flush();
  assert.deepEqual(endpoints, [growth, marketing]);
});
