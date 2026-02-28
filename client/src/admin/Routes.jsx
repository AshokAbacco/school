// client/src/admin/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import FinanceList from "./pages/finance/FinanceList";
import MeetingsList from "./pages/meeting/MeetingsList";
import CurriculumList from "./pages/curriculum/CurriculumList";
import Settings from "./pages/settings/Settings";

// ── NEW imports ───────────────────────────────────────────────────────────────
import StreamsPage from "./pages/classes/StreamsPage";
import CoursesPage from "./pages/classes/CoursesPage";
import PromotionPage from "./pages/classes/PromotionPage";
import ReadmissionPage from "./pages/classes/ReadmissionPage";

function AdminRoutes() {
  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Students */}
      <Route path="/students" element={<StudentsList />} />
      <Route path="/students/add" element={<AddStudents />} />
      <Route path="/students/:id" element={<StudentView />} />
      <Route path="/students/:id/edit" element={<AddStudents />} />

      {/* Teachers */}
      <Route path="/teachers" element={<TeachersPage />} />

      {/* Classes */}
      <Route path="/classes" element={<ClassesList />} />

      {/* ① School Timings */}
      <Route path="/classes/timings" element={<SchoolTimingsPage />} />

      {/* ② Subjects */}
      <Route path="/classes/subjects" element={<SubjectsPage />} />

      {/* ③ Create Sections */}
      <Route path="/classes/sections" element={<CreateSectionsPage />} />

      {/* ④ Timetable Builder */}
      <Route path="/classes/timetable" element={<TimetablePage />} />

      {/* ⑤ View timetable for a specific class */}
      <Route
        path="/classes/:id/timetable"
        element={<ClassTimetableViewPage />}
      />

      {/* ── NEW: Streams (PUC only) ─────────────────────────────────────── */}
      <Route path="/classes/streams" element={<StreamsPage />} />

      {/* ── NEW: Courses + Branches (Degree / Diploma / PG) ────────────── */}
      <Route path="/classes/courses" element={<CoursesPage />} />

      {/* ── NEW: Student Promotion ──────────────────────────────────────── */}
      <Route path="/classes/promotion" element={<PromotionPage />} />

      {/* ── NEW: Re-admission (School type only) ────────────────────────── */}
      <Route path="/classes/readmission" element={<ReadmissionPage />} />

      {/* Other */}
      <Route path="/attendance" element={<AttendanceList />} />
      <Route path="/exams" element={<ExamsList />} />
      <Route path="/finance" element={<FinanceList />} />
      <Route path="/meetings" element={<MeetingsList />} />
      <Route path="/curriculum" element={<CurriculumList />} />
      <Route path="/settings/" element={<Settings />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AdminRoutes;
