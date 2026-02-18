import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api/teachers`;

const authHeaders = (isJson = false) => {
  const headers = {
    Authorization: `Bearer ${getToken()}`,
  };

  if (isJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

const toQuery = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) s.set(k, v);
  });
  return s.toString();
};

/* ───────────────────────────── */
/* GET LIST */
/* ───────────────────────────── */
export const fetchTeachers = (filters, signal) =>
  fetch(`${BASE}?${toQuery(filters)}`, {
    signal,
    headers: authHeaders(),
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

/* ───────────────────────────── */
/* GET BY ID */
/* ───────────────────────────── */
export const fetchTeacherById = (id) =>
  fetch(`${BASE}/${id}`, {
    headers: authHeaders(),
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

/* ───────────────────────────── */
/* CREATE */
/* ───────────────────────────── */
export const createTeacher = (data) =>
  fetch(BASE, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to create teacher");
    return j;
  });

/* ───────────────────────────── */
/* UPDATE */
/* ───────────────────────────── */
export const updateTeacher = (id, data) =>
  fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to update teacher");
    return j;
  });

/* ───────────────────────────── */
/* DELETE (SOFT) */
/* ───────────────────────────── */
export const deactivateTeacher = (id) =>
  fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to deactivate");
    return r.json();
  });

/* ───────────────────────────── */
/* ASSIGNMENTS */
/* ───────────────────────────── */
export const addAssignment = (teacherId, data) =>
  fetch(`${BASE}/${teacherId}/assignments`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  });

export const removeAssignment = (teacherId, aId) =>
  fetch(`${BASE}/${teacherId}/assignments/${aId}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });
