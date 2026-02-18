// client/src/auth/storage.js

export const saveAuth = (data) => {
  // New API returns: { success: true, token, user: { role, userType, school, ... } }
  // We normalize it so App.jsx reads consistently
  const normalized = {
    token: data.token,
    accountType: data.user?.userType, // "staff" | "student" | "parent" | "superAdmin"
    role: data.user?.role, // "ADMIN" | "TEACHER" | "SUPER_ADMIN" | "STUDENT" | "PARENT"
    user: data.user,
  };
  localStorage.setItem("auth", JSON.stringify(normalized));
};

export const getAuth = () => {
  const raw = localStorage.getItem("auth");
  return raw ? JSON.parse(raw) : null;
};

export const getToken = () => {
  const auth = getAuth();
  return auth?.token || null;
};

export const getUser = () => {
  const auth = getAuth();
  return auth?.user || null;
};

export const clearAuth = () => {
  localStorage.removeItem("auth");
};

export const isLoggedIn = () => !!getToken();
