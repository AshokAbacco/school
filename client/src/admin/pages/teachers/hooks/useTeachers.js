// client/src/admin/pages/teachers/hooks/useTeachers.js
// Path: client/src/admin/pages/teachers/hooks/useTeachers.js
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchTeachers } from "../api/teachersApi.js";

// Client-side in-memory cache (prevents re-fetch on tab/filter toggle)
const cache = new Map();
const CACHE_MS = 2 * 60 * 1000; // 2 min

export function useTeachers(filters) {
  const [state, setState] = useState({
    teachers: [],
    meta: null,
    loading: true,
    error: null,
  });
  const abortRef = useRef(null);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    // 1. Check memory cache
    const cached = cache.get(filtersKey);
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setState({
        teachers: cached.data,
        meta: cached.meta,
        loading: false,
        error: null,
      });
      return;
    }

    // 2. Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((p) => ({ ...p, loading: true, error: null }));

    fetchTeachers(filters, abortRef.current.signal)
      .then((res) => {
        cache.set(filtersKey, {
          ts: Date.now(),
          data: res.data,
          meta: res.meta,
        });
        setState({
          teachers: res.data,
          meta: res.meta,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState((p) => ({ ...p, loading: false, error: err.message }));
      });

    return () => abortRef.current?.abort();
  }, [filtersKey]); // eslint-disable-line

  const refetch = useCallback(() => {
    cache.delete(filtersKey);
    setState((p) => ({ ...p, loading: true, error: null }));

    fetchTeachers(filters)
      .then((res) => {
        cache.set(filtersKey, {
          ts: Date.now(),
          data: res.data,
          meta: res.meta,
        });

        setState({
          teachers: res.data,
          meta: res.meta,
          loading: false,
          error: null,
        });
      })
      .catch((err) =>
        setState((p) => ({ ...p, loading: false, error: err.message })),
      );
  }, [filters, filtersKey]);

  return { ...state, refetch };
}
