import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, X, CheckCircle, GraduationCap,
  IndianRupee, Calendar, ToggleLeft, ToggleRight, AlertCircle
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLASS_OPTIONS = [
  "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class",
  "6th Class", "7th Class", "8th Class", "9th Class", "10th Class", "Custom"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = CURRENT_YEAR - 1 + i;
  return `${y}-${String(y + 1).slice(-2)}`;
});

const EMPTY_FORM = {
  className: "",
  customClass: "",
  feeAmount: "",
  academicYear: YEAR_OPTIONS[1],
  status: "Active",
};

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ label, error, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: "#384959" }}>
        {label} {required && <span style={{ color: "#DC2626" }}>*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#DC2626" }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddFee() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load edit data if coming from list page
  useEffect(() => {
    try {
      const editData = localStorage.getItem("editFeeData");
      if (editData) {
        const fee = JSON.parse(editData);
        setIsEditing(true);
        setEditId(fee.id);
        const isCustom = !CLASS_OPTIONS.slice(0, -1).includes(fee.className);
        setForm({
          className: isCustom ? "Custom" : fee.className,
          customClass: isCustom ? fee.className : "",
          feeAmount: String(fee.feeAmount),
          academicYear: fee.academicYear,
          status: fee.status,
        });
        localStorage.removeItem("editFeeData");
      }
    } catch { /* ignore */ }
  }, []);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    const effectiveClass = form.className === "Custom" ? form.customClass : form.className;
    if (!effectiveClass.trim()) e.className = "Class name is required";
    if (form.className === "Custom" && !form.customClass.trim()) e.customClass = "Please enter a custom class name";
    if (!form.feeAmount || isNaN(Number(form.feeAmount)) || Number(form.feeAmount) <= 0)
      e.feeAmount = "Enter a valid fee amount greater than 0";
    if (!form.academicYear) e.academicYear = "Academic year is required";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);
    const effectiveClass = form.className === "Custom" ? form.customClass : form.className;

    setTimeout(() => {
      try {
        const saved = localStorage.getItem("feesData");
        let fees = saved ? JSON.parse(saved) : [];

        if (isEditing) {
          fees = fees.map(f =>
            f.id === editId
              ? { ...f, className: effectiveClass, feeAmount: Number(form.feeAmount), academicYear: form.academicYear, status: form.status }
              : f
          );
          localStorage.setItem("feesData", JSON.stringify(fees));
          localStorage.setItem("feesToast", `Fee for ${effectiveClass} updated successfully!`);
        } else {
          const newFee = {
            id: Date.now(),
            className: effectiveClass,
            feeAmount: Number(form.feeAmount),
            academicYear: form.academicYear,
            status: form.status,
          };
          fees.push(newFee);
          localStorage.setItem("feesData", JSON.stringify(fees));
          localStorage.setItem("feesToast", `Fee for ${effectiveClass} added successfully!`);
        }
      } catch { /* ignore */ }

      setSubmitting(false);
      navigate("/admin/fees");
    }, 600);
  };

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "10px 14px",
    borderRadius: "12px",
    border: `1.5px solid ${hasError ? "#DC2626" : "#BDDDFC"}`,
    outline: "none",
    fontSize: "14px",
    color: "#384959",
    background: hasError ? "#FFF5F5" : "#F0F7FF",
    transition: "border-color 0.2s",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-xl" style={{fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }} >

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium"
          style={{ background: "#384959" }}
        >
          <CheckCircle size={16} color="#4ADE80" />
          {toast}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Back Button */}
        <button
          onClick={() => navigate("/fees")}
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
          style={{ color: "#6A89A7" }}
        >
          <ArrowLeft size={16} />
          Back to Fees List
        </button>

        {/* Card */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ background: "#fff", border: "1px solid #BDDDFC" }}
        >
          {/* Card Header */}
          <div
            className="px-8 py-6"
            style={{ background: "linear-gradient(135deg, #384959 0%, #6A89A7 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap size={20} color="#fff" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {isEditing ? "Edit Fee Record" : "Add New Fee"}
                </h1>
                <p className="text-xs text-white/70 mt-0.5">
                  {isEditing ? "Update fee details for the selected class" : "Define class-wise fee structure"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="px-8 py-8 flex flex-col gap-6">

            {/* Class Name */}
            <Field label="Class Name" error={errors.className || errors.customClass} required>
              <select
                value={form.className}
                onChange={e => set("className", e.target.value)}
                style={inputStyle(!!errors.className)}
              >
                <option value="">— Select a class —</option>
                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.className === "Custom" && (
                <input
                  type="text"
                  placeholder="e.g. Pre-Primary, LKG, UKG..."
                  value={form.customClass}
                  onChange={e => set("customClass", e.target.value)}
                  style={{ ...inputStyle(!!errors.customClass), marginTop: 8 }}
                />
              )}
            </Field>

            {/* Fee Amount */}
            <Field label="Fee Amount (₹)" error={errors.feeAmount} required>
              <div className="relative">
                <IndianRupee
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  color="#6A89A7"
                />
                <input
                  type="number"
                  placeholder="0"
                  min={0}
                  value={form.feeAmount}
                  onChange={e => set("feeAmount", e.target.value)}
                  style={{ ...inputStyle(!!errors.feeAmount), paddingLeft: 34 }}
                />
              </div>
              {form.feeAmount && !isNaN(Number(form.feeAmount)) && Number(form.feeAmount) > 0 && (
                <p className="text-xs mt-1 font-medium" style={{ color: "#6A89A7" }}>
                  ₹{Number(form.feeAmount).toLocaleString("en-IN")} per year
                </p>
              )}
            </Field>

            {/* Academic Year */}
            <Field label="Academic Year" error={errors.academicYear} required>
              <div className="relative">
                <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" color="#6A89A7" />
                <select
                  value={form.academicYear}
                  onChange={e => set("academicYear", e.target.value)}
                  style={{ ...inputStyle(!!errors.academicYear), paddingLeft: 34 }}
                >
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </Field>

            {/* Status Toggle */}
            <Field label="Status">
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "#F0F7FF", border: "1.5px solid #BDDDFC" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#384959" }}>
                    {form.status === "Active" ? "Active" : "Inactive"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6A89A7" }}>
                    {form.status === "Active"
                      ? "This fee is currently applicable"
                      : "This fee is disabled for now"}
                  </p>
                </div>
                <button
                  onClick={() => set("status", form.status === "Active" ? "Inactive" : "Active")}
                  className="transition-all hover:scale-105"
                >
                  {form.status === "Active"
                    ? <ToggleRight size={40} color="#384959" />
                    : <ToggleLeft size={40} color="#BDDDFC" />
                  }
                </button>
              </div>
            </Field>

            {/* Preview Card */}
            {form.feeAmount && form.className && (
              <div
                className="rounded-xl px-5 py-4"
                style={{ background: "#EDF5FF", border: "1.5px dashed #88BDF2" }}
              >
                <p className="text-xs font-semibold mb-1.5" style={{ color: "#6A89A7" }}>PREVIEW</p>
                <p className="text-sm font-bold" style={{ color: "#384959" }}>
                  {form.className === "Custom" ? form.customClass || "Custom Class" : form.className}
                  {" — "}
                  ₹{Number(form.feeAmount || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#6A89A7" }}>
                  Academic Year: {form.academicYear} · Status:{" "}
                  <span style={{ color: form.status === "Active" ? "#065F46" : "#991B1B" }}>
                    {form.status}
                  </span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate("/fees")}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
                style={{ borderColor: "#BDDDFC", color: "#6A89A7" }}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6A89A7, #384959)" }}
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submitting ? "Saving..." : isEditing ? "Update Fee" : "Add Fee"}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs mt-4" style={{ color: "#6A89A7" }}>
          Fees are stored per class and academic year. You can add multiple classes separately.
        </p>
      </div>
    </div>
  );
}