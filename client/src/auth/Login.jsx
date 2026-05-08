// client/src/auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, loginSuperAdmin } from "./api";
import { saveAuth } from "./storage";
import {
  GraduationCap, Users, ShieldCheck, Building2,
  Mail, Lock, Eye, EyeOff, ChevronRight, BookOpen,
  BarChart3, UserCog, ArrowRight, Sparkles
} from "lucide-react";

const REDIRECT = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
  SUPER_ADMIN: "/superAdmin/dashboard",
  FINANCER: "/financer/dashboard",
};

const STAFF_ROLES = [
  { label: "Admin", value: "admin", icon: UserCog,  },
  { label: "Teacher", value: "teacher", icon: BookOpen, },
  { label: "Financer", value: "financer", icon: BarChart3, },
];

const TOP_TABS = [
  { label: "Staff", value: "staff", icon: Users },
  { label: "Student", value: "student", icon: GraduationCap },
  { label: "Parent", value: "parent", icon: Building2 },
  { label: "Super Admin", value: "superAdmin", icon: ShieldCheck },
];

const FEATURES = [
  { icon: Users, text: "Staff & Faculty Management", sub: "Streamline HR and academic workflows" },
  { icon: GraduationCap, text: "Student Academic Portal", sub: "Grades, attendance & schedules" },
  { icon: BarChart3, text: "Finance & Fee Tracking", sub: "Real-time financial oversight" },
];

