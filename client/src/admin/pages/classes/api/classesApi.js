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
  let j = null;

  try {
    j = await r.json();
  } catch {
    j = null;
  }

  if (!r.ok) {
    const err = new Error(j?.message || j?.error || `HTTP ${r.status}`);
    if (j?.periodsWithEntries) err.periodsWithEntries = j.periodsWithEntries;
    if (j?.conflicts) err.conflicts = j.conflicts;
    if (j?.dayMismatch) err.dayMismatch = j.dayMismatch;
    throw err;
  }

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

// Call: PATCH /api/class-sections/academic-years/:id/activate
// Purpose: Sets the given year as active, deactivates all others for this school
export const activateAcademicYear = (yearId) =>
  fetch(`${BASE}/class-sections/academic-years/${yearId}/activate`, {
    method: "PATCH",
    headers: authHeaders(true),
  }).then(handle);

export const readmitStudentBulk = (data) =>
  fetch(`${BASE}/promotion/readmit-bulk`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(handle);

// ── TIMETABLE EXCEL ────────────────────────────────────────────────────────
//
// FIX: All upload functions now use a shared safeHandle() that reads the
// response as text first, then attempts JSON.parse. This prevents the
// "Unexpected token '<'" crash when the server returns an HTML error page
// (e.g. 404 due to unregistered routes).
//
// IMPORTANT — if you are still getting the HTML error after this fix, the
// route is not registered in your Express router. Add these lines to your
// router file (e.g. timetableExcelRoutes.js / index.js):
//
//   import {
//     downloadAllTimetableTemplate,
//     downloadSingleTimetableTemplate,
//     uploadAllTimetableTemplate,
//     uploadSingleTimetableTemplate,
//   } from "../staffControlls/timetableExcelController.js";
//   import multer from "multer";
//   const upload = multer({ storage: multer.memoryStorage() });
//
//   router.get("/timetable-excel/download-all",          downloadAllTimetableTemplate);
//   router.get("/timetable-excel/download-single/:classSectionId", downloadSingleTimetableTemplate);
//   router.post("/timetable-excel/upload-all",    upload.single("file"), uploadAllTimetableTemplate);
//   router.post("/timetable-excel/upload-single/:classSectionId", upload.single("file"), uploadSingleTimetableTemplate);
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe response handler for file-upload endpoints.
 * Reads body as text, tries to parse as JSON.
 * If the server returns an HTML page (unregistered route / proxy error) we
 * surface a clear message instead of crashing with a JSON parse error.
 */
const safeHandle = async (r) => {
  const text = await r.text();

  // Detect HTML error page (404 / 502 / nginx / express default)
  if (text.trimStart().startsWith("<!")) {
    throw new Error(
      `Server returned an HTML page (HTTP ${r.status}). ` +
        "The API route may not be registered. " +
        "Check that timetable-excel routes are mounted in your Express router."
    );
  }

  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`Unexpected server response (HTTP ${r.status}): ${text.slice(0, 120)}`);
  }

  if (!r.ok) {
    throw new Error(j?.message || j?.error || `HTTP ${r.status}`);
  }

  return j;
};

/**
 * Download all-classes timetable template as Excel blob.
 * GET /api/timetable-excel/download-all?academicYearId=xxx
 */
export const downloadAllTimetableTemplate = async (academicYearId) => {
  const r = await fetch(
    `${BASE}/timetable-excel/download-all?academicYearId=${academicYearId}`,
    { headers: authHeaders() }
  );

  if (!r.ok) {
    // Try to parse error body safely
    const text = await r.text();
    let msg = `HTTP ${r.status}`;
    if (!text.trimStart().startsWith("<!")) {
      try { msg = JSON.parse(text)?.message || msg; } catch { /* ignore */ }
    } else {
      msg =
        `Server returned an HTML page (HTTP ${r.status}). ` +
        "The API route may not be registered in your Express router.";
    }
    throw new Error(msg);
  }

  return r.blob();
};

/**
 * Upload filled all-classes timetable workbook.
 * POST /api/timetable-excel/upload-all
 * body: FormData { academicYearId, file }
 *
 * FIX: Do NOT set Content-Type manually — let the browser set the multipart
 * boundary automatically. Only Authorization header is passed.
 */
export const uploadAllTimetableTemplate = async (academicYearId, file) => {
  const form = new FormData();
  form.append("academicYearId", academicYearId);
  form.append("file", file);

  const r = await fetch(`${BASE}/timetable-excel/upload-all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // ← NO Content-Type
    body: form,
  });

  return safeHandle(r);
};

/**
 * Download single-class timetable template as Excel blob.
 * GET /api/timetable-excel/download-single/:classSectionId?academicYearId=xxx
 */
export const downloadSingleTimetableTemplate = async (academicYearId, classSectionId) => {
  const r = await fetch(
    `${BASE}/timetable-excel/download-single/${classSectionId}?academicYearId=${academicYearId}`,
    { headers: authHeaders() }
  );

  if (!r.ok) {
    const text = await r.text();
    let msg = `HTTP ${r.status}`;
    if (!text.trimStart().startsWith("<!")) {
      try { msg = JSON.parse(text)?.message || msg; } catch { /* ignore */ }
    } else {
      msg =
        `Server returned an HTML page (HTTP ${r.status}). ` +
        "The API route may not be registered in your Express router.";
    }
    throw new Error(msg);
  }

  return r.blob();
};

/**
 * Upload filled single-class timetable workbook.
 * POST /api/timetable-excel/upload-single/:classSectionId
 * body: FormData { academicYearId, file }
 *
 * FIX: Do NOT set Content-Type manually — let the browser set the multipart
 * boundary automatically.
 */
export const uploadSingleTimetableTemplate = async (academicYearId, classSectionId, file) => {
  const form = new FormData();
  form.append("academicYearId", academicYearId);
  form.append("file", file);

  const r = await fetch(`${BASE}/timetable-excel/upload-single/${classSectionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` }, // ← NO Content-Type
    body: form,
  });

  return safeHandle(r);
};