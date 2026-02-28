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

export const createAcademicYear = (data) =>
  fetch(`${BASE}/academic-years`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

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

// Single: { grade, section, capacity? }
// Bulk:   { grade, sections: [{ section, capacity? }] }
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
    {
      headers: authHeaders(),
    },
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
  fetch(`${BASE}/teachers?limit=200&status=ACTIVE`, {
    headers: authHeaders(),
  }).then(handle);

// ── EXTRA CLASSES ──────────────────────────────────────────────────────────

/**
 * GET /api/class-sections/:classSectionId/extra-classes?academicYearId=xxx
 * Fetch all extra classes for a specific section + year
 */
export const fetchExtraClasses = (classSectionId, filters = {}) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/extra-classes?${toQuery(filters)}`,
    { headers: authHeaders() },
  ).then(handle);

/**
 * GET /api/class-sections/extra-classes/overview?academicYearId=xxx
 * Fetch extra classes for ALL sections — for admin overview
 */
export const fetchAllExtraClassesOverview = (filters = {}) =>
  fetch(`${BASE}/class-sections/extra-classes/overview?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

/**
 * POST /api/class-sections/:classSectionId/extra-classes
 * body: {
 *   academicYearId, subjectId, teacherId, type,
 *   reason?,
 *   recurringDay?  — "MONDAY"|"TUESDAY"|...|"SUNDAY"
 *   specificDate?  — ISO date string  (provide one of recurringDay/specificDate)
 *   startTime,     — "HH:MM"
 *   endTime,       — "HH:MM"
 * }
 */
export const saveExtraClass = (classSectionId, data) =>
  fetch(`${BASE}/class-sections/${classSectionId}/extra-classes`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

/**
 * PUT /api/class-sections/:classSectionId/extra-classes/:extraClassId
 * Same body shape as POST — all fields optional (except day/date)
 */
export const updateExtraClass = (classSectionId, extraClassId, data) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/extra-classes/${extraClassId}`,
    {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(data),
    },
  ).then(handle);

/**
 * DELETE /api/class-sections/:classSectionId/extra-classes/:extraClassId
 * Soft delete — sets isActive = false
 */
export const deleteExtraClass = (classSectionId, extraClassId) =>
  fetch(
    `${BASE}/class-sections/${classSectionId}/extra-classes/${extraClassId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  ).then(handle);

// ── STREAMS (PUC only) ─────────────────────────────────────────────────────
export const fetchStreams = () =>
  fetch(`${BASE}/streams`, { headers: authHeaders() }).then(handle);

export const createStream = (data) =>
  fetch(`${BASE}/streams`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateStream = (id, data) =>
  fetch(`${BASE}/streams/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteStream = (id) =>
  fetch(`${BASE}/streams/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── STREAM COMBINATIONS (PUC — PCMB, PCMC etc.) ───────────────────────────
export const createCombination = (streamId, data) =>
  fetch(`${BASE}/streams/${streamId}/combinations`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateCombination = (streamId, combinationId, data) =>
  fetch(`${BASE}/streams/${streamId}/combinations/${combinationId}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteCombination = (streamId, combinationId) =>
  fetch(`${BASE}/streams/${streamId}/combinations/${combinationId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── COURSES (Degree / Diploma / PG) ───────────────────────────────────────
export const fetchCourses = () =>
  fetch(`${BASE}/courses`, { headers: authHeaders() }).then(handle);

export const createCourse = (data) =>
  fetch(`${BASE}/courses`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateCourse = (id, data) =>
  fetch(`${BASE}/courses/${id}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteCourse = (id) =>
  fetch(`${BASE}/courses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── COURSE BRANCHES ────────────────────────────────────────────────────────
export const createBranch = (courseId, data) =>
  fetch(`${BASE}/courses/${courseId}/branches`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const updateBranch = (courseId, branchId, data) =>
  fetch(`${BASE}/courses/${courseId}/branches/${branchId}`, {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

export const deleteBranch = (courseId, branchId) =>
  fetch(`${BASE}/courses/${courseId}/branches/${branchId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handle);

// ── PROMOTION ──────────────────────────────────────────────────────────────

/**
 * POST /api/promotion/preview
 * body: { fromAcademicYearId, toAcademicYearId }
 * Returns a dry-run summary of what will happen when promotion is run
 */
export const fetchPromotionPreview = (data) =>
  fetch(`${BASE}/promotion/preview`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

/**
 * POST /api/promotion/run
 * body: { fromAcademicYearId, toAcademicYearId, notes? }
 * Actually executes the promotion
 */
export const runPromotion = (data) =>
  fetch(`${BASE}/promotion/run`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

// ── READMISSION ────────────────────────────────────────────────────────────

/**
 * GET /api/promotion/pending-readmission?academicYearId=xxx
 * Returns students with status PENDING_READMISSION
 */
export const fetchPendingReadmission = (filters = {}) =>
  fetch(`${BASE}/promotion/pending-readmission?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handle);

/**
 * POST /api/promotion/readmit/:studentId
 * body: { newClassSectionId, newAcademicYearId, newAdmissionNumber?, reason? }
 * Re-admits a student who was in PENDING_READMISSION state
 */
export const readmitStudent = (studentId, data) =>
  fetch(`${BASE}/promotion/readmit/${studentId}`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);
