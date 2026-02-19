// client/src/admin/pages/classes/api/classesApi.js
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

// ── ACADEMIC YEARS ─────────────────────────────────────────────────────────
export const fetchAcademicYears = () =>
  fetch(`${BASE}/academic-years`, { headers: authHeaders() }).then(handle);

// ── SUBJECTS ───────────────────────────────────────────────────────────────
export const fetchSubjects = (filters = {}) =>
  fetch(`${BASE}/subjects?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const createSubject = (data) =>
  fetch(`${BASE}/subjects`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateSubject = (id, data) =>
  fetch(`${BASE}/subjects/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteSubject = (id) =>
  fetch(`${BASE}/subjects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── CLASS SECTIONS ─────────────────────────────────────────────────────────
export const fetchClassSections = (filters = {}) =>
  fetch(`${BASE}/class-sections?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const fetchClassSectionById = (id, filters = {}) =>
  fetch(`${BASE}/class-sections/${id}?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const createClassSection = (data) =>
  fetch(`${BASE}/class-sections`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteClassSection = (id) =>
  fetch(`${BASE}/class-sections/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

export const activateClassForYear = (id, data) =>
  fetch(`${BASE}/class-sections/${id}/activate`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

// ── CLASS SUBJECTS ─────────────────────────────────────────────────────────
export const assignSubjectToClass = (classSectionId, data) =>
  fetch(`${BASE}/class-sections/${classSectionId}/class-subjects`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const removeSubjectFromClass = (classSectionId, classSubjectId) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/class-subjects/${classSubjectId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  ).then(handle);

// ── TEACHER ASSIGNMENTS ────────────────────────────────────────────────────
export const assignTeacherToSubject = (classSectionId, data) =>
  fetch(`${BASE}/class-sections/${classSectionId}/teacher-assignments`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const removeTeacherAssignment = (classSectionId, assignmentId) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/teacher-assignments/${assignmentId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  ).then(handle);

// ── TIMETABLE CONFIG ───────────────────────────────────────────────────────
export const fetchTimetableConfig = (filters = {}) =>
  fetch(`${BASE}/class-sections/timetable/config?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

export const saveTimetableConfig = (data) =>
  fetch(`${BASE}/class-sections/timetable/config`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

// ── TIMETABLE ENTRIES ──────────────────────────────────────────────────────
export const fetchTimetableEntries = (classSectionId, filters = {}) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/timetable?${toQuery(filters)}`,
    { headers: authHeaders() },
  ).then(handle);

export const saveTimetableEntries = (classSectionId, data) =>
  fetch(`${BASE}/class-sections/${classSectionId}/timetable`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteTimetableEntry = (classSectionId, entryId) =>
  fetch(`${BASE}/class-sections/${classSectionId}/timetable/entry/${entryId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── TEACHERS DROPDOWN ──────────────────────────────────────────────────────
export const fetchTeachersForDropdown = () =>
  fetch(`${BASE}/teachers`, { headers: authHeaders() }).then(handle);
