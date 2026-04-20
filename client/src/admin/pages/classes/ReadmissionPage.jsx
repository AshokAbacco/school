// client/src/admin/pages/classes/ReadmissionPage.jsx
// Fully responsive — mobile, tablet, desktop
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  UserPlus,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  fetchPendingReadmission,
  readmitStudent,
  fetchAcademicYears,
  fetchClassSections,
} from "./api/classesApi";
import BulkReadmissionUpload from "./components/BulkReadmissionUpload";

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
  padding: "9px 12px",
  border: `1.5px solid rgba(136,189,242,0.4)`,
  borderRadius: 10,
  fontSize: 13,
  color: "#384959",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  width: "100%",
  background: "#fff",
  boxSizing: "border-box",
};

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed z-50 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium"
      style={{
        // Mobile: full-width bottom bar; desktop: bottom-right snackbar
        bottom: 16,
        left: 16,
        right: 16,
        padding: "12px 16px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
        // Upgrade to bottom-right on sm+
        maxWidth: "calc(100vw - 32px)",
      }}
      style2={{}}
    >
      {/* Responsive override via inline media-query trick using a wrapper */}
      <style>{`
        @media (min-width: 640px) {
          .toast-wrapper {
            left: auto !important;
            right: 24px !important;
            max-width: 340px !important;
          }
        }
      `}</style>
      {type === "success" ? (
        <CheckCircle2 size={15} className="shrink-0" />
      ) : (
        <AlertCircle size={15} className="shrink-0" />
      )}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <X size={13} style={{ color: type === "success" ? "#15803d" : "#dc2626" }} />
      </button>
    </div>
  );
}

