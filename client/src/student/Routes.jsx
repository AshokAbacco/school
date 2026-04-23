// client/src/student/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "./components/PageLayout";

import Dashboard from "./dashboard/Dashboard";
import Profile from "./pages/profile/profile.jsx";
import Attendance from "./pages/attendance/Attendance";
import Marks from "./pages/marks/Marks";
import TimeTable from "./pages/TimeTable/TimeTable";
import ActivitiesPage from "./pages/Activities/ActivitiesPage";
// import CertificatesPage from "./pages/Certificates/CertificatesPage";
import OnlineClassesPage from "./pages/onlineClasses/OnlineClassesPage";
import StudentCertificatesPage from "./pages/Certificates/StudentCertificatesPage";
import HomeworkPage  from "./pages/Homework/HomeworkPage.jsx";
import StudentHolidayPage from "./pages/holidays/HolidayPage";


function StudentRoutes() {        // ← fixed: was named "App"
  return (
    <PageLayout>                  {/* ← added PageLayout wrapper */}
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"       element={<Dashboard />} />
        <Route path="profile"         element={<Profile />} />
        <Route path="attendance"      element={<Attendance />} />
        <Route path="marks"           element={<Marks />} />
        <Route path="time-table"      element={<TimeTable />} />
        <Route path="activites"       element={<ActivitiesPage />} />
        {/* <Route path="certicates"      element={<CertificatesPage />} /> */}
        <Route path="my-certificates" element={<StudentCertificatesPage />} />
        <Route path="online-classes"  element={<OnlineClassesPage />} />
        <Route path="homework" element={<HomeworkPage />} />
        <Route path="holidays" element={<StudentHolidayPage />} />
        <Route path="*"               element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PageLayout>
  );
}

export default StudentRoutes;