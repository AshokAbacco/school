import { Routes, Route, Navigate } from "react-router-dom";

import PageLayout from "./components/PageLayout";

import Dashboard from "./dashboard/Dashboard";
import Profile from "./pages/Profile/Profile";
import Attendance from "./pages/Attendance/Attendance";
import SyllabusProgress from "./pages/SyllabusProgress/SyllabusProgress";
import Marks from './pages/Marksresults/Marks';       // ← added
import Timetable from "./pages/Timetable/Timetable";
import Activities from "./pages/Activities/Activities";
import Certificates from "./pages/Certificates/Certificates";
import ParentChatPage from "./pages/chat/ParentChatPage";
import ParentHolidayPage from "./pages/holidays/HolidayPage";
import TutorialRecommendations from "./pages/TutorialRecommendations/TutorialRecommendations";


// import CertificatesUploadPage from "../teacher/pages/Certificates/CertificatesUploadPage";

import FeesAndPayments from "./pages/FeesAndPayments/FeesAndPayments";

const ParentRoutes = () => {
  return (
    <Routes>
      <Route element={<PageLayout />}>

        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="syllabus-progress" element={<SyllabusProgress />} />
        <Route path="marks" element={<Marks />} />          {/* ← added */}
        <Route path="timetable" element={<Timetable />} />
        <Route path="activities" element={<Activities />} />
        <Route path="certificates" element={<Certificates />} />
        {/* <Route path="certificates" element={<CertificatesUploadPage />} /> */}

        <Route path="fees-payments" element={<FeesAndPayments />} />
        <Route path="chat" element={<ParentChatPage />} />
        <Route path="holidays" element={<ParentHolidayPage />} />
        <Route path="tutorial-recommendations" element={<TutorialRecommendations />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />

      </Route>
    </Routes>
  );
};

export default ParentRoutes;