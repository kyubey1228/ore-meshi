import assert from 'node:assert/strict';
import test from 'node:test';
import { ANALYTICS_TIMEZONE, buildAreaDemandPayloads, buildDailyMetricsPayload, buildHourlyDemandPayloads, createTokyoDayPeriod, type AnalyticsSourceRows } from '../src/lib/analytics-snapshot';

const period = createTokyoDayPeriod(new Date('2026-09-10T03:00:00Z'));
const rows: AnalyticsSourceRows = {
  growthEvents: [{ eventType: 'SIGNUP_STARTED' }, { eventType: 'SIGNUP_COMPLETED' }],
  meals: [{ area: '新宿', genre: '焼肉', status: 'MATCHED', maxParticipants: 4, demandClusterKey: 'demand-1', createdAt: new Date('2026-09-10T01:00:00Z'), firstJoinAt: null, matchedAt: new Date('2026-09-10T02:00:00Z') }],
  matchedMeals: [{ area: '新宿', genre: '焼肉', matchedAt: new Date('2026-09-10T02:00:00Z') }],
  completedMatches: [{ completedAt: new Date('2026-09-10T03:00:00Z'), meal: { area: '新宿', genre: '焼肉' }, participants: [{ userId: 'u1' }, { userId: 'u1' }, { userId: 'u2' }] }],
  demandIntents: [{ area: '新宿', genre: '焼肉', status: 'MATCHED', createdAt: new Date('2026-09-10T00:00:00Z') }],
  notifications: [{ type: 'MEAL_TODAY', readAt: new Date('2026-09-10T04:00:00Z'), clickedAt: null }],
};

test('JSTの暦日をUTC半開区間へ変換する', () => {
  assert.equal(period.timezone, ANALYTICS_TIMEZONE);
  assert.equal(period.start.toISOString(), '2026-09-09T15:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-09-10T15:00:00.000Z');
});

test('日次・エリア・時間帯payloadの合計が元データと一致する', () => {
  const generatedAt = new Date('2026-09-10T05:00:00Z');
  const daily = buildDailyMetricsPayload(period, rows, generatedAt);
  assert.equal(daily.signupStarted, 1);
  assert.equal(daily.mealsMatched, 1);
  assert.equal(daily.uniqueDiners, 2);
  assert.deepEqual(daily.notificationTypeMetrics, { MEAL_TODAY: { sent: 1, opened: 1, clicked: 0 } });

  const area = buildAreaDemandPayloads(period, rows, generatedAt);
  assert.deepEqual(area.map(({ area: name, genre, demandIntents, mealsCreated, mealsMatched, matchesCompleted, estimatedParticipants }) => ({ area: name, genre, demandIntents, mealsCreated, mealsMatched, matchesCompleted, estimatedParticipants })), [
    { area: '新宿', genre: '焼肉', demandIntents: 1, mealsCreated: 1, mealsMatched: 1, matchesCompleted: 1, estimatedParticipants: 4 },
  ]);

  const hourly = buildHourlyDemandPayloads(period, rows, generatedAt);
  assert.equal(hourly.reduce((sum, row) => sum + row.demandIntents, 0), 1);
  assert.equal(hourly.reduce((sum, row) => sum + row.mealsCreated, 0), 1);
  assert.equal(hourly.reduce((sum, row) => sum + row.mealsMatched, 0), 1);
  assert.equal(hourly.reduce((sum, row) => sum + row.matchesCompleted, 0), 1);
});
