type Options<T> = {
  load: () => Promise<T>;
  maxAgeMs: number;
  refreshEveryMs: number;
  now?: () => number;
  onError?: (error: unknown) => void;
};

// Keep the last complete snapshot while one refresh runs. Never fabricate an empty
// result, publish a partial load, or serve data beyond the configured age limit.
export function createRefreshingCache<T>({ load, maxAgeMs, refreshEveryMs, now = Date.now, onError }: Options<T>) {
  let value: { data: T; startedAt: number } | undefined;
  let inFlight: Promise<T> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;

  function refresh(): Promise<T> {
    if (inFlight) return inFlight;
    const startedAt = now();
    inFlight = Promise.resolve().then(load).then(data => {
      value = { data, startedAt };
      return data;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  }

  return {
    refresh,
    get(): Promise<T> {
      if (value && now() - value.startedAt < maxAgeMs) return Promise.resolve(value.data);
      return refresh();
    },
    async start() {
      if (!timer) {
        timer = setInterval(() => { void refresh().catch(error => onError?.(error)); }, refreshEveryMs);
        timer.unref();
      }
      return refresh();
    },
    stop() { if (timer) clearInterval(timer); timer = undefined; },
    ageMs() { return value ? Math.max(0, now() - value.startedAt) : null; },
  };
}
