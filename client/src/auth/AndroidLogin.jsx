// client/src/auth/AndroidLogin.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendLoginOtp,
  verifyLoginOtp,
  sendBusHeadLoginOtp,
  verifyBusHeadLoginOtp,
} from "./api";
import { saveAuth } from "./storage";

import {
  GraduationCap,
  Users,
  ShieldCheck,
  Building2,
  Phone,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  BarChart3,
  UserCog,
  ArrowRight,
  Sparkles,
  Bus,
  MapPin,
  ChevronDown,
} from "lucide-react";

import schoolConfig from "../config/schoolConfig";

const FOUNDATION_LOGOS = {
  abacco: "/Logo/abacco.png",
  waseela: "/Logo/waseela.png",
  fazeelah: "/Logo/fazeelah.png",
};

const foundationLogo = FOUNDATION_LOGOS[schoolConfig.foundationKey];

const foundationShortName =
  schoolConfig.foundationName?.replace(/\s+Education Foundation$/i, "") ||
  schoolConfig.foundationName;

const REDIRECT = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  FINANCE: "/financer/dashboard",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
  SUPER_ADMIN: "/superAdmin/dashboard",
  BUS_HEAD: "/busHead/dashboard",
};

const STAFF_ROLES = [
  { label: "Admin", value: "admin", icon: UserCog },
  { label: "Teacher", value: "teacher", icon: BookOpen },
  { label: "Financer", value: "financer", icon: BarChart3 },
];

const TOP_TABS = [
  { label: "Staff", value: "staff", icon: Users },
  { label: "Student", value: "student", icon: GraduationCap },
  { label: "Parent", value: "parent", icon: Building2 },
  { label: "Super Admin", value: "superAdmin", icon: ShieldCheck },
  { label: "Bus Head", value: "busHead", icon: Bus },
];

const FEATURES = [
  {
    icon: Users,
    text: "Staff & Faculty Management",
    sub: "Streamline HR and academic workflows",
  },
  {
    icon: GraduationCap,
    text: "Student Academic Portal",
    sub: "Grades, attendance & schedules",
  },
  {
    icon: BarChart3,
    text: "Finance & Fee Tracking",
    sub: "Real-time financial oversight",
  },
];

