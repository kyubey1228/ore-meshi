import assert from 'node:assert/strict';
import test from 'node:test';
import { getUgcStyle, initialUgcStyle, isUgcStyle, RANDOM_UGC_STYLES, UGC_STYLES, withUgcStyle } from '../src/lib/ugc';

test('UGCテーマは7種類あり限定テーマを通常ランダムから除外する', () => {
  assert.equal(UGC_STYLES.length, 7);
  assert.equal(RANDOM_UGC_STYLES.some(style => style.restricted), false);
  assert.equal(UGC_STYLES.some(style => style.id === 'women-only'), true);
  assert.equal(UGC_STYLES.some(style => style.id === 'men-only'), true);
});

test('同じ募集には同じ初期テーマを返す', () => {
  assert.equal(initialUgcStyle('meal-123'), initialUgcStyle('meal-123'));
  assert.equal(RANDOM_UGC_STYLES.some(style => style.id === initialUgcStyle('meal-123')), true);
});

test('共有URLへテーマと任意の募集IDを安全に追加する', () => {
  const result = new URL(withUgcStyle('https://example.com/invite/abc?utm_source=x', 'mixer', 'meal/1'));
  assert.equal(result.searchParams.get('utm_source'), 'x');
  assert.equal(result.searchParams.get('ugc_style'), 'mixer');
  assert.equal(result.searchParams.get('meal'), 'meal/1');
});

test('未知のテーマはデフォルトへ戻す', () => {
  assert.equal(isUgcStyle('unknown'), false);
  assert.equal(getUgcStyle('unknown').id, 'gag');
});
