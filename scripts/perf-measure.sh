#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: scripts/perf-measure.sh https://example.com" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
export PERF_MEASURE_BASE_URL="$BASE_URL"

node <<'NODE'
const { performance } = require('node:perf_hooks');

const baseUrl = process.env.PERF_MEASURE_BASE_URL;
// 最初のアクセスでもCDN/サーバーのキャッシュがcoldとは限らないため、coldと断定しない。
const measurements = ['/', '/meals', '/business', '/business/pricing', '/coupons'].flatMap(path => [
  { label: `${path} first`, path },
  { label: `${path} repeat`, path },
]);

async function measure({ label, path }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
    const headersAt = performance.now();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let headingAt = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (headingAt === null && /<h1[\s>]/i.test(html)) headingAt = performance.now();
    }
    const completedAt = performance.now();
    return { label, status: response.status, ttfb: Math.round(headersAt - started), heading: headingAt === null ? '—' : `${Math.round(headingAt - started)}ms`, total: Math.round(completedAt - started), cache: response.headers.get('x-nextjs-cache') ?? response.headers.get('x-vercel-cache') ?? 'unknown' };
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  console.log(`base_url=${baseUrl}`);
  console.log(`measured_at=${new Date().toISOString()}`);
  console.log('HTTP受信の計測です。見出し到着はブラウザーの描画時刻(LCP)とは異なります。');
  console.log('| 対象 | Status | TTFB | 見出し到着 | Total | Cache |');
  console.log('|---|---:|---:|---:|---:|---|');
  for (const item of measurements) {
    try {
      const result = await measure(item);
      console.log(`| ${result.label} | ${result.status} | ${result.ttfb}ms | ${result.heading} | ${result.total}ms | ${result.cache} |`);
    } catch (error) {
      console.log(`| ${item.label} | ERROR | — | — | — | ${error?.name ?? 'UnknownError'} |`);
    }
  }
})();
NODE
