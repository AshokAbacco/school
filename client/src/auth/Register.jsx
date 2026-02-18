// client/src/auth/Register.jsx
import { useState } from "react";
import { registerSuperAdmin } from "./api";
import { saveAuth } from "./storage";

const STEPS = [
  { id: 1, label: "University Info" },
  { id: 2, label: "Admin Account" },
  { id: 3, label: "Review" },
];

const Input = ({ label, required, hint, ...props }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
      {...props}
    />
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

export default function Register({ onSwitchToLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    universityName: "",
    universityCode: "",
    universityCity: "",
    universityState: "",
    universityPhone: "",
    universityEmail: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminConfirmPassword: "",
    adminPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (field) => (e) => {
    let val = e.target.value;
    if (field === "universityCode")
      val = val.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    setForm((f) => ({ ...f, [field]: val }));
  };

  const validateStep = (s) => {
    if (s === 1) {
      if (!form.universityName.trim()) return "University name is required";
      if (form.universityCode.length < 2)
        return "University code must be at least 2 characters";
    }
    if (s === 2) {
      if (!form.adminName.trim()) return "Admin name is required";
      if (!/\S+@\S+\.\S+/.test(form.adminEmail)) return "Valid email required";
      if (form.adminPassword.length < 8)
        return "Password must be at least 8 characters";
      if (form.adminPassword !== form.adminConfirmPassword)
        return "Passwords do not match";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) return setError(err);
    setError("");
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const err = validateStep(2);
    if (err) {
      setStep(2);
      return setError(err);
    }

    try {
      setLoading(true);
      const result = await registerSuperAdmin({
        universityName: form.universityName,
        universityCode: form.universityCode,
        universityCity: form.universityCity,
        universityState: form.universityState,
        universityPhone: form.universityPhone,
        universityEmail: form.universityEmail,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        adminPhone: form.adminPhone,
      });

      saveAuth(result);
      setDone(true);
      setTimeout(() => {
        window.location.href = "/superAdmin/dashboard";
      }, 1500);
    } catch (err) {
      setError(err.message || "Registration failed");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-500 text-sm">
            Redirecting to your dashboard...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <button
            onClick={onSwitchToLogin}
            className="text-indigo-200 hover:text-white text-sm mb-3 flex items-center gap-1"
          >
            ← Back to Login
          </button>
          <h1 className="text-xl font-bold text-white">Register University</h1>
          <p className="text-indigo-200 text-xs mt-1">
            Create your institution and Super Admin account
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-gray-100">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition
                ${step === s.id ? "border-indigo-600 text-indigo-600 bg-indigo-50" : ""}
                ${step > s.id ? "border-green-400 text-green-600" : ""}
                ${step < s.id ? "border-transparent text-gray-400" : ""}
              `}
            >
              {step > s.id ? "✅ " : `${s.id}. `}
              {s.label}
            </div>
          ))}
        </div>

        <div className="p-8 space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              ⚠️ {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-gray-800">
                University Information
              </h2>
              <Input
                label="University Name"
                required
                placeholder="Christ University"
                value={form.universityName}
                onChange={set("universityName")}
              />
              <Input
                label="University Code"
                required
                hint="Uppercase, no spaces. e.g. CHRIST_UNI — used for school codes"
                placeholder="CHRIST_UNI"
                value={form.universityCode}
                onChange={set("universityCode")}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  placeholder="Bangalore"
                  value={form.universityCity}
                  onChange={set("universityCity")}
                />
                <Input
                  label="State"
                  placeholder="Karnataka"
                  value={form.universityState}
                  onChange={set("universityState")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.universityPhone}
                  onChange={set("universityPhone")}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="admin@university.edu"
                  value={form.universityEmail}
                  onChange={set("universityEmail")}
                />
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-gray-800">Super Admin Account</h2>
              <p className="text-xs text-gray-500">
                This account manages all schools under your university.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Full Name"
                  required
                  placeholder="John Doe"
                  value={form.adminName}
                  onChange={set("adminName")}
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.adminPhone}
                  onChange={set("adminPhone")}
                />
              </div>
              <Input
                label="Email Address"
                required
                type="email"
                hint="This will be your login email"
                placeholder="super@university.edu"
                value={form.adminEmail}
                onChange={set("adminEmail")}
              />
              <Input
                label="Password"
                required
                type="password"
                hint="Minimum 8 characters"
                placeholder="••••••••"
                value={form.adminPassword}
                onChange={set("adminPassword")}
              />
              <Input
                label="Confirm Password"
                required
                type="password"
                placeholder="••••••••"
                value={form.adminConfirmPassword}
                onChange={set("adminConfirmPassword")}
              />
            </>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <>
              <h2 className="font-bold text-gray-800">Review & Submit</h2>
              <div className="bg-indigo-50 rounded-xl p-4 space-y-1 text-sm">
                <p className="font-semibold text-indigo-700 mb-2">
                  🏛️ University
                </p>
                <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                  <span>Name</span>
                  <span className="font-medium text-gray-800">
                    {form.universityName}
                  </span>
                  <span>Code</span>
                  <span className="font-mono font-bold text-indigo-600">
                    {form.universityCode}
                  </span>
                  {form.universityCity && (
                    <>
                      <span>Location</span>
                      <span className="font-medium text-gray-800">
                        {form.universityCity}, {form.universityState}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 space-y-1 text-sm">
                <p className="font-semibold text-purple-700 mb-2">
                  👤 Super Admin
                </p>
                <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                  <span>Name</span>
                  <span className="font-medium text-gray-800">
                    {form.adminName}
                  </span>
                  <span>Email</span>
                  <span className="font-medium text-gray-800">
                    {form.adminEmail}
                  </span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                After registration, log in as Super Admin to create schools
                (Primary, High School, PUC, Degree) and assign their admins.
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={next}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold transition disabled:opacity-60"
              >
                {loading ? "Registering..." : "🚀 Complete Registration"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
