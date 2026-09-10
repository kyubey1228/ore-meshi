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
const measurements = [
  { label: '/ cold相当', path: '/', noCache: true },
  { label: '/ warm 1', path: '/' },
  { label: '/ warm 2', path: '/' },
  { label: '/api/health', path: '/api/health', noCache: true },
];

async function measure({ label, path, noCache }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: 'follow',
      cache: 'no-store',
      headers: noCache ? { 'cache-control': 'no-cache' } : {},
      signal: controller.signal,
    });
    const headersAt = performance.now();
    await response.arrayBuffer();
    const completedAt = performance.now();
    return { label, status: response.status, ttfb: Math.round(headersAt - started), total: Math.round(completedAt - started), cache: response.headers.get('x-nextjs-cache') ?? response.headers.get('x-vercel-cache') ?? 'unknown' };
  } finally {
    clearTimeout(timeout);
  }
}

(async () => {
  console.log(`base_url=${baseUrl}`);
  console.log(`measured_at=${new Date().toISOString()}`);
  console.log('| 対象 | Status | TTFB | Total | Cache |');
  console.log('|---|---:|---:|---:|---|');
  for (const item of measurements) {
    try {
      const result = await measure(item);
      console.log(`| ${result.label} | ${result.status} | ${result.ttfb}ms | ${result.total}ms | ${result.cache} |`);
    } catch (error) {
      console.log(`| ${item.label} | ERROR | — | — | ${error?.name ?? 'UnknownError'} |`);
    }
  }
})();
NODE
