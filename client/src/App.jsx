// App.jsx
import "./App.css";
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { connectSocket } from "./socket";

import { getAuth } from "./auth/storage";

// Auth
import Login from "./auth/Login";
import AndroidLogin from "./auth/AndroidLogin";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import VerifyOtp from "./auth/VerifyOtp";
import ResetPassword from "./auth/ResetPassword";

// Private Routes
import AdminRoutes from "./admin/Routes";
import StudentRoutes from "./student/Routes";
import SuperAdminRoutes from "./superAdmin/Routes";
import TeacherRoutes from "./teacher/Routes";
import ParentRoutes from "./parent/Routes";
import FinanceRoutes from "./finance/Routes";
import BusHeadRoutes from "./busHead/routes/BusHeadRoutes";

// Website / Landing Pages
import PublicLayout from "./LandingPages/components/PublicLayout";
import Home from "./LandingPages/Home";
import Pricing from "./LandingPages/pricing/Pricing";
import About from "./LandingPages/About";
import Contact from "./LandingPages/ContactUs";
import Terms from "./LandingPages/components/terms";
import FAQ from "./LandingPages/components/FAQ";
import PrivacyPolicy from "./LandingPages/components/PrivacyPolicy";

import ScrollToTop from "./components/ScrollToTop";

function App() {
  const auth = getAuth();

  // Detect whether the app is running inside
  // Capacitor Android/iOS or normal web browser.
  const isApp = Capacitor.isNativePlatform();

  useEffect(() => {
    const userId = auth?.user?.id;

    if (!userId) return;

    let socketInstance;

    try {
      socketInstance = connectSocket(userId);
    } catch (error) {
      console.log("Socket connection failed:", error);
    }

    return () => {
      if (socketInstance?.connected) {
        socketInstance.disconnect();
      }
    };
  }, [auth?.user?.id]);

  // Decide where a logged-in user should go
  const getDashboardPath = () => {
    if (!auth) {
      return "/login";
    }

    if (auth.accountType === "staff" && auth.role === "ADMIN") {
      return "/admin/dashboard";
    }

    if (auth.accountType === "staff" && auth.role === "TEACHER") {
      return "/teacher/dashboard";
    }

    if (auth.accountType === "staff" && auth.role === "FINANCE") {
      return "/finance/dashboard";
    }

    if (auth.accountType === "student") {
      return "/student/dashboard";
    }

    if (auth.accountType === "parent") {
      return "/parent/dashboard";
    }

    if (auth.accountType === "superAdmin" || auth.role === "SUPER_ADMIN") {
      return "/superAdmin/dashboard";
    }

    if (auth.accountType === "busHead") {
      return "/busHead/dashboard";
    }

    return "/login";
  };

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <ScrollToTop />

      <Routes>
        {/* =====================================================
            WEBSITE ONLY - LANDING PAGES
            These routes are available only on normal website.
            They will NOT be used as the APK home page.
        ====================================================== */}

        {!isApp && (
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/pricing" element={<Pricing />} />

            <Route path="/about" element={<About />} />

            <Route path="/contact" element={<Contact />} />

            <Route path="/faq" element={<FAQ />} />

            <Route path="/terms" element={<Terms />} />

            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Route>
        )}

        {/* =====================================================
            AUTHENTICATION PAGES
            Available on both website and APK.
        ====================================================== */}

        {isApp ? (
          <Route path="/login" element={<AndroidLogin />} />
        ) : (
          <Route path="/login" element={<Login />} />
        )}

        <Route path="/register" element={<Register />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/verify-otp" element={<VerifyOtp />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* =====================================================
            APK ROOT
            Android APK opening "/" will go to:
            
            - Login if user is not logged in
            - Dashboard if user is already logged in
        ====================================================== */}

        {isApp && (
          <Route
            path="/"
            element={<Navigate to={getDashboardPath()} replace />}
          />
        )}

        {/* =====================================================
            PRIVATE ROUTES
        ====================================================== */}

        {/* ADMIN */}
        {auth?.accountType === "staff" && auth?.role === "ADMIN" && (
          <Route path="/admin/*" element={<AdminRoutes />} />
        )}

        {/* TEACHER */}
        {auth?.accountType === "staff" && auth?.role === "TEACHER" && (
          <Route path="/teacher/*" element={<TeacherRoutes />} />
        )}

        {/* FINANCE */}
        {auth?.accountType === "staff" && auth?.role === "FINANCE" && (
          <Route path="/finance/*" element={<FinanceRoutes />} />
        )}

        {/* STUDENT */}
        {auth?.accountType === "student" && (
          <Route path="/student/*" element={<StudentRoutes />} />
        )}

        {/* PARENT */}
        {auth?.accountType === "parent" && (
          <Route path="/parent/*" element={<ParentRoutes />} />
        )}

        {/* SUPER ADMIN */}
        {(auth?.accountType === "superAdmin" ||
          auth?.role === "SUPER_ADMIN") && (
          <Route path="/superAdmin/*" element={<SuperAdminRoutes />} />
        )}

        {/* BUS HEAD */}
        {auth?.accountType === "busHead" && (
          <Route path="/busHead/*" element={<BusHeadRoutes />} />
        )}

        {/* =====================================================
            FALLBACK
        ====================================================== */}

        <Route
          path="*"
          element={<Navigate to={getDashboardPath()} replace />}
        />
      </Routes>
    </>
  );
}

export default App;
