// client/src/App.jsx
import "./App.css";
import { getAuth } from "./auth/storage";
import Login from "./auth/Login";
import Register from "./auth/Register";
import { useState } from "react";

import AdminRoutes from "./admin/Routes";
import StudentRoutes from "./student/Routes";
import SuperAdminRoutes from "./superAdmin/Routes";
import TeacherRoutes from "./teacher/Routes";
import ParentRoutes from "./parent/Routes";

function App() {
  const [view, setView] = useState("login"); // "login" | "register"
  const auth = getAuth();

  // ── Not logged in → show Login or Register ──────────────────
  if (!auth) {
    if (view === "register") {
      return <Register onSwitchToLogin={() => setView("login")} />;
    }
    return <Login onSwitchToRegister={() => setView("register")} />;
  }

  // ── Logged in → route by accountType + role ─────────────────

  if (auth.accountType === "student") return <StudentRoutes />;

  if (auth.accountType === "parent") return <ParentRoutes />;

  if (auth.accountType === "superAdmin") return <SuperAdminRoutes />;

  if (auth.accountType === "staff") {
    if (auth.role === "ADMIN") return <AdminRoutes />;
    if (auth.role === "TEACHER") return <TeacherRoutes />;
    // SUPER_ADMIN role inside staff (legacy fallback)
    if (auth.role === "SUPER_ADMIN") return <SuperAdminRoutes />;
  }

  // fallback — clear bad auth and show login
  return <Login onSwitchToRegister={() => setView("register")} />;
}

export default App;
