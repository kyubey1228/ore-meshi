import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';

test('旧ドメイン(Hostヘッダー)へのアクセスは新ドメインへ301リダイレクトする', () => {
  const request = new NextRequest('https://internal-origin.example.com/meals?area=渋谷', { headers: { host: 'ore-meshi.lolipop-now.app' } });
  const response = proxy(request);
  assert.ok(response);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://ore-meshi.com/meals?area=%E6%B8%8B%E8%B0%B7');
});

test('X-Forwarded-Hostが旧ドメインの場合もリダイレクトする', () => {
  const request = new NextRequest('https://internal-origin.example.com/media/some-slug', { headers: { 'x-forwarded-host': 'ore-meshi.lolipop-now.app' } });
  const response = proxy(request);
  assert.ok(response);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://ore-meshi.com/media/some-slug');
});

test('新ドメインへのアクセスはリダイレクトしない', () => {
  const request = new NextRequest('https://ore-meshi.com/meals', { headers: { host: 'ore-meshi.com' } });
  assert.equal(proxy(request), undefined);
});
