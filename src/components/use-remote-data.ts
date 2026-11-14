"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./states";

// Callers provide a stable callback. A generation guard ignores older requests.
export function useRemoteData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async (silent = false) => {
    const request = ++generation.current;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const response = await load();
      if (request === generation.current) { setData(response); setError(null); }
    } catch (problem) {
      if (request === generation.current) setError(errorMessage(problem));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    let active = true;
    // Defer until this mount survives cleanup (including Strict Mode's probe).
    queueMicrotask(() => { if (active) void reload(); });
    return () => { active = false; generation.current += 1; };
  }, [reload]);
  const replaceData = useCallback((next: T) => {
    // A read started before a successful mutation must not replace its newer result.
    generation.current += 1;
    setData(next);
    setLoading(false);
    setError(null);
  }, []);
  return { data, loading, error, reload, setData: replaceData };
}
