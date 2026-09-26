import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveMealStatus, shouldAutoCloseMeal } from '../src/lib/meal-expiration';

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

test('候補日時をすべて過ぎたOPENはcronのstatus更新を待たずCLOSED扱いになる', () => {
  const meal = { status: 'OPEN' as const, candidates: [{ date, startTime: '19:00' }] };
  assert.equal(effectiveMealStatus(meal, new Date('2026-09-10T10:01:00.000Z')), 'CLOSED');
});

test('未来の候補が残るOPENはそのままOPENと判定される', () => {
  const meal = { status: 'OPEN' as const, candidates: [{ date, startTime: '19:00' }] };
  assert.equal(effectiveMealStatus(meal, new Date('2026-09-10T09:00:00.000Z')), 'OPEN');
});

test('OPEN以外のstatusは候補日時に関わらずそのまま返す', () => {
  const meal = { status: 'MATCHED' as const, candidates: [{ date, startTime: '19:00' }] };
  assert.equal(effectiveMealStatus(meal, new Date('2026-09-10T10:01:00.000Z')), 'MATCHED');
});
