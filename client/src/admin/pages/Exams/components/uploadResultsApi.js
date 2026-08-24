// client/src/admin/pages/Exams/components/uploadResultsApi.js
import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/results`;

const authHeaders = (isJson = false) => {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
};

const handle = async (r) => {
  const j = await r.json();
  if (!r.ok || j.success === false) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  return j;
};

// ── Overview (stat cards + class-wise breakdown) ───────────────────────────
export const fetchUploadOverview = () =>
  fetch(`${BASE}/admin/overview`, { headers: authHeaders() }).then(handle);

// ── All classes in the school (unrestricted — not limited to a teacher) ────
export const fetchAllClassSections = () =>
  fetch(`${API_URL}/api/class-sections`, { headers: authHeaders() }).then(handle);

// ── Exam groups for the active academic year ────────────────────────────────
export const fetchExamGroups = () =>
  fetch(`${BASE}/exams`, { headers: authHeaders() }).then(handle);

// ── "Sub Exam" groups — exams filed under the default "Assessment" term.
//    Auto-creates that term on first call. Used by the optional Sub Exam
//    dropdown in the Upload Results modal + combined report card. ──────────
export const fetchSubExamGroups = () =>
  fetch(`${BASE}/sub-exams`, { headers: authHeaders() }).then(handle);

// ── ALL schedules (every class + subject) for a given exam — admin gets the
//    unrestricted list (see getSchedulesByAssessmentGroup ADMIN branch) ─────
export const fetchSchedulesForExam = (assessmentGroupId) =>
  fetch(`${BASE}/exams/${assessmentGroupId}/schedules`, { headers: authHeaders() }).then(handle);

// ── Students (+ any existing marks) for one schedule (exam × class × subject)
export const fetchStudentsForSchedule = (scheduleId) =>
  fetch(`${BASE}/schedule/${scheduleId}/students`, { headers: authHeaders() }).then(handle);

// ── Save/update marks for a batch of students against one schedule ─────────
export const saveMarks = (scheduleId, students) =>
  fetch(`${BASE}/schedule/${scheduleId}/marks`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ students }),
  }).then(handle);