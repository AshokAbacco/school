// src/parent/profile/components/api.js
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────
// AXIOS INSTANCE (Protected)
// ─────────────────────────────────────────
const protectedAPI = axios.create({
  baseURL: API,
});

// Attach token automatically
protectedAPI.interceptors.request.use((config) => {
  // Token is stored inside the "auth" JSON object by storage.js → saveAuth()
  let token = null;
  try {
    const raw = localStorage.getItem("auth");
    if (raw) {
      token = JSON.parse(raw).token;
    }
  } catch {
    // fallback: some apps store the raw token directly under "token"
    token = localStorage.getItem("token");
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────
// STUDENT PROFILE API
// ─────────────────────────────────────────

// Logged-in student fetches their own profile
export const getMyProfile = async () => {
  const res = await protectedAPI.get("/api/students/me");
  return res.data.student;
};

// Logged-in parent fetches their linked students
export const getParentStudents = async () => {
  const res = await protectedAPI.get("/api/students/my-students");
  return res.data.students; // array
};

// Staff viewing any student by ID
export const getStudentById = async (id) => {
  const res = await protectedAPI.get(`/api/students/${id}`);
  return res.data.student;
};
// ─────────────────────────────────────────
// STUDENT FEES API
// ─────────────────────────────────────────

// Fetch fees for a student (Parent / Staff)
export const getStudentFees = async (studentId) => {
  const res = await protectedAPI.get(`/api/fees/student/${studentId}`);
  return res.data;
};
