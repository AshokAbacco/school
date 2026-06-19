// client/src/superAdmin/pages/VoiceAnnouncements/voiceApi.js
//
// Path assumption: this file lives at
//   client/src/superAdmin/pages/VoiceAnnouncements/voiceApi.js
// so "../../../auth/storage" resolves to client/src/auth/storage.js,
// matching the same import used in Sidebar.jsx. Adjust the import path
// below if your actual folder depth differs.

import axios from "axios";
import { getToken } from "../../../auth/storage";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Lookups (reuses existing biometric-module endpoints — same admin scope) ──
export const fetchSchools = () =>
  client.get("/api/biometric/schools").then((r) => r.data.data || []);

export const fetchClassSections = (schoolId) =>
  client.get("/api/biometric/classes", { params: { schoolId } }).then((r) => r.data.data || []);

export const searchStudents = (schoolId, q, classSectionId) =>
  client
    .get("/api/biometric/persons", {
      params: { schoolId, personType: "STUDENT", q, classSectionId: classSectionId || undefined },
    })
    .then((r) => r.data.data || []);

// ── Voice announcement endpoints ─────────────────────────────────────────────
export const uploadVoiceAudio = (blob, schoolId, onProgress) => {
  const formData = new FormData();
  const file = new File([blob], `voice-${Date.now()}.webm`, {
    type: blob.type || "audio/webm",
  });
  formData.append("audio", file);
  formData.append("schoolId", schoolId);

  return client
    .post("/api/voice/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    })
    .then((r) => r.data.data); // { audioUrl, audioKey }
};

export const createVoiceAnnouncement = (payload) =>
  client.post("/api/voice/announcement", payload).then((r) => r.data.data);

export const fetchAnnouncements = (schoolId, page = 1, limit = 20) =>
  client
    .get("/api/voice/announcements", { params: { schoolId, page, limit } })
    .then((r) => ({ data: r.data.data || [], meta: r.data.meta }));

export default client;