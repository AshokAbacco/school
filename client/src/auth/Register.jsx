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
    <label className="block text-base font-medium text-[#384959] mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#88BDF2] focus:border-[#6A89A7] outline-none text-base font-medium transition-all placeholder:text-gray-300"
      {...props}
    />
    {hint && (
      <p className="text-xs text-[#6A89A7] font-medium mt-1 italic">{hint}</p>
    )}
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
      <div className="min-h-screen flex items-center justify-center bg-[#BDDDFC]">
        <div className="bg-white rounded-xl shadow-2xl p-12 text-center max-w-sm w-full border border-[#88BDF2]">
          <div className="text-5xl mb-6">✅</div>
          <h2 className="text-xl font-bold text-[#384959] mb-3">
            Registration Successful!
          </h2>
          <p className="text-[#6A89A7] text-base font-medium">
            Redirecting to your dashboard...
          </p>
          <div className="mt-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#6A89A7] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#BDDDFC] p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-[#88BDF2]/30">
        {/* Header - Weights: Title 700, Sub 500 */}
        <div className="bg-[#384959] px-8 py-8">
          <button
            onClick={onSwitchToLogin}
            className="text-[#BDDDFC] hover:text-white text-sm font-bold mb-4 flex items-center gap-1 transition-colors"
          >
            ← Back to Login
          </button>
          <h1 className="text-xl font-bold text-white">Register University</h1>
          <p className="text-[#BDDDFC]/80 text-sm mt-1 font-medium">
            Establish your institution and master administrator account.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all
                ${step === s.id ? "border-[#6A89A7] text-[#384959] bg-white" : ""}
                ${step > s.id ? "border-[#88BDF2] text-[#6A89A7]" : ""}
                ${step < s.id ? "border-transparent text-gray-400" : ""}
              `}
            >
              {step > s.id ? "✓ " : `${s.id}. `}
              {s.label}
            </div>
          ))}
        </div>

        <div className="p-8 space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-lg font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-lg font-bold text-[#384959]">
                University Information
              </h2>
              <Input
                label="University Name"
                required
                placeholder="e.g. Christ University"
                value={form.universityName}
                onChange={set("universityName")}
              />
              <Input
                label="University Code"
                required
                hint="Uppercase, no spaces. e.g. CHRIST_UNI"
                placeholder="CHRIST_UNI"
                value={form.universityCode}
                onChange={set("universityCode")}
              />
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-lg font-bold text-[#384959]">
                Super Admin Account
              </h2>
              <p className="text-sm text-[#6A89A7] font-medium">
                The primary administrator responsible for system-wide
                configuration.
              </p>
              <div className="grid grid-cols-2 gap-4">
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
                hint="Your primary login credential"
                placeholder="super@university.edu"
                value={form.adminEmail}
                onChange={set("adminEmail")}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Password"
                  required
                  type="password"
                  hint="Min. 8 chars"
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
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-lg font-bold text-[#384959]">
                Review & Finalize
              </h2>

              <div className="bg-[#f8fafc] rounded-lg border border-gray-200 p-5 space-y-3 text-base font-medium">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[#6A89A7]">University</span>
                  <span className="text-[#384959]">{form.universityName}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[#6A89A7]">Code</span>
                  <span className="font-mono text-[#6A89A7] bg-[#BDDDFC]/30 px-2 rounded">
                    {form.universityCode}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-[#6A89A7]">Super Admin</span>
                  <span className="text-[#384959]">{form.adminName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6A89A7]">Admin Email</span>
                  <span className="text-[#384959]">{form.adminEmail}</span>
                </div>
              </div>

              <div className="bg-[#88BDF2]/10 border border-[#88BDF2]/40 rounded-lg p-4 text-sm text-[#384959] font-medium italic">
                Note: Upon completion, log in as Super Admin to manage
                institutional divisions.
              </div>
            </div>
          )}

          {/* Navigation - Button Weight 700 */}
          <div className="flex gap-4 pt-4">
            {step > 1 && (
              <button
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
                className="flex-1 py-3 rounded-lg border-2 border-[#88BDF2] text-[#384959] font-bold hover:bg-[#BDDDFC]/20 transition-all"
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={next}
                className="flex-1 py-3 rounded-lg bg-[#6A89A7] hover:bg-[#384959] text-white font-bold transition-all shadow-md"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-3 rounded-lg bg-[#384959] hover:bg-black text-white font-bold transition-all shadow-xl disabled:opacity-50"
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
