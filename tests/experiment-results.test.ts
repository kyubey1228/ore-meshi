import test from 'node:test';
import assert from 'node:assert/strict';

// computeExperimentResultsのDBに依存しない集計ロジック部分のみを抜き出してテストする。
function aggregateByVariant(rows: { eventType: 'EXPERIMENT_EXPOSED' | 'EXPERIMENT_CONVERSION'; sessionKey: string; metadata: { variant?: string } | null }[]) {
  const byVariant = new Map<string, { exposed: Set<string>; converted: Set<string> }>();
  for (const row of rows) {
    const variant = row.metadata?.variant;
    if (!variant) continue;
    const bucket = byVariant.get(variant) ?? { exposed: new Set<string>(), converted: new Set<string>() };
    if (row.eventType === 'EXPERIMENT_EXPOSED') bucket.exposed.add(row.sessionKey);
    else bucket.converted.add(row.sessionKey);
    byVariant.set(variant, bucket);
  }
  return [...byVariant.entries()]
    .map(([variant, b]) => ({ variant, exposed: b.exposed.size, converted: b.converted.size, cvr: b.exposed.size ? b.converted.size / b.exposed.size : 0 }))
    .sort((a, b) => a.variant.localeCompare(b.variant));
}

test('同一セッションの複数表示/複数クリックは1件として数える', () => {
  const result = aggregateByVariant([
    { eventType: 'EXPERIMENT_EXPOSED', sessionKey: 's1', metadata: { variant: 'A' } },
    { eventType: 'EXPERIMENT_EXPOSED', sessionKey: 's1', metadata: { variant: 'A' } },
    { eventType: 'EXPERIMENT_CONVERSION', sessionKey: 's1', metadata: { variant: 'A' } },
    { eventType: 'EXPERIMENT_EXPOSED', sessionKey: 's2', metadata: { variant: 'A' } },
  ]);
  assert.equal(result[0].exposed, 2);
  assert.equal(result[0].converted, 1);
  assert.equal(result[0].cvr, 0.5);
});

test('variantが無いイベントは無視する', () => {
  const result = aggregateByVariant([
    { eventType: 'EXPERIMENT_EXPOSED', sessionKey: 's1', metadata: null },
    { eventType: 'EXPERIMENT_EXPOSED', sessionKey: 's2', metadata: { variant: 'B' } },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].variant, 'B');
});
