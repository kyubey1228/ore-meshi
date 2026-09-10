import test from 'node:test';
import assert from 'node:assert/strict';
import { withUtm } from '../src/lib/social';

test('withUtmはutm_source/medium/campaignを付与する', () => {
  const url = withUtm('https://example.com/meals/abc', 'x', 'social');
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('utm_source'), 'x');
  assert.equal(parsed.searchParams.get('utm_medium'), 'social');
  assert.equal(parsed.searchParams.get('utm_campaign'), 'meal_share');
  assert.equal(parsed.origin + parsed.pathname, 'https://example.com/meals/abc');
});

test('withUtmはcampaignを上書きできる', () => {
  const url = withUtm('https://example.com/meals/abc', 'line', 'social', 'custom_campaign');
  assert.equal(new URL(url).searchParams.get('utm_campaign'), 'custom_campaign');
});

test('withUtmは既存のクエリパラメータを保持する', () => {
  const url = withUtm('https://example.com/meals/abc?foo=bar', 'share', 'copy');
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('foo'), 'bar');
  assert.equal(parsed.searchParams.get('utm_source'), 'share');
});
