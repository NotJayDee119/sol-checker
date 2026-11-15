import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

interface AsyncState<T> {
  data?: T;
  error?: string;
  loading: boolean;
}

/**
 * Load data, keep the last good result while reloading, and optionally poll while the
 * tab is visible. `deps` re-run the loader; `reload()` re-runs it on demand.
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[], pollMs?: number) {
  const [state, setState] = useState<AsyncState<T>>({ loading: true });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    load().then(
      (data) => alive && setState({ data, loading: false }),
      (e) => alive && setState((s) => ({ ...s, error: errorMessage(e), loading: false }))
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs, reload]);

  return { ...state, reload };
}

/** Current time, refreshed every `ms`, so "3 min ago" labels stay true. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// ── Hash routing: #/papers?teacher=<id> ───────────────────────────────────────

export const PAGES = ['overview', 'teachers', 'papers', 'maintenance'] as const;
export type Page = (typeof PAGES)[number];

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const page: Page = (PAGES as readonly string[]).includes(path) ? (path as Page) : 'overview';
  return { page, params: new URLSearchParams(query) };
}

export function navigate(page: Page, params?: Record<string, string>) {
  const qs = params ? new URLSearchParams(params).toString() : '';
  window.location.hash = `/${page}${qs ? `?${qs}` : ''}`;
}
