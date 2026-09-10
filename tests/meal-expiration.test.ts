import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldAutoCloseMeal } from '../src/lib/meal-expiration';

const date = new Date('2026-09-10T00:00:00.000Z');

test('当日の候補開始時刻を過ぎた募集を終了対象にする', () => {
  assert.equal(shouldAutoCloseMeal([{ date, startTime: '19:00' }], new Date('2026-09-10T10:01:00.000Z')), true);
});

test('未来の候補が1つでも残っていれば募集を継続する', () => {
  assert.equal(shouldAutoCloseMeal([{ date, startTime: '18:00' }, { date, startTime: '20:00' }], new Date('2026-09-10T10:01:00.000Z')), false);
});

test('候補がない募集を自動終了対象にしない', () => {
  assert.equal(shouldAutoCloseMeal([], new Date('2026-09-10T10:01:00.000Z')), false);
});
