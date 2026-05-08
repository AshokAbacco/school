// app.jsx
import "./App.css";
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { connectSocket } from "./socket";

import { getAuth } from "./auth/storage";
import Login from "./auth/Login";
import Register from "./auth/Register";
import AdminRoutes from "./admin/Routes";
import StudentRoutes from "./student/Routes";
import SuperAdminRoutes from "./superAdmin/Routes";
import TeacherRoutes from "./teacher/Routes";
import ParentRoutes from "./parent/Routes";
import FinanceRoutes from "./finance/Routes";
import LandingPage from "./pages/LandingPage";
   

import PublicLayout from "./LandingPages/components/PublicLayout";
import Home from "./LandingPages/Home";
import Pricing from "./LandingPages/pricing/Pricing";
import About from "./LandingPages/About";
import Contact from "./LandingPages/ContactUs";
import ScrollToTop from "./components/ScrollToTop";
import ForgotPassword from "./auth/ForgotPassword";
import VerifyOtp from "./auth/VerifyOtp";
import ResetPassword from "./auth/ResetPassword";
import Terms from "./LandingPages/components/terms";
import FAQ from "./LandingPages/components/FAQ";
import PrivacyPolicy from "./LandingPages/components/PrivacyPolicy";
function App() {
  const auth = getAuth();

useEffect(() => {
  const userId = auth?.user?.id;

  if (!userId) return;

  const socket = connectSocket(userId);

  return () => {
    socket?.disconnect();
  };
}, [auth?.user?.id]); // ✅ IMPORTANT CHANGE
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <ScrollToTop /> {/* 🔥 NEW: Scroll to top on route change */}
      <Routes>
        {/* PUBLIC WEBSITE */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

        </Route>
        {/* PUBLIC */}
        {/* <Route path="/" element={<Navigate to="/login" />} />
       */}
        <Route path="/register" element={<Register />} />

        {/* PRIVATE */}
        {auth?.accountType === "staff" && auth?.role === "ADMIN" && (
          <Route path="/admin/*" element={<AdminRoutes />} />
        )}
        {auth?.accountType === "staff" && auth?.role === "TEACHER" && (
          <Route path="/teacher/*" element={<TeacherRoutes />} />
        )}
        {auth?.accountType === "staff" && auth?.role === "FINANCE" && (
          <Route path="/finance/*" element={<FinanceRoutes />} />
        )}
        {auth?.accountType === "student" && (
          <Route path="/student/*" element={<StudentRoutes />} />
        )}
        {auth?.accountType === "parent" && (
          <Route path="/parent/*" element={<ParentRoutes />} />
        )}
        {(auth?.accountType === "superAdmin" || auth?.role === "SUPER_ADMIN") && (
          <Route path="/superAdmin/*" element={<SuperAdminRoutes />} />
        )}

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                !auth ? "/login"
                  : auth.accountType === "staff" && auth.role === "ADMIN" ? "/admin/dashboard"
                    : auth.accountType === "staff" && auth.role === "TEACHER" ? "/teacher/dashboard"
                      : auth.accountType === "staff" && auth.role === "FINANCE" ? "/finance/dashboard"
                        : auth.accountType === "student" ? "/student/dashboard"
                          : auth.accountType === "parent" ? "/parent/dashboard"
                            : (auth.accountType === "superAdmin" || auth.role === "SUPER_ADMIN") ? "/superAdmin/dashboard"
                              : "/login"
              }
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;