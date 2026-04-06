// src/admin/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "./components/PageLayout";

import Dashboard from "./dashboard/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import AddStudents from "./pages/students/AddStudents";
import StudentView from "./pages/students/StudentView";
import TeachersPage from "./pages/teachers/TeachersPage";
import ClassesList from "./pages/classes/ClassesList";
import SchoolTimingsPage from "./pages/classes/SchoolTimingsPage";
import SubjectsPage from "./pages/classes/SubjectsPage";
import CreateSectionsPage from "./pages/classes/CreateSectionsPage";
import TimetablePage from "./pages/classes/TimetablePage";
import ClassTimetableViewPage from "./pages/classes/ClassTimetableViewPage";
import AttendanceList from "./pages/attendances/AttendanceList";
import ExamsList from "./pages/Exams/ExamsList";
import MeetingsList from "./pages/meeting/MeetingsList";
import CurriculumList from "./pages/curriculum/CurriculumList";
import Gallery from "./pages/gallery/Gallery.jsx";
import HolidayList from "./pages/holidays/HolidayList.jsx";
import Settings from "./pages/settings/Settings";
import StreamsPage from "./pages/classes/StreamsPage";
import CoursesPage from "./pages/classes/CoursesPage";
import PromotionPage from "./pages/classes/PromotionPage";
import ReadmissionPage from "./pages/classes/ReadmissionPage";
import AdminAwardsPage from "./pages/awardspage/Adminawardspage.jsx";
import ExamsPage from "./pages/Exams/Examspage.jsx";
import ActivitiesList from "./pages/activities/ActivitiesList";
import StaffList from "./pages/Staff/StaffList.jsx";
import TransportPage from "./pages/transport/TransportPage";
function AdminRoutes() {
  return (
    <PageLayout>
      <Routes>
        {/* /admin/ → /admin/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard"             element={<Dashboard />} />

        {/* Students */}
        <Route path="students"              element={<StudentsList />} />
        <Route path="students/add"          element={<AddStudents />} />
        <Route path="students/:id"          element={<StudentView />} />
        <Route path="students/:id/edit"     element={<AddStudents />} />

        {/* Teachers */}
        <Route path="teachers"              element={<TeachersPage />} />

        {/* Classes */}
        <Route path="classes"               element={<ClassesList />} />
        <Route path="classes/timings"       element={<SchoolTimingsPage />} />
        <Route path="classes/subjects"      element={<SubjectsPage />} />
        <Route path="classes/sections"      element={<CreateSectionsPage />} />
        <Route path="classes/timetable"     element={<TimetablePage />} />
        <Route path="classes/:id/timetable" element={<ClassTimetableViewPage />} />
        <Route path="classes/streams"       element={<StreamsPage />} />
        <Route path="classes/courses"       element={<CoursesPage />} />
        <Route path="classes/promotion"     element={<PromotionPage />} />
        <Route path="classes/readmission"   element={<ReadmissionPage />} />
        {/* Staff */}
        <Route path="/staff"                 element={<StaffList />} />
        {/* <Route path="staff/add"             element={<StaffAdd />} /> */}

        {/* Other */}
        <Route path="attendance"            element={<AttendanceList />} />
        <Route path="exams"                 element={<ExamsList />} />
        <Route path="exams-page"            element={<ExamsPage />} />
        <Route path="activities"            element={<ActivitiesList />} />
        <Route path="meetings"              element={<MeetingsList />} />
        <Route path="curriculum"            element={<CurriculumList />} />
        <Route path="gallery"               element={<Gallery />} />
        <Route path="holidays"              element={<HolidayList />} />
        <Route path="awards"                element={<AdminAwardsPage />} />
        <Route path="transport"             element={<TransportPage />} />
        <Route path="settings"              element={<Settings />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PageLayout>
  );
}

export default AdminRoutes;