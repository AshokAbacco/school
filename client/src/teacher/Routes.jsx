// client/src/teacher/Routes.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import Attendance from "./pages/Attendance/Attendance";
import CurriculumPage from "./pages/curriculum/CurriculumPage";
import ActivitiesAndEvents from "./pages/Activities/index";
import AwardsPage from "./pages/awardspage/Awardspage";

function TeachersRoutes() {
  return (
    <Routes>
      {/* Dashboard Route */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/attendance" element={<Attendance />} />

      {/* Curriculum Route */}
      <Route path="/curriculum" element={<CurriculumPage />} />
     <Route path="/activities" element={<ActivitiesAndEvents />} />
     <Route path="/teacher/awards" element={<AwardsPage />} />

      {/* Redirect any unknown route to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default TeachersRoutes;
