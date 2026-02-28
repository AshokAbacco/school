// client/src/admin/pages/classes/ClassesList.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Clock,
  BookOpen,
  GraduationCap,
  Grid3X3,
  RefreshCw,
  Users,
  UserCog,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Waves,
  GitBranch,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import CreateAcademicYearModal from "./components/CreateAcademicYearModal";
import {
  fetchClassSections,
  deleteClassSection,
  fetchAcademicYears,
  activateClassForYear,
  fetchTeachersForDropdown,
} from "./api/classesApi";
import { useInstitutionConfig } from "./hooks/useInstitutionConfig";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};

const iconBtn = (extra = {}) => ({
  border: "none",
  borderRadius: 9,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: 5,
  ...extra,
});

// ── Toast ─────────────────────────────────────────────────────────────────────
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
        fontFamily: "Inter, sans-serif",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {msg}
    </div>
  );
}

// ── Assign Class Teacher Modal ────────────────────────────────────────────────
function AssignTeacherModal({
  cls,
  yearId,
  years,
  teachers,
  onClose,
  onSaved,
}) {
  const link = cls.academicYearLinks?.[0];
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    link?.classTeacher?.id || "",
  );
  const [selectedYearId, setSelectedYearId] = useState(
    link?.academicYear?.id || yearId || "",
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredTeachers = teachers.filter((t) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.designation?.toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!selectedYearId) {
      setError("Select an academic year first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await activateClassForYear(cls.id, {
        academicYearId: selectedYearId,
        classTeacherId: selectedTeacherId || null,
      });
      onSaved(selectedTeacherId, selectedYearId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedYearId) return;
    setSaving(true);
    setError("");
    try {
      await activateClassForYear(cls.id, {
        academicYearId: selectedYearId,
        classTeacherId: null,
      });
      onSaved(null, selectedYearId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl flex flex-col"
        style={{
          width: "min(480px, 95vw)",
          maxHeight: "88vh",
          border: `1px solid ${C.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(56,73,89,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCog size={17} style={{ color: C.primary }} />
            </div>
            <div>
              <h3
                className="text-base font-semibold"
                style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
              >
                Assign Class Teacher
              </h3>
              <p
                className="text-xs"
                style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
              >
                {cls.name}
              </p>
            </div>
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

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl mb-4 text-sm"
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                color: "#dc2626",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Academic Year */}
          <div className="mb-5">
            <p
              className="text-xs font-semibold uppercase mb-2"
              style={{
                color: C.mid,
                letterSpacing: "0.5px",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Academic Year
            </p>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "9px 12px",
                border: `1.5px solid ${C.border}`,
                color: C.primary,
                fontFamily: "Inter, sans-serif",
                background: "#fff",
              }}
            >
              <option value="">Select year…</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " ✓ (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-xs font-semibold uppercase"
                style={{
                  color: C.mid,
                  letterSpacing: "0.5px",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Class Teacher
              </p>
              {selectedTeacherId && (
                <button
                  onClick={() => setSelectedTeacherId("")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Clear selection
                </button>
              )}
            </div>

            {/* None option */}
            <div
              onClick={() => setSelectedTeacherId("")}
              style={{
                padding: "9px 12px",
                borderRadius: 10,
                cursor: "pointer",
                marginBottom: 8,
                border: `1.5px solid ${!selectedTeacherId ? "#ef4444" : C.border}`,
                background: !selectedTeacherId
                  ? "rgba(239,68,68,0.05)"
                  : "#fff",
                display: "flex",
                alignItems: "center",
                gap: 10,
                transition: "all 0.12s",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: !selectedTeacherId
                    ? "rgba(239,68,68,0.1)"
                    : C.pale,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <X
                  size={13}
                  style={{ color: !selectedTeacherId ? "#ef4444" : C.mid }}
                />
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color: !selectedTeacherId ? "#ef4444" : C.mid,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                No class teacher
              </span>
              {!selectedTeacherId && (
                <Check
                  size={14}
                  style={{ color: "#ef4444", marginLeft: "auto" }}
                />
              )}
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 mb-2 rounded-xl"
              style={{
                padding: "7px 11px",
                border: `1.5px solid ${C.border}`,
                background: "#fff",
              }}
            >
              <Search size={13} style={{ color: C.light, flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or department…"
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: C.primary,
                  fontFamily: "Inter, sans-serif",
                  flex: 1,
                  background: "transparent",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    display: "flex",
                    padding: 0,
                  }}
                >
                  <X size={11} style={{ color: C.mid }} />
                </button>
              )}
            </div>

            {/* Teacher list */}
            {teachers.length === 0 ? (
              <div
                className="flex items-center gap-2 rounded-xl text-sm"
                style={{
                  padding: "10px 12px",
                  background: "#fef9ec",
                  border: "1.5px solid #fde68a",
                  color: "#92400e",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <AlertCircle size={13} /> No active teachers found.
              </div>
            ) : filteredTeachers.length === 0 ? (
              <p
                className="text-xs text-center py-4"
                style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
              >
                No teachers match "{search}"
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                {filteredTeachers.map((t) => {
                  const sel = selectedTeacherId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeacherId(t.id)}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: `1.5px solid ${sel ? C.primary : C.border}`,
                        background: sel ? C.pale : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.12s",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: sel
                              ? "rgba(56,73,89,0.18)"
                              : "rgba(136,189,242,0.2)",
                            color: C.primary,
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {t.firstName?.[0]}
                          {t.lastName?.[0]}
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold"
                            style={{
                              color: C.primary,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {t.firstName} {t.lastName}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.department && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{
                                  background: "rgba(79,70,229,0.09)",
                                  color: "#4f46e5",
                                  fontFamily: "Inter, sans-serif",
                                }}
                              >
                                {t.department}
                              </span>
                            )}
                            {t.designation && (
                              <span
                                className="text-xs"
                                style={{
                                  color: C.mid,
                                  fontFamily: "Inter, sans-serif",
                                }}
                              >
                                {t.designation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {sel && (
                        <Check
                          size={14}
                          style={{ color: C.primary, flexShrink: 0 }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-between items-center gap-2 px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <div>
            {link?.classTeacher && (
              <button
                onClick={handleRemove}
                disabled={saving}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1.5px solid rgba(239,68,68,0.25)",
                  borderRadius: 9,
                  cursor: saving ? "not-allowed" : "pointer",
                  background: "rgba(239,68,68,0.06)",
                  color: "#ef4444",
                  fontFamily: "Inter, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <X size={12} /> Remove Teacher
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                color: C.mid,
                background: "transparent",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedYearId}
              className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
              style={{
                padding: "8px 22px",
                background:
                  saving || !selectedYearId
                    ? "rgba(106,137,167,0.4)"
                    : C.primary,
                border: "none",
                cursor: saving || !selectedYearId ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check size={14} /> Assign
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-4"
      style={{ border: `1px solid ${C.border}` }}
    >
      <p className="text-sm" style={{ color: C.mid }}>
        {title}
      </p>
      <h2 className="text-xl font-semibold mt-1" style={{ color: C.primary }}>
        {value}
      </h2>
      {sub && (
        <p className="text-xs mt-0.5" style={{ color: C.light }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Quick Card ────────────────────────────────────────────────────────────────
function QuickCard({ icon: Icon, title, desc, onClick, accent, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.pale : C.card,
        border: `1.5px solid ${hov ? C.light : C.border}`,
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.18s",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
      }}
    >
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontSize: 9,
            fontWeight: 700,
            background: accent + "22",
            color: accent,
            padding: "2px 6px",
            borderRadius: 99,
            letterSpacing: "0.5px",
          }}
        >
          {badge}
        </span>
      )}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: hov ? accent + "22" : "rgba(189,221,252,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={18} style={{ color: hov ? accent : C.mid }} />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: C.primary }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: C.mid }}>
          {desc}
        </p>
      </div>
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function ClassesList() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Institution config (drives dynamic UI) ────────────────────────────────
  const config = useInstitutionConfig();

  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [yearId, setYearId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [assignModal, setAssignModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cd, yd, td] = await Promise.all([
        fetchClassSections(yearId ? { academicYearId: yearId } : {}),
        fetchAcademicYears(),
        fetchTeachersForDropdown().catch(() => ({ data: [] })),
      ]);
      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      setYears(yr);
      setTeachers(td.data || td.teachers || []);
      if (!yearId) {
        const active = yr.find((y) => y.isActive);
        if (active) setYearId(active.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [yearId]);

  useEffect(() => {
    load();
  }, [load, location.pathname, location.state]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteClassSection(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleAssignSaved = (teacherId, savedYearId) => {
    const foundTeacher = teacherId
      ? teachers.find((t) => t.id === teacherId)
      : null;
    const foundYear = years.find((y) => y.id === savedYearId);
    setClasses((prev) =>
      prev.map((c) => {
        if (c.id !== assignModal.id) return c;
        const existingLinks = c.academicYearLinks || [];
        const linkIndex = existingLinks.findIndex(
          (l) => l.academicYear?.id === savedYearId,
        );
        const updatedLink = {
          ...(existingLinks[linkIndex] || {}),
          classTeacher: foundTeacher
            ? {
                id: foundTeacher.id,
                firstName: foundTeacher.firstName,
                lastName: foundTeacher.lastName,
                designation: foundTeacher.designation,
              }
            : null,
          academicYear: foundYear
            ? {
                id: foundYear.id,
                name: foundYear.name,
                isActive: foundYear.isActive,
              }
            : existingLinks[linkIndex]?.academicYear,
          isActive: true,
        };
        const newLinks =
          linkIndex >= 0
            ? existingLinks.map((l, i) => (i === linkIndex ? updatedLink : l))
            : [...existingLinks, updatedLink];
        return { ...c, academicYearLinks: newLinks };
      }),
    );
    setAssignModal(null);
    setToast({
      type: "success",
      msg: foundTeacher
        ? `${foundTeacher.firstName} ${foundTeacher.lastName} assigned as class teacher`
        : "Class teacher removed",
    });
  };

  const filtered = classes.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.academicYearLinks?.[0]?.classTeacher?.firstName
        ?.toLowerCase()
        .includes(search.toLowerCase()),
  );

  const totalStudents = classes.reduce(
    (sum, c) => sum + (c._count?.studentEnrollments || 0),
    0,
  );
  const activeYear = years.find((y) => y.id === yearId);

  // ── Build dynamic setup flow cards based on institution type ──────────────
  const setupCards = [];
  let step = 1;

  // Step 1: Always — School Timings
  setupCards.push({
    step: step++,
    icon: Clock,
    title: "School Timings",
    desc: "Periods & breaks",
    path: "/classes/timings",
    accent: "#6A89A7",
  });

  // Step 2: PUC — Streams; Degree/Diploma/PG — Courses
  if (config.showStream) {
    setupCards.push({
      step: step++,
      icon: Waves,
      title: "Manage Streams",
      desc: "Science, Commerce, Arts",
      path: "/classes/streams",
      accent: "#6366f1",
      badge: "PUC",
    });
  }
  if (config.showCourse) {
    setupCards.push({
      step: step++,
      icon: BookOpen,
      title: "Manage Courses",
      desc: "BTech, BA, BCom + branches",
      path: "/classes/courses",
      accent: "#10b981",
      badge: config.schoolType,
    });
  }

  // Step: Create Sections
  setupCards.push({
    step: step++,
    icon: GraduationCap,
    title: `Create ${config.gradesLabel}`,
    desc: `Add ${config.gradeLabel.toLowerCase()}s & sections`,
    path: "/classes/sections",
    accent: "#10b981",
  });

  // Step: Subjects
  setupCards.push({
    step: step++,
    icon: BookOpen,
    title: "Subjects",
    desc: "Add & assign to classes",
    path: "/classes/subjects",
    accent: "#4f46e5",
  });

  // Step: Timetable
  setupCards.push({
    step: step++,
    icon: Grid3X3,
    title: "Timetable",
    desc: "Build timetables",
    path: "/classes/timetable",
    accent: "#f59e0b",
  });

  // Step: Promotion
  setupCards.push({
    step: step++,
    icon: ArrowRight,
    title: "Promotion",
    desc: `Promote ${config.studentsLabel.toLowerCase()}`,
    path: "/classes/promotion",
    accent: "#8b5cf6",
  });

  // Step: Re-admission (School only)
  if (config.hasReadmission) {
    setupCards.push({
      step: step++,
      icon: GraduationCap,
      title: "Re-admission",
      desc: "Grade 7 re-admissions",
      path: "/classes/readmission",
      accent: "#f59e0b",
      badge: "Grade 7",
    });
  }

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: C.primary }}
              />
              <h1
                className="text-xl font-semibold"
                style={{ color: C.primary }}
              >
                Classes & Sections
              </h1>
            </div>
            <p className="text-sm ml-3" style={{ color: C.mid }}>
              Manage {config.gradeLabel.toLowerCase()} structure, subjects and
              timetables
              <span
                className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(56,73,89,0.1)", color: C.primary }}
              >
                {config.schoolType}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "8px 12px",
                border: `1.5px solid ${C.border}`,
                color: C.primary,
                fontFamily: "Inter, sans-serif",
                background: "#fff",
              }}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " ✓" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={load}
              style={iconBtn({
                padding: "8px 10px",
                background: C.pale,
                border: `1.5px solid ${C.border}`,
                color: C.mid,
              })}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
              style={{
                padding: "8px 16px",
                background: C.primary,
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Plus size={14} /> New Academic Year
            </button>
          </div>
        </div>

        {/* ── Dynamic Setup Flow ────────────────────────────────────────────── */}
        <div className="mb-2">
          <p
            className="text-xs font-semibold mb-2"
            style={{
              color: C.mid,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Setup Flow
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          {setupCards.map((card) => (
            <div key={card.path} className="relative">
              <div
                className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center z-10 text-white text-xs font-bold"
                style={{ background: card.accent, fontSize: 10 }}
              >
                {card.step}
              </div>
              <QuickCard
                icon={card.icon}
                title={card.title}
                desc={card.desc}
                onClick={() => navigate(card.path)}
                accent={card.accent}
                badge={card.badge}
              />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <StatCard
            title={`Total ${config.gradesLabel}`}
            value={classes.length}
          />
          <StatCard
            title="Total Students"
            value={totalStudents}
            sub="across all sections"
          />
          <StatCard
            title="Academic Year"
            value={activeYear?.name || "All"}
            sub={activeYear?.isActive ? "Active" : ""}
          />
          <StatCard
            title="Not Activated"
            value={classes.filter((c) => !c.academicYearLinks?.length).length}
            sub="need activation"
          />
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 mb-4 rounded-xl bg-white shadow-sm"
          style={{ padding: "8px 14px", border: `1px solid ${C.border}` }}
        >
          <Search size={15} style={{ color: C.light }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search classes or teachers…`}
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              color: C.primary,
              fontFamily: "Inter, sans-serif",
              flex: 1,
              background: "transparent",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: C.mid,
                fontSize: 12,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: `1px solid ${C.border}` }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2
                size={22}
                className="animate-spin"
                style={{ color: C.light }}
              />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm" style={{ color: "#ef4444" }}>
                {error}
              </p>
              <button
                onClick={load}
                style={iconBtn({
                  padding: "8px 16px",
                  background: C.pale,
                  border: `1.5px solid ${C.border}`,
                  color: C.primary,
                  fontSize: 13,
                  fontWeight: 600,
                })}
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <GraduationCap size={32} style={{ color: C.light }} />
              <p className="text-sm" style={{ color: C.mid }}>
                {search
                  ? "No matching classes"
                  : `No ${config.gradeLabel.toLowerCase()} sections yet`}
              </p>
              {!search && (
                <button
                  onClick={() => navigate("/classes/sections")}
                  style={iconBtn({
                    padding: "9px 18px",
                    background: C.primary,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                  })}
                >
                  <Plus size={14} /> Create Sections
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {[
                      "Class",
                      "Class Teacher",
                      "Students",
                      "Year",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "11px 20px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.5px",
                          color: C.mid,
                          fontFamily: "Inter, sans-serif",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cls) => {
                    const link = cls.academicYearLinks?.[0];
                    const teacher = link?.classTeacher;
                    const students = cls._count?.studentEnrollments || 0;
                    const isActivated = !!link;
                    return (
                      <tr
                        key={cls.id}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(189,221,252,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {/* Class name */}
                        <td style={{ padding: "12px 20px" }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0"
                              style={{ background: C.pale, color: C.primary }}
                            >
                              {cls.grade?.replace(/\D/g, "")}
                              {cls.section ? cls.section.slice(0, 1) : ""}
                            </div>
                            <div>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: C.primary }}
                              >
                                {cls.name}
                              </p>
                              <div className="flex items-center gap-1 flex-wrap">
                                {cls.stream && (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                      background: "rgba(99,102,241,0.1)",
                                      color: "#4f46e5",
                                    }}
                                  >
                                    {cls.stream.name}
                                  </span>
                                )}
                                {cls.course && (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                      background: "rgba(16,185,129,0.1)",
                                      color: "#065f46",
                                    }}
                                  >
                                    {cls.course.name}
                                  </span>
                                )}
                                {cls.branch && (
                                  <span
                                    className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{
                                      background: "rgba(245,158,11,0.1)",
                                      color: "#92400e",
                                    }}
                                  >
                                    {cls.branch.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Class Teacher */}
                        <td style={{ padding: "12px 20px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignModal(cls);
                            }}
                            title="Click to assign class teacher"
                            style={{
                              border: `1.5px dashed ${teacher ? C.border : C.light}`,
                              borderRadius: 10,
                              padding: "5px 10px",
                              background: teacher
                                ? "transparent"
                                : "rgba(136,189,242,0.06)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              transition: "all 0.14s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.borderColor = C.primary)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.borderColor = teacher
                                ? C.border
                                : C.light)
                            }
                          >
                            {teacher ? (
                              <>
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                                  style={{
                                    background: "rgba(106,137,167,0.15)",
                                    color: C.primary,
                                  }}
                                >
                                  {teacher.firstName?.[0]}
                                  {teacher.lastName?.[0]}
                                </div>
                                <span
                                  className="text-sm font-medium"
                                  style={{
                                    color: C.primary,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  {teacher.firstName} {teacher.lastName}
                                </span>
                                <UserCog
                                  size={11}
                                  style={{ color: C.light, marginLeft: 2 }}
                                />
                              </>
                            ) : (
                              <>
                                <UserCog size={13} style={{ color: C.light }} />
                                <span
                                  className="text-sm"
                                  style={{
                                    color: C.light,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  Assign teacher
                                </span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Students */}
                        <td style={{ padding: "12px 20px" }}>
                          <div className="flex items-center gap-1.5">
                            <Users size={13} style={{ color: C.light }} />
                            <span
                              className="text-sm font-medium"
                              style={{ color: C.primary }}
                            >
                              {students}
                            </span>
                          </div>
                        </td>

                        {/* Year */}
                        <td style={{ padding: "12px 20px" }}>
                          {link?.academicYear ? (
                            <span
                              className="text-xs font-medium px-2.5 py-1 rounded-lg"
                              style={{ background: C.pale, color: C.primary }}
                            >
                              {link.academicYear.name}
                            </span>
                          ) : (
                            <span
                              className="text-sm"
                              style={{ color: C.light }}
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 20px" }}>
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                              background: isActivated
                                ? "rgba(16,185,129,0.1)"
                                : "rgba(136,189,242,0.15)",
                              color: isActivated ? "#065f46" : C.mid,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                background: isActivated ? "#10b981" : C.light,
                              }}
                            />
                            {isActivated ? "Active" : "Not activated"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 20px" }}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/classes/${cls.id}/timetable`);
                              }}
                              title="View Timetable"
                              style={iconBtn({
                                padding: "6px 7px",
                                background: C.pale,
                              })}
                            >
                              <Eye size={13} style={{ color: C.mid }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/classes/timetable", {
                                  state: { sectionId: cls.id },
                                });
                              }}
                              title="Edit Timetable"
                              style={iconBtn({
                                padding: "6px 7px",
                                background: C.pale,
                              })}
                            >
                              <Edit size={13} style={{ color: C.mid }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignModal(cls);
                              }}
                              title="Assign Class Teacher"
                              style={iconBtn({
                                padding: "6px 7px",
                                background: teacher
                                  ? "rgba(56,73,89,0.08)"
                                  : "rgba(136,189,242,0.12)",
                              })}
                            >
                              <UserCog
                                size={13}
                                style={{ color: teacher ? C.primary : C.light }}
                              />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, cls.id, cls.name)}
                              disabled={deleting === cls.id}
                              title="Delete"
                              style={iconBtn({
                                padding: "6px 7px",
                                background: "rgba(239,68,68,0.08)",
                                cursor:
                                  deleting === cls.id
                                    ? "not-allowed"
                                    : "pointer",
                              })}
                            >
                              {deleting === cls.id ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                  style={{ color: "#ef4444" }}
                                />
                              ) : (
                                <Trash2
                                  size={13}
                                  style={{ color: "#ef4444" }}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Teacher Modal */}
      {assignModal && (
        <AssignTeacherModal
          cls={assignModal}
          yearId={yearId}
          years={years}
          teachers={teachers}
          onClose={() => setAssignModal(null)}
          onSaved={handleAssignSaved}
        />
      )}

      {/* New Academic Year Modal */}
      <CreateAcademicYearModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(newYear) => {
          setShowModal(false);
          load();
          setToast({
            type: "success",
            msg: `Academic year "${newYear.name}" created successfully`,
          });
        }}
      />

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
