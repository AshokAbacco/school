// client/src/admin/pages/teachers/hooks/useTeachers.js

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchTeachers } from "../api/teachersApi.js";

export function useTeachers(filters) {
  const [state, setState] = useState({
    teachers: [],
    meta: null,
    loading: true,
    error: null,
  });

  const abortRef = useRef(null);
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(() => {
    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    fetchTeachers(filters, abortRef.current.signal)
      .then((res) => {
        setState({
          teachers: res.data,
          meta: res.meta,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;

        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Failed to fetch teachers",
        }));
      });
  }, [filters]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [filtersKey, load]);

  return {
    ...state,
    refetch: load,
  };
}
