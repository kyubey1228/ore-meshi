import assert from 'node:assert/strict';
import test from 'node:test';
import { apiErrorMessage, readJsonResponse } from '../src/lib/json-response';

test('JSONレスポンスを読み取る', async () => {
  const response = Response.json({ ok: true, publicUrl: 'https://example.com/image.webp' });
  assert.deepEqual(await readJsonResponse(response, '失敗しました。'), { ok: true, publicUrl: 'https://example.com/image.webp' });
});

test('HTMLエラーページをJSONとして解析せずHTTPステータスを表示する', async () => {
  const response = new Response('<!DOCTYPE html><title>Payload Too Large</title>', { status: 413, headers: { 'content-type': 'text/html' } });
  await assert.rejects(() => readJsonResponse(response, '画像をアップロードできませんでした。'), /画像をアップロードできませんでした。 \(HTTP 413\)/);
});

test('APIの安全なmessageだけを利用する', () => {
  assert.equal(apiErrorMessage({ message: '管理者ログインが必要です。' }, '失敗しました。'), '管理者ログインが必要です。');
  assert.equal(apiErrorMessage({ message: { secret: 'hidden' } }, '失敗しました。'), '失敗しました。');
});
