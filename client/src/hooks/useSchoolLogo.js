// client/src/hooks/useSchoolLogo.js
import { useState, useEffect } from "react";
import { getToken } from "../auth/storage";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

/**
 * Universal school logo hook.
 * Works for ALL roles — superadmin, admin, teacher, finance, parent, student, staff.
 * The backend reads the role from the JWT and returns the correct school's logo.
 *
 * Usage (same line in every sidebar):
 *   const logoUrl = useSchoolLogo();
 */
export function useSchoolLogo() {
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API}/api/school/logo`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled && data?.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      } catch {
        // logo is decorative — silently ignore errors
      }
    };

    fetchLogo();
    return () => { cancelled = true; };
  }, []);

  return logoUrl;
}