// client/src/admin/pages/meeting/api/meetingsApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

const authHeaders = (isJson = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
};

const toQuery = (params = {}) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) s.set(k, v);
  });
  return s.toString();
};

const handle = async (r) => {
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  return j;
};

// ── MEETINGS ───────────────────────────────────────────────────────────────

export const fetchMeetings = (filters = {}) =>
  fetch(`${BASE}/meetings?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const fetchMeetingById = (id) =>
  fetch(`${BASE}/meetings/${id}`, { headers: authHeaders() }).then(handle);

export const createMeeting = (data) =>
  fetch(`${BASE}/meetings`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateMeeting = (id, data) =>
  fetch(`${BASE}/meetings/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateMeetingStatus = (id, status) =>
  fetch(`${BASE}/meetings/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ status }),
  }).then(handle);

export const updateMeetingNotes = (id, notes) =>
  fetch(`${BASE}/meetings/${id}/notes`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ notes }),
  }).then(handle);

export const deleteMeeting = (id) =>
  fetch(`${BASE}/meetings/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

export const sendMeetingReminder = (id) =>
  fetch(`${BASE}/meetings/${id}/reminder`, {
    method: "PATCH",
    headers: authHeaders(),
  }).then(handle);

// ── ATTENDANCE ─────────────────────────────────────────────────────────────

export const markParticipantAttendance = (meetingId, participantId, attended) =>
  fetch(
    `${BASE}/meetings/${meetingId}/participants/${participantId}/attendance`,
    {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ attended }),
    },
  ).then(handle);

export const markStudentAttendance = (meetingId, studentId, attended) =>
  fetch(`${BASE}/meetings/${meetingId}/students/${studentId}/attendance`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ attended }),
  }).then(handle);

// ── STATS ──────────────────────────────────────────────────────────────────

export const fetchMeetingStats = (filters = {}) =>
  fetch(`${BASE}/meetings/stats?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

// ── DROPDOWNS ──────────────────────────────────────────────────────────────

export const fetchAcademicYears = () =>
  fetch(`${BASE}/academic-years`, { headers: authHeaders() }).then(handle);

export const fetchClassSections = (filters = {}) =>
  fetch(`${BASE}/class-sections?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const fetchTeachersForDropdown = () =>
  fetch(`${BASE}/teachers?limit=200&status=ACTIVE`, {
    headers: authHeaders(),
  }).then(handle);

/**
 * GET /api/meetings/class-sections/:classSectionId/teachers?academicYearId=
 * Returns teachers assigned to this class section for the given academic year.
 */
export const fetchTeachersByClassSection = (classSectionId, academicYearId) => {
  const q = academicYearId ? `?academicYearId=${academicYearId}` : "";
  return fetch(
    `${BASE}/meetings/class-sections/${classSectionId}/teachers${q}`,
    {
      headers: authHeaders(),
    },
  ).then(handle);
};

export const fetchStudents = (filters = {}) =>
  fetch(`${BASE}/students?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);
