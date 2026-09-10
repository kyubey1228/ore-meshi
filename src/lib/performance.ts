import 'server-only';

export type PerfCategory = 'DB' | 'AUTH' | 'HOME' | 'ADMIN' | 'RECOMMENDATION' | 'MATCH_SCORE' | 'NOTIFICATION' | 'BUSINESS';
const WARN_MS = 100;

export function logPerformance(category: PerfCategory, label: string, durationMs: number) {
  const message = `[PERF] ${category} ${label} ${Math.round(durationMs)}ms`;
  if (durationMs >= WARN_MS) console.warn(message);
  else if (process.env.PERF_LOG_ALL === 'true') console.info(message);
}

export async function measurePerformance<T>(category: PerfCategory, label: string, operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try { return await operation(); }
  finally { logPerformance(category, label, performance.now() - started); }
}
