// client/src/admin/pages/teachers/api/teachersApi.js
const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api/teachers`;

const toQuery = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) s.set(k, v);
  });
  return s.toString();
};

export const fetchTeachers = (filters, signal) =>
  fetch(`${BASE}?${toQuery(filters)}`, { signal, credentials: "include" }).then(
    (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  );

export const fetchTeacherById = (id) =>
  fetch(`${BASE}/${id}`, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const createTeacher = (data) =>
  fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to create teacher");
    return j;
  });

export const updateTeacher = (id, data) =>
  fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed to update teacher");
    return j;
  });

export const deactivateTeacher = (id) =>
  fetch(`${BASE}/${id}`, { method: "DELETE", credentials: "include" }).then(
    (r) => {
      if (!r.ok) throw new Error("Failed to deactivate");
      return r.json();
    },
  );

export const addAssignment = (teacherId, data) =>
  fetch(`${BASE}/${teacherId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  });

export const removeAssignment = (teacherId, aId) =>
  fetch(`${BASE}/${teacherId}/assignments/${aId}`, {
    method: "DELETE",
    credentials: "include",
  }).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
  });
