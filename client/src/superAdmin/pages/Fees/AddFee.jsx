import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, X, CheckCircle, GraduationCap,
  IndianRupee, Calendar, ToggleLeft, ToggleRight, AlertCircle, Loader2
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ── helpers ─────────────────────────────────────
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ─── Field wrapper ──────────────────────────────
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

// ─── Main Component ─────────────────────────────
export default function AddFee() {
  const navigate = useNavigate();
  const location = useLocation();
  const editFee = location.state?.editFee ?? null;
  const isEditing = Boolean(editFee);

  // ✅ NEW STATES
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");

  const [classSections, setClassSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [form, setForm] = useState({
    classSectionId: "",
    academicYearId: "",
    feeAmount: "",
    status: "ACTIVE",
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Load Schools + Years ──────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoadingData(true);

        const [schoolData, yearData] = await Promise.all([
          apiFetch("/api/schools"),
          apiFetch("/api/fees/academic-years"),
        ]);

        setSchools(schoolData.schools ?? []);
        setAcademicYears(yearData.academicYears ?? []);

        const activeYear = (yearData.academicYears ?? []).find(y => y.isActive);
        if (activeYear) {
          setForm(prev => ({ ...prev, academicYearId: activeYear.id }));
        }

      } catch (err) {
        setDataError(err.message);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // ── Load Classes based on School ──────────────
  useEffect(() => {
    if (!selectedSchool) return;

    (async () => {
      try {
        const data = await apiFetch(`/api/fees/classes?schoolId=${selectedSchool}`);
        setClassSections(data.classSections || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedSchool]);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
  };

  // ── validation ────────────────────────────────
  const validate = () => {
    const e = {};
    if (!selectedSchool) e.school = "Please select a school";
    if (!form.classSectionId) e.classSectionId = "Please select a class";
    if (!form.academicYearId) e.academicYearId = "Please select an academic year";
    if (!form.feeAmount || Number(form.feeAmount) <= 0)
      e.feeAmount = "Enter valid fee amount";
    return e;
  };

  // ── submit ───────────────────────────────────
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        classSectionId: form.classSectionId,
        academicYearId: form.academicYearId,
        feeAmount: Number(form.feeAmount),
        status: form.status,
      };

      if (isEditing) {
        await apiFetch(`/api/fees/${editFee.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/fees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      navigate("/superAdmin/fees");
    } catch (err) {
      setToast({ type: "error", msg: err.message });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
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
  });

  const selectedClass = classSections.find(c => c.id === form.classSectionId);
  const selectedYear = academicYears.find(y => y.id === form.academicYearId);

  return (
    <div className="min-h-screen bg-gray-100/40">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm"
          style={{ background: "#DC2626" }}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Back */}
        <button
          onClick={() => navigate("/superAdmin/fees")}
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: "#6A89A7" }}
        >
          <ArrowLeft size={16} /> Back to Fees List
        </button>

        {/* Card */}
        <div className="rounded-2xl shadow-sm overflow-hidden"
          style={{ background: "#fff", border: "1px solid #BDDDFC" }}>

          {/* Header */}
          <div className="px-8 py-6"
            style={{ background: "linear-gradient(135deg, #384959 0%, #6A89A7 100%)" }}>
            <div className="flex items-center gap-3">
              <GraduationCap color="#fff" />
              <div>
                <h1 className="text-white font-bold">
                  {isEditing ? "Edit Fee" : "Add Fee"}
                </h1>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-8 flex flex-col gap-6">

            {loadingData && (
              <div className="flex gap-2 items-center">
                <Loader2 className="animate-spin" />
                Loading...
              </div>
            )}

            {!loadingData && (
              <>
                {/* SCHOOL */}
                <Field label="School" error={errors.school} required>
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setForm(prev => ({ ...prev, classSectionId: "" }));
                    }}
                    style={inputStyle(!!errors.school)}
                  >
                    <option value="">Select School</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                {/* CLASS */}
                <Field label="Class" error={errors.classSectionId} required>
                  <select
                    value={form.classSectionId}
                    onChange={(e) => set("classSectionId", e.target.value)}
                    disabled={!selectedSchool}
                    style={inputStyle(!!errors.classSectionId)}
                  >
                    <option value="">
                      {selectedSchool ? "Select Class" : "Select school first"}
                    </option>
                    {classSections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                {/* YEAR */}
                <Field label="Academic Year" error={errors.academicYearId} required>
                  <select
                    value={form.academicYearId}
                    onChange={(e) => set("academicYearId", e.target.value)}
                    style={inputStyle(!!errors.academicYearId)}
                  >
                    <option value="">Select Year</option>
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* AMOUNT */}
                <Field label="Fee Amount" error={errors.feeAmount} required>
                  <input
                    type="number"
                    value={form.feeAmount}
                    onChange={(e) => set("feeAmount", e.target.value)}
                    style={inputStyle(!!errors.feeAmount)}
                  />
                </Field>

                {/* PREVIEW */}
                {selectedClass && form.feeAmount && (
                  <div className="p-4 rounded-xl"
                    style={{ background: "#EDF5FF", border: "1px dashed #88BDF2" }}>
                    <b>{selectedClass.name}</b> — ₹{form.feeAmount}
                    <div>{selectedYear?.name}</div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="flex-1 border py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 text-white py-3 rounded-xl"
                    style={{ background: "#384959" }}
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}