// client/src/admin/pages/teachers/hooks/useTeacherDetail.js
// Path: client/src/admin/pages/teachers/hooks/useTeacherDetail.js
import { useState, useEffect } from "react";
import { fetchTeacherById } from "../api/teachersApi.js";

const cache = new Map();
const CACHE_MS = 2 * 60 * 1000;

export function useTeacherDetail(id) {
  const [state, setState] = useState({
    teacher: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!id) return;

    const cached = cache.get(id);
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setState({ teacher: cached.data, loading: false, error: null });
      return;
    }

    setState({ teacher: null, loading: true, error: null });
    fetchTeacherById(id)
      .then((res) => {
        cache.set(id, { ts: Date.now(), data: res.data });
        setState({ teacher: res.data, loading: false, error: null });
      })
      .catch((err) =>
        setState({ teacher: null, loading: false, error: err.message }),
      );
  }, [id]);

  const invalidate = () => cache.delete(id);
  return { ...state, invalidate };
}
