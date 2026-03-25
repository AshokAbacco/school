// client/src/teacher/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "./components/PageLayout";

import Dashboard from "./dashboard/Dashboard";
import Attendance from "./pages/Attendance/Attendance";
import CurriculumPage from "./pages/curriculum/CurriculumPage";
import ActivitiesAndEvents from "./pages/Activities/index";
import AwardsPage from "./pages/awardspage/Awardspage";
import OnlineClassesPage from "./pages/onlineClasses/OnlineClassesPage";
import TimetablePage from "./pages/timetable/TimetablePage";
import CertificatesUploadPage from "./pages/Certificates/CertificatesUploadPage";


function TeacherRoutes() {
  return (
    <PageLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="attendance"     element={<Attendance />} />
        <Route path="curriculum"     element={<CurriculumPage />} />
        <Route path="activities"     element={<ActivitiesAndEvents />} />
        <Route path="awards"         element={<AwardsPage />} />
        <Route path="online-classes" element={<OnlineClassesPage />} />
        <Route path="timetable"      element={<TimetablePage />} />
        <Route path="*"              element={<Navigate to="dashboard" replace />} />
        <Route path="certificates" element={<CertificatesUploadPage />} />
      </Routes>
    </PageLayout>
  );
}

export default TeacherRoutes;