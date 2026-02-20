// client/src/superAdmin/pages/schools/components/AddSchoolModal.jsx
import React, { useState, useEffect } from "react";
import { createSchool } from "./components/SchoolsApi";

const SCHOOL_TYPES = [
  { value: "PRIMARY",       label: "Primary School (Class 1–5)" },
  { value: "UPPER_PRIMARY", label: "Upper Primary (Class 6–8)" },
  { value: "HIGH_SCHOOL",   label: "High School (Class 9–10)" },
  { value: "PUC",           label: "PUC / Pre-University (Class 11–12)" },
  { value: "DEGREE",        label: "Degree / Undergraduate" },
  { value: "POSTGRADUATE",  label: "Postgraduate" },
  { value: "OTHER",         label: "Other" },
];

const INIT = {
  name: "", code: "", type: "PRIMARY", email: "", phone: "",
  address: "", city: "", state: "",
};

const REQUIRED = ["name", "code", "type"];
const font = { fontFamily: "'DM Sans', sans-serif" };

function FInput({ label, required, value, onChange, type = "text", error, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="py-2 px-3 rounded-lg text-sm outline-none transition-all"
        style={{ border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`, ...font, color: "#384959", background: "#fff" }}
        onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
        onBlur={(e) => (e.target.style.borderColor = error ? "#f87171" : "#BDDDFC")}
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
        value={value} onChange={(e) => onChange(e.target.value)}
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
  { label: "Basic Info", icon: "🏫" },
  { label: "Location",   icon: "📍" },
];

export default function AddSchoolModal({ onClose, onSuccess }) {
  const [form, setForm]         = useState(INIT);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");
  const [step, setStep]         = useState(1);

  const set = (k) => (v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
    setApiError("");
  };

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    REQUIRED.forEach((k) => { if (!form[k]) errs[k] = "Required"; });
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errs.email = "Enter a valid email";
    return errs;
  };

  const handleSubmit = async () => {
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

    try {
      // ✅ schoolsApi sends Bearer token from getToken() automatically
      const result = await createSchool({
        name:    form.name.trim(),
        code:    form.code.trim().toUpperCase(),
        type:    form.type,
        email:   form.email.trim()   || undefined,
        phone:   form.phone.trim()   || undefined,
        address: form.address.trim() || undefined,
        city:    form.city.trim()    || undefined,
        state:   form.state.trim()   || undefined,
      });

      if (onSuccess) onSuccess(result.school);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const btnBase = { ...font, fontSize: 13, cursor: "pointer", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 600 };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(56,73,89,0.3)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
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
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1.5px solid #BDDDFC" }}>
          <div>
            <h2 className="font-bold text-base" style={{ ...font, color: "#384959" }}>Add New School</h2>
            <p className="text-xs mt-0.5" style={{ ...font, color: "#6A89A7" }}>Complete all steps to register the school</p>
          </div>
          <button onClick={onClose} style={{ ...font, background: "none", border: "none", cursor: "pointer", color: "#6A89A7", fontSize: 22 }}>×</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 gap-1 flex-shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <React.Fragment key={num}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{ background: isActive || isDone ? "#384959" : "#f1f5f9", color: isActive || isDone ? "#fff" : "#6A89A7" }}
                  >
                    {isDone ? "✓" : num}
                  </div>
                  <span className="text-xs font-semibold" style={{ ...font, color: isActive ? "#384959" : "#6A89A7" }}>
                    {s.icon} {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: "#BDDDFC" }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm flex-shrink-0"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", ...font }}>
            {apiError}
          </div>
        )}

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <FInput label="School Name" required value={form.name} onChange={set("name")} error={errors.name} placeholder="e.g. Green Valley High School" />
              <div className="grid grid-cols-2 gap-4">
                <FInput label="School Code" required value={form.code} onChange={set("code")} error={errors.code} placeholder="e.g. CHRIST_HIGH" />
                <FSelect label="School Type" required value={form.type} onChange={set("type")} error={errors.type} options={SCHOOL_TYPES} />
              </div>
              <FInput label="School Email" value={form.email} onChange={set("email")} type="email" error={errors.email} placeholder="school@example.com" />
              <FInput label="Phone" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
              <div className="mt-1 px-3 py-3 rounded-xl text-xs" style={{ background: "#f8fbff", color: "#6A89A7", border: "1px solid #BDDDFC", ...font }}>
                💡 School Code must be unique. It will be stored in uppercase automatically.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <FInput label="Street Address" value={form.address} onChange={set("address")} placeholder="Building no, Street name" />
              <div className="grid grid-cols-2 gap-4">
                <FInput label="City" value={form.city} onChange={set("city")} placeholder="City" />
                <FInput label="State" value={form.state} onChange={set("state")} placeholder="State" />
              </div>
              <div className="mt-2 px-3 py-3 rounded-xl text-xs" style={{ background: "#f8fbff", color: "#6A89A7", border: "1px solid #BDDDFC", ...font }}>
                💡 Location details are optional and can be updated later from the school's profile.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1.5px solid #BDDDFC" }}>
          <div className="flex gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} style={{ ...btnBase, background: "#f3f8fd", color: "#384959" }}>← Back</button>
            )}
            <button onClick={onClose} style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}>Cancel</button>
          </div>

          {step < STEPS.length ? (
            <button onClick={() => setStep((s) => s + 1)} style={{ ...btnBase, background: "#384959", color: "#fff" }}>Next →</button>
          ) : (
            <button
              onClick={handleSubmit} disabled={loading}
              style={{ ...btnBase, background: "#384959", color: "#fff", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Creating…" : "✓ Create School"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}