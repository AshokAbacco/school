// client/src/auth/api.js
const API = import.meta.env.VITE_API_URL;

const post = async (url, body) => {
  const response = await fetch(`${API}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

// ── Login ──────────────────────────────────────────────────────────────────

const ROUTE_MAP = {
  admin:    "staff",
  teacher:  "staff",
  financer: "finance",
  student:  "student",
  parent:   "parent",
};

// Role map: what DB role the selected tab must match
const ROLE_MAP = {
  admin:    "ADMIN",
  teacher:  "TEACHER",
  financer: "FINANCE",
};

export const loginRequest = async (type, credentials) => {
  const route = ROUTE_MAP[type] || type;
  // Pass selectedRole so backend can enforce it
  const body = ROLE_MAP[type]
    ? { ...credentials, selectedRole: ROLE_MAP[type] }
    : credentials;
  return post(`/api/auth/${route}/login`, body);
};

// ── Super Admin ────────────────────────────────────────────────────────────

export const loginSuperAdmin = (credentials) =>
  post("/api/auth/super-admin/login", credentials);

export const registerSuperAdmin = (data) =>
  post("/api/auth/super-admin/register", data);

// ── Login OTP ─────────────────────────────────────────────────────────────

export const sendLoginOtp = (credentials) =>
  post("/api/auth/login-with-otp", credentials);

export const verifyLoginOtp = (data) =>
  post("/api/auth/verify-login-otp", data);