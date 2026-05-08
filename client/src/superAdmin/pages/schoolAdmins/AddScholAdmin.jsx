// client/src/superAdmin/pages/schoolAdmins/components/AddSchoolAdminModal.jsx
import React, { useState, useEffect } from "react";
import { UserCog, X, Check, Loader2, Eye, EyeOff, Info, KeyRound } from "lucide-react";
import { createSchoolAdmin, updateSchoolAdmin } from "./components/schoolAdminApi.js";
import { getSchools } from "../../pages/schools/components/SchoolsApi.js";

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

const INIT = { name: "", email: "", password: "", confirmPassword: "", schoolId: "" };

// admin prop: pass existing admin object for edit mode, omit for add mode
export default function AddSchoolAdminModal({ onClose, onSuccess, admin = null }) {
  const isEdit = Boolean(admin);

  const buildInitial = () =>
    isEdit
      ? {
          name:            admin.name  || "",
          email:           admin.email || "",
          password:        "",
          confirmPassword: "",
          schoolId:        admin.schoolId || "",
        }
      : INIT;

  const [form, setForm]         = useState(buildInitial);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");
  const [schools, setSchools]   = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [showPassword, setShowPassword]     = useState(false);
  // In edit mode, password section is collapsed unless user explicitly opens it
  const [changePassword, setChangePassword] = useState(false);

  const set = (k) => (v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
    setApiError("");
  };

  useEffect(() => {
    getSchools()
      .then((data) => setSchools(data.schools || []))
      .catch(() => setApiError("Failed to load schools"))
      .finally(() => setSchoolsLoading(false));
  }, []);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Required";
    if (!form.email.trim()) errs.email = "Required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email";
    if (!form.schoolId) errs.schoolId = "Please select a school";

    // Password required in add mode, optional in edit (only if changePassword is on)
    const needsPassword = !isEdit || changePassword;
    if (needsPassword) {
      if (!form.password)           errs.password = "Required";
      else if (form.password.length < 6) errs.password = "Minimum 6 characters";
      if (!form.confirmPassword)    errs.confirmPassword = "Required";
      else if (form.password !== form.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError("");

    try {
      if (isEdit) {
        const payload = {
          name:     form.name.trim(),
          email:    form.email.trim(),
          schoolId: form.schoolId,
          ...(changePassword && form.password ? { password: form.password } : {}),
        };
        const result = await updateSchoolAdmin(admin.id, payload);
        if (onSuccess) onSuccess(result.admin);
      } else {
        const result = await createSchoolAdmin({
          name:     form.name.trim(),
          email:    form.email.trim(),
          password: form.password,
          schoolId: form.schoolId,
        });
        if (onSuccess) onSuccess(result.admin);
      }
      onClose();
    } catch (err) {
      setApiError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const btnBase = {
    ...font, fontSize: 13, cursor: "pointer", border: "none",
    borderRadius: 10, padding: "9px 20px", fontWeight: 600,
    display: "flex", alignItems: "center", gap: 6,
  };

  const schoolOptions = [
    { value: "", label: schoolsLoading ? "Loading schools…" : "Select a school" },
    ...schools.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
  ];

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
          width: 500, maxWidth: "95vw", maxHeight: "92vh",
          background: "#fff", borderRadius: 20,
          boxShadow: "0 20px 60px rgba(56,73,89,0.2)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:translate(-50%,-47%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1.5px solid #BDDDFC" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #384959, #6A89A7)" }}>
              <UserCog size={17} color="#fff" />
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ ...font, color: "#384959" }}>
                {isEdit ? "Edit School Admin" : "Add School Admin"}
              </h2>
              <p className="text-xs mt-0.5" style={{ ...font, color: "#6A89A7" }}>
                {isEdit ? "Update admin details below" : "Create login credentials for the school admin"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FD] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7" }}
          >
            <X size={18} />
          </button>
        </div>

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
          <div className="flex flex-col gap-4">

            {/* Assign School */}
            <FSelect
              label="Assign School" required
              value={form.schoolId} onChange={set("schoolId")}
              error={errors.schoolId} options={schoolOptions}
              disabled={schoolsLoading}
            />

            {/* Admin Name */}
            <FInput
              label="Admin Name" required
              value={form.name} onChange={set("name")}
              error={errors.name} placeholder="e.g. Ravi Kumar"
            />

            {/* Email */}
            <FInput
              label="Email Address" required
              value={form.email} onChange={set("email")}
              type="email" error={errors.email}
              placeholder="admin@school.com"
            />

            {/* ── Password Section ── */}
            {isEdit ? (
              // Edit mode: collapsed by default, expand via toggle
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setChangePassword((p) => !p); setForm((f) => ({ ...f, password: "", confirmPassword: "" })); setErrors((e) => ({ ...e, password: "", confirmPassword: "" })); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all w-full"
                  style={{
                    background: changePassword ? "#f0f7ff" : "#f8fbff",
                    border: `1.5px solid ${changePassword ? "#88BDF2" : "#BDDDFC"}`,
                    color: changePassword ? "#384959" : "#6A89A7",
                    cursor: "pointer",
                    ...font,
                  }}
                >
                  <KeyRound size={14} />
                  {changePassword ? "Cancel Password Change" : "Change Password"}
                </button>

                {changePassword && (
                  <div className="flex flex-col gap-3 px-3 py-4 rounded-xl" style={{ background: "#f8fbff", border: "1px solid #BDDDFC" }}>
                    {/* New Password */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold" style={{ ...font, color: "#6A89A7" }}>
                        New Password <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => set("password")(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full py-2 px-3 pr-16 rounded-lg text-sm outline-none transition-all"
                          style={{ border: `1.5px solid ${errors.password ? "#f87171" : "#BDDDFC"}`, ...font, color: "#384959", background: "#fff" }}
                          onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
                          onBlur={(e) => (e.target.style.borderColor = errors.password ? "#f87171" : "#BDDDFC")}
                        />
                        <button type="button" onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7" }}>
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {errors.password && <span className="text-[11px]" style={{ color: "#dc2626" }}>{errors.password}</span>}
                    </div>
                    {/* Confirm Password */}
                    <FInput
                      label="Confirm New Password" required
                      value={form.confirmPassword} onChange={set("confirmPassword")}
                      type={showPassword ? "text" : "password"}
                      error={errors.confirmPassword} placeholder="Re-enter new password"
                    />
                  </div>
                )}
              </div>
            ) : (
              // Add mode: password always shown
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
                      className="w-full py-2 px-3 pr-16 rounded-lg text-sm outline-none transition-all"
                      style={{ border: `1.5px solid ${errors.password ? "#f87171" : "#BDDDFC"}`, ...font, color: "#384959", background: "#fff" }}
                      onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
                      onBlur={(e) => (e.target.style.borderColor = errors.password ? "#f87171" : "#BDDDFC")}
                    />
                    <button type="button" onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#6A89A7" }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <span className="text-[11px]" style={{ color: "#dc2626" }}>{errors.password}</span>}
                </div>

                <FInput
                  label="Confirm Password" required
                  value={form.confirmPassword} onChange={set("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  error={errors.confirmPassword} placeholder="Re-enter password"
                />
              </>
            )}

            {/* Info box */}
            <div className="px-3 py-3 rounded-xl text-xs flex items-start gap-2"
              style={{ background: "#f8fbff", color: "#6A89A7", border: "1px solid #BDDDFC", ...font }}>
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              {isEdit
                ? "Update the admin's name, email, or school assignment. Leave password section closed to keep the existing password."
                : "The admin will use this email and password to log into their school dashboard. Share credentials securely."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1.5px solid #BDDDFC" }}>
          <button onClick={onClose} style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...btnBase, background: "#384959", color: "#fff",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? "Saving…" : "Creating…"}</>
              : <><Check size={14} /> {isEdit ? "Save Changes" : "Create Admin"}</>
            }
          </button>
        </div>
      </div>
    </>
  );
}