export default function AndroidLogin() {
  const navigate = useNavigate();

  const [type, setType] = useState("staff");
  const [staffRole, setStaffRole] = useState("admin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [resolvedPhone, setResolvedPhone] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const resolveRole = () => {
    const staffRoleMap = {
      admin: "ADMIN",
      teacher: "TEACHER",
      financer: "FINANCE",
    };

    const roleMap = {
      superAdmin: "SUPER_ADMIN",
      student: "STUDENT",
      parent: "PARENT",
      busHead: "BUS_HEAD",
    };

    return type === "staff" ? staffRoleMap[staffRole] : roleMap[type];
  };

  const handleLogin = async () => {
    setError("");

    if (!phone || !password) {
      return setError("Please enter mobile number and password");
    }

    const isEmailInput = /\S+@\S+\.\S+/.test(phone.trim());

    if (!isEmailInput) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        return setError("Please enter a valid mobile number or email address");
      }
    }

    try {
      setLoading(true);

      if (type === "busHead") {
        const result = await sendBusHeadLoginOtp({
          phone,
          password,
          universityId: schoolConfig.universityId,
        });

        if (result?.otpRequired) {
          setShowOtp(true);
          setOtpMessage("OTP sent to your registered mobile number");
          setError("");
          setResolvedPhone(result.phone || phone);
          return;
        }

        setError("Login failed. Please try again.");
        return;
      }

      const result = await sendLoginOtp({
        phone,
        password,
        selectedRole: resolveRole(),
        universityId: schoolConfig.universityId,
      });

      if (result?.otpRequired) {
        setShowOtp(true);
        setOtpMessage("OTP sent to your registered mobile number");
        setError("");
        setResolvedPhone(result.phone || phone);
        return;
      }

      if (result?.token) {
        saveAuth(result);

        const role = result?.user?.role;
        if (!role) {
          setError("Login failed: role not found");
          return;
        }

        window.location.href = REDIRECT[role] || "/dashboard";
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");

    if (!otp) {
      return setError("Please enter OTP");
    }

    try {
      setLoading(true);

      if (type === "busHead") {
        const result = await verifyBusHeadLoginOtp({
          phone: resolvedPhone || phone,
          otp,
          universityId: schoolConfig.universityId,
        });

        saveAuth(result);
        window.location.href = REDIRECT.BUS_HEAD;
        return;
      }

      const result = await verifyLoginOtp({
        phone: resolvedPhone || phone,
        otp,
        universityId: schoolConfig.universityId,
      });

      saveAuth(result);

      const role = result?.user?.role;
      if (!role) {
        setError("Login failed: role not found");
        return;
      }

      window.location.href = REDIRECT[role] || "/dashboard";
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const isPhoneOnlyType = type === "busHead";

  // Find the selected role object to display its icon and label
  const activeStaffRole =
    STAFF_ROLES.find((r) => r.value === staffRole) || STAFF_ROLES[0];
  const ActiveStaffIcon = activeStaffRole.icon;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        html, body {
          width: 100%;
          height: 100%;
          background: #F5F5F7;
          overflow-x: hidden;
        }

        .ml-wrapper {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
        }

        .ml-ambient-bg {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: -1;
          pointer-events: none;
          background: #F5F5F7;
          overflow: hidden;
        }
        .ml-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s infinite ease-in-out alternate;
          transform: translate3d(0,0,0);
        }
        .ml-orb-1 {
          width: clamp(300px, 50vw, 600px);
          height: clamp(300px, 50vw, 600px);
          background: #d4e4fb;
          top: -10%; left: -10%;
        }
        .ml-orb-2 {
          width: clamp(350px, 60vw, 700px);
          height: clamp(350px, 60vw, 700px);
          background: #fdf2f8;
          bottom: -20%; right: -10%;
          animation-delay: -5s;
        }
        
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(5%, 10%) scale(1.1); }
        }

        .ml-main-layout {
          flex: 1 1 auto;
          display: flex;
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .ml-left-panel {
          flex: 1;
          display: none;
          flex-direction: column;
          justify-content: center;
          padding: clamp(24px, 5vw, 60px);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ml-left-panel.show {
          opacity: 1;
          transform: translateY(0);
        }

        @media (min-width: 1024px) {
          .ml-left-panel { display: flex; }
        }

        .ml-hero-text {
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          font-weight: 700;
          letter-spacing: -0.04em;
          color: #111827;
          line-height: 1.1;
          margin-bottom: 24px;
        }
        .ml-hero-subtext {
          font-size: 1.125rem;
          color: #6B7280;
          line-height: 1.6;
          max-width: 480px;
          margin-bottom: 48px;
        }

        .ml-features-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ml-feature-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .ml-feature-icon {
          width: 48px; height: 48px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3B82F6;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          flex-shrink: 0;
        }
        .ml-feature-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }
        .ml-feature-content p {
          font-size: 0.875rem;
          color: #6B7280;
        }

        .ml-right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: max(16px, env(safe-area-inset-top, 16px)) 16px 16px;
        }
        
        .ml-right-inner {
          width: 100%;
          max-width: 440px;
          margin: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ml-header {
          text-align: center;
          margin-bottom: clamp(16px, 3vh, 24px);
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
        }
        .ml-header.show {
          opacity: 1;
          transform: translateY(0);
        }

        .ml-logo-container {
          width: clamp(70px, 15vw, 80px);
          height: clamp(70px, 15vw, 80px);
          margin: 0 auto 12px;
          background: #ffffff;
          border-radius: clamp(16px, 4vw, 20px);
          padding: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ml-logo-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .ml-header h1 {
          font-size: clamp(1.35rem, 5vw, 1.6rem);
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
          line-height: 1.2;
        }
        .ml-header p {
          font-size: clamp(0.9rem, 3vw, 0.95rem);
          color: #4B5563;
          font-weight: 500;
          text-transform: capitalize;
        }

        .ml-glass-card {
          width: 100%;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: clamp(16px, 5vw, 24px);
          padding: clamp(20px, 5vw, 32px) clamp(16px, 4vw, 24px);
          box-shadow: 
            0 20px 40px -12px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255,255,255,0.4) inset;
          opacity: 0;
          transform: scale(0.98);
          transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
        }
        .ml-glass-card.show {
          opacity: 1;
          transform: scale(1);
        }

        .ml-field-group {
          margin-bottom: 16px;
          position: relative;
          width: 100%;
        }
        .ml-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .ml-segmented-control {
          display: flex;
          background: rgba(0, 0, 0, 0.05);
          padding: 3px;
          border-radius: 8px;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          gap: 2px;
        }
        .ml-segmented-control::-webkit-scrollbar { display: none; }
        
        .ml-segment-btn {
          flex: 1 0 auto;
          min-width: max(60px, 18%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 4px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #4B5563;
          font-size: clamp(0.65rem, 2vw, 0.75rem);
          font-weight: 600;
          transition: all 0.2s ease;
          text-align: center;
        }
        .ml-segment-btn.active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .ml-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .ml-icon-left {
          position: absolute;
          left: 14px;
          color: #6B7280;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ml-input {
          width: 100%;
          height: clamp(46px, 6vh, 50px);
          padding: 0 14px 0 42px;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          font-size: 0.95rem;
          color: #111827;
          transition: all 0.2s ease;
          outline: none;
          font-size: 16px;
        }
        .ml-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .ml-input::placeholder { 
          color: #6B7280;
          font-weight: 400;
        }

        .ml-icon-right {
          position: absolute;
          right: 12px;
          color: #6B7280;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .ml-icon-right:hover {
          background: rgba(0,0,0,0.05);
          color: #111827;
        }

        /* --- CUSTOM ANIMATED DROPDOWN --- */
        .ml-dropdown-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 9;
        }

        .ml-custom-select-container {
          position: relative;
          width: 100%;
        }

        .ml-custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-left: 42px;
          padding-right: 16px;
          cursor: pointer;
          user-select: none;
        }
        .ml-custom-select-trigger:active {
          transform: scale(0.99);
        }
        .ml-custom-select-trigger.open {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .ml-dropdown-chevron {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: #6B7280;
        }
        .ml-dropdown-chevron.rotate {
          transform: rotate(180deg);
        }

        .ml-custom-select-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 10px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08);
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 10;
          
          /* Animation setup */
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px) scale(0.98);
          transform-origin: top center;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ml-custom-select-menu.show {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        .ml-custom-select-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          color: #4B5563;
          transition: all 0.2s ease;
        }
        .ml-custom-select-option:hover, 
        .ml-custom-select-option:active {
          background: rgba(0,0,0,0.04);
          color: #111827;
        }
        .ml-custom-select-option.selected {
          background: rgba(59, 130, 246, 0.08);
          color: #3B82F6;
          font-weight: 600;
        }
        
        .ml-option-label {
          flex: 1;
          text-align: left;
        }

        /* Error & OTP */
        .ml-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ml-success {
          color: #16A34A;
          font-size: 0.85rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .ml-forgot {
          display: block;
          text-align: right;
          font-size: 0.85rem;
          font-weight: 600;
          color: #3B82F6;
          cursor: pointer;
          margin-top: -4px;
          margin-bottom: 20px;
          padding: 4px 0;
          transition: opacity 0.2s;
        }
        .ml-forgot:hover { opacity: 0.8; }

        .ml-btn {
          width: 100%;
          height: clamp(48px, 6vh, 52px);
          background: #111827;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(17, 24, 39, 0.15);
        }
        .ml-btn:hover:not(:disabled) {
          background: #1f2937;
          box-shadow: 0 4px 12px rgba(17, 24, 39, 0.2);
        }
        .ml-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .ml-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .ml-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ml-footer {
          flex-shrink: 0;
          padding: 24px 16px max(16px, env(safe-area-inset-bottom, 16px));
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .ml-footer-content {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: clamp(0.7rem, 2.5vw, 0.8rem);
          color: #6B7280;
        }
        
        .ml-footer-brand {
          font-weight: 500;
        }
        .ml-highlight-text {
          font-weight: 800;
          color: #111827;
        }

        .ml-footer-links {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .ml-footer-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #4B5563;
        }
        .ml-footer-divider {
          display: none;
          color: #D1D5DB;
        }
        .ml-footer-icon {
          color: #9CA3AF;
        }
        
        @media (min-width: 768px) {
          .ml-footer-links {
             flex-direction: row;
             gap: 12px;
          }
          .ml-footer-divider {
            display: inline;
          }
        }
      `}</style>

      <div className="ml-wrapper">
        <div className="ml-ambient-bg">
          <div className="ml-orb ml-orb-1" />
          <div className="ml-orb ml-orb-2" />
        </div>

        <main className="ml-main-layout">
          {/* LEFT DESKTOP PANEL */}
          <div className={`ml-left-panel ${mounted ? "show" : ""}`}>
            <h1 className="ml-hero-text">
              Your campus,
              <br />
              one platform.
            </h1>
            <p className="ml-hero-subtext">
              A unified workspace for staff, students, parents, and
              administrators to manage every aspect of university life.
            </p>
            <div className="ml-features-grid">
              {FEATURES.map(({ icon: Icon, text, sub }) => (
                <div className="ml-feature-row" key={text}>
                  <div className="ml-feature-icon">
                    <Icon size={22} />
                  </div>
                  <div className="ml-feature-content">
                    <h4>{text}</h4>
                    <p>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT LOGIN PANEL */}
          <div className="ml-right-panel">
            <div className="ml-right-inner">
              <div className={`ml-header ${mounted ? "show" : ""}`}>
                <div className="ml-logo-container">
                  <img src={foundationLogo} alt={schoolConfig.foundationName} />
                </div>
                <h1>Welcome to {foundationShortName}</h1>
                <p>{schoolConfig.appName?.toLowerCase()} portal</p>
              </div>

              <div className={`ml-glass-card ${mounted ? "show" : ""}`}>
                {/* 1. Primary Role Selection */}
                <div className="ml-field-group">
                  <label className="ml-label">Login as</label>
                  <div className="ml-segmented-control">
                    {TOP_TABS.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.value}
                          className={`ml-segment-btn ${
                            type === tab.value ? "active" : ""
                          }`}
                          onClick={() => {
                            setType(tab.value);
                            setError("");
                            setShowOtp(false);
                            setOtp("");
                            setIsDropdownOpen(false); // Close dropdown if open
                          }}
                        >
                          <Icon
                            size={16}
                            strokeWidth={type === tab.value ? 2.5 : 2}
                          />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Secondary Staff Role Dropdown (Animated Custom UI) */}
                {type === "staff" && (
                  <div className="ml-field-group" style={{ zIndex: 10 }}>
                    <label className="ml-label">Staff role</label>

                    {/* Transparent overlay to handle clicking outside */}
                    {isDropdownOpen && (
                      <div
                        className="ml-dropdown-overlay"
                        onClick={() => setIsDropdownOpen(false)}
                      />
                    )}

                    <div className="ml-custom-select-container">
                      <button
                        type="button"
                        className={`ml-input ml-custom-select-trigger ${
                          isDropdownOpen ? "open" : ""
                        }`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        <div className="ml-icon-left">
                          <ActiveStaffIcon size={18} />
                        </div>

                        <span style={{ fontWeight: 500 }}>
                          {activeStaffRole.label}
                        </span>

                        <ChevronDown
                          size={18}
                          className={`ml-dropdown-chevron ${
                            isDropdownOpen ? "rotate" : ""
                          }`}
                        />
                      </button>

                      <div
                        className={`ml-custom-select-menu ${
                          isDropdownOpen ? "show" : ""
                        }`}
                      >
                        {STAFF_ROLES.map((role) => {
                          const OptionIcon = role.icon;
                          const isSelected = staffRole === role.value;

                          return (
                            <button
                              key={role.value}
                              type="button"
                              className={`ml-custom-select-option ${
                                isSelected ? "selected" : ""
                              }`}
                              onClick={() => {
                                setStaffRole(role.value);
                                setIsDropdownOpen(false);
                                setError("");
                              }}
                            >
                              <OptionIcon size={16} />
                              <span className="ml-option-label">
                                {role.label}
                              </span>
                              {isSelected && <ShieldCheck size={16} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {error && (
                  <div className="ml-error">
                    <ShieldCheck size={16} />
                    {error}
                  </div>
                )}

                {/* Mobile / Email Input */}
                <div className="ml-field-group">
                  <label className="ml-label">Mobile number or email</label>
                  <div className="ml-input-wrapper">
                    <Phone size={18} className="ml-icon-left" />
                    <input
                      className="ml-input"
                      type={isPhoneOnlyType ? "tel" : "text"}
                      placeholder="Enter your details"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) =>
                        !showOtp && e.key === "Enter" && handleLogin()
                      }
                      maxLength={isPhoneOnlyType ? 13 : undefined}
                      autoComplete={isPhoneOnlyType ? "tel" : "username"}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="ml-field-group">
                  <label className="ml-label">Password</label>
                  <div className="ml-input-wrapper">
                    <Lock size={18} className="ml-icon-left" />
                    <input
                      className="ml-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) =>
                        !showOtp && e.key === "Enter" && handleLogin()
                      }
                    />
                    <button
                      className="ml-icon-right"
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* OTP Section */}
                {showOtp && (
                  <div className="ml-field-group">
                    <label className="ml-label">Enter OTP</label>
                    <div className="ml-input-wrapper">
                      <input
                        className="ml-input"
                        style={{ paddingLeft: 14 }}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleVerifyOtp()
                        }
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                      />
                    </div>
                    <div className="ml-success">
                      <ShieldCheck size={14} />
                      {otpMessage}
                    </div>
                  </div>
                )}

                {/* Forgot Password Link */}
                <span
                  className="ml-forgot"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </span>

                {/* Action Button */}
                <button
                  className="ml-btn"
                  onClick={showOtp ? handleVerifyOtp : handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="ml-spinner" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{showOtp ? "Verify OTP" : "Sign In"}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* REDESIGNED CLEAN FOOTER */}
        <footer className="ml-footer">
          <div className="ml-footer-content">
            <div className="ml-footer-brand">
              © {new Date().getFullYear()}{" "}
              <span className="ml-highlight-text">
                {schoolConfig.foundationName}
              </span>
            </div>

            <div className="ml-footer-links">
              {schoolConfig.address && (
                <>
                  <span className="ml-footer-item">
                    <MapPin size={14} className="ml-footer-icon" />
                    {schoolConfig.address}
                  </span>
                  {schoolConfig.Phone && (
                    <span className="ml-footer-divider">•</span>
                  )}
                </>
              )}
              {schoolConfig.Phone && (
                <span className="ml-footer-item">
                  <Phone size={14} className="ml-footer-icon" />
                  {schoolConfig.Phone}
                </span>
              )}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
