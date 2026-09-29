import { useCallback, useEffect, useState } from 'react';
export function useApi<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null); const [refreshing, setRefreshing] = useState(true); const [version, setVersion] = useState(0);
  const refresh = useCallback(() => { setRefreshing(true); setVersion(value => value + 1); }, []);
  useEffect(() => { const controller = new AbortController(); loader(controller.signal).then(value => { setData(value); setError(null); }).catch(value => { if (value instanceof Error && value.name !== 'AbortError') setError(value.message); }).finally(() => { if (!controller.signal.aborted) setRefreshing(false); }); return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version]);
  return { data, error, refreshing, refresh };
}
