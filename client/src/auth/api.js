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

// Roles that use identifier (email OR phone) instead of email-only
const IDENTIFIER_ROLES = new Set(["STUDENT", "PARENT"]);

/**
 * Step 1 — verify credentials and trigger OTP.
 * For STUDENT / PARENT: sends `identifier` (email or phone).
 * For STAFF / SUPER_ADMIN: sends `email` as before.
 */
export const sendLoginOtp = ({ email, identifier, password, selectedRole }) => {
  const useIdentifier = IDENTIFIER_ROLES.has(selectedRole);
  const body = useIdentifier
    ? { identifier: identifier || email, password, selectedRole }
    : { email, password, selectedRole };
  return post("/api/auth/login-with-otp", body);
};

/**
 * Step 2 — submit OTP.
 * Sends whichever key the backend stored the record under.
 */
export const verifyLoginOtp = ({ email, identifier, otp }) =>
  post("/api/auth/verify-login-otp", {
    // Always send both; backend uses `identifier` with fallback to `email`
    identifier: identifier || email,
    email: identifier || email,
    otp,
  });