// client/src/admin/pages/teachers/hooks/useTeacherDetail.js

import { useState, useEffect, useCallback } from "react";
import { fetchTeacherById } from "../api/teachersApi.js";

export function useTeacherDetail(id) {
  const [state, setState] = useState({
    teacher: null,
    loading: true,
    error: null,
  });

  const load = useCallback(() => {
    if (!id) return;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    fetchTeacherById(id)
      .then((res) => {
        setState({
          teacher: res.data,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setState({
          teacher: null,
          loading: false,
          error: err.message || "Failed to fetch teacher",
        });
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    invalidate: load, // simple re-fetch
  };
}
