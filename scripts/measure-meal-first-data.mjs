import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error('Usage: node scripts/measure-meal-first-data.mjs http://127.0.0.1:3201');
const authFile = process.argv[3];
const headers = {};
if (authFile) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) throw new Error('Test authentication is allowed only on loopback hosts.');
  const state = JSON.parse(readFileSync(authFile, 'utf8'));
  headers.cookie = state.cookies.filter(cookie => cookie.name === 'next-auth.session-token').map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  if (!headers.cookie) throw new Error('No test session cookie found.');
}
const targetMs = 100;
console.log('実際の募集カードHTML到着を測定。サーバーreadiness完了後の初回GETを含みます。起動時間・LCPとは別です。');
console.log('| Request | TTFB | First meal card | Full response | <=100ms |');
console.log('|---|---:|---:|---:|---|');
for (let i = 0; i < 5; i++) {
  const started = performance.now();
  const response = await fetch(new URL('/meals', baseUrl), { headers, cache: 'no-store', signal: AbortSignal.timeout(30_000) });
  const ttfb = performance.now() - started;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let html = ''; let firstCardMs;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    html += decoder.decode(value, { stream: true });
    if (firstCardMs === undefined && /<article class="meal-card(?:\s|")/.test(html)) firstCardMs = performance.now() - started;
  }
  if (authFile && !html.includes('data-meal-viewer="signed-in"')) throw new Error('The test session was not accepted; refusing to label an anonymous measurement as authenticated.');
  const passed = firstCardMs !== undefined && firstCardMs <= targetMs;
  console.log(`| ${i === 0 ? 'first' : `repeat ${i}`} | ${ttfb.toFixed(1)}ms | ${firstCardMs === undefined ? 'NO CARDS' : `${firstCardMs.toFixed(1)}ms`} | ${(performance.now() - started).toFixed(1)}ms | ${passed ? 'PASS' : 'FAIL'} |`);
  if (!passed) process.exitCode = 1;
}
