// client/src/superAdmin/pages/schoolAdmins/components/AddSchoolAdminModal.jsx
import React, { useState, useEffect } from "react";
import {
  UserCog, X, Check, Loader2, Eye, EyeOff, ChevronRight,
  ChevronLeft, User, Briefcase, FileText, Building2, Lock,
  ShieldAlert, Infinity,
} from "lucide-react";
import { createSchoolAdmin, updateSchoolAdmin } from "./components/schoolAdminApi.js";
import { getSchools } from "../schools/components/SchoolsApi.js";
import { getToken } from "../../../auth/storage.js"; // ✅ reads token from auth.token, not "token" key

const font = { fontFamily: "'DM Sans', sans-serif" };

/* ─── Reusable field components ─────────────────────────── */
function FInput({ label, required, value, onChange, type = "text", error, placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <input
        type={type} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="py-2 px-3 rounded-lg text-sm outline-none transition-all"
        style={{
          border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`,
          ...font, color: "#384959",
          background: disabled ? "#f8fbff" : "#fff",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => { if (!disabled) e.target.style.borderColor = "#88BDF2"; }}
        onBlur={(e) => (e.target.style.borderColor = error ? "#f87171" : "#BDDDFC")}
      />
      {error && <span className="text-[11px]" style={{ color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function FSelect({ label, required, value, onChange, options, error, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="py-2 px-3 rounded-lg text-sm outline-none"
        style={{
          border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`,
          ...font, color: value ? "#384959" : "#94a3b8", background: "#fff",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-[11px]" style={{ color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function FileUploadField({ label, accept, value, onChange, hint }) {
  const [preview, setPreview] = useState(null);
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onChange(file);
    if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>{label}</label>
      <label
        className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
        style={{ border: "1.5px dashed #BDDDFC", background: "#f8fbff", padding: "18px 12px", minHeight: 80 }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#88BDF2"; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = "#BDDDFC"; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "#BDDDFC";
          const file = e.dataTransfer.files[0];
          if (file) { onChange(file); if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file)); }
        }}
      >
        {preview
          ? <img src={preview} alt="preview" className="h-16 w-16 object-cover rounded-lg" />
          : <FileText size={22} style={{ color: "#BDDDFC" }} />}
        <span className="text-xs text-center" style={{ color: "#6A89A7", ...font }}>
          {value ? value.name : <>Click or drag & drop<br /><span style={{ color: "#94a3b8" }}>{hint}</span></>}
        </span>
        <input type="file" accept={accept} className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────── */
const STEPS = [
  { label: "Account", icon: Lock },
  { label: "Admin Details", icon: Briefcase },
  { label: "Documents", icon: FileText },
];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 w-full px-6 py-4" style={{ borderBottom: "1.5px solid #BDDDFC" }}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <div
                className="flex items-center justify-center rounded-full transition-all"
                style={{
                  width: 34, height: 34,
                  background: done ? "#384959" : active ? "#88BDF2" : "#f0f7ff",
                  border: `2px solid ${done ? "#384959" : active ? "#88BDF2" : "#BDDDFC"}`,
                }}
              >
                {done
                  ? <Check size={15} color="#fff" />
                  : <Icon size={15} color={active ? "#fff" : "#BDDDFC"} />}
              </div>
              <span className="text-[10px] font-semibold" style={{ ...font, color: active ? "#384959" : done ? "#384959" : "#94a3b8" }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height: 2, flex: 1, background: done ? "#384959" : "#BDDDFC", marginBottom: 20, borderRadius: 2 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Usage banner ───────────────────────────────────────── */
/**
 * usageInfo shape (from GET /api/school-admins/usage):
 *   { used, limit, isUnlimited, planName, planExpired, hasActivePlan }
 *
 * Display rules:
 *   - isUnlimited  → green banner, show ∞
 *   - limit reached → orange/red banner, block submit
 *   - planExpired   → red banner, block submit
 *   - no plan       → red banner, block submit
 */
function UsageBanner({ usageInfo, loading }) {
  if (loading) {
    return (
      <div className="mx-6 mt-4 px-4 py-3 rounded-xl animate-pulse"
        style={{ background: "#f0f7ff", border: "1px solid #BDDDFC" }}>
        <div className="h-3 w-32 rounded" style={{ background: "#BDDDFC" }} />
        <div className="h-3 w-48 rounded mt-2" style={{ background: "#BDDDFC" }} />
      </div>
    );
  }

  if (!usageInfo) return null;

  const {
    used = 0,
    limit = null,
    isUnlimited = false,
    planName = "—",
    planExpired = false,
    hasActivePlan = false,
  } = usageInfo;

  const limitReached = hasActivePlan && !isUnlimited && !planExpired && used >= limit;

  // Determine banner variant
  let variant = "ok"; // ok | warn | error
  let title = "School Admin Usage";
  let message = "";

  if (!hasActivePlan) {
    variant = "error";
    title = "No Active Plan";
    message = "Purchase a plan to start adding school admins.";
  } else if (planExpired) {
    variant = "error";
    title = "Plan Expired";
    message = `Your ${planName} plan has expired. Please renew to add admins.`;
  } else if (limitReached) {
    variant = "warn";
    title = "Admin Limit Reached";
    message = `${used}/${limit} admins used on your ${planName} plan. Upgrade to add more.`;
  } else if (isUnlimited) {
    variant = "ok";
    title = `${planName} Plan — Unlimited Admins`;
    message = `${used} admin${used !== 1 ? "s" : ""} created so far.`;
  } else {
    variant = "ok";
    title = "School Admin Usage";
    message = `${used}/${limit} admins used on your ${planName} plan.`;
  }

  const colors = {
    ok:   { bg: "#f0fdf4", border: "#86efac", text: "#166534", badge: "#dcfce7" },
    warn: { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", badge: "#ffedd5" },
    error:{ bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", badge: "#fee2e2" },
  }[variant];

  const displayLimit = isUnlimited ? "∞" : (limit ?? "—");

  return (
    <div
      className="mx-6 mt-4 px-4 py-3 rounded-xl"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, ...font }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          {variant !== "ok" && (
            <ShieldAlert size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          )}
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs mt-0.5">{message}</div>
          </div>
        </div>

        {hasActivePlan && (
          <div
            className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0"
            style={{ background: colors.badge }}
          >
            {used}
            <span className="opacity-50">/</span>
            {isUnlimited ? <Infinity size={12} /> : displayLimit}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Initial form state ─────────────────────────────────── */
const INIT = {
  name: "", email: "", password: "", confirmPassword: "", schoolId: "",
  employeeId: "", designation: "School Admin",
  phoneNumber: "", address: "", salary: "",
  bankName: "", accountNumber: "", ifscCode: "",
  panNumber: "", aadharNumber: "",
  photo: null, panDocument: null, aadharDocument: null,
};

/* ─── Main component ─────────────────────────────────────── */
export default function AddSchoolAdminModal({ onClose, onSuccess, admin = null }) {
  const isEdit = Boolean(admin);

  const buildInitial = () => {
    if (!isEdit) return { ...INIT };
    const p = admin.schoolAdminProfile || {};
    return {
      ...INIT,
      name:          admin.name  || "",
      email:         admin.email || "",
      schoolId:      admin.schoolId || "",
      employeeId:    p.employeeId    || "",
      designation:   p.designation   || "School Admin",
      phoneNumber:   p.phoneNumber   || "",
      address:       p.address       || "",
      salary:        p.basicSalary != null ? String(p.basicSalary) : "",
      bankName:      p.bankName      || "",
      accountNumber: p.accountNumber || "",
      ifscCode:      p.ifscCode      || "",
      panNumber:     p.panNumber     || "",
      aadharNumber:  p.aadharNumber  || "",
    };
  };

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(buildInitial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  // ── Plan usage (replaces the old separate admins-count + payment fetches) ──
  const [usageInfo, setUsageInfo] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const set = (k) => (v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
    setApiError("");
  };

  // Derive blocking states from usageInfo
  const limitReached = usageInfo
    ? (!usageInfo.hasActivePlan ||
       usageInfo.planExpired ||
       (!usageInfo.isUnlimited && usageInfo.used >= usageInfo.limit))
    : false;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ── Schools ──
        const schoolsData = await getSchools();
        setSchools(schoolsData.schools || []);
        setSchoolsLoading(false);

        // ── Plan usage: single dedicated endpoint ──
        // GET /api/school-admins/usage
        // Returns: { used, limit, isUnlimited, planName, planExpired, hasActivePlan }
        const usageRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/school-admins/usage`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`, // ✅ reads auth.token (not the missing "token" key)
            },
          }
        );

        if (!usageRes.ok) throw new Error("Failed to fetch usage");

        const usageData = await usageRes.json();
        setUsageInfo(usageData);
      } catch (err) {
        console.error(err);
        setApiError("Failed to load plan info. Please refresh.");
      } finally {
        setUsageLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* ─── Per-step validation ─── */
  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!form.name.trim()) errs.name = "Required";
      if (!form.email.trim()) errs.email = "Required";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = "Enter a valid email";
      if (!form.schoolId) errs.schoolId = "Please select a school";
      const needsPassword = !isEdit || changePassword;
      if (needsPassword) {
        if (!form.password) errs.password = "Required";
        else if (form.password.length < 6) errs.password = "Minimum 6 characters";
        if (!form.confirmPassword) errs.confirmPassword = "Required";
        else if (form.password !== form.confirmPassword)
          errs.confirmPassword = "Passwords do not match";
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((p) => p + 1);
  };

  const handleBack = () => setStep((p) => p - 1);

  const handleSubmit = async () => {
    if (limitReached && !isEdit) {
      setApiError("Admin limit reached. Please upgrade your plan.");
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const profilePayload = {
        employeeId:    form.employeeId    || undefined,
        designation:   form.designation   || "School Admin",
        phoneNumber:   form.phoneNumber   || undefined,
        address:       form.address       || undefined,
        salary:        Number(form.salary || 0),
        bankName:      form.bankName      || undefined,
        accountNumber: form.accountNumber || undefined,
        ifscCode:      form.ifscCode      || undefined,
        panNumber:     form.panNumber     || undefined,
        aadharNumber:  form.aadharNumber  || undefined,
      };

      if (isEdit) {
        const payload = {
          name:  form.name,
          email: form.email,
          ...(changePassword && { password: form.password }),
          ...profilePayload,
        };
        await updateSchoolAdmin(admin?.id, payload);
      } else {
        const payload = {
          name:     form.name,
          email:    form.email,
          password: form.password,
          schoolId: form.schoolId,
          ...profilePayload,
        };
        await createSchoolAdmin(payload);
        // Optimistically update usage count
        setUsageInfo((prev) =>
          prev ? { ...prev, used: prev.used + 1 } : prev
        );
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Step renderers ─── */
  const renderStep = () => {
    /* ══ STEP 0: Account ══ */
    if (step === 0) return (
      <div className="flex flex-col gap-4">
        <FInput
          label="Full Name" required
          value={form.name} onChange={set("name")}
          placeholder="John Doe" error={errors.name}
        />
        <FInput
          label="Email Address" required type="email"
          value={form.email} onChange={set("email")}
          placeholder="john@school.edu" error={errors.email}
          disabled={isEdit}
        />
        <FSelect
          label="School" required
          value={form.schoolId} onChange={set("schoolId")}
          error={errors.schoolId}
          disabled={isEdit || schoolsLoading}
          options={[
            { value: "", label: schoolsLoading ? "Loading schools…" : "Select a school" },
            ...schools.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />

        {/* Password section */}
        {isEdit ? (
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
                className="rounded"
              />
              Change Password
            </label>
          </div>
        ) : null}

        {(!isEdit || changePassword) && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
                Password <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full py-2 pl-3 pr-10 rounded-lg text-sm outline-none"
                  style={{ border: `1.5px solid ${errors.password ? "#f87171" : "#BDDDFC"}`, ...font, color: "#384959" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="text-[11px]" style={{ color: "#dc2626" }}>{errors.password}</span>}
            </div>
            <FInput
              label="Confirm Password" required type="password"
              value={form.confirmPassword} onChange={set("confirmPassword")}
              placeholder="Re-enter password" error={errors.confirmPassword}
            />
          </>
        )}
      </div>
    );

    /* ══ STEP 1: Admin Details ══ */
    if (step === 1) return (
      <div className="flex flex-col gap-5">
        <section>
          <SectionHeading icon={<User size={14} />} title="Personal Info" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FInput label="Employee ID" value={form.employeeId} onChange={set("employeeId")} placeholder="ADM-001" />
            <FInput label="Designation" value={form.designation} onChange={set("designation")} placeholder="School Admin" />
            <FInput label="Phone Number" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+91 9876543210" />
            <FInput label="Basic Salary (₹)" value={form.salary} onChange={set("salary")} placeholder="50000" type="number" />
          </div>
          <div className="mt-3">
            <FInput label="Address" value={form.address} onChange={set("address")} placeholder="123, MG Road, Bengaluru" />
          </div>
        </section>

        <section>
          <SectionHeading icon={<FileText size={14} />} title="Identity" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FInput label="PAN Number" value={form.panNumber} onChange={set("panNumber")} placeholder="ABCDE1234F" />
            <FInput label="Aadhar Number" value={form.aadharNumber} onChange={set("aadharNumber")} placeholder="1234 5678 9012" />
          </div>
        </section>

        <section>
          <SectionHeading icon={<Building2 size={14} />} title="Bank Details" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FInput label="Bank Name" value={form.bankName} onChange={set("bankName")} placeholder="State Bank of India" />
            <FInput label="Account Number" value={form.accountNumber} onChange={set("accountNumber")} placeholder="1234567890" />
            <FInput label="IFSC Code" value={form.ifscCode} onChange={set("ifscCode")} placeholder="SBIN0001234" />
          </div>
        </section>
      </div>
    );

    /* ══ STEP 2: Documents ══ */
    if (step === 2) return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "#f0f7ff", border: "1.5px solid #BDDDFC" }}>
          <FileText size={18} style={{ color: "#88BDF2" }} />
          <div>
            <p className="text-xs font-bold" style={{ ...font, color: "#384959" }}>Upload Documents</p>
            <p className="text-[11px]" style={{ ...font, color: "#6A89A7" }}>
              Upload admin profile photo and ID documents.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FileUploadField label="Profile Photo" accept="image/*" value={form.photo} onChange={(f) => setForm((p) => ({ ...p, photo: f }))} hint="JPG or PNG" />
          <FileUploadField label="PAN Card Document" accept=".pdf,image/*" value={form.panDocument} onChange={(f) => setForm((p) => ({ ...p, panDocument: f }))} hint="PDF or image" />
          <FileUploadField label="Aadhar Card Document" accept=".pdf,image/*" value={form.aadharDocument} onChange={(f) => setForm((p) => ({ ...p, aadharDocument: f }))} hint="PDF or image" />
        </div>
      </div>
    );
  };

  const isLastStep = step === STEPS.length - 1;
  const canSubmit = !loading && (!limitReached || isEdit);

  const btnBase = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 18px", borderRadius: 10, fontSize: 13,
    fontWeight: 600, border: "none", cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", transition: "opacity 0.15s",
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(56,73,89,0.35)", backdropFilter: "blur(3px)" }} />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col overflow-hidden"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "min(600px, 96vw)", maxHeight: "90vh",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 24px 64px rgba(56,73,89,0.18)",
          border: "1.5px solid #BDDDFC",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1.5px solid #BDDDFC" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: "#384959" }}>
              <UserCog size={18} color="#fff" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ ...font, color: "#384959" }}>
                {isEdit ? "Edit School Admin" : "Add School Admin"}
              </h2>
              <p className="text-[11px]" style={{ ...font, color: "#6A89A7" }}>
                Step {step + 1} of {STEPS.length}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "#f3f8fd", border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 8px", color: "#6A89A7" }}>
            <X size={16} />
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* ── Usage Banner (only shown when adding, not editing) ── */}
        {!isEdit && (
          <UsageBanner usageInfo={usageInfo} loading={usageLoading} />
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderStep()}
          {apiError && (
            <div className="mt-4 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "#fff1f0", color: "#dc2626", border: "1px solid #f87171", ...font }}>
              {apiError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1.5px solid #BDDDFC" }}>
          {step === 0 ? (
            <button onClick={onClose} style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}>Cancel</button>
          ) : (
            <button onClick={handleBack} style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}>
              <ChevronLeft size={15} /> Back
            </button>
          )}

          {!isLastStep ? (
            <button onClick={handleNext} style={{ ...btnBase, background: "#384959", color: "#fff" }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                ...btnBase, background: "#384959", color: "#fff",
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? "Saving…" : "Creating…"}</>
                : <><Check size={14} /> {isEdit ? "Save Changes" : "Create Admin"}</>}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Section heading helper ─────────────────────────────── */
function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid #BDDDFC" }}>
      <span style={{ color: "#88BDF2" }}>{icon}</span>
      <span className="text-xs font-bold uppercase tracking-wide"
        style={{ fontFamily: "'DM Sans', sans-serif", color: "#384959" }}>
        {title}
      </span>
    </div>
  );
}