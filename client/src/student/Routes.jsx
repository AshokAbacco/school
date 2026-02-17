import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './dashboard/Dashboard';
import Profile from './pages/profile';
import Attendance from './pages/attendance/Attendance';
import Marks from './pages/marks/Marks';
import TimeTable from './pages/TimeTable/TimeTable';
import ActivitiesPage from './pages/Activities/ActivitiesPage';
import CertificatesPage from './pages/Certificates/CertificatesPage';


function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard Route */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/time-table" element={<TimeTable />} />
        <Route path="/activites" element={<ActivitiesPage />} />
        <Route path="/certicates" element={<CertificatesPage />} />
        
        
        {/* Redirect any unknown route to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
