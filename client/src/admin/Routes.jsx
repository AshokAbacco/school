// client/src/admin/Routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import AddStudents from "./pages/students/AddStudents";
import StudentView from "./pages/students/StudentView";
import TeachersPage from "./pages/teachers/TeachersPage";
import ClassesList from "./pages/classes/ClassesList";
import ClassesAndTimetable from "./pages/classes/ClassesAndTimetable";
import ClassTimetableView from "./pages/classes/ClassTimetableView";
import AttendanceList from "./pages/attendances/AttendanceList";
import ExamsList from "./pages/Exams/ExamsList";
import FinanceList from "./pages/finance/FinanceList";
import MeetingsList from "./pages/meeting/MeetingsList";
import CurriculumList from "./pages/curriculum/CurriculumList";

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
      <Route path="/classes/setup" element={<ClassesAndTimetable />} />
      {/* Class-specific timetable view (Eye button) */}
      <Route path="/classes/:id/timetable" element={<ClassTimetableView />} />
      {/* Other */}
      <Route path="/attendance" element={<AttendanceList />} />
      <Route path="/exams" element={<ExamsList />} />
      <Route path="/finance" element={<FinanceList />} />
      <Route path="/meetings" element={<MeetingsList />} />
      <Route path="/curriculum" element={<CurriculumList />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AdminRoutes;
