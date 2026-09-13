export type AnalyticsEndpoint = '/api/growth-events' | '/api/business-marketing';
type QueuedEvent = { endpoint: AnalyticsEndpoint; event: string; queuedAt: number };
type QueueOptions = {
  send: (endpoint: AnalyticsEndpoint, body: string) => Promise<unknown>;
  schedule: (callback: () => void) => () => void;
  persist?: (events: QueuedEvent[]) => void;
  initial?: QueuedEvent[];
};

// Leave room below the browser's 64 KiB aggregate keepalive request limit.
const MAX_BODY_BYTES = 60 * 1024;
const MAX_BATCH_EVENTS = 30;
const PENDING_TTL_MS = 30_000;
const encoder = new TextEncoder();

export function createAnalyticsQueue({ send, schedule, persist, initial = [] }: QueueOptions) {
  let pending = [...initial];
  let cancelScheduled: (() => void) | undefined;
  let inFlight: Promise<void> | undefined;

  async function drain() {
    while (pending.length) {
      const endpoint = pending[0].endpoint;
      const events: string[] = [];
      const remaining: QueuedEvent[] = [];
      let bytes = encoder.encode('{"events":[]}').length;
      for (const item of pending) {
        const itemBytes = encoder.encode(item.event).length + (events.length ? 1 : 0);
        if (item.endpoint === endpoint && events.length < MAX_BATCH_EVENTS && bytes + itemBytes <= MAX_BODY_BYTES) {
          events.push(item.event);
          bytes += itemBytes;
        } else {
          remaining.push(item);
        }
      }
      pending = remaining;
      persist?.(pending);
      // Establish the session cookie before starting the next request.
      // Dispatched requests survive page navigation via keepalive.
      try { await send(endpoint, `{"events":[${events.join(',')}]}`); }
      catch { /* Analytics failures must not interrupt the user's action. */ }
    }
  }

  function flush() {
    cancelScheduled?.();
    cancelScheduled = undefined;
    if (inFlight) return inFlight;
    if (!pending.length) return Promise.resolve();
    inFlight = drain().finally(() => {
      inFlight = undefined;
      if (pending.length && !cancelScheduled) cancelScheduled = schedule(() => { void flush(); });
    });
    return inFlight;
  }

  return {
    enqueue(endpoint: AnalyticsEndpoint, event: object) {
      const serialized = JSON.stringify(event);
      if (encoder.encode(serialized).length + 13 > MAX_BODY_BYTES) return;
      pending.push({ endpoint, event: serialized, queuedAt: Date.now() });
      persist?.(pending);
      if (!cancelScheduled && !inFlight) cancelScheduled = schedule(() => { void flush(); });
    },
    flush,
  };
}

const STORAGE_KEY = 'ore_pending_analytics';
let browserQueue: ReturnType<typeof createAnalyticsQueue> | undefined;

function restorePending(): QueuedEvent[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is QueuedEvent => {
      if (!item || (item.endpoint !== '/api/growth-events' && item.endpoint !== '/api/business-marketing') || typeof item.event !== 'string') return false;
      // Only resume a recent navigation, not events from an earlier login session.
      if (typeof item.queuedAt !== 'number' || item.queuedAt > Date.now() || Date.now() - item.queuedAt > PENDING_TTL_MS) return false;
      if (encoder.encode(item.event).length + 13 > MAX_BODY_BYTES) return false;
      try { const event = JSON.parse(item.event); return event !== null && typeof event === 'object' && !Array.isArray(event); }
      catch { return false; }
    });
  } catch { return []; }
}

export function enqueueAnalyticsEvent(endpoint: AnalyticsEndpoint, event: object) {
  if (typeof window === 'undefined') return;
  if (!browserQueue) {
    let storageScheduled = false;
    let eventsToPersist: QueuedEvent[] = [];
    browserQueue = createAnalyticsQueue({
      initial: restorePending(),
      schedule(callback) {
        const timer = window.setTimeout(callback, 200);
        return () => window.clearTimeout(timer);
      },
      send: (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }),
      persist(events) {
        eventsToPersist = events;
        if (storageScheduled) return;
        storageScheduled = true;
        // One synchronous storage write per burst, rather than per impression.
        queueMicrotask(() => {
          storageScheduled = false;
          try {
            if (eventsToPersist.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(eventsToPersist));
            else sessionStorage.removeItem(STORAGE_KEY);
          } catch { /* Storage limits do not block tracking. */ }
        });
      },
    });
    window.addEventListener('pagehide', () => { void browserQueue?.flush(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void browserQueue?.flush();
    });
  }
  browserQueue.enqueue(endpoint, event);
  if (document.visibilityState === 'hidden') void browserQueue.flush();
}
