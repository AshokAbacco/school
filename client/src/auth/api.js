// client/src/auth/api.js

const API = import.meta.env.VITE_API_URL;

// console.log("==================================");
// console.log("VITE_API_URL:", API);
// console.log("==================================");

const post = async (url, body) => {
  const fullUrl = `${API}${url}`;

  console.log("POST URL:", fullUrl);
  console.log("BODY:", body);

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Status:", response.status);

    const data = await response.json();

    console.log("Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  } catch (err) {
    console.error("========== FETCH ERROR ==========");
    console.error(err);
    console.error("Message:", err.message);
    console.error("URL:", fullUrl);
    console.error("===============================");
    throw err;
  }
};

// ── Login ──────────────────────────────────────────────────────────────────

const ROUTE_MAP = {
  admin: "staff",
  teacher: "staff",
  financer: "finance",
  student: "student",
  parent: "parent",
};

const ROLE_MAP = {
  admin: "ADMIN",
  teacher: "TEACHER",
  financer: "FINANCE",
};

export const loginRequest = async (type, credentials) => {
  const route = ROUTE_MAP[type] || type;

  const body = ROLE_MAP[type]
    ? { ...credentials, selectedRole: ROLE_MAP[type] }
    : credentials;

  return post(`/api/auth/${route}/login`, body);
};

export const loginSuperAdmin = (credentials) =>
  post("/api/auth/super-admin/login", credentials);

export const registerSuperAdmin = (data) =>
  post("/api/auth/super-admin/register", data);

export const sendLoginOtp = (credentials) =>
  post("/api/auth/login-with-otp", credentials);

export const verifyLoginOtp = (data) =>
  post("/api/auth/verify-login-otp", data);

export const sendBusHeadLoginOtp = (credentials) =>
  post("/api/auth/bus-head/login", credentials);

export const verifyBusHeadLoginOtp = (data) =>
  post("/api/auth/bus-head/verify-otp", data);
