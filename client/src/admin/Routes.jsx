import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import AddStudents from "./pages/students/AddStudents";
import TeachersPage from "./pages/teachers/TeachersPage";
import ClassesList from "./pages/classes/ClassesList";
import AttendanceList from "./pages/attendances/AttendanceList";
import ExamsList from "./pages/Exams/ExamsList";
import FinanceList from "./pages/finance/FinanceList";
import MeetingsList from "./pages/meeting/MeetingsList";
import CurriculumList from "./pages/curriculum/CurriculumList";
function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard Route */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Students Routes */}
        <Route path="/students" element={<StudentsList />} />
        <Route path="/students/add" element={<AddStudents />} />
        <Route path="/students/:id"      element={<StudentView />} />
        <Route path="/students/:id/edit" element={<AddStudents />} />

        {/* Teachers routes */}
        <Route path="/teachers" element={<TeachersPage />} />
        {/* Classes Realted routes*/}
        <Route path="/classes" element={<ClassesList />} />
        {/* Attendance Realted routes*/}
        <Route path="/attendance" element={<AttendanceList />} />
        <Route path="/exams" element={<ExamsList />} />
        <Route path="/finance" element={<FinanceList />} />
        <Route path="/meetings" element={<MeetingsList />} />
        <Route path="/curriculum" element={<CurriculumList />} />

        {/* Redirect any unknown route to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
