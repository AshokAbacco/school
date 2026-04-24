// client/src/auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, loginSuperAdmin } from "./api";
import { saveAuth } from "./storage";
import {
  GraduationCap, Users, ShieldCheck, Building2,
  Mail, Lock, Eye, EyeOff, ChevronRight, BookOpen,
  BarChart3, UserCog, ArrowRight
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
  { label: "Admin", value: "admin", icon: UserCog, desc: "Manage university operations" },
  { label: "Teacher", value: "teacher", icon: BookOpen, desc: "Access classes & grades" },
  { label: "Financer", value: "financer", icon: BarChart3, desc: "Manage fees & accounts" },
];

const TOP_TABS = [
  { label: "Staff", value: "staff", icon: Users },
  { label: "Student", value: "student", icon: GraduationCap },
  { label: "Parent", value: "parent", icon: Building2 },
  { label: "Super Admin", value: "superAdmin", icon: ShieldCheck },
];

const styles = `
  * { box-sizing: border-box; }

  .login-root {
    min-height: 100vh;
    display: flex;
    background: #f0f6ff;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  /* ── LEFT PANEL ── */
  .login-left {
    flex: 0 0 45%;
    background: linear-gradient(145deg, #384959 0%, #4a6278 60%, #6A89A7 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
  }

  .login-left-blob1 {
    position: absolute; top: -80px; right: -80px;
    width: 320px; height: 320px; border-radius: 50%;
    background: rgba(136,189,242,0.12); pointer-events: none;
  }
  .login-left-blob2 {
    position: absolute; bottom: -60px; left: -60px;
    width: 240px; height: 240px; border-radius: 50%;
    background: rgba(189,221,252,0.10); pointer-events: none;
  }

  .login-logo {
    display: flex; align-items: center; gap: 12px; margin-bottom: 48px;
  }
  .login-logo-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: #88BDF2; display: flex; align-items: center; justify-content: center;
  }
  .login-logo-text {
    color: #BDDDFC; font-weight: 700; font-size: 18px; letter-spacing: 0.5px;
  }

  .login-left h1 {
    color: #fff; font-size: 38px; font-weight: 800;
    line-height: 1.2; margin: 0 0 18px; max-width: 340px;
  }
  .login-left p {
    color: #BDDDFC; font-size: 15px; line-height: 1.7;
    max-width: 340px; margin: 0 0 48px;
  }

  .login-features {
    display: flex; flex-direction: column; gap: 16px;
    width: 100%; max-width: 320px;
  }
  .login-feature-item {
    display: flex; align-items: center; gap: 12px;
  }
  .login-feature-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(136,189,242,0.18);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .login-feature-text {
    color: #BDDDFC; font-size: 14px; font-weight: 500;
  }

  /* ── RIGHT PANEL ── */
  .login-right {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 40px 32px;
  }
  .login-form-container {
    width: 100%; max-width: 440px;
  }

  .login-title {
    color: #384959; font-size: 26px; font-weight: 800; margin: 0 0 6px; 
  }
  .login-subtitle {
    color: #6A89A7; font-size: 14px; margin: 0 0 28px;
  }

  /* Role Tabs */
  .login-tabs {
    display: flex; gap: 6px;
    background: #eaf3fc; border-radius: 12px; padding: 5px;
  }
  .login-tab {
    flex: 1; padding: 8px 4px; border-radius: 8px; border: none; cursor: pointer;
    font-weight: 600; font-size: 12px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    transition: all 0.2s;
  }
  .login-tab.active {
    background: #384959; color: #fff;
    box-shadow: 0 2px 8px rgba(56,73,89,0.18);
  }
  .login-tab.inactive {
    background: transparent; color: #6A89A7;
  }

  /* Staff sub-roles */
  .login-staff-roles {
    display: flex; gap: 8px; margin-bottom: 24px;
  }
  .login-staff-role-btn {
    flex: 1; padding: 10px 8px; border-radius: 10px; cursor: pointer; text-align: left;
    transition: all 0.2s;
  }
  .login-staff-role-btn.active {
    border: 2px solid #6A89A7; background: #eaf3fc;
  }
  .login-staff-role-btn.inactive {
    border: 2px solid #dde8f5; background: #fff;
  }
  .login-staff-role-header {
    display: flex; align-items: center; gap: 6px; margin-bottom: 3px;
  }
  .login-staff-role-label {
    font-size: 12px; font-weight: 700;
  }
  .login-staff-role-desc {
    font-size: 10px; color: #88BDF2; margin: 0; line-height: 1.4;
  }

  /* Badge */
  .login-badge {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 20px; padding: 8px 14px;
    background: #BDDDFC; border-radius: 8px;
  }
  .login-badge span {
    font-size: 12px; color: #384959; font-weight: 600;
  }

  /* Error */
  .login-error {
    background: #fff0f0; border: 1px solid #fcc; border-radius: 8px;
    padding: 10px 14px; margin-bottom: 18px;
    color: #c0392b; font-size: 13px; font-weight: 500;
  }

  /* Input */
  .login-input-group { margin-bottom: 16px; }
  .login-input-label {
    display: block; font-size: 13px; font-weight: 600;
    color: #384959; margin-bottom: 6px;
  }
  .login-input-wrap { position: relative; }
  .login-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  }
  .login-input {
    width: 100%; padding: 11px 14px 11px 40px;
    border: 1.5px solid #dde8f5; border-radius: 10px;
    font-size: 14px; font-weight: 500; color: #384959;
    outline: none; background: #fff; transition: border 0.2s;
  }
  .login-input:focus { border-color: #6A89A7; }
  .login-input-password { padding-right: 44px !important; }
  .login-eye-btn {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; padding: 2px;
  }

  /* Buttons */
  .login-submit-btn {
    width: 100%; padding: 13px; border-radius: 10px; border: none;
    color: #fff; font-weight: 700; font-size: 15px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 14px rgba(56,73,89,0.22);
    transition: all 0.2s; margin-bottom: 14px;
  }
  .login-submit-btn:disabled { cursor: not-allowed; background: #6A89A7; opacity: 0.75; }
  .login-submit-btn:not(:disabled) { cursor: pointer; background: #384959; }
  .login-submit-btn:not(:disabled):hover { background: #2c3a47; }

  .login-divider {
    display: flex; align-items: center; gap: 12px; margin: 4px 0 14px;
  }
  .login-divider-line { flex: 1; height: 1px; background: #dde8f5; }
  .login-divider-text {
    font-size: 11px; color: #88BDF2; font-weight: 700;
    letter-spacing: 1px; text-transform: uppercase;
  }

  .login-register-btn {
    width: 100%; padding: 12px; border-radius: 10px;
    border: 2px solid #88BDF2; background: #fff;
    color: #384959; font-weight: 700; font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s;
  }
  .login-register-btn:hover { background: #eaf3fc; }

  /* ── TABLET (max 900px) ── */
  @media (max-width: 900px) {
    .login-left {
      flex: 0 0 38%;
      padding: 40px 36px;
    }
    .login-left h1 { font-size: 28px; }
    .login-left p { font-size: 13px; }
  }

  /* ── MOBILE (max 680px): stack vertically, hide left panel ── */
  @media (max-width: 680px) {
    .login-root {
      flex-direction: column;
    }

    /* Compact header banner replacing the left panel */
    .login-left {
      flex: none;
      padding: 20px 20px 16px;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
    }
    .login-left-blob1,
    .login-left-blob2 { display: none; }
    .login-logo { margin-bottom: 0; }
    .login-left h1,
    .login-left p,
    .login-features { display: none; }

    /* Mobile banner title */
    .login-mobile-banner-text {
      display: flex !important;
      flex-direction: column;
    }

    .login-right {
      flex: 1;
      padding: 24px 16px 32px;
      align-items: flex-start;
    }

    .login-form-container { max-width: 100%; }

    .login-title { font-size: 22px; }

    /* Tabs: 2×2 grid on very small screens */
    .login-tabs {
      flex-wrap: wrap;
    }
    .login-tab {
      flex: 1 1 calc(50% - 6px);
      min-width: 0;
    }

    .login-staff-roles {
      flex-direction: column;
    }
    .login-staff-role-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 12px;
    }
    .login-staff-role-header { margin-bottom: 0; }
    .login-staff-role-desc { display: none; }
  }

  /* ── SMALL PHONES (max 360px) ── */
  @media (max-width: 360px) {
    .login-right { padding: 16px 12px 24px; }
    .login-title { font-size: 20px; }
    .login-tab { font-size: 11px; padding: 7px 2px; }
  }
`;