// ── Readmission Modal ──────────────────────────────────────────────────────────
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
    if (!form.newAdmissionNumber.trim()) return setError("New admission number is required");
    if (!form.newAcademicYearId) return setError("Select academic year");
    if (!form.newClassSectionId) return setError("Select target class (Grade 8)");

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-md"
        style={{
          borderRadius: "20px 20px 0 0",
          // On sm+ screens: standard rounded card
          border: `1px solid ${C.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          maxHeight: "95vh",
          overflowY: "auto",
        }}
      >
        <style>{`
          @media (min-width: 640px) {
            .readmit-modal {
              border-radius: 20px !important;
            }
          }
        `}</style>

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div style={{ width: 36, height: 4, borderRadius: 4, background: "#e2e8f0" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: C.border }}
        >
          <div>
            <p className="font-bold text-sm" style={{ color: C.primary }}>Re-admit Student</p>
            <p className="text-xs mt-0.5" style={{ color: C.mid }}>
              {student.personalInfo?.firstName} {student.personalInfo?.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: C.pale, borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}
          >
            <X size={15} style={{ color: C.mid }} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2">
          {/* Previous info */}
          <div
            className="rounded-xl p-3 mb-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <p className="text-xs font-semibold mb-1.5" style={{ color: "#b45309" }}>
              Previous Admission Info
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <p className="text-xs" style={{ color: "#92400e" }}>
                Adm No: <strong>{lastEnrollment?.admissionNumber || "-"}</strong>
              </p>
              <p className="text-xs" style={{ color: "#92400e" }}>
                Class: <strong>{lastEnrollment?.classSection?.name || "—"}</strong>
              </p>
              <p className="text-xs" style={{ color: "#92400e" }}>
                Year: <strong>{lastEnrollment?.academicYear?.name || "—"}</strong>
              </p>
            </div>
            <p className="text-xs mt-2" style={{ color: "#92400e" }}>
              ✓ All marks, attendance & history preserved
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs font-medium"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
            >
              <AlertCircle size={13} className="shrink-0" /> {error}
            </div>
          )}

          <div className="space-y-3">
            {[
              {
                label: "New Admission Number",
                required: true,
                node: (
                  <input
                    value={form.newAdmissionNumber}
                    onChange={(e) => setForm((p) => ({ ...p, newAdmissionNumber: e.target.value }))}
                    placeholder="Enter new admission number"
                    style={IS}
                  />
                ),
              },
              {
                label: "Target Academic Year",
                required: true,
                node: (
                  <select
                    value={form.newAcademicYearId}
                    onChange={(e) => setForm((p) => ({ ...p, newAcademicYearId: e.target.value }))}
                    style={IS}
                  >
                    <option value="">Select year</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}{y.isActive ? " (Active)" : ""}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                label: "Target Class (Grade 8)",
                required: true,
                node: (
                  <select
                    value={form.newClassSectionId}
                    onChange={(e) => setForm((p) => ({ ...p, newClassSectionId: e.target.value }))}
                    style={IS}
                  >
                    <option value="">Select class</option>
                    {grade8Sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ),
              },
              {
                label: "Reason (optional)",
                required: false,
                node: (
                  <input
                    value={form.reason}
                    onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Re-admission reason..."
                    style={IS}
                  />
                ),
              },
            ].map(({ label, required, node }) => (
              <div key={label}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.mid, display: "block", marginBottom: 4 }}>
                  {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                {node}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 0",
              border: `1.5px solid ${C.border}`, borderRadius: 12,
              color: C.mid, background: "transparent",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center gap-2 text-sm font-bold text-white rounded-xl"
            style={{
              flex: 2, padding: "11px 0",
              background: "#384959", border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {saving ? "Processing…" : "Confirm Re-admission"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Card — responsive ─────────────────────────────────────────────────
function StudentCard({ student, onReadmit }) {
  const info = student.personalInfo;
  const lastEnrollment = student.enrollments?.[0];
  const initials = `${info?.firstName?.[0] || ""}${info?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div
      className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      {/* Left: avatar + info */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
        >
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: C.primary }}>
            {info?.firstName} {info?.lastName}
          </p>
          {/* Stack on mobile, inline on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mt-0.5">
            <span className="text-xs" style={{ color: C.mid }}>
              Adm: {lastEnrollment?.admissionNumber || "-"}
            </span>
            {lastEnrollment && (
              <span className="text-xs" style={{ color: C.mid }}>
                <span className="hidden sm:inline">• </span>
                Last: {lastEnrollment.classSection?.name} ({lastEnrollment.academicYear?.name})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: badge + button — stack vertically on mobile */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
        <span
          className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309" }}
        >
          <Clock size={10} className="inline mr-1" />
          Pending
        </span>
        <button
          onClick={() => onReadmit(student)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl whitespace-nowrap"
          style={{ padding: "7px 14px", background: C.primary, border: "none", cursor: "pointer" }}
        >
          <UserPlus size={12} /> Re-admit
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReadmissionPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const grade8Sections = allSections.filter(
    (s) => s.grade === "Grade 8" || s.grade?.includes("8"),
  );

  const filtered = students.filter((s) => {
    const name = `${s.personalInfo?.firstName} ${s.personalInfo?.lastName}`.toLowerCase();
    const adm = s.enrollments?.[0]?.admissionNumber?.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || adm?.includes(q);
  });

  const handleSuccess = (studentId) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    setSelectedStudent(null);
    setToast({ type: "success", msg: "Student re-admitted successfully!" });
  };

  return (
    <>
      {/* Page wrapper — full bleed on mobile, constrained on desktop */}
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "0",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "16px 12px 80px",  // bottom padding for mobile nav bars
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate(-1)}
              style={{
                border: "none", background: C.pale,
                borderRadius: 10, padding: "8px 10px",
                cursor: "pointer", display: "flex", shrink: 0,
              }}
            >
              <ArrowLeft size={16} style={{ color: C.primary }} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: C.primary }}>
                Re-admission
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: C.mid }}>
                Process Grade 7 students pending re-admission into Grade 8
              </p>
            </div>
          </div>

          {/* ── Info box ───────────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 mb-5"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: "#b45309" }}>
              About Re-admission
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>
              Grade 7 students who were skipped during promotion are listed here.
              Each student will receive a new admission number when re-admitted
              into Grade 8. All previous history (marks, attendance, parents) is preserved.
            </p>
          </div>

          {/* ── Toolbar: search + buttons ──────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            {/* Search — full width on mobile, flex-1 on sm+ */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: C.mid }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or admission number..."
                style={{ ...IS, paddingLeft: 34 }}
              />
            </div>

            {/* Buttons row — always row, even on mobile */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl flex-1 sm:flex-none justify-center"
                style={{
                  padding: "9px 16px",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <FileSpreadsheet size={14} />
                <span>Bulk Upload</span>
              </button>

              <span
                className="flex items-center text-xs font-medium px-3 py-2 rounded-xl whitespace-nowrap"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#b45309",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                {filtered.length} pending
              </span>
            </div>
          </div>

          {/* ── Student list ───────────────────────────────────────────────── */}
          <div
            className="rounded-2xl shadow-sm overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: C.light }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 px-4 text-center">
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
                    <p className="text-sm font-medium" style={{ color: C.mid }}>No results found</p>
                    <p className="text-xs" style={{ color: C.light }}>Try a different search term</p>
                  </>
                )}
              </div>
            ) : (
              <div>
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
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {selectedStudent && (
        <ReadmitModal
          student={selectedStudent}
          years={years}
          grade8Sections={grade8Sections}
          onClose={() => setSelectedStudent(null)}
          onSuccess={handleSuccess}
        />
      )}

      {showBulkUpload && (
        <BulkReadmissionUpload
          pendingStudents={students}
          allSections={allSections}
          years={years}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { setShowBulkUpload(false); load(); }}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}