export default function Login({ onSwitchToRegister }) {
  const navigate = useNavigate();

  const [type, setType] = useState("staff");
  const [staffRole, setStaffRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) return setError("Please enter email and password");
    try {
      setLoading(true);
      let result;
      const loginType = type === "staff" ? staffRole : type;
      if (type === "superAdmin") {
        result = await loginSuperAdmin({ email, password });
      } else {
        result = await loginRequest(loginType, { email, password });
      }
      saveAuth(result);
      const role = result?.user?.role;
      if (!role) { setError("Login failed: role not found"); return; }
      window.location.href = REDIRECT[role] || "/dashboard";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const activeTab = TOP_TABS.find(t => t.value === type);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: #f0f6ff;
          overflow: hidden;
          padding-top: 60px;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          flex: 0 0 46%;
          background: linear-gradient(155deg, #384959 0%, #2c3a47 55%, #1e2a35 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 52px;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateX(-24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .left-panel.show { opacity: 1; transform: translateX(0); }

        .left-panel::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(136,189,242,0.14) 0%, transparent 70%);
          pointer-events: none;
        }
        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(136,189,242,0.10) 0%, transparent 70%);
          pointer-events: none;
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(136,189,242,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(136,189,242,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 52px;
          position: relative;
          z-index: 1;
        }
        .logo-icon {
          width: 46px; height: 46px;
          background: linear-gradient(135deg, #88BDF2, #BDDDFC);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 18px rgba(136,189,242,0.35);
        }
        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .logo-sub {
          font-size: 11px;
          color: #88BDF2;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-top: 1px;
        }

        .left-headline {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 38px;
          line-height: 1.15;
          color: #fff;
          margin-bottom: 14px;
          position: relative; z-index: 1;
          letter-spacing: -0.5px;
        }
        .left-headline span { color: #88BDF2; }

        .left-sub {
          color: #BDDDFC;
          font-size: 14.5px;
          line-height: 1.7;
          max-width: 330px;
          margin-bottom: 48px;
          position: relative; z-index: 1;
          font-weight: 400;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative; z-index: 1;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(136,189,242,0.15);
          border-radius: 14px;
          backdrop-filter: blur(4px);
          transition: background 0.2s, border-color 0.2s;
        }
        .feature-item:hover {
          background: rgba(255,255,255,0.10);
          border-color: rgba(136,189,242,0.28);
        }
        .feature-icon-wrap {
          width: 38px; height: 38px;
          background: rgba(136,189,242,0.18);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .feature-text { font-size: 13.5px; font-weight: 600; color: #fff; }
        .feature-sub { font-size: 11.5px; color: #88BDF2; margin-top: 2px; font-weight: 400; }

        .left-badge {
          margin-top: 40px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(136,189,242,0.12);
          border: 1px solid rgba(136,189,242,0.22);
          border-radius: 100px;
          padding: 6px 14px;
          color: #88BDF2;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.3px;
          width: fit-content;
          position: relative; z-index: 1;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          opacity: 0;
          transform: translateX(24px);
          transition: opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s;
        }
        .right-panel.show { opacity: 1; transform: translateX(0); }

        .form-card {
          width: 100%;
          max-width: 460px;
          background: #fff;
          border-radius: 24px;
          padding: 40px 38px;
          box-shadow: 0 8px 48px rgba(56,73,89,0.10), 0 2px 12px rgba(56,73,89,0.06);
          border: 1px solid rgba(136,189,242,0.18);
        }

        .form-header { margin-bottom: 28px; }
        .form-title {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #384959;
          letter-spacing: -0.4px;
          margin-bottom: 4px;
        }
        .form-subtitle { font-size: 13.5px; color: #6A89A7; font-weight: 400; }

        /* Tabs */
        .tabs-wrap {
          background: #f0f6ff;
          border-radius: 14px;
          padding: 5px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          margin-bottom: 20px;
        }
        .tab-btn {
          padding: 9px 4px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          background: transparent;
          color: #6A89A7;
        }
        .tab-btn.active {
          background: #384959;
          color: #fff;
          box-shadow: 0 2px 10px rgba(56,73,89,0.22);
        }
        .tab-btn:hover:not(.active) { background: rgba(56,73,89,0.06); }

        /* Staff sub-roles */
        .staff-roles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 18px;
        }
        .role-btn {
          padding: 11px 8px;
          border-radius: 12px;
          border: 1.5px solid #dde8f5;
          background: #fff;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .role-btn.active {
          border-color: #6A89A7;
          background: #f0f6ff;
          box-shadow: 0 0 0 3px rgba(106,137,167,0.10);
        }
        .role-btn-icon { margin-bottom: 5px; display: flex; justify-content: center; }
        .role-btn-label { font-size: 11.5px; font-weight: 700; color: #384959; }
        .role-btn-desc { font-size: 10px; color: #88BDF2; margin-top: 2px; line-height: 1.3; }

        /* Active role pill */
        .role-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          background: linear-gradient(90deg, #eaf3fc, #f0f6ff);
          border: 1px solid #BDDDFC;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .role-pill-text { font-size: 12.5px; color: #384959; font-weight: 600; }

        /* Error */
        .error-box {
          background: #fff5f5;
          border: 1px solid #fcc;
          border-left: 3px solid #e74c3c;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
          color: #c0392b;
          font-size: 13px;
          font-weight: 500;
        }

        /* Fields */
        .field-group { margin-bottom: 16px; }
        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #384959;
          margin-bottom: 7px;
          letter-spacing: 0.1px;
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .field-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #dde8f5;
          border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 500;
          color: #384959;
          background: #fafcff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .field-input:focus {
          border-color: #6A89A7;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(106,137,167,0.10);
        }
        .field-input::placeholder { color: #aabdd0; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; padding: 4px;
          display: flex; align-items: center;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .pw-toggle:hover { background: #eaf3fc; }

        .forgot-link {
          display: block;
          text-align: right;
          margin: -6px 0 20px;
          font-size: 12.5px;
          font-weight: 600;
          color: #6A89A7;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.15s;
        }
        .forgot-link:hover { color: #384959; }

        /* Buttons */
        .btn-primary {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #384959, #2c3a47);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(56,73,89,0.24);
          transition: all 0.2s;
          letter-spacing: 0.1px;
          margin-bottom: 12px;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2c3a47, #1e2a35);
          box-shadow: 0 6px 22px rgba(56,73,89,0.32);
          transform: translateY(-1px);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 4px 0 12px;
        }
        .divider-line { flex: 1; height: 1px; background: #dde8f5; }
        .divider-text { font-size: 10.5px; color: #88BDF2; font-weight: 700; letter-spacing: 1px; }

        .btn-secondary {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1.5px solid #88BDF2;
          background: #fff;
          color: #384959;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: #eaf3fc;
          border-color: #6A89A7;
        }

        /* Loading spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .left-panel { flex: 0 0 40%; padding: 48px 36px; }
          .left-headline { font-size: 30px; }
          .right-panel { padding: 32px 28px; }
          .form-card { padding: 32px 28px; }
        }

        @media (max-width: 720px) {
          .login-root { flex-direction: column; }
          .left-panel {
            flex: none;
            padding: 40px 40px;
            flex-direction: row;
            align-items: center;
            gap: 14px;
            background: linear-gradient(120deg, #384959, #2c3a47);
          }
          .left-panel::before, .left-panel::after { display: none; }
          .grid-bg { display: none; }
          .logo-wrap { margin-bottom: 0; }
          .left-headline, .left-sub, .feature-list, .left-badge { display: none; }
          .mobile-brand { display: flex !important; flex-direction: column; }
          .right-panel { padding: 24px 16px; align-items: flex-start; }
          .form-card { padding: 28px 20px; border-radius: 18px; }
          .tabs-wrap { grid-template-columns: repeat(2, 1fr); }
          .form-title { font-size: 22px; }
        }

        @media (max-width: 400px) {
          .form-card { padding: 22px 16px; }
          .staff-roles { grid-template-columns: repeat(3, 1fr); gap: 5px; }
          .role-btn { padding: 9px 4px; }
          .role-btn-desc { display: none; }
          .btn-primary { font-size: 14px; padding: 13px; }
        }

        .mobile-brand { display: none; }
      `}</style>

      <div className="login-root">
        {/* ── LEFT PANEL ── */}
        <div className={`left-panel ${mounted ? "show" : ""}`}>
          <div className="grid-bg" />

          <div className="logo-wrap">
            <div className="logo-icon">
              <GraduationCap size={22} color="#384959" />
            </div>
            <div>
              <div className="logo-text">UniPortal</div>
              <div className="logo-sub">Campus Management Platform</div>
            </div>
          </div>

          {/* Mobile-only inline brand (no headline/features) */}
          <div className="mobile-brand">
            <span style={{ color: "#fff", fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 17 }}>UniPortal</span>
            <span style={{ color: "#88BDF2", fontSize: 11, fontWeight: 500 }}>Campus Management</span>
          </div>

          <h1 className="left-headline">
            Your campus,<br /><span>one platform.</span>
          </h1>
          <p className="left-sub">
            A unified workspace for staff, students, parents, and administrators to manage every aspect of university life.
          </p>

          <div className="feature-list">
            {FEATURES.map(({ icon: Icon, text, sub }) => (
              <div className="feature-item" key={text}>
                <div className="feature-icon-wrap">
                  <Icon size={16} color="#88BDF2" />
                </div>
                <div>
                  <div className="feature-text">{text}</div>
                  <div className="feature-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="left-badge">
            <Sparkles size={12} />
            Trusted by 500+ universities
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className={`right-panel ${mounted ? "show" : ""}`}>
          <div className="form-card">
            <div className="form-header">
              <div className="form-title">Welcome back</div>
              <div className="form-subtitle">Sign in to access your portal</div>
            </div>

            {/* Role Tabs */}
            <div className="tabs-wrap">
              {TOP_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    className={`tab-btn ${type === tab.value ? "active" : ""}`}
                    onClick={() => { setType(tab.value); setError(""); }}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Staff Sub-roles */}
            {type === "staff" && (
              <div className="staff-roles">
                {STAFF_ROLES.map(({ label, value, icon: Icon, desc }) => (
                  <button
                    key={value}
                    className={`role-btn ${staffRole === value ? "active" : ""}`}
                    onClick={() => { setStaffRole(value); setError(""); }}
                  >
                    <div className="role-btn-icon">
                      <Icon size={15} color={staffRole === value ? "#384959" : "#88BDF2"} />
                    </div>
                    <div className="role-btn-label">{label}</div>
                    <div className="role-btn-desc">{desc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Active role pill */}
            <div className="role-pill">
              {activeTab && <activeTab.icon size={13} color="#384959" />}
              <span className="role-pill-text">
                Signing in as:{" "}
                {type === "staff"
                  ? `${STAFF_ROLES.find(r => r.value === staffRole)?.label} (Staff)`
                  : activeTab?.label}
              </span>
            </div>

            {/* Error */}
            {error && <div className="error-box">{error}</div>}

            {/* Email */}
            <div className="field-group">
              <label className="field-label">Email Address</label>
              <div className="field-wrap">
                <span className="field-icon"><Mail size={15} color="#88BDF2" /></span>
                <input
                  className="field-input"
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="field-wrap">
                <span className="field-icon"><Lock size={15} color="#88BDF2" /></span>
                <input
                  className="field-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{ paddingRight: 44 }}
                />
                <button className="pw-toggle" type="button" onClick={() => setShowPassword(s => !s)}>
                  {showPassword ? <EyeOff size={16} color="#6A89A7" /> : <Eye size={16} color="#6A89A7" />}
                </button>
              </div>
            </div>

            <span className="forgot-link" onClick={() => navigate("/forgot-password")}>
              Forgot Password?
            </span>

            {/* Sign In Button */}
            <button className="btn-primary" onClick={handleLogin} disabled={loading}>
              {loading
                ? <><div className="spinner" /><span>Authenticating...</span></>
                : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">OR</span>
              <div className="divider-line" />
            </div>

            {/* Register */}
            <button className="btn-secondary" onClick={() => navigate("/register")}>
              <Building2 size={15} color="#6A89A7" />
              <span>Register New University</span>
              <ChevronRight size={14} color="#6A89A7" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}