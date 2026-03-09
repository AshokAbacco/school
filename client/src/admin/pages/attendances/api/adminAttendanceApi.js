// client/src/admin/pages/attendances/api/adminAttendanceApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const handle = async (r) => {
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
  return j;
};

// GET /api/admin/attendance?classSectionId=...&date=YYYY-MM-DD
export const fetchAdminAttendance = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${BASE}/admin/attendance?${query}`, {
    headers: authHeaders(),
  }).then(handle);
};

// GET /api/admin/attendance/summary?date=YYYY-MM-DD
// Returns { academicYear, date, summaries: [{ classSectionId, grade, section,
//   totalStudents, present, absent, marked, attendanceRate }] }
export const fetchAttendanceSummary = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${BASE}/admin/attendance/summary?${query}`, {
    headers: authHeaders(),
  }).then(handle);
};
