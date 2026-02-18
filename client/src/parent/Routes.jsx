import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import PageLayout from "./components/PageLayout";

import Dashboard from "./dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import Attendance from "./pages/Attendance/Attendance";
import MarksResults from "./pages/Marksresults/Marksresults";
import Timetable from "./pages/Timetable/Timetable";
import Activities from "./pages/Activities/Activities";
import Certificates from "./pages/Certificates/Certificates";
import Meeting from "./pages/Meeting/Meeting";

const ParentRoutes = () => {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/marks" element={<MarksResults />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/meeting" element={<Meeting />} />
      </Route>
    </Routes>
  );
};

export default ParentRoutes;
