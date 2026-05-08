// client/src/admin/pages/exams/api/examsApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api/exams`;

const authHeaders = (isJson = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
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

/**
 * ✅ ADMIN route — fetches ALL schedules for a group without section filtering.
 * Use this in admin ViewExams / EditExams modals.
 * GET /api/exams/schedules/admin/:groupId
 */
export const fetchSchedulesAdmin = (groupId) =>
  fetch(`${BASE}/schedules/admin/${groupId}`, {
    headers: authHeaders(),
  }).then(handle);

/**
 * Student route — filtered by classSectionId from JWT token.
 * Use this in student-facing exam timetable views.
 * GET /api/exams/schedules/:groupId
 */
export const fetchSchedules = (groupId) =>
  fetch(`${BASE}/schedules/${groupId}`, {
    headers: authHeaders(),
  }).then(handle);

export const createSchedule = (data) =>
  fetch(`${BASE}/schedules`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteSchedule = (id) =>
  fetch(`${BASE}/schedules/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── MARKS ──────────────────────────────────────────────────────────────────
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
export const calculateResults = (groupId) =>
  fetch(`${BASE}/results/calculate/${groupId}`, {
    method: "POST",
    headers: authHeaders(),
  }).then(handle);

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