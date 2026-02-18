// client/src/admin/pages/teachers/components/AddTeacherModal.jsx
import React, { useState, useEffect } from "react";
import { createTeacher } from "../api/teachersApi.js";

const INIT = {
  // Step 1 — Account
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  // Step 2 — Professional
  employeeCode: "",
  department: "",
  designation: "",
  qualification: "",
  experienceYears: "",
  joiningDate: "",
  employmentType: "FULL_TIME",
  // Step 3 — Address
  address: "",
  city: "",
  state: "",
  zipCode: "",
  // Step 4 — Payroll
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

function FInput({
  label,
  required,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
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
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="py-2 px-3 rounded-lg text-sm outline-none transition-all"
        style={{
          border: `1.5px solid ${error ? "#f87171" : "#BDDDFC"}`,
          ...font,
          color: "#384959",
          background: "#fff",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#88BDF2")}
        onBlur={(e) =>
          (e.target.style.borderColor = error ? "#f87171" : "#BDDDFC")
        }
      />
      {error && (
        <span className="text-[11px]" style={{ color: "#dc2626" }}>
          {error}
        </span>
      )}
    </div>
  );
}

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

const STEPS = [
  { label: "Account", icon: "👤" },
  { label: "Professional", icon: "🏫" },
  { label: "Address", icon: "📍" },
  { label: "Payroll", icon: "💳" },
];

export default function AddTeacherModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [step, setStep] = useState(1);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

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
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // jump to the step containing the first error
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
      await createTeacher({
        ...form,
        name: `${form.firstName} ${form.lastName}`,
        experienceYears: form.experienceYears
          ? Number(form.experienceYears)
          : undefined,
        salary: form.salary ? Number(form.salary) : undefined,
        dateOfBirth: form.dateOfBirth || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(err.message);
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
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(56,73,89,0.3)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex flex-col overflow-hidden"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 540,
          maxWidth: "95vw",
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(56,73,89,0.2)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:translate(-50%,-47%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1.5px solid #BDDDFC" }}
        >
          <div>
            <h2
              className="font-bold text-base"
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
            }}
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div
          className="flex items-center px-6 py-3 gap-1 flex-shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          {STEPS.map((s, i) => {
            const active = step === i + 1;
            const done = step > i + 1;
            return (
              <React.Fragment key={s.label}>
                <button
                  onClick={() => setStep(i + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    ...font,
                    background: active
                      ? "#384959"
                      : done
                        ? "#BDDDFC"
                        : "#f8fbff",
                    color: active ? "#fff" : done ? "#384959" : "#6A89A7",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span>{done ? "✓" : s.icon}</span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: done ? "#88BDF2" : "#BDDDFC",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {apiError && (
            <div
              className="mb-4 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "#fee2e2", color: "#991b1b", ...font }}
            >
              ⚠ {apiError}
            </div>
          )}

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FInput
                  label="First Name"
                  required
                  value={form.firstName}
                  onChange={set("firstName")}
                  error={errors.firstName}
                />
                <FInput
                  label="Last Name"
                  required
                  value={form.lastName}
                  onChange={set("lastName")}
                  error={errors.lastName}
                />
              </div>
              <FInput
                label="Email"
                required
                value={form.email}
                onChange={set("email")}
                type="email"
                error={errors.email}
              />
              <FInput
                label="Password"
                required
                value={form.password}
                onChange={set("password")}
                type="password"
                error={errors.password}
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

        {/* Footer */}
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
