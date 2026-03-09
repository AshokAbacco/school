// client/src/admin/pages/exams/api/examsApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api/exams`;

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

// ── TERMS ──────────────────────────────────────────────────────────────────
export const createTerm = (data) =>
  fetch(`${BASE}/terms`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const fetchTerms = (academicYearId) =>
  fetch(`${BASE}/terms/${academicYearId}`, {
    headers: authHeaders(),
  }).then(handle);

export const updateTerm = (id, data) =>
  fetch(`${BASE}/terms/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteTerm = (id) =>
  fetch(`${BASE}/terms/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── ASSESSMENT GROUPS ──────────────────────────────────────────────────────
export const createGroup = (data) =>
  fetch(`${BASE}/groups`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const fetchGroups = (academicYearId) =>
  fetch(`${BASE}/groups/${academicYearId}`, {
    headers: authHeaders(),
  }).then(handle);

export const updateGroup = (id, data) =>
  fetch(`${BASE}/groups/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteGroup = (id) =>
  fetch(`${BASE}/groups/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

export const publishGroup = (id) =>
  fetch(`${BASE}/groups/${id}/publish`, {
    method: "PATCH",
    headers: authHeaders(),
  }).then(handle);

export const lockGroup = (id) =>
  fetch(`${BASE}/groups/${id}/lock`, {
    method: "PATCH",
    headers: authHeaders(),
  }).then(handle);

// ── SCHEDULES ──────────────────────────────────────────────────────────────
export const createSchedule = (data) =>
  fetch(`${BASE}/schedules`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const fetchSchedules = (groupId) =>
  fetch(`${BASE}/schedules/${groupId}`, {
    headers: authHeaders(),
  }).then(handle);

export const deleteSchedule = (id) =>
  fetch(`${BASE}/schedules/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── MARKS ──────────────────────────────────────────────────────────────────
/**
 * POST /api/exams/marks/bulk
 * body: { scheduleId, marks: [{ studentId, marksObtained, isAbsent }] }
 */
export const bulkMarksEntry = (data) =>
  fetch(`${BASE}/marks/bulk`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const fetchMarksBySchedule = (scheduleId) =>
  fetch(`${BASE}/marks/${scheduleId}`, {
    headers: authHeaders(),
  }).then(handle);

// ── RESULTS ────────────────────────────────────────────────────────────────
/**
 * POST /api/exams/results/calculate/:groupId
 * Triggers server-side result calculation for the group
 */
export const calculateResults = (groupId) =>
  fetch(`${BASE}/results/calculate/${groupId}`, {
    method: "POST",
    headers: authHeaders(),
  }).then(handle);

/**
 * GET /api/exams/results/student/:studentId/:academicYearId
 * Returns all result summaries for a student in a given academic year
 */
export const fetchStudentResult = (studentId, academicYearId) =>
  fetch(`${BASE}/results/student/${studentId}/${academicYearId}`, {
    headers: authHeaders(),
  }).then(handle);


  // ── CLASS SECTIONS ─────────────────────────────────────────────────────────
export const fetchClassSections = () =>
  fetch(`${API_URL}/api/class-sections`, {
    headers: authHeaders(),
  }).then(handle);

export const fetchClassSectionById = (id) =>
  fetch(`${API_URL}/api/class-sections/${id}`, {
    headers: authHeaders(),
  }).then(handle);