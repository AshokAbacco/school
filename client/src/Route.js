import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import Login from "./auth/Login"; // adjust if different path



export default function AppRoutes() {

  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* ✅ Login Page */}
        <Route path="/login" element={<Login />} />

      </Routes>
    </BrowserRouter>
  );
}