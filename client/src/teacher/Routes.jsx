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
import Result from "./pages/result/Result"
import CertificatesUploadPage from "./pages/Certificates/CertificatesUploadPage";
import AssignmentsPage from "./pages/assignments/AssignmentsPage";
import TeacherChatPage from "./pages/chat/TeacherChatPage";
import TeacherHolidayPage from "./pages/holidays/HolidayPage";
import TeacherProfilePage from "./pages/profile/profile.jsx";
import SubmissionsViewPage from "./pages/assignments/SubmissionsViewPage";
function TeacherRoutes() {
  return (
    <PageLayout>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"      element={<Dashboard />} />
        <Route path="attendance"     element={<Attendance />} />
        <Route path="curriculum"     element={<CurriculumPage />} />
        <Route path="holidays" element={<TeacherHolidayPage />} />
        <Route path="activities"     element={<ActivitiesAndEvents />} />
        <Route path="awards"         element={<AwardsPage />} />
        <Route path="online-classes" element={<OnlineClassesPage />} />
        <Route path="timetable"      element={<TimetablePage />} />
        <Route path="results"        element={<Result />} />
        <Route path="certificates" element={<CertificatesUploadPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="chat" element={<TeacherChatPage />} />
        <Route path="profile" element={<TeacherProfilePage />} />
        <Route path="assignments/:assignmentId/submissions" element={<SubmissionsViewPage />} />
        <Route path="*"              element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PageLayout>
  );
}

export default TeacherRoutes;