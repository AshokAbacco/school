// app.jsx
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
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
  const auth = getAuth();

  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PRIVATE */}
      {auth?.accountType === "staff" && auth?.role === "ADMIN" && (
        <Route path="/admin/*" element={<AdminRoutes />} />
      )}
      {auth?.accountType === "staff" && auth?.role === "TEACHER" && (
        <Route path="/teacher/*" element={<TeacherRoutes />} />
      )}
      {auth?.accountType === "staff" && auth?.role === "FINANCE" && (
        <Route path="/finance/*" element={<FinanceRoutes />} />
      )}
      {auth?.accountType === "student" && (
        <Route path="/student/*" element={<StudentRoutes />} />
      )}
      {auth?.accountType === "parent" && (
        <Route path="/parent/*" element={<ParentRoutes />} />
      )}
      {(auth?.accountType === "superAdmin" || auth?.role === "SUPER_ADMIN") && (
        <Route path="/superAdmin/*" element={<SuperAdminRoutes />} />
      )}

      {/* FALLBACK */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              !auth ? "/login"
              : auth.accountType === "staff" && auth.role === "ADMIN" ? "/admin/dashboard"
              : auth.accountType === "staff" && auth.role === "TEACHER" ? "/teacher/dashboard"
              : auth.accountType === "staff" && auth.role === "FINANCE" ? "/finance/dashboard"
              : auth.accountType === "student" ? "/student/dashboard"
              : auth.accountType === "parent" ? "/parent/dashboard"
              : (auth.accountType === "superAdmin" || auth.role === "SUPER_ADMIN") ? "/superAdmin/dashboard"
              : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;