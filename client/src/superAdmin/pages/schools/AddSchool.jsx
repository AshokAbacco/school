// client/src/superAdmin/pages/schools/components/AddSchoolModal.jsx
import React, { useState, useEffect } from "react";
import { Building2, MapPin, X, ChevronRight, ChevronLeft, Check, Loader2, Info, ShieldAlert, Infinity } from "lucide-react";
import { createSchool, updateSchool } from "./components/SchoolsApi";
import { getToken } from "../../../auth/storage.js"; // ✅ reads token from auth.token correctly

const SCHOOL_TYPES = [
  { label: "School (Class 1–10)",               value: "SCHOOL" },
  { label: "PUC / Pre-University (Class 11–12)", value: "PUC" },
  { label: "Diploma",                            value: "DIPLOMA" },
  { label: "Degree / Undergraduate",             value: "DEGREE" },
  { label: "Postgraduate",                       value: "POSTGRADUATE" },
  { label: "Other",                              value: "OTHER" },
];

const INIT = {
  name: "", code: "", type: "SCHOOL", email: "", phone: "",
  address: "", city: "", state: "",
};

const REQUIRED = ["name", "code", "type"];
const font = { fontFamily: "'DM Sans', sans-serif" };

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
          ...font,
          color: "#384959",
          background: disabled ? "#f8fbff" : "#fff",
          cursor: disabled ? "not-allowed" : "text",
        }}
        onFocus={(e) => { if (!disabled) e.target.style.borderColor = "#88BDF2"; }}
        onBlur={(e)  => (e.target.style.borderColor = error ? "#f87171" : "#BDDDFC")}
      />
      {error && <span className="text-[11px]" style={{ color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

function FSelect({ label, required, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-2 px-3 rounded-lg text-sm outline-none cursor-pointer"
        style={{ border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`, ...font, color: "#384959", background: "#fff" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-[11px]" style={{ color: "#dc2626" }}>{error}</span>}
    </div>
  );
}

const STEPS = [
  { label: "Basic Info", icon: Building2 },
  { label: "Location",   icon: MapPin },
];

// ── Usage Banner ──────────────────────────────────────────────────────────────
// usageInfo shape (from GET /api/schools/usage):
//   { used, limit, isUnlimited, planName, planExpired, hasActivePlan }
function UsageBanner({ usageInfo, loading }) {
  if (loading) {
    return (
      <div className="mx-6 mt-4 px-4 py-3 rounded-xl animate-pulse"
        style={{ background: "#f0f7ff", border: "1px solid #BDDDFC" }}>
        <div className="h-3 w-36 rounded mb-2" style={{ background: "#BDDDFC" }} />
        <div className="h-3 w-52 rounded"      style={{ background: "#BDDDFC" }} />
      </div>
    );
  }

  if (!usageInfo) return null;

  const {
    used         = 0,
    limit        = null,
    isUnlimited  = false,
    planName     = "—",
    planExpired  = false,
    hasActivePlan = false,
  } = usageInfo;

  const limitReached = hasActivePlan && !isUnlimited && !planExpired && used >= limit;

  let variant = "ok";
  let title   = "School Usage";
  let message = "";

  if (!hasActivePlan) {
    variant = "error";
    title   = "No Active Plan";
    message = "Purchase a plan to start adding schools.";
  } else if (planExpired) {
    variant = "error";
    title   = "Plan Expired";
    message = `Your ${planName} plan has expired. Please renew to add schools.`;
  } else if (limitReached) {
    variant = "warn";
    title   = "School Limit Reached";
    message = `${used}/${limit} schools used on your ${planName} plan. Upgrade to add more.`;
  } else if (isUnlimited) {
    variant = "ok";
    title   = `${planName} Plan — Unlimited Schools`;
    message = `${used} school${used !== 1 ? "s" : ""} created so far.`;
  } else {
    variant = "ok";
    title   = "School Usage";
    message = `${used}/${limit} schools used on your ${planName} plan.`;
  }

  const colors = {
    ok:    { bg: "#f0fdf4", border: "#86efac", text: "#166534", badge: "#dcfce7" },
    warn:  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", badge: "#ffedd5" },
    error: { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", badge: "#fee2e2" },
  }[variant];

  return (
    <div className="mx-6 mt-4 px-4 py-3 rounded-xl"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, ...font }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          {variant !== "ok"
            ? <ShieldAlert size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            : <Info        size={16} style={{ marginTop: 1, flexShrink: 0 }} />}
          <div>
            <div className="font-semibold text-sm">{title}</div>
            <div className="text-xs mt-0.5">{message}</div>
          </div>
        </div>

        {hasActivePlan && (
          <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0"
            style={{ background: colors.badge }}>
            {used}
            <span className="opacity-50">/</span>
            {isUnlimited ? <Infinity size={12} /> : limit}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AddSchoolModal({ onClose, onSuccess, school = null }) {
  const isEdit = Boolean(school);

  const buildInitial = () =>
    isEdit
      ? {
          name:    school.name    || "",
          code:    school.code    || "",
          type:    school.type    || "SCHOOL",
          email:   school.email   || "",
          phone:   school.phone   || "",
          address: school.address || "",
          city:    school.city    || "",
          state:   school.state   || "",
        }
      : INIT;

  const [form, setForm]       = useState(buildInitial);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [step, setStep]       = useState(1);

  // ── Usage state (replaces the old separate schools + payment fetches) ──
  const [usageInfo, setUsageInfo]       = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const set = (k) => (v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
    setApiError("");
  };

  // Derive limit-reached from usageInfo
  const limitReached = usageInfo
    ? (!usageInfo.hasActivePlan ||
        usageInfo.planExpired ||
        (!usageInfo.isUnlimited && usageInfo.used >= usageInfo.limit))
    : false;

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);

    // ── Single usage fetch replaces two separate fetches ──────────────────
    // GET /api/schools/usage
    // Returns: { used, limit, isUnlimited, planName, planExpired, hasActivePlan }
    const fetchUsage = async () => {
      if (isEdit) { setUsageLoading(false); return; }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/schools/usage`,
          { headers: { Authorization: `Bearer ${getToken()}` } } // ✅ correct token
        );
        if (!res.ok) throw new Error("Usage fetch failed");
        const data = await res.json();
        setUsageInfo(data);
      } catch (err) {
        console.error("School usage fetch failed:", err);
        setApiError("Failed to load plan info. Please refresh.");
      } finally {
        setUsageLoading(false);
      }
    };

    fetchUsage();

    return () => window.removeEventListener("keydown", h);
  }, [onClose, isEdit]);

  const validate = () => {
    const errs = {};
    REQUIRED.forEach((k) => { if (!form[k]) errs[k] = "Required"; });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Enter a valid email";
    return errs;
  };

  const handleSubmit = async () => {
    if (limitReached && !isEdit) {
      setApiError("School limit reached. Please upgrade your plan.");
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      if (["address", "city", "state"].includes(firstKey)) setStep(2);
      else setStep(1);
      return;
    }

    setLoading(true);
    setApiError("");

    const payload = {
      name:    form.name.trim(),
      code:    form.code.trim().toUpperCase(),
      type:    form.type,
      email:   form.email.trim()   || undefined,
      phone:   form.phone.trim()   || undefined,
      address: form.address.trim() || undefined,
      city:    form.city.trim()    || undefined,
      state:   form.state.trim()   || undefined,
    };

    try {
      if (isEdit) {
        const result = await updateSchool(school.id, payload);
        if (onSuccess) onSuccess(result.updatedSchool);
      } else {
        const result = await createSchool(payload);
        if (onSuccess) onSuccess(result.school);
        // Optimistically update usage count
        setUsageInfo((prev) => prev ? { ...prev, used: prev.used + 1 } : prev);
      }
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

  const btnBase = {
    ...font,
    fontSize: 13,
    cursor: "pointer",
    border: "none",
    borderRadius: 10,
    padding: "9px 20px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(56,73,89,0.3)", backdropFilter: "blur(2px)" }}
      />

      <div
        className="fixed z-50 flex flex-col overflow-hidden"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 540, maxWidth: "95vw", maxHeight: "92vh",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 20px 60px rgba(56,73,89,0.2)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:translate(-50%,-47%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1.5px solid #BDDDFC" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #384959, #6A89A7)" }}>
              <Building2 size={17} color="#fff" />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ ...font, color: "#384959" }}>
                {isEdit ? "Edit School" : "Add New School"}
              </h2>
              <p className="text-xs mt-0.5" style={{ ...font, color: "#6A89A7" }}>
                {isEdit ? "Update school details below" : "Complete all steps to register the school"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 gap-1 flex-shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone   = step > num;
            const IconComp = s.icon;
            return (
              <React.Fragment key={num}>
                <div className="flex items-center gap-1.5 cursor-pointer select-none"
                  onClick={() => setStep(num)}>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: isActive || isDone ? "#384959" : "#f1f5f9",
                      color:      isActive || isDone ? "#fff"    : "#6A89A7",
                    }}
                  >
                    {isDone ? <Check size={12} /> : num}
                  </div>
                  <span className="text-xs font-semibold flex items-center gap-1"
                    style={{ ...font, color: isActive ? "#384959" : "#6A89A7" }}>
                    <IconComp size={12} />
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-2" style={{ background: "#BDDDFC" }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ✅ Usage Banner — single source of truth from /api/schools/usage */}
        {!isEdit && (
          <UsageBanner usageInfo={usageInfo} loading={usageLoading} />
        )}

        {/* API error banner */}
        {apiError && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm flex-shrink-0 flex items-center gap-2"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", ...font }}>
            <X size={14} />
            {apiError}
          </div>
        )}

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <FInput
                label="School Name" required
                value={form.name} onChange={set("name")}
                error={errors.name} placeholder="e.g. Green Valley High School"
                disabled={limitReached && !isEdit}
              />
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="School Code" required
                  value={form.code} onChange={set("code")}
                  error={errors.code} placeholder="e.g. CHRIST_HIGH"
                  disabled={isEdit}
                />
                <FSelect
                  label="School Type" required
                  value={form.type} onChange={set("type")}
                  error={errors.type} options={SCHOOL_TYPES}
                />
              </div>
              <FInput
                label="School Email"
                value={form.email} onChange={set("email")}
                type="email" error={errors.email} placeholder="school@example.com"
              />
              <FInput
                label="Phone"
                value={form.phone} onChange={set("phone")}
                placeholder="+91 98765 43210"
              />
              <div className="mt-1 px-3 py-3 rounded-xl text-xs flex items-start gap-2"
                style={{ background: "#f8fbff", color: "#6A89A7", border: "1px solid #BDDDFC", ...font }}>
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                {isEdit
                  ? "School Code is locked and cannot be changed after creation."
                  : "School Code must be unique. It will be stored in uppercase automatically."}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <FInput
                label="Street Address"
                value={form.address} onChange={set("address")}
                placeholder="Building no, Street name"
              />
              <div className="grid grid-cols-2 gap-4">
                <FInput label="City"  value={form.city}  onChange={set("city")}  placeholder="City" />
                <FInput label="State" value={form.state} onChange={set("state")} placeholder="State" />
              </div>
              <div className="mt-2 px-3 py-3 rounded-xl text-xs flex items-start gap-2"
                style={{ background: "#f8fbff", color: "#6A89A7", border: "1px solid #BDDDFC", ...font }}>
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                Location details are optional and can be updated later from the school's profile.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1.5px solid #BDDDFC" }}>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)}
                style={{ ...btnBase, background: "#f3f8fd", color: "#384959" }}>
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button onClick={onClose} style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}>
              Cancel
            </button>
          </div>

          {step < STEPS.length ? (
            <button onClick={() => setStep((s) => s + 1)}
              style={{ ...btnBase, background: "#384959", color: "#fff" }}>
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || (limitReached && !isEdit)}
              style={{
                ...btnBase,
                background: "#384959", color: "#fff",
                opacity: loading || (limitReached && !isEdit) ? 0.5 : 1,
                cursor:  loading || (limitReached && !isEdit) ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? "Saving…" : "Creating…"}</>
                : <><Check size={14} /> {isEdit ? "Save Changes" : "Create School"}</>}
            </button>
          )}
        </div>
      </div>
    </>
  );
}