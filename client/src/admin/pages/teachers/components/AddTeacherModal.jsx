// client/src/admin/pages/teachers/components/AddTeacherModal.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  createTeacher,
  uploadTeacherProfileImage,
} from "../api/teachersApi.js";

const INIT = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  employeeCode: "",
  department: "",
  designation: "",
  qualification: "",
  experienceYears: "",
  joiningDate: "",
  employmentType: "FULL_TIME",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  salary: "",
  bankAccountNo: "",
  bankName: "",
  ifscCode: "",
  panNumber: "",
  aadhaarNumber: "",
};

const REQUIRED = [
  "firstName",
  "lastName",
  "email",
  "password",
  "employeeCode",
  "department",
  "designation",
  "joiningDate",
];

const font = { fontFamily: "'DM Sans', sans-serif" };

// ─── Eye toggle button ────────────────────────────────────────
function EyeBtn({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        color: "#6A89A7",
        display: "flex",
        alignItems: "center",
      }}
      title={show ? "Hide password" : "Show password"}
    >
      {show ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

// ─── Text input ───────────────────────────────────────────────
function FInput({
  label,
  required,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
  suffix,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-semibold"
        style={{ ...font, color: "#6A89A7" }}
      >
        {label}
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full py-2 px-3 rounded-lg text-sm outline-none transition-all"
          style={{
            border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`,
            ...font,
            color: "#384959",
            background: "#fff",
            paddingRight: suffix ? 38 : 12,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
          onBlur={(e) =>
            (e.target.style.borderColor = error ? "#f87171" : "#BDDDFC")
          }
        />
        {suffix && (
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <span className="text-[11px]" style={{ color: "#dc2626" }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────
function FSelect({ label, required, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-semibold"
        style={{ ...font, color: "#6A89A7" }}
      >
        {label}
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-2 px-3 rounded-lg text-sm outline-none cursor-pointer"
        style={{
          border: "1.5px solid #BDDDFC",
          ...font,
          color: "#384959",
          background: "#fff",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Avatar picker ────────────────────────────────────────────
function AvatarPicker({ firstName, lastName, preview, onFileSelect }) {
  const fileRef = useRef(null);
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className="text-xs font-semibold"
        style={{ ...font, color: "#6A89A7" }}
      >
        Photo{" "}
        <span style={{ color: "#6A89A7", fontWeight: 400 }}>(optional)</span>
      </label>

      {/* Circle */}
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl"
          style={{
            background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
            cursor: "pointer",
          }}
          onClick={() => fileRef.current?.click()}
          title="Click to select photo"
        >
          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              style={{
                fontSize: initials ? 22 : 14,
                opacity: initials ? 1 : 0.5,
              }}
            >
              {initials || "📷"}
            </span>
          )}
        </div>

        {/* Camera badge */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#384959",
            border: "2.5px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
          title="Upload photo"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2" />
          </svg>
        </button>
      </div>

      {/* Remove link */}
      {preview && (
        <button
          type="button"
          onClick={() => onFileSelect(null)}
          className="text-[11px]"
          style={{
            ...font,
            color: "#ef4444",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Remove
        </button>
      )}

      {/* Hidden input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Steps config ─────────────────────────────────────────────
const STEPS = [
  { label: "Account", icon: "👤" },
  { label: "Professional", icon: "🏫" },
  { label: "Address", icon: "📍" },
  { label: "Payroll", icon: "💳" },
];

// ─── Main modal ───────────────────────────────────────────────
export default function AddTeacherModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // ── Photo state ──────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState(null); // File object
  const [photoPreview, setPhotoPreview] = useState(""); // Object URL for preview

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  // Generate preview URL when file selected
  const handlePhotoSelect = (file) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    REQUIRED.forEach((k) => {
      if (!form[k]) errs[k] = "Required";
    });
    if (
      form.password &&
      form.confirmPassword &&
      form.password !== form.confirmPassword
    ) {
      errs.confirmPassword = "Passwords do not match";
    }
    if (!form.confirmPassword) errs.confirmPassword = "Required";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      if (
        ["employeeCode", "department", "designation", "joiningDate"].includes(
          firstKey,
        )
      )
        setStep(2);
      else setStep(1);
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      // Step 1: Create teacher (JSON)
      const { confirmPassword: _cp, ...formData } = form;
      const result = await createTeacher({
        ...formData,
        name: `${form.firstName} ${form.lastName}`,
        experienceYears: form.experienceYears
          ? Number(form.experienceYears)
          : undefined,
        salary: form.salary ? Number(form.salary) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });

      // Step 2: Upload photo if one was selected
      if (photoFile && result?.data?.id) {
        try {
          await uploadTeacherProfileImage(result.data.id, photoFile);
        } catch (imgErr) {
          // Don't block success — teacher was created, image upload failed silently
          console.warn("[AddTeacher] Photo upload failed:", imgErr.message);
        }
      }

      onSuccess();
    } catch (err) {
      setApiError(err.message || "Failed to create teacher");
    } finally {
      setLoading(false);
    }
  };

  const btnBase = {
    ...font,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(56,73,89,0.3)",
          backdropFilter: "blur(3px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 560,
          maxWidth: "95vw",
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 80px rgba(56,73,89,0.18)",
          animation: "fadeUp 0.2s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        {/* ── Modal Header ── */}
        <div
          className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1.5px solid #BDDDFC" }}
        >
          <div>
            <h2
              className="font-bold text-lg"
              style={{ ...font, color: "#384959" }}
            >
              Add New Teacher
            </h2>
            <p className="text-xs mt-0.5" style={{ ...font, color: "#6A89A7" }}>
              Complete all steps to create the teacher profile
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              ...font,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6A89A7",
              fontSize: 22,
              lineHeight: 1,
              marginTop: 2,
            }}
            onMouseEnter={(e) => (e.target.style.color = "#384959")}
            onMouseLeave={(e) => (e.target.style.color = "#6A89A7")}
          >
            ×
          </button>
        </div>

        {/* ── Step tabs ── */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 flex-shrink-0">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const active = step === idx;
            const done = step > idx;
            return (
              <React.Fragment key={s.label}>
                <button
                  onClick={() => idx < step && setStep(idx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    ...font,
                    background: active
                      ? "#384959"
                      : done
                        ? "#BDDDFC"
                        : "#f3f8fd",
                    color: active ? "#fff" : done ? "#384959" : "#6A89A7",
                    border: "none",
                    cursor: idx < step ? "pointer" : "default",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{done ? "✓" : s.icon}</span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1.5,
                      background: step > idx ? "#88BDF2" : "#BDDDFC",
                      margin: "0 4px",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {apiError && (
            <div
              className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: "#fee2e2", color: "#991b1b", ...font }}
            >
              ⚠ {apiError}
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              {/* Avatar picker + name row */}
              <div className="flex items-end gap-4">
                <AvatarPicker
                  firstName={form.firstName}
                  lastName={form.lastName}
                  preview={photoPreview}
                  onFileSelect={handlePhotoSelect}
                />
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <FInput
                    label="First Name"
                    required
                    value={form.firstName}
                    onChange={set("firstName")}
                    error={errors.firstName}
                    placeholder="First name"
                  />
                  <FInput
                    label="Last Name"
                    required
                    value={form.lastName}
                    onChange={set("lastName")}
                    error={errors.lastName}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <FInput
                label="Email (used to login)"
                required
                value={form.email}
                onChange={set("email")}
                error={errors.email}
                type="email"
                placeholder="teacher@school.com"
              />

              <div
                className="px-3 py-2.5 rounded-xl text-xs flex items-start gap-2"
                style={{
                  background: "#f8fbff",
                  border: "1px solid #BDDDFC",
                  color: "#6A89A7",
                  ...font,
                }}
              >
                🔑 The email and password below will be the teacher's login
                credentials for the portal.
              </div>

              <FInput
                label="Password"
                required
                value={form.password}
                onChange={set("password")}
                error={errors.password}
                type={showPwd ? "text" : "password"}
                placeholder="Set a password"
                suffix={
                  <EyeBtn
                    show={showPwd}
                    onToggle={() => setShowPwd((v) => !v)}
                  />
                }
              />
              <FInput
                label="Confirm Password"
                required
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                error={errors.confirmPassword}
                type={showConfirmPwd ? "text" : "password"}
                placeholder="Re-enter password"
                suffix={
                  <EyeBtn
                    show={showConfirmPwd}
                    onToggle={() => setShowConfirmPwd((v) => !v)}
                  />
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Phone"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 XXXXX XXXXX"
                />
                <FInput
                  label="Date of Birth"
                  value={form.dateOfBirth}
                  onChange={set("dateOfBirth")}
                  type="date"
                />
              </div>

              <FSelect
                label="Gender"
                value={form.gender}
                onChange={set("gender")}
                options={[
                  { value: "", label: "Select Gender" },
                  { value: "MALE", label: "Male" },
                  { value: "FEMALE", label: "Female" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
            </div>
          )}

          {/* ── Step 2: Professional ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Employee Code"
                  required
                  value={form.employeeCode}
                  onChange={set("employeeCode")}
                  error={errors.employeeCode}
                  placeholder="e.g. TCH-001"
                />
                <FInput
                  label="Qualification"
                  value={form.qualification}
                  onChange={set("qualification")}
                  placeholder="e.g. B.Ed, M.Sc"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Department"
                  required
                  value={form.department}
                  onChange={set("department")}
                  error={errors.department}
                  placeholder="e.g. Science"
                />
                <FInput
                  label="Designation"
                  required
                  value={form.designation}
                  onChange={set("designation")}
                  error={errors.designation}
                  placeholder="e.g. Senior Teacher"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Experience (years)"
                  value={form.experienceYears}
                  onChange={set("experienceYears")}
                  type="number"
                  placeholder="e.g. 5"
                />
                <FSelect
                  label="Employment Type"
                  value={form.employmentType}
                  onChange={set("employmentType")}
                  options={[
                    { value: "FULL_TIME", label: "Full Time" },
                    { value: "PART_TIME", label: "Part Time" },
                    { value: "CONTRACT", label: "Contract" },
                    { value: "TEMPORARY", label: "Temporary" },
                  ]}
                />
              </div>
              <FInput
                label="Joining Date"
                required
                value={form.joiningDate}
                onChange={set("joiningDate")}
                type="date"
                error={errors.joiningDate}
              />
            </div>
          )}

          {/* ── Step 3: Address ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <FInput
                label="Street Address"
                value={form.address}
                onChange={set("address")}
                placeholder="House no, Street name"
              />
              <div className="grid grid-cols-3 gap-4">
                <FInput
                  label="City"
                  value={form.city}
                  onChange={set("city")}
                  placeholder="City"
                />
                <FInput
                  label="State"
                  value={form.state}
                  onChange={set("state")}
                  placeholder="State"
                />
                <FInput
                  label="ZIP Code"
                  value={form.zipCode}
                  onChange={set("zipCode")}
                  placeholder="PIN"
                />
              </div>
              <div
                className="mt-2 px-3 py-3 rounded-xl text-xs"
                style={{
                  background: "#f8fbff",
                  color: "#6A89A7",
                  border: "1px solid #BDDDFC",
                  ...font,
                }}
              >
                💡 Address is optional and can be added later from the teacher's
                profile.
              </div>
            </div>
          )}

          {/* ── Step 4: Payroll ── */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Monthly Salary (₹)"
                  value={form.salary}
                  onChange={set("salary")}
                  type="number"
                  placeholder="e.g. 45000"
                />
                <FInput
                  label="Bank Name"
                  value={form.bankName}
                  onChange={set("bankName")}
                  placeholder="e.g. SBI"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="Bank Account No."
                  value={form.bankAccountNo}
                  onChange={set("bankAccountNo")}
                  placeholder="Account number"
                />
                <FInput
                  label="IFSC Code"
                  value={form.ifscCode}
                  onChange={set("ifscCode")}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="PAN Number"
                  value={form.panNumber}
                  onChange={set("panNumber")}
                  placeholder="e.g. ABCDE1234F"
                />
                <FInput
                  label="Aadhaar Number"
                  value={form.aadhaarNumber}
                  onChange={set("aadhaarNumber")}
                  placeholder="12-digit number"
                />
              </div>
              <div
                className="mt-1 px-3 py-3 rounded-xl text-xs"
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  ...font,
                }}
              >
                🔒 Payroll data is sensitive. All fields are optional and
                access-controlled.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1.5px solid #BDDDFC" }}
        >
          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                style={{ ...btnBase, background: "#f3f8fd", color: "#384959" }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              style={{ ...btnBase, background: "#f3f8fd", color: "#6A89A7" }}
            >
              Cancel
            </button>
          </div>

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{ ...btnBase, background: "#384959", color: "#fff" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...btnBase,
                background: "#384959",
                color: "#fff",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating…" : "✓ Create Teacher"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
