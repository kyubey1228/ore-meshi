import test from 'node:test';
import assert from 'node:assert/strict';
import { percentiles } from '../src/lib/percentile';
import { classifyMealTimeRange, intentMatchesMeal } from '../src/lib/demand';
import { classifyChannel } from '../src/lib/channel';
import { toCsv } from '../src/lib/csv';

test('percentileはサンプル0件でnullを返す(ゼロ除算回避)', () => {
  const p = percentiles([]);
  assert.deepEqual(p, { p25: null, p50: null, p75: null, p90: null, sampleSize: 0 });
});

test('percentileは昇順ソートされた値から算出する', () => {
  const p = percentiles([10, 1, 5, 8, 3]);
  assert.equal(p.p50, 5);
  assert.equal(p.sampleSize, 5);
});

test('classifyMealTimeRangeは今日をTONIGHTと判定する', () => {
  assert.equal(classifyMealTimeRange(new Date()), 'TONIGHT');
});

test('intentMatchesMealはareaが一致しない場合falseを返す', () => {
  const matches = intentMatchesMeal(
    { area: '渋谷', genre: null, timeRange: null, desiredGroupSize: 2 },
    { area: '新宿', genre: null, maxParticipants: 4, earliestCandidateDate: null },
  );
  assert.equal(matches, false);
});

test('intentMatchesMealは募集人数が希望人数未満ならfalseを返す', () => {
  const matches = intentMatchesMeal(
    { area: '渋谷', genre: null, timeRange: null, desiredGroupSize: 5 },
    { area: '渋谷', genre: null, maxParticipants: 2, earliestCandidateDate: null },
  );
  assert.equal(matches, false);
});

test('intentMatchesMealはarea/genre/人数が条件を満たせばtrueを返す', () => {
  const matches = intentMatchesMeal(
    { area: '渋谷', genre: '焼肉', timeRange: null, desiredGroupSize: 2 },
    { area: '渋谷エリア', genre: '焼肉', maxParticipants: 4, earliestCandidateDate: null },
  );
  assert.equal(matches, true);
});

test('classifyChannelはisReferralを最優先する', () => {
  assert.equal(classifyChannel({ source: 'x', isReferral: true }), 'Referral');
});

test('classifyChannelはutm_campaignがあればCampaignと判定する', () => {
  assert.equal(classifyChannel({ utmCampaign: 'shibuya_launch' }), 'Campaign');
});

test('classifyChannelはsource/referrerが無ければDirectと判定する', () => {
  assert.equal(classifyChannel({}), 'Direct');
});

test('toCsvは空配列で空文字を返す', () => {
  assert.equal(toCsv([]), '');
});

test('toCsvはカンマや改行を含む値をダブルクォートでエスケープする', () => {
  const csv = toCsv([{ area: '渋谷, 新宿', note: '改行\nあり' }]);
  assert.match(csv, /"渋谷, 新宿"/);
  assert.match(csv, /"改行\nあり"/);
});
