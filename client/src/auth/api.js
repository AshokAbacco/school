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

/**
 * Staff / Student / Parent login (all require schoolCode)
 * type: "staff" | "student" | "parent"
 */
export const loginRequest = async (type, credentials) =>
  post(`/api/auth/${type}/login`, credentials);

// ── Super Admin ────────────────────────────────────────────────────────────

export const loginSuperAdmin = (credentials) =>
  post("/api/auth/super-admin/login", credentials);

export const registerSuperAdmin = (data) =>
  post("/api/auth/super-admin/register", data);
