import test from 'node:test';
import assert from 'node:assert/strict';
import { articleDescription, extractHeadings, readingTime, validPublicUrl } from '../src/lib/media';

test('記事descriptionはSEO設定、概要、本文の順にフォールバックする', () => {
  assert.equal(articleDescription({ seoDescription: ' SEO説明 ', excerpt: '概要', content: '本文' }), 'SEO説明');
  assert.equal(articleDescription({ excerpt: '概要', content: '本文' }), '概要');
  assert.equal(articleDescription({ content: '## 見出し\n[本文](/meals) **太字**' }), '見出し 本文 太字');
});

test('目次はH2/H3だけを安全なidとともに抽出する', () => {
  assert.deepEqual(extractHeadings('# H1\n## 食事相手の探し方\n### 東京 2026'), [
    { level: 2, text: '食事相手の探し方', id: '食事相手の探し方' },
    { level: 3, text: '東京 2026', id: '東京-2026' },
  ]);
});

test('読了時間は最低1分で600文字単位', () => {
  assert.equal(readingTime('短い本文'), 1);
  assert.equal(readingTime('あ'.repeat(1201)), 3);
});

test('公開画像URLはHTTPSだけを受け入れる', () => {
  assert.equal(validPublicUrl('https://example.com/image.jpg'), 'https://example.com/image.jpg');
  assert.equal(validPublicUrl('javascript:alert(1)'), null);
});
