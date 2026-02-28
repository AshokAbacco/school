//client\src\teacher\Routes.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import Attendance from "./pages/Attendance/Attendance";

function TeachersRoutes() {
  return (
    <Routes>
      {/* Dashboard Route */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/attendance" element={<Attendance />} />

      {/* Students Routes */}

      {/* Students Routes */}

      {/* Redirect any unknown route to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default TeachersRoutes;
