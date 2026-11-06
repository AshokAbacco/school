// src/admin/pages/Staff/api/api.js

import { getToken } from "../../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api/staff/profiles`;

const authHeaders = (isJson = false) => {
  const headers = {
    Authorization: `Bearer ${getToken()}`,
    "Cache-Control": "no-store",
  };
  if (isJson) headers["Content-Type"] = "application/json";
  return headers;
};

const toQuery = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v != null) s.set(k, v);
  });
  return s.toString();
};

// ✅ Helper: throw on non-2xx responses so catch blocks actually trigger
const handleResponse = async (r) => {
  const data = await r.json();
  if (!r.ok) {
    // Use server's error message if available, else fallback
    throw new Error(data?.error || `Request failed (${r.status})`);
  }
  return data;
};

// ✅ GET STAFF
export const fetchStaff = (filters) =>
  fetch(`${BASE}?${toQuery(filters)}`, {
    headers: authHeaders(),
  }).then(handleResponse);

// Builds the request body: plain JSON when no photo change is involved
// (keeps Bulk Import and other callers exactly as before), multipart
// FormData when a profile photo is being uploaded or removed.
const buildBody = (data, { photo, removePhoto } = {}) => {
  if (!photo && !removePhoto) {
    return { headers: authHeaders(true), body: JSON.stringify(data) };
  }
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined) return;
    fd.append(k, v === null ? "" : String(v)); // null → "" so the server clears it
  });
  if (photo) fd.append("profileImage", photo);
  if (removePhoto && !photo) fd.append("removeProfileImage", "true");
  // No Content-Type header — the browser sets the multipart boundary itself
  return { headers: authHeaders(), body: fd };
};

// ✅ CREATE STAFF  — options: { photo: File }
export const createStaff = (data, options) =>
  fetch(BASE, {
    method: "POST",
    ...buildBody(data, options),
  }).then(handleResponse);

// ✅ UPDATE  — options: { photo: File, removePhoto: boolean }
export const updateStaff = (id, data, options) =>
  fetch(`${BASE}/${id}`, {
    method: "PATCH",
    ...buildBody(data, options),
  }).then(handleResponse);

// ✅ REMOVE PROFILE PHOTO ONLY
export const deleteStaffPhoto = (id) =>
  fetch(`${BASE}/${id}/profile-image`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handleResponse);

// ✅ DELETE
export const deleteStaff = (id) =>
  fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).then(handleResponse);