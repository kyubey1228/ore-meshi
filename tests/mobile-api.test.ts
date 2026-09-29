import assert from 'node:assert/strict';
import test from 'node:test';
import { plainArticleText } from '../src/lib/mobile-api';

test('mobile article API converts trusted editor HTML into readable plain text', () => {
  assert.equal(
    plainArticleText('<h2>見出し</h2><p>誰かと&amp;ご飯へ<br>行こう。</p>'),
    '見出し\n\n 誰かと&ご飯へ\n行こう。',
  );
});

test('mobile article API removes markdown links without losing their labels', () => {
  assert.equal(plainArticleText('詳しくは[募集一覧](https://example.com/meals)へ。'), '詳しくは募集一覧へ。');
});
