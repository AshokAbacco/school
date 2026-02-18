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

// Where to go after login based on role
const REDIRECT = {
  ADMIN: "/admin/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
  PARENT: "/parent/dashboard",
  SUPER_ADMIN: "/superAdmin/dashboard",
};

export default function Login({ onSwitchToRegister }) {
  const [type, setType] = useState("staff");
  const [form, setForm] = useState({ email: "", password: "", schoolCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleLogin = async () => {
    setError("");
    const { email, password, schoolCode } = form;

    if (!email || !password) return setError("Please enter email and password");
    if (type !== "superAdmin" && !schoolCode)
      return setError("Please enter your school code");

    try {
      setLoading(true);

      let result;
      if (type === "superAdmin") {
        result = await loginSuperAdmin({ email, password });
      } else {
        result = await loginRequest(type, { email, password, schoolCode });
      }

      saveAuth(result);

      const role = result?.user?.role;
      window.location.href = REDIRECT[role] || "/dashboard";
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const needsSchoolCode = type !== "superAdmin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setType(tab.value);
                setError("");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition min-w-[60px]
                ${
                  type === tab.value
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-50 py-2 px-3 rounded-lg">
            {error}
          </p>
        )}

        {/* School Code (hidden for Super Admin) */}
        {needsSchoolCode && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              School Code
            </label>
            <input
              type="text"
              placeholder="e.g. CHRIST_HIGHSCHOOL"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm uppercase"
              value={form.schoolCode}
              onChange={set("schoolCode")}
            />
            <p className="text-xs text-gray-400 mt-1">
              Get this from your school administrator
            </p>
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            value={form.email}
            onChange={set("email")}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm pr-10"
              value={form.password}
              onChange={set("password")}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-60 mb-3"
        >
          {loading
            ? "Signing in..."
            : `Login as ${TABS.find((t) => t.value === type)?.label}`}
        </button>

        {/* Register Link */}
        <button
          onClick={onSwitchToRegister}
          className="w-full py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold transition text-sm"
        >
          🏛️ Register New University
        </button>
      </div>
    </div>
  );
}
