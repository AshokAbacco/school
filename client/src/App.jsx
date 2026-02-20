import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { useState } from "react";

import { getAuth } from "./auth/storage";
import Login from "./auth/Login";
import Register from "./auth/Register";

import AdminRoutes from "./admin/Routes";
import StudentRoutes from "./student/Routes";
import SuperAdminRoutes from "./superAdmin/Routes";
import TeacherRoutes from "./teacher/Routes";
import ParentRoutes from "./parent/Routes";
import FinanceRoutes from "./finance/Routes";

function App() {
  const [view, setView] = useState("login");
  const [auth, setAuth] = useState(getAuth());

  // ───────── NOT LOGGED IN ─────────
  if (!auth) {
    return view === "login" ? (
      <Login
        onLoginSuccess={(data) => setAuth(data)}
        onSwitchToRegister={() => setView("register")}
      />
    ) : (
      <Register onSwitchToLogin={() => setView("login")} />
    );
  }

  // ───────── STAFF BASED ROUTING ─────────
  if (auth.accountType === "staff") {
    if (auth.role === "ADMIN") return <AdminRoutes />;
    if (auth.role === "TEACHER") return <TeacherRoutes />;
    if (auth.role === "FINANCE") return <FinanceRoutes />;
    if (auth.role === "SUPER_ADMIN") return <SuperAdminRoutes />;
  }

  // ───────── STUDENT ─────────
  if (auth.accountType === "student") {
    return <StudentRoutes />;
  }

  // ───────── PARENT ─────────
  if (auth.accountType === "parent") {
    return <ParentRoutes />;
  }

  // ───────── FALLBACK ─────────
  return (
    <Login
      onLoginSuccess={(data) => setAuth(data)}
      onSwitchToRegister={() => setView("register")}
    />
  );
}

export default App;