// client/src/auth/Register.jsx
import { useState } from "react";
import { useNavigate, useLocation  } from "react-router-dom";
import { registerSuperAdmin } from "./api";
import { saveAuth } from "./storage";

/* ─── helpers ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "University Info",  desc: "Basic details"   },
  { id: 2, label: "Admin Account",    desc: "Credentials"     },
  { id: 3, label: "Review",           desc: "Confirm & submit"},
];

/** Validate a single step; returns array of { field, msg } */
const getErrors = (s, form) => {
  const errs = [];
  if (s === 1) {
    if (!form.universityName.trim())
      errs.push({ field: "universityName", msg: "University name is required" });
    if (form.universityCode.length < 2)
      errs.push({ field: "universityCode", msg: "Code must be at least 2 characters" });
  }
  if (s === 2) {
    if (!form.adminName.trim())
      errs.push({ field: "adminName", msg: "Full name is required" });
    if (!/\S+@\S+\.\S+/.test(form.adminEmail))
      errs.push({ field: "adminEmail", msg: "Valid email is required" });
    if (form.adminPassword.length < 6)
      errs.push({ field: "adminPassword", msg: "Password must be at least 6 characters" });
    if (form.adminPassword !== form.adminConfirmPassword)
      errs.push({ field: "adminConfirmPassword", msg: "Passwords do not match" });
  }
  return errs;
};

