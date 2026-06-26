"use client";
import * as React from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Fetch JSON with loading/error state and optional polling (live reads).
export function useFetch<T>(url: string, pollMs?: number): State<T> & { refresh: () => void } {
  const [state, setState] = React.useState<State<T>>({ data: null, loading: true, error: null });

  const load = React.useCallback(
    async (silent = false) => {
      if (!silent) setState((s) => ({ ...s, loading: true }));
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as T;
        setState({ data, loading: false, error: null });
      } catch (e: any) {
        setState((s) => ({ data: s.data, loading: false, error: String(e?.message ?? e) }));
      }
    },
    [url],
  );

  React.useEffect(() => {
    load();
    if (!pollMs) return;
    const id = setInterval(() => load(true), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { ...state, refresh: () => load() };
}
