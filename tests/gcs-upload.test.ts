import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_GCS_UPLOAD_BYTES, gcsObjectName, gcsPublicUrl, gcsUploadRequestSchema, normalizeGcsPrivateKey, resolveGcsProjectId } from '../src/lib/gcs-upload';

test('GCSプロジェクトIDは明示値を優先し、未指定時だけサービスアカウントから補完する', () => {
  assert.equal(resolveGcsProjectId(' explicit-project ', 'u@fallback.iam.gserviceaccount.com'), 'explicit-project');
  assert.equal(resolveGcsProjectId(undefined, 'u@fallback.iam.gserviceaccount.com'), 'fallback');
  assert.equal(resolveGcsProjectId(undefined, 'invalid@example.com'), undefined);
});

test('記事画像は年月・用途・UUIDを含む衝突しにくいパスになる', () => {
  assert.equal(gcsObjectName('cover', 'test-id', new Date('2026-09-28T00:00:00Z')), 'articles/2026/09/cover-test-id.webp');
});

test('秘密鍵は実改行・\\n・JSON引用符付き形式を同じPEMへ正規化する', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
  assert.equal(normalizeGcsPrivateKey(pem), pem);
  assert.equal(normalizeGcsPrivateKey(pem.replace(/\n/g, '\\n')), pem);
  assert.equal(normalizeGcsPrivateKey(JSON.stringify(pem)), pem);
  assert.equal(normalizeGcsPrivateKey(''), undefined);
});

test('公開URLはバケット名と各パス要素をURLエンコードする', () => {
  assert.equal(gcsPublicUrl('ore-meshi', 'articles/日本語 image.webp'), 'https://storage.googleapis.com/ore-meshi/articles/%E6%97%A5%E6%9C%AC%E8%AA%9E%20image.webp');
});

test('署名URLリクエストはWebP・正のサイズ・8MB以下だけを許可する', () => {
  assert.equal(gcsUploadRequestSchema.safeParse({ contentType: 'image/webp', size: 1, purpose: 'cover' }).success, true);
  assert.equal(gcsUploadRequestSchema.safeParse({ contentType: 'image/png', size: 1, purpose: 'cover' }).success, false);
  assert.equal(gcsUploadRequestSchema.safeParse({ contentType: 'image/webp', size: 0, purpose: 'cover' }).success, false);
  assert.equal(gcsUploadRequestSchema.safeParse({ contentType: 'image/webp', size: MAX_GCS_UPLOAD_BYTES + 1, purpose: 'cover' }).success, false);
});
