// client/src/auth/Login.jsx
import { useState } from "react";
import { loginRequest, loginSuperAdmin } from "./api";
import { saveAuth } from "./storage";

const TABS = [
  { label: "Staff", value: "staff" },
  { label: "Student", value: "student" },
  { label: "Parent", value: "parent" },
  { label: "Super Admin", value: "superAdmin" },
];

const REDIRECT = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
  SUPER_ADMIN: "/superAdmin/dashboard",
};

export default function Login({ onSwitchToRegister }) {
  const [type, setType] = useState("staff");
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
      if (type === "superAdmin") {
        result = await loginSuperAdmin({ email, password });
      } else {
        result = await loginRequest(type, { email, password });
      }
      saveAuth(result);
      window.location.href = REDIRECT[result?.user?.role] || "/dashboard";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#BDDDFC] p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-10 border border-[#88BDF2]/30">
        {/* Heading - 700 Weight */}
        <h1 className="text-xl font-bold text-center text-[#384959] mb-8">
          University Portal Login
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#f4f7fa] p-1.5 rounded-lg border border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setType(tab.value);
                setError("");
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${
                  type === tab.value
                    ? "bg-[#6A89A7] text-white shadow-md"
                    : "text-[#6A89A7] hover:bg-[#BDDDFC]/20"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-6 text-center bg-red-50 py-2.5 px-3 rounded-lg border border-red-100 font-medium">
            {error}
          </div>
        )}

        {/* Form Fields - 500 Weight */}
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-base font-medium text-[#384959] mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@university.edu"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#88BDF2] focus:border-[#6A89A7] outline-none text-base font-medium transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-base font-medium text-[#384959] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#88BDF2] focus:border-[#6A89A7] outline-none text-base font-medium pr-16 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6A89A7] hover:text-[#384959]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#384959] hover:bg-[#2c3a47] text-white font-bold transition-all shadow-lg disabled:opacity-50 active:scale-[0.98]"
          >
            {loading
              ? "Authenticating..."
              : `Login as ${TABS.find((t) => t.value === type)?.label}`}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
              or
            </span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            onClick={onSwitchToRegister}
            className="w-full py-3 rounded-lg border-2 border-[#88BDF2] text-[#384959] hover:bg-[#BDDDFC]/30 font-bold transition-all text-sm flex items-center justify-center gap-2"
          >
            🏛️ Register New University
          </button>
        </div>
      </div>
    </div>
  );
}
