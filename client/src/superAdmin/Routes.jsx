import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import StudentsList from "./pages/students/StudentsList";
import Schools from "./pages/schools/Schools";
function App() {
  return (
    <Routes>
      {/* Dashboard Route */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/students" element={<StudentsList />} />
      <Route path="/schools" element={<Schools />} />

      {/* Students Routes */}

      {/* Redirect any unknown route to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
