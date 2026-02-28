import { getToken } from "../../../auth/storage";

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
   TEACHER CLASSES
───────────────────────────────────────────── */
export const fetchTeacherClasses = () =>
  fetch(`${BASE}/attendance/teacher/classes`, {
    headers: authHeaders(),
  }).then(handle);

/* ─────────────────────────────────────────────
   STUDENTS FOR ATTENDANCE
───────────────────────────────────────────── */
export const fetchStudentsForAttendance = (params = {}) => {
  const query = new URLSearchParams(params).toString();

  return fetch(`${BASE}/attendance/teacher/class-students?${query}`, {
    headers: authHeaders(),
  }).then(handle);
};

/* ─────────────────────────────────────────────
   MARK ATTENDANCE
───────────────────────────────────────────── */
export const saveAttendance = (data) =>
  fetch(`${BASE}/attendance/teacher/mark`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);
