// client/src/auth/api.js

import { Capacitor } from "@capacitor/core";
import schoolConfig from "../config/schoolConfig";

const API = import.meta.env.VITE_API_URL;

// ============================================================
// GLOBAL API FETCH CONFIGURATION
// ============================================================
//
// This automatically adds the ngrok bypass header to ALL
// API requests made through fetch() in the application.
//
// You do NOT need to manually add:
//
//   ngrok-skip-browser-warning
//
// to every page.
//
// It is added ONLY when the request is going to the API URL
// and the API URL is using ngrok.
//
// Production/Render APIs are unaffected.
// ============================================================

const originalFetch = window.fetch.bind(window);

window.fetch = async (input, init = {}) => {
  try {
    // Get the actual request URL
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof Request
        ? input.url
        : String(input);

    // Only modify requests going to our backend API
    const isApiRequest =
      API && (requestUrl.startsWith(API) || requestUrl.startsWith(`${API}/`));

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    // Copy existing headers
    const headers = new Headers(
      input instanceof Request ? input.headers : undefined,
    );

    if (init.headers) {
      const initHeaders = new Headers(init.headers);

      initHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // ==========================================================
    // NGROK FREE DOMAIN
    // ==========================================================

    if (API.includes("ngrok-free.dev")) {
      headers.set("ngrok-skip-browser-warning", "true");
    }

    // ==========================================================
    // JWT TOKEN
    // ==========================================================
    //
    // Only add Authorization if it doesn't already exist.
    // This prevents overwriting a custom Authorization header
    // used by any existing page.
    // ==========================================================

    const token = localStorage.getItem("token");

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Use the modified request
    return originalFetch(input, {
      ...init,
      headers,
    });
  } catch (error) {
    console.error("Global API fetch error:", error);

    // Never break normal fetch behavior because of this wrapper
    return originalFetch(input, init);
  }
};

// ============================================================
// POST HELPER
// ============================================================

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

// ============================================================
// LOGIN
// ============================================================

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

// ============================================================
// NORMAL LOGIN
// ============================================================

export const loginRequest = async (type, credentials) => {
  const route = ROUTE_MAP[type] || type;

  const body = ROLE_MAP[type]
    ? {
        ...credentials,
        selectedRole: ROLE_MAP[type],
      }
    : credentials;

  return post(`/api/auth/${route}/login`, body);
};

// ============================================================
// SUPER ADMIN LOGIN
// ============================================================

export const loginSuperAdmin = (credentials) =>
  post("/api/auth/super-admin/login", credentials);

// ============================================================
// SUPER ADMIN REGISTER
// ============================================================

export const registerSuperAdmin = (data) =>
  post("/api/auth/super-admin/register", data);

// ============================================================
// LOGIN OTP
// ============================================================

// export const sendLoginOtp = (credentials) =>
//   post("/api/auth/login-with-otp", credentials);

export const sendLoginOtp = (credentials) =>
  post("/api/auth/login-with-otp", {
    ...credentials,
    ...(Capacitor.isNativePlatform()
      ? { universityId: schoolConfig.universityId }
      : {}),
  });

// ============================================================
// VERIFY LOGIN OTP
// ============================================================

export const verifyLoginOtp = (data) =>
  post("/api/auth/verify-login-otp", data);

// ============================================================
// BUS HEAD LOGIN OTP
// ============================================================

// export const sendBusHeadLoginOtp = (credentials) =>
//   post("/api/auth/bus-head/login", credentials);

export const sendBusHeadLoginOtp = (credentials) =>
  post("/api/auth/bus-head/login", {
    ...credentials,
    ...(Capacitor.isNativePlatform()
      ? { universityId: schoolConfig.universityId }
      : {}),
  });

// ============================================================
// VERIFY BUS HEAD OTP
// ============================================================

export const verifyBusHeadLoginOtp = (data) =>
  post("/api/auth/bus-head/verify-otp", data);
