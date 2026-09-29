import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';

test('legacy production URLs permanently redirect while preserving path and query', () => {
  const response = proxy(new NextRequest('https://ore-meshi.lolipop-now.app/media/example?utm_source=x'));

  assert.equal(response?.status, 301);
  assert.equal(response?.headers.get('location'), 'https://ore-meshi.com/media/example?utm_source=x');
});

test('canonical and local hosts continue without a redirect', () => {
  assert.equal(proxy(new NextRequest('https://ore-meshi.com/meals')), undefined);
  assert.equal(proxy(new NextRequest('http://localhost:3000/meals')), undefined);
});
