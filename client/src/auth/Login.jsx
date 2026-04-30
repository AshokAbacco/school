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

/* Small helper shown only on mobile alongside logo */
function MobileBannerText() {
  return (
    <div className="hidden max-[680px]:flex flex-col">
      <span className="text-white font-extrabold text-base leading-tight">UniPortal</span>
      <span className="text-[#BDDDFC] text-xs font-medium">Campus management platform</span>
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
    // Root
    <div className="min-h-screen flex bg-[#f0f6ff] font-[Segoe_UI,system-ui,sans-serif] max-[680px]:flex-col">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[rgba(136,189,242,0.12)] pointer-events-none max-[680px]:hidden" />

      {/* ── LEFT PANEL ── */}
      <div className="
        flex-[0_0_45%] relative overflow-hidden
        flex flex-col justify-center items-start
        px-14 py-[60px]
        max-[900px]:flex-[0_0_38%] max-[900px]:px-9 max-[900px]:py-10
        max-[680px]:flex-none max-[680px]:px-5 max-[680px]:py-5
        max-[680px]:flex-row max-[680px]:items-center max-[680px]:justify-start max-[680px]:gap-4
        ml-10
      ">
        {/* Blobs */}
        <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-[rgba(136,189,242,0.12)] pointer-events-none max-[680px]:hidden" />

        {/* Logo */}
        <div className="flex items-center gap-3 mb-12 max-[680px]:mb-0 ml-20">
          <div className="w-11 h-11 rounded-xl bg-[#88BDF2] flex items-center justify-center">
            <GraduationCap size={24} color="#384959" />
          </div>
          <span className="text-[#384959] font-bold text-lg tracking-wide">UniPortal</span>
        </div>

        {/* Shown only on mobile */}
        <MobileBannerText />

        <h1 className="ml-20 text-[#6A89A7] text-[38px] font-extrabold mb-[18px]">
          Welcome to our Education Hub
        </h1>
        <p className=" ml-20 text-[#6A89A7] text-[15px] leading-relaxed max-w-[340px] mb-12 max-[900px]:text-[13px] max-[680px]:hidden">
          One platform for staff, students, parents and administrators to manage university life seamlessly.
        </p>

        <div className=" ml-20 flex flex-col gap-4 w-full max-w-[320px] max-[680px]:hidden">
          {[
            { icon: Users, text: "Staff & Faculty Management" },
            { icon: GraduationCap, text: "Student Academic Portal" },
            { icon: BarChart3, text: "Finance & Fee Tracking" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[rgba(136,189,242,0.18)] flex items-center justify-center flex-shrink-0">
                <Icon size={17} color="#88BDF2" />
              </div>
              <span className="text-[#6A89A7] text-sm font-medium">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex items-center justify-center mt-10 px-8 py-10 max-[680px]:items-start max-[680px]:px-4 max-[680px]:py-6 max-[360px]:px-3 max-[360px]:py-4">
        <div className="w-full max-w-[440px] max-[680px]:max-w-full">

          <h2 className="text-[#384959] text-[26px] font-extrabold mb-1.5 pt-[50px] max-[680px]:text-[22px] max-[360px]:text-xl">
            Sign In
          </h2>
          <p className="text-[#6A89A7] text-sm mb-7">Select your role and enter your credentials</p>

          {/* Top Role Tabs */}
          <div
            className={`flex gap-1.5 bg-[#eaf3fc] rounded-xl p-1.5 flex-wrap ${type === "staff" ? "mb-4" : "mb-6"}`}
          >
            {TOP_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = type === tab.value;
              return (
                <button
                  key={tab.value}
                  className={`
                    flex-1 py-2 px-1 rounded-lg border-none cursor-pointer font-semibold text-xs
                    flex flex-col items-center gap-1 transition-all duration-200
                    max-[680px]:flex-[1_1_calc(50%-6px)] min-w-0 max-[360px]:text-[11px] max-[360px]:py-1.5 max-[360px]:px-0.5
                    ${isActive
                      ? "bg-[#384959] text-white shadow-[0_2px_8px_rgba(56,73,89,0.18)]"
                      : "bg-transparent text-[#6A89A7]"}
                  `}
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
            <div className="flex gap-2 mb-6 max-[680px]:flex-col">
              {STAFF_ROLES.map(({ label, value, icon: Icon, desc }) => {
                const isActive = staffRole === value;
                return (
                  <button
                    key={value}
                    className={`
                      flex-1 p-2.5 rounded-[10px] cursor-pointer text-left transition-all duration-200
                      max-[680px]:flex max-[680px]:items-center max-[680px]:gap-3 max-[680px]:p-3
                      ${isActive
                        ? "border-2 border-[#6A89A7] bg-[#eaf3fc]"
                        : "border-2 border-[#dde8f5] bg-white"}
                    `}
                    onClick={() => { setStaffRole(value); setError(""); }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 max-[680px]:mb-0">
                      <Icon size={14} color={isActive ? "#384959" : "#6A89A7"} />
                      <span
                        className="text-xs font-bold"
                        style={{ color: isActive ? "#384959" : "#6A89A7" }}
                      >
                        {label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#88BDF2] m-0 leading-snug max-[680px]:hidden">{desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Active role badge */}
          <div className="flex items-center gap-2 mb-5 px-3.5 py-2 bg-[#BDDDFC] rounded-lg">
            {activeTab && <activeTab.icon size={14} color="#384959" />}
            <span className="text-xs text-[#384959] font-semibold">
              Logging in as:{" "}
              {type === "staff"
                ? `${STAFF_ROLES.find(r => r.value === staffRole)?.label} (Staff)`
                : activeTab?.label}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-[#fff0f0] border border-[#fcc] rounded-lg px-3.5 py-2.5 mb-[18px] text-[#c0392b] text-[13px] font-medium">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-[13px] font-semibold text-[#384959] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} color="#88BDF2" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="name@university.edu"
                value={email}
                className="
                  w-full py-[11px] pr-3.5 pl-10 border-[1.5px] border-[#dde8f5] rounded-[10px]
                  text-sm font-medium text-[#384959] outline-none bg-white transition-colors duration-200
                  focus:border-[#6A89A7]
                "
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-[26px]">
            <label className="block text-[13px] font-semibold text-[#384959] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={16} color="#88BDF2" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                className="
                  w-full py-[11px] pl-10 pr-11 border-[1.5px] border-[#dde8f5] rounded-[10px]
                  text-sm font-medium text-[#384959] outline-none bg-white transition-colors duration-200
                  focus:border-[#6A89A7]
                "
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-0.5"
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword
                  ? <EyeOff size={17} color="#6A89A7" />
                  : <Eye size={17} color="#6A89A7" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right -mt-3 mb-[18px]">
            <span
              className="text-[13px] text-[#6A89A7] cursor-pointer font-semibold"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot Password?
            </span>
          </div>

          {/* Login Button */}
          <button
            className={`
              w-full py-[13px] rounded-[10px] border-none text-white font-bold text-[15px]
              flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(56,73,89,0.22)]
              transition-all duration-200 mb-3.5
              ${loading
                ? "cursor-not-allowed bg-[#6A89A7] opacity-75"
                : "cursor-pointer bg-[#384959] hover:bg-[#2c3a47]"}
            `}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading
              ? "Authenticating..."
              : <><span>Sign In</span><ArrowRight size={17} /></>}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1 mb-3.5">
            <div className="flex-1 h-px bg-[#dde8f5]" />
            <span className="text-[11px] text-[#88BDF2] font-bold tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-[#dde8f5]" />
          </div>

          {/* Register */}
          <button
            className="
              w-full py-3 rounded-[10px] border-2 border-[#88BDF2] bg-white
              text-[#384959] font-bold text-sm cursor-pointer
              flex items-center justify-center gap-2 transition-all duration-200
              hover:bg-[#eaf3fc]
            "
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