/* Small helper shown only on mobile alongside logo */
function MobileBannerText() {
  return (
    <div className="login-mobile-banner-text" style={{ display: "none" }}>
      <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>UniPortal</span>
      <span style={{ color: "#BDDDFC", fontSize: 12, fontWeight: 500 }}>Campus management platform</span>
    </div>
  );
}

export default function Login({ onSwitchToRegister }) {
  const navigate = useNavigate();
  const [type, setType] = useState("staff");
  const [staffRole, setStaffRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Inject styles once
  useEffect(() => {
    const id = "login-responsive-styles";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = styles;
      document.head.appendChild(tag);
    }
    return () => {
      // Keep styles around; remove if you prefer cleanup:
      // document.getElementById(id)?.remove();
    };
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
    <div className="login-root ">

      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div className="login-left-blob1" />
        <div className="login-left-blob2" />

        <div className="login-logo">
          <div className="login-logo-icon">
            <GraduationCap size={24} color="#384959" />
          </div>
          <span className="login-logo-text">UniPortal</span>
        </div>

        {/* Shown only on mobile, hidden on desktop via CSS */}
        <MobileBannerText />

        <h1>Welcome to our Education Hub</h1>
        <p>One platform for staff, students, parents and administrators to manage university life seamlessly.</p>

        <div className="login-features">
          {[
            { icon: Users, text: "Staff & Faculty Management" },
            { icon: GraduationCap, text: "Student Academic Portal" },
            { icon: BarChart3, text: "Finance & Fee Tracking" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="login-feature-item">
              <div className="login-feature-icon">
                <Icon size={17} color="#88BDF2" />
              </div>
              <span className="login-feature-text">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right">
        <div className="login-form-container">

          <h2 style={ {paddingTop:"50px"}} className="login-title">Sign In</h2>
          <p className="login-subtitle">Select your role and enter your credentials</p>

          {/* Top Role Tabs */}
          <div className="login-tabs" style={{ marginBottom: type === "staff" ? 16 : 24 }}>
            {TOP_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  className={`login-tab ${type === tab.value ? "active" : "inactive"}`}
                  onClick={() => { setType(tab.value); setError(""); }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Staff Sub-roles */}
          {type === "staff" && (
            <div className="login-staff-roles">
              {STAFF_ROLES.map(({ label, value, icon: Icon, desc }) => (
                <button
                  key={value}
                  className={`login-staff-role-btn ${staffRole === value ? "active" : "inactive"}`}
                  onClick={() => { setStaffRole(value); setError(""); }}
                >
                  <div className="login-staff-role-header">
                    <Icon size={14} color={staffRole === value ? "#384959" : "#6A89A7"} />
                    <span
                      className="login-staff-role-label"
                      style={{ color: staffRole === value ? "#384959" : "#6A89A7" }}
                    >
                      {label}
                    </span>
                  </div>
                  <p className="login-staff-role-desc">{desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* Active role badge */}
          <div className="login-badge">
            {activeTab && <activeTab.icon size={14} color="#384959" />}
            <span>
              Logging in as:{" "}
              {type === "staff"
                ? `${STAFF_ROLES.find(r => r.value === staffRole)?.label} (Staff)`
                : activeTab?.label}
            </span>
          </div>

          {error && <div className="login-error">{error}</div>}

          {/* Email */}
          <div className="login-input-group">
            <label className="login-input-label">Email Address</label>
            <div className="login-input-wrap">
              <Mail size={16} color="#88BDF2" className="login-input-icon" />
              <input
                type="email"
                placeholder="name@university.edu"
                value={email}
                className="login-input"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-input-group" style={{ marginBottom: 26 }}>
            <label className="login-input-label">Password</label>
            <div className="login-input-wrap">
              <Lock size={16} color="#88BDF2" className="login-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                className="login-input login-input-password"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword
                  ? <EyeOff size={17} color="#6A89A7" />
                  : <Eye size={17} color="#6A89A7" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            className="login-submit-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading
              ? "Authenticating..."
              : <><span>Sign In</span><ArrowRight size={17} /></>}
          </button>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <div className="login-divider-line" />
          </div>

          {/* Register */}
          <button
            className="login-register-btn"
            onClick={() => navigate("/register")}
          >
            <Building2 size={16} color="#6A89A7" />
            <span>Register New University</span>
            <ChevronRight size={15} color="#6A89A7" />
          </button>

        </div>
      </div>
    </div>
  );
}