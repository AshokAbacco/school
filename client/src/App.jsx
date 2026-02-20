import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { getAuth } from "./auth/storage";
import Login from "./auth/Login";
import Register from "./auth/Register";
import { useState } from "react";

import AdminRoutes from "./admin/Routes";
import StudentRoutes from "./student/Routes";
import SuperAdminRoutes from "./superAdmin/Routes";
import TeacherRoutes from "./teacher/Routes";
import ParentRoutes from "./parent/Routes";
import FinanceRoutes from "./finance/Routes";

function App() {

  const [setView] = useState("login");
  const [auth, setAuth] = useState(getAuth());


  return (
    <Router>
      <Routes>

        {/* ───────── NOT LOGGED IN ───────── */}
        {!auth && (
          <>
            <Route
              path="/login"
              element={
                <Login
                  onLoginSuccess={(data) => setAuth(data)}   // 🔥 IMPORTANT
                  onSwitchToRegister={() => setView("register")}
                />
              }
            />

            <Route
              path="/register"
              element={<Register onSwitchToLogin={() => setView("login")} />}
            />

            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}

        {/* ───────── ROLE BASED ROUTING ───────── */}

        {auth?.user?.role === "PARENT" && (
          <Route path="/parent/*" element={<ParentRoutes />} />
        )}

        {auth?.user?.role === "STUDENT" && (
          <Route path="/student/*" element={<StudentRoutes />} />
        )}

        {auth?.user?.role === "ADMIN" && (
          <Route path="/admin/*" element={<AdminRoutes />} />
        )}

        {auth?.user?.role === "TEACHER" && (
          <Route path="/teacher/*" element={<TeacherRoutes />} />
        )}

        {auth?.user?.role === "SUPER_ADMIN" && (
          <Route path="/superAdmin/*" element={<SuperAdminRoutes />} />
        )}

  if (auth.accountType === "staff") {
    if (auth.role === "ADMIN") return <AdminRoutes />;
    if (auth.role === "TEACHER") return <TeacherRoutes />;
    if (auth.role === "FINANCE") return <FinanceRoutes />;
    if (auth.role === "SUPER_ADMIN") return <SuperAdminRoutes />;
  }


  // fallback — clear bad auth and show login
  return <Login onSwitchToRegister={() => setView("register")} />;
}

export default App;
