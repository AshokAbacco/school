// client/src/admin/pages/classes/ReadmissionPage.jsx
// Only shown to SCHOOL type admins — manage Grade 7 → Grade 8 re-admissions
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import {
  fetchPendingReadmission,
  readmitStudent,
  fetchAcademicYears,
  fetchClassSections,
} from "./api/classesApi";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};
const IS = {
  padding: "8px 11px",
  border: `1.5px solid rgba(136,189,242,0.4)`,
  borderRadius: 10,
  fontSize: 13,
  color: "#384959",
  fontFamily: "Inter, sans-serif",
  outline: "none",
  width: "100%",
  background: "#fff",
};

function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
      style={{
        padding: "12px 18px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}{" "}
      {msg}
    </div>
  );
}

// ── Readmission modal ─────────────────────────────────────────────────────────
function ReadmitModal({ student, years, grade8Sections, onClose, onSuccess }) {
  const [form, setForm] = useState({
    newAdmissionNumber: "",
    newAcademicYearId: "",
    newClassSectionId: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lastEnrollment = student.enrollments?.[0];

  const handleSubmit = async () => {
    if (!form.newAdmissionNumber.trim())
      return setError("New admission number is required");
    if (!form.newAcademicYearId) return setError("Select academic year");
    if (!form.newClassSectionId)
      return setError("Select target class (Grade 8)");

    setSaving(true);
    setError("");
    try {
      await readmitStudent(student.id, form);
      onSuccess(student.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full"
        style={{ maxWidth: 480, border: `1px solid ${C.border}` }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: C.border }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: C.primary }}>
              Re-admit Student
            </p>
            <p className="text-xs" style={{ color: C.mid }}>
              {student.personalInfo?.firstName} {student.personalInfo?.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: C.pale,
              borderRadius: 8,
              padding: 7,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={15} style={{ color: C.mid }} />
          </button>
        </div>

        {/* Previous info */}
        <div className="px-6 pt-4">
          <div
            className="rounded-xl p-3 mb-4"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: "#b45309" }}
            >
              Previous Admission Info
            </p>
            <p className="text-xs" style={{ color: "#92400e" }}>
              Admission No: <strong>{student.admissionNumber}</strong>
            </p>
            <p className="text-xs" style={{ color: "#92400e" }}>
              Last Class:{" "}
              <strong>{lastEnrollment?.classSection?.name || "Unknown"}</strong>
            </p>
            <p className="text-xs" style={{ color: "#92400e" }}>
              Last Year:{" "}
              <strong>{lastEnrollment?.academicYear?.name || "Unknown"}</strong>
            </p>
            <p className="text-xs mt-1" style={{ color: "#92400e" }}>
              ✓ All marks, attendance, and history will be preserved
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs font-medium"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              }}
            >
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                New Admission Number <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                value={form.newAdmissionNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newAdmissionNumber: e.target.value }))
                }
                placeholder="Enter new admission number"
                style={IS}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Target Academic Year <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.newAcademicYearId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newAcademicYearId: e.target.value }))
                }
                style={IS}
              >
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Target Class (Grade 8){" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.newClassSectionId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, newClassSectionId: e.target.value }))
                }
                style={IS}
              >
                <option value="">Select class</option>
                {grade8Sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Reason (optional)
              </label>
              <input
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="Re-admission reason..."
                style={IS}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl"
            style={{
              flex: 2,
              padding: "10px 0",
              background: "#384959",
              border: "none",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            {saving ? "Processing…" : "Confirm Re-admission"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────
function StudentCard({ student, onReadmit }) {
  const info = student.personalInfo;
  const lastEnrollment = student.enrollments?.[0];
  const initials =
    `${info?.firstName?.[0] || ""}${info?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
        >
          {initials || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: C.primary }}>
            {info?.firstName} {info?.lastName}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: C.mid }}>
              Adm: {student.admissionNumber}
            </span>
            {lastEnrollment && (
              <span className="text-xs" style={{ color: C.mid }}>
                • Last: {lastEnrollment.classSection?.name} (
                {lastEnrollment.academicYear?.name})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
        >
          <Clock size={10} className="inline mr-1" />
          Pending
        </span>
        <button
          onClick={() => onReadmit(student)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl"
          style={{
            padding: "7px 14px",
            background: C.primary,
            border: "none",
            cursor: "pointer",
          }}
        >
          <UserPlus size={12} /> Re-admit
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReadmissionPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, yr, cr] = await Promise.all([
        fetchPendingReadmission(),
        fetchAcademicYears(),
        fetchClassSections(),
      ]);
      setStudents(sr.students || []);
      setYears(yr.academicYears || []);
      setAllSections(cr.classSections || []);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Grade 8 sections for target selection
  const grade8Sections = allSections.filter(
    (s) => s.grade === "Grade 8" || s.grade?.includes("8"),
  );

  const filtered = students.filter((s) => {
    const name =
      `${s.personalInfo?.firstName} ${s.personalInfo?.lastName}`.toLowerCase();
    const adm = s.admissionNumber?.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || adm?.includes(q);
  });

  const handleSuccess = (studentId) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudent(null);
    setToast({ type: "success", msg: "Student re-admitted successfully!" });
  };

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            style={{
              border: "none",
              background: C.pale,
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <ArrowLeft size={16} style={{ color: C.primary }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.primary }}>
              Re-admission
            </h1>
            <p className="text-sm" style={{ color: C.mid }}>
              Process Grade 7 students pending re-admission into Grade 8
            </p>
          </div>
        </div>

        {/* Info box */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: "#b45309" }}
          >
            About Re-admission
          </p>
          <p className="text-xs" style={{ color: "#92400e" }}>
            Grade 7 students who were skipped during promotion are listed here.
            Each student will receive a new admission number when re-admitted
            into Grade 8. All previous history (marks, attendance, parents) is
            preserved.
          </p>
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.mid }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or admission number..."
              style={{ ...IS, paddingLeft: 32 }}
            />
          </div>
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(245,158,11,0.1)",
              color: "#b45309",
              whiteSpace: "nowrap",
            }}
          >
            {filtered.length} pending
          </span>
        </div>

        {/* List */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: C.light }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              {students.length === 0 ? (
                <>
                  <CheckCircle2 size={32} style={{ color: "#10b981" }} />
                  <p className="text-sm font-medium" style={{ color: C.mid }}>
                    No pending re-admissions!
                  </p>
                  <p className="text-xs" style={{ color: C.light }}>
                    All Grade 7 students have been processed
                  </p>
                </>
              ) : (
                <>
                  <Search size={32} style={{ color: C.light }} />
                  <p className="text-sm font-medium" style={{ color: C.mid }}>
                    No results found
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: C.border }}>
              {filtered.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onReadmit={setSelectedStudent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Re-admit Modal */}
      {selectedStudent && (
        <ReadmitModal
          student={selectedStudent}
          years={years}
          grade8Sections={grade8Sections}
          onClose={() => setSelectedStudent(null)}
          onSuccess={handleSuccess}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
}
