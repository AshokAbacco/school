// client/src/auth/storage.js

// export const saveAuth = (data) => {
//   // New API returns: { success: true, token, user: { role, userType, school, ... } }
//   // We normalize it so App.jsx reads consistently
//   const normalized = {
//     token: data.token,
//     accountType: data.user?.userType, // "staff" | "student" | "parent" | "superAdmin"
//     role: data.user?.role, // "ADMIN" | "TEACHER" | "SUPER_ADMIN" | "STUDENT" | "PARENT"
//     user: data.user,
//   };
//   localStorage.setItem("auth", JSON.stringify(normalized));
// };
export const saveAuth = (data) => {
  const role = data.user?.role;

  let accountType = data.user?.userType;

  if (role === "SUPER_ADMIN") accountType = "superAdmin";
  if (role === "ADMIN" || role === "TEACHER" || role === "FINANCE") {
    accountType = "staff";
  }
  if (role === "STUDENT") accountType = "student";
  if (role === "PARENT") accountType = "parent";

  const normalizedUser = {
    ...data.user,

    // ✅ IMPORTANT
    planName: data.user?.planName || "Silver",
  };

  const normalized = {
    token: data.token,
    accountType,
    role,
    user: normalizedUser,
  };

  // ✅ SAVE BOTH
  localStorage.setItem("auth", JSON.stringify(normalized));
  localStorage.setItem("user", JSON.stringify(normalizedUser));

  console.log("SAVED USER =", normalizedUser);
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
