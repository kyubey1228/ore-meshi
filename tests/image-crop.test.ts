import test from 'node:test';
import assert from 'node:assert/strict';
import { centerCrop } from '../src/lib/image-crop';

test('横長画像は左右を中央トリミングして1200×630比率にする', () => {
  const crop = centerCrop(2000, 1000, 1200, 630);
  assert.equal(crop.sourceY, 0);
  assert.equal(crop.sourceHeight, 1000);
  assert.ok(crop.sourceX > 0);
  assert.equal(crop.sourceWidth / crop.sourceHeight, 1200 / 630);
});

test('縦長画像は上下を中央トリミングして1200×630比率にする', () => {
  const crop = centerCrop(800, 1200, 1200, 630);
  assert.equal(crop.sourceX, 0);
  assert.equal(crop.sourceWidth, 800);
  assert.ok(crop.sourceY > 0);
  assert.equal(crop.sourceWidth / crop.sourceHeight, 1200 / 630);
});

test('同じ比率の画像は全体を使用する', () => {
  assert.deepEqual(centerCrop(1200, 630, 1200, 630), { sourceX: 0, sourceY: 0, sourceWidth: 1200, sourceHeight: 630 });
});
