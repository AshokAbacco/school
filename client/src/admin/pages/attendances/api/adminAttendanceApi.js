//client\src\admin\pages\attendances\api\adminAttendanceApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

const authHeaders = (isJson = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
};

const handle = async (r) => {
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
  return j;
};

/* ─────────────────────────────────────────────
   ADMIN FETCH ATTENDANCE
───────────────────────────────────────────── */
export const fetchAdminAttendance = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return fetch(`${BASE}/admin/attendance?${query}`, {
    headers: authHeaders(),
  }).then(handle);
};