/* ─── reusable Input ───────────────────────────────────────── */
const Input = ({ label, required, hint, error, type = "text", isPassword, show, toggleShow, ...props }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-[#6A89A7] uppercase tracking-wide">
      {label}{required && <span className="text-[#88BDF2] ml-0.5">*</span>}
    </label>

    <div className="relative">
      <input
        type={isPassword ? (show ? "text" : "password") : type}
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#384959] outline-none transition-all duration-200
          bg-slate-50 border
          ${error
            ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200"
            : "border-slate-200 hover:border-[#88BDF2] hover:bg-white focus:border-[#6A89A7] focus:bg-white focus:ring-2 focus:ring-[#88BDF2]/25"
          }`}
        {...props}
      />

      {/* 👁 Toggle Icon */}
      {isPassword && (
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A89A7] text-sm"
        >
          {show ? "🙈" : "🙊"}
        </button>
      )}
    </div>

    {error && (
      <p className="text-xs text-red-500 font-medium flex items-center gap-1">
        ⚠ {error}
      </p>
    )}

    {hint && !error && (
      <p className="text-xs text-[#6A89A7] italic">{hint}</p>
    )}
  </div>
);

/* ─── main component ───────────────────────────────────────── */
export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});   // { fieldName: "msg" }
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const location = useLocation();
  const paymentData = location.state || {};
  const tempUserId =
    paymentData.tempUserId || localStorage.getItem("tempUserId");

  const [form, setForm] = useState({
    universityName: paymentData.schoolName || "",
    universityCode: "",
    universityCity: "",
    universityState: "",
    universityPhone: paymentData.phone || "",
    universityEmail: paymentData.email || "",

    adminName: paymentData.fullName || "",
    adminEmail: paymentData.email || "",
    adminPassword: "",
    adminConfirmPassword: "",
    adminPhone: paymentData.phone || "",
  });

  /* ── field updater ─────────────────────────── */
  const set = (field) => (e) => {
    let val = e.target.value;
    if (field === "universityCode")
      val = val.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    setForm((f) => ({ ...f, [field]: val }));
    // clear inline error on change
    if (fieldErrors[field])
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  /* ── step tab click (allow free navigation) ─ */
  const goToStep = (target) => {
    // validate current step first before moving forward
    if (target > step) {
      for (let s = step; s < target; s++) {
        const errs = getErrors(s, form);
        if (errs.length) {
          const map = {};
          errs.forEach((e) => { map[e.field] = e.msg; });
          setFieldErrors(map);
          setGlobalError("");
          return; // stay on current step
        }
      }
    }
    setFieldErrors({});
    setGlobalError("");
    setStep(target);
  };

  /* ── next button ────────────────────────────── */
  const next = () => {
    const errs = getErrors(step, form);
    if (errs.length) {
      const map = {};
      errs.forEach((e) => { map[e.field] = e.msg; });
      setFieldErrors(map);
      return;
    }
    setFieldErrors({});
    setStep((s) => s + 1);
  };

  /* ── submit ─────────────────────────────────── */
  const submit = async () => {
    // validate both steps before submitting
    const errs1 = getErrors(1, form);
    const errs2 = getErrors(2, form);
    const allErrs = [...errs1, ...errs2];
    if (allErrs.length) {
      const map = {};
      allErrs.forEach((e) => { map[e.field] = e.msg; });
      setFieldErrors(map);
      // jump to the first offending step
      if (errs1.length) setStep(1);
      else setStep(2);
      return;
    }
    try {
      setLoading(true);
      const result = await registerSuperAdmin({
        universityName:  form.universityName,
        universityCode:  form.universityCode,
        universityCity:  form.universityCity,
        universityState: form.universityState,
        universityPhone: form.universityPhone,
        universityEmail: form.universityEmail,
        adminName:       form.adminName,
        adminEmail:      form.adminEmail,
        adminPassword:   form.adminPassword,
        adminPhone:      form.adminPhone,
        tempUserId: tempUserId,
      });
      saveAuth(result);
      localStorage.removeItem("tempUserId");
      setDone(true);
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    } catch (err) {
      setGlobalError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── step completion status ─────────────────── */
  const stepDone = (s) => getErrors(s, form).length === 0 && (
    s === 1 ? (form.universityName.trim() && form.universityCode.length >= 2) :
    s === 2 ? (form.adminName.trim() && /\S+@\S+\.\S+/.test(form.adminEmail) && form.adminPassword.length >= 6 && form.adminPassword === form.adminConfirmPassword) :
    false
  );

  /* ── success screen ─────────────────────────── */
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#BDDDFC] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-sm w-full border border-[#88BDF2]/40">
          <div className="w-16 h-16 rounded-full bg-[#88BDF2]/20 flex items-center justify-center mx-auto mb-5 animate-pulse">
            <svg className="w-8 h-8 text-[#384959]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#384959] mb-2">Registration Successful!</h2>
          <p className="text-[#6A89A7] text-sm">Redirecting to login...</p>
          <div className="mt-8 flex justify-center">
            <div className="w-7 h-7 border-[3px] border-[#6A89A7] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  /* ── main layout ────────────────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#BDDDFC] p-4">
      <div className="w-full max-w-7xl flex rounded-2xl shadow-2xl overflow-hidden border border-[#88BDF2]/20">

        {/* ── LEFT PANEL ── */}
        <div className="relative w-[42%] bg-[#384959] flex flex-col p-10 overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#88BDF2]/8 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-[#BDDDFC]/6 pointer-events-none" />

          <div className="relative z-10 mb-auto">
            <p className="text-[10px] font-bold text-[#88BDF2] uppercase tracking-widest mb-8">
              University Portal
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight mb-3">
              Register your institution
            </h1>
            <p className="text-sm text-[#BDDDFC]/65 leading-relaxed">
              Set up your university and create a master administrator account in just a few steps.
            </p>
          </div>

          {/* vertical stepper */}
          <div className="relative z-10 mt-10 space-y-1">
            {STEPS.map((s, i) => {
              const isActive = step === s.id;
              const isDone   = stepDone(s.id);
              const isFuture = step < s.id && !isDone;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => goToStep(s.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-200 group
                      ${isActive ? "bg-white/10" : "hover:bg-white/6"}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200
                      ${isActive ? "bg-[#88BDF2] text-[#384959] scale-110 shadow-[0_0_0_4px_rgba(136,189,242,0.25)]" : ""}
                      ${isDone && !isActive ? "bg-[#6A89A7] text-[#BDDDFC]" : ""}
                      ${isFuture ? "bg-white/10 text-white/30 border border-white/15" : ""}
                    `}>
                      {isDone && !isActive
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        : s.id
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-semibold transition-colors
                        ${isActive ? "text-white" : isDone ? "text-[#BDDDFC]" : "text-white/35"}`}>
                        {s.label}
                      </p>
                      <p className={`text-xs transition-colors
                        ${isActive ? "text-[#BDDDFC]/70" : isDone ? "text-[#BDDDFC]/45" : "text-white/20"}`}>
                        {s.desc}
                      </p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`ml-7 w-0.5 h-6 mx-auto transition-colors duration-300
                      ${isDone ? "bg-[#6A89A7]" : "bg-white/10"}`}
                      style={{ marginLeft: "26px" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* bottom login link */}
          <div className="relative z-10 mt-10 pt-8 border-t border-white/10">
            <p className="text-xs text-[#BDDDFC]/45 mb-3">Already registered?</p>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#88BDF2] border border-[#88BDF2]/30 px-4 py-2 rounded-xl
                transition-all duration-200 hover:bg-[#88BDF2]/10 hover:border-[#88BDF2]/60 hover:text-white"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white flex flex-col min-h-[600px]">

          {/* top header */}
          <div className="px-10 pt-10 pb-2">
            {globalError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl font-medium flex items-center gap-2">
                <span>⚠</span> {globalError}
              </div>
            )}
            <h2 className="text-xl font-bold text-[#384959]">
              {step === 1 ? "University Information" : step === 2 ? "Super Admin Account" : "Review & Finalize"}
            </h2>
            <p className="text-sm text-[#6A89A7] mt-1">
              {step === 1 ? "Tell us about your institution." :
               step === 2 ? "Create the master administrator credentials." :
               "Check all details before completing registration."}
            </p>
          </div>

          {/* form body */}
          <div className="flex-1 px-10 py-6 overflow-y-auto">

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
                <Input
                  label="University Name" required
                  placeholder="e.g. Christ University"
                  value={form.universityName}
                  onChange={set("universityName")}
                  error={fieldErrors.universityName}
                />
                <Input
                  label="University Code" required
                  placeholder="CHRIST_UNI"
                  hint="Uppercase letters, numbers, underscores only"
                  value={form.universityCode}
                  onChange={set("universityCode")}
                  error={fieldErrors.universityCode}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City"  placeholder="Bangalore" value={form.universityCity}  onChange={set("universityCity")} />
                  <Input label="State" placeholder="Karnataka" value={form.universityState} onChange={set("universityState")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Phone" type="tel"   placeholder="+91 98765 43210"   value={form.universityPhone} onChange={set("universityPhone")} />
                  <Input label="Email" type="email" placeholder="admin@university.edu" value={form.universityEmail} onChange={set("universityEmail")} />
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
                <p className="text-xs text-[#6A89A7] bg-[#BDDDFC]/20 border border-[#88BDF2]/25 rounded-xl px-4 py-2.5">
                  The primary administrator responsible for all system-wide configuration.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name" required placeholder="John Doe"
                    value={form.adminName} onChange={set("adminName")}
                    error={fieldErrors.adminName} />
                  <Input label="Phone" type="tel" placeholder="+91 98765 43210"
                    value={form.adminPhone} onChange={set("adminPhone")} />
                </div>
                <Input
                  label="Email Address"
                  type="email"
                  value={form.adminEmail}
                  onChange={set("adminEmail")}
                  disabled
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Password"
                    required
                    isPassword
                    show={showPassword}
                    toggleShow={() => setShowPassword(!showPassword)}
                    placeholder="••••••••"
                    hint="Min. 6 characters"
                    value={form.adminPassword}
                    onChange={set("adminPassword")}
                    error={fieldErrors.adminPassword}
                  />

                  <Input
                    label="Confirm Password"
                    required
                    isPassword
                    show={showConfirmPassword}
                    toggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                    placeholder="••••••••"
                    value={form.adminConfirmPassword}
                    onChange={set("adminConfirmPassword")}
                    error={fieldErrors.adminConfirmPassword}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3 — Review ── */}
            {step === 3 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease]">

                {/* University section */}
                <ReviewSection
                  title="University"
                  onEdit={() => goToStep(1)}
                  rows={[
                    { key: "Name",     val: form.universityName, field: "universityName",  required: true,  step: 1 },
                    { key: "Code",     val: form.universityCode, field: "universityCode",  required: true,  step: 1, mono: true },
                    { key: "City",     val: form.universityCity,  field: "universityCity",  required: false, step: 1 },
                    { key: "State",    val: form.universityState, field: "universityState", required: false, step: 1 },
                    { key: "Phone",    val: form.universityPhone, field: "universityPhone", required: false, step: 1 },
                    { key: "Email",    val: form.universityEmail, field: "universityEmail", required: false, step: 1 },
                  ]}
                  errors={fieldErrors}
                  onGoToStep={goToStep}
                />

                {/* Admin section */}
                <ReviewSection
                  title="Super Admin"
                  onEdit={() => goToStep(2)}
                  rows={[
                    { key: "Full Name", val: form.adminName,    field: "adminName",    required: true,  step: 2 },
                    { key: "Email",     val: form.adminEmail,   field: "adminEmail",   required: true,  step: 2 },
                    { key: "Phone",     val: form.adminPhone,   field: "adminPhone",   required: false, step: 2 },
                    { key: "Password",  val: form.adminPassword ? "••••••••" : "",  field: "adminPassword",  required: true, step: 2 },
                  ]}
                  errors={fieldErrors}
                  onGoToStep={goToStep}
                />

                <div className="bg-[#88BDF2]/10 border-l-4 border-[#88BDF2] rounded-r-xl px-4 py-3 text-sm text-[#384959] italic">
                  Upon completion, log in as Super Admin to manage institutional divisions.
                </div>
              </div>
            )}
          </div>

          {/* nav buttons */}
          <div className="px-10 pb-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => { setStep((s) => s - 1); setFieldErrors({}); setGlobalError(""); }}
                className="flex-1 py-3 rounded-xl border-2 border-[#88BDF2] text-[#384959] font-bold text-sm
                  transition-all duration-200 hover:bg-[#BDDDFC]/25 hover:border-[#6A89A7] hover:-translate-y-0.5"
              >
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={next}
                className="flex-1 py-3 rounded-xl bg-[#6A89A7] hover:bg-[#384959] text-white font-bold text-sm
                  transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                Next Step →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#384959] hover:bg-black text-white font-bold text-sm
                  transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </span>
                ) : "🚀 Complete Registration"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ReviewSection sub-component ─────────────────────────── */
function ReviewSection({ title, rows, errors, onEdit, onGoToStep }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* section header */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-[#384959] uppercase tracking-wider">{title}</span>
        <button
          onClick={onEdit}
          className="text-xs text-[#6A89A7] font-semibold hover:text-[#384959] transition-colors px-2 py-1 rounded-lg hover:bg-[#88BDF2]/15"
        >
          Edit
        </button>
      </div>

      {/* rows */}
      <div className="divide-y divide-slate-100">
        {rows.map(({ key, val, field, required, step, mono }) => {
          const isEmpty = required && !val.trim();
          const hasErr  = !!errors[field];
          const showWarning = isEmpty || hasErr;
          return (
            <div
              key={field}
              className={`flex items-center justify-between px-5 py-3 text-sm transition-colors
                ${showWarning ? "bg-red-50" : "bg-white"}`}
            >
              <span className="text-[#6A89A7] font-medium w-32 shrink-0">{key}</span>
              {showWarning ? (
                <button
                  onClick={() => onGoToStep(step)}
                  className="flex items-center gap-1.5 text-red-500 font-semibold text-xs
                    hover:text-red-700 transition-colors group"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {hasErr ? errors[field] : "Complete this field"}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              ) : (
                <span className={`text-[#384959] font-medium text-right break-all
                  ${mono ? "font-mono text-xs bg-[#BDDDFC]/30 text-[#6A89A7] px-2 py-0.5 rounded-md" : ""}`}>
                  {val || <span className="text-slate-300 italic text-xs">—</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}