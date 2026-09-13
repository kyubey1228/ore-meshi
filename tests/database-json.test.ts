import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseJsonDate } from '../src/lib/database-json';

test('PostgreSQL JSON timestamp keeps the same UTC instant in every server timezone', () => {
  assert.equal(databaseJsonDate('2026-09-13T19:00:00').toISOString(), '2026-09-13T19:00:00.000Z');
  assert.equal(databaseJsonDate('2026-09-13T19:00:00.123').toISOString(), '2026-09-13T19:00:00.123Z');
  assert.equal(databaseJsonDate('2026-09-13T19:00:00Z').toISOString(), '2026-09-13T19:00:00.000Z');
  assert.equal(databaseJsonDate('2026-09-13T19:00:00+09:00').toISOString(), '2026-09-13T10:00:00.000Z');
});
