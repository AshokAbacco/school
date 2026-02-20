// client/src/admin/pages/classes/ClassSectionsSetup.jsx
import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Grid3X3,
  Users,
} from "lucide-react";
import {
  fetchClassSections,
  createClassSection,
  deleteClassSection,
  activateClassForYear,
  fetchAcademicYears,
  fetchTeachersForDropdown,
  fetchTimetableEntries,
} from "./api/classesApi";

const COLORS = [
  "#6A89A7",
  "#88BDF2",
  "#384959",
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

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

export default function ClassSectionsSetup({ onNext, onBack }) {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [activeYearId, setActiveYearId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Single form
  const [sForm, setSForm] = useState({
    grade: "",
    section: "",
    room: "",
    capacity: "",
  });
  // Bulk form
  const [bGrade, setBGrade] = useState("");
  const [bSections, setBSections] = useState("A, B, C");
  // Activate modal
  const [activateModal, setActivateModal] = useState(null); // { classId, className }
  const [actTeacherId, setActTeacherId] = useState("");
  const [actSaving, setActSaving] = useState(false);
  const [timetableCounts, setTimetableCounts] = useState({}); // { [classId]: count }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cd, yd, td] = await Promise.all([
        fetchClassSections(),
        fetchAcademicYears(),
        fetchTeachersForDropdown(),
      ]);
      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      setYears(yr);
      const active = yr.find((y) => y.isActive);
      if (active) setActiveYearId(active.id);
      setTeachers(td.teachers || td.data || []);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load timetable entry counts per class to show progress info
  useEffect(() => {
    if (!classes.length || !activeYearId) return;
    const loadCounts = async () => {
      const counts = {};
      await Promise.all(
        classes.map(async (cls) => {
          try {
            const d = await fetchTimetableEntries(cls.id, {
              academicYearId: activeYearId,
            });
            counts[cls.id] = (d.entries || []).length;
          } catch (_) {
            counts[cls.id] = 0;
          }
        }),
      );
      setTimetableCounts(counts);
    };
    loadCounts();
  }, [classes, activeYearId]);

  const handleSingle = async () => {
    if (!sForm.grade.trim() || !sForm.section.trim())
      return setToast({ type: "error", msg: "Grade and Section are required" });
    setSaving(true);
    try {
      await createClassSection({ grade: sForm.grade, section: sForm.section });
      setToast({
        type: "success",
        msg: `Class ${sForm.grade}-${sForm.section} created`,
      });
      setSForm({ grade: "", section: "", room: "", capacity: "" });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    if (!bGrade.trim())
      return setToast({ type: "error", msg: "Grade is required" });
    const secs = bSections
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ section: s }));
    if (secs.length === 0)
      return setToast({ type: "error", msg: "Enter at least one section" });
    setSaving(true);
    try {
      const res = await createClassSection({
        grade: bGrade.trim(),
        sections: secs,
      });
      setToast({
        type: "success",
        msg: `${res.classSections?.length || 0} class(es) created${res.errors?.length ? `, ${res.errors.length} skipped` : ""}`,
      });
      setBGrade("");
      setBSections("A, B, C");
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class section?")) return;
    setDeleting(id);
    try {
      await deleteClassSection(id);
      setToast({ type: "success", msg: "Class deleted" });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setDeleting(null);
    }
  };

  const handleActivate = async () => {
    if (!activateModal || !activeYearId) return;
    setActSaving(true);
    try {
      await activateClassForYear(activateModal.classId, {
        academicYearId: activeYearId,
        classTeacherId: actTeacherId || null,
      });
      setToast({
        type: "success",
        msg: `${activateModal.className} activated for ${years.find((y) => y.id === activeYearId)?.name}`,
      });
      setActivateModal(null);
      setActTeacherId("");
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setActSaving(false);
    }
  };

  const gradeGroups = classes.reduce((acc, cls) => {
    (acc[cls.grade] = acc[cls.grade] || []).push(cls);
    return acc;
  }, {});

  const InputStyle = {
    padding: "8px 11px",
    border: "1.5px solid rgba(136,189,242,0.4)",
    borderRadius: 12,
    fontSize: 13,
    color: "#384959",
    fontFamily: "Inter, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Year selector */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-4"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "14px 20px",
        }}
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium" style={{ color: "#384959" }}>
            Active Academic Year:
          </p>
          <select
            value={activeYearId}
            onChange={(e) => setActiveYearId(e.target.value)}
            style={{ ...InputStyle, padding: "6px 10px" }}
          >
            <option value="">Select year</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isActive ? " (Active)" : ""}
              </option>
            ))}
          </select>
          <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
            Used when activating classes and building timetable
          </p>
        </div>
      </div>

      {/* Create forms */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-4"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "18px 20px",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(189,221,252,0.3)" }}
          >
            <GraduationCap size={16} style={{ color: "#6A89A7" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#384959" }}>
              Create Classes
            </h2>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Add individual or multiple sections at once
            </p>
          </div>
        </div>

        {/* Single */}
        <p
          className="text-sm font-medium uppercase mb-2"
          style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
        >
          Single Class
        </p>
        <div className="flex gap-3 items-end flex-wrap mb-5">
          {[
            {
              key: "grade",
              label: "Grade / Class *",
              placeholder: "10, FY, Sem 1",
              w: 140,
            },
            { key: "section", label: "Section *", placeholder: "A", w: 90 },
          ].map((f) => (
            <div key={f.key} style={{ width: f.w }}>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#384959" }}
              >
                {f.label}
              </p>
              <input
                value={sForm[f.key]}
                onChange={(e) =>
                  setSForm((ff) => ({ ...ff, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                style={{ ...InputStyle, width: "100%" }}
                onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(136,189,242,0.4)")
                }
              />
            </div>
          ))}
          <button
            onClick={handleSingle}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
            style={{
              padding: "9px 18px",
              background: "#384959",
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              opacity: saving ? 0.7 : 1,
              marginBottom: 0,
              alignSelf: "flex-end",
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Add
          </button>
        </div>

        <div
          style={{
            height: 1,
            background: "rgba(136,189,242,0.18)",
            marginBottom: 16,
          }}
        />

        {/* Bulk */}
        <p
          className="text-sm font-medium uppercase mb-2"
          style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
        >
          Bulk Add Sections
        </p>
        <div className="flex gap-3 items-end flex-wrap">
          <div style={{ width: 130 }}>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#384959" }}
            >
              Grade *
            </p>
            <input
              value={bGrade}
              onChange={(e) => setBGrade(e.target.value)}
              placeholder="10"
              style={{ ...InputStyle, width: "100%" }}
              onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(136,189,242,0.4)")
              }
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#384959" }}
            >
              Sections (comma separated)
            </p>
            <input
              value={bSections}
              onChange={(e) => setBSections(e.target.value)}
              placeholder="A, B, C, D"
              style={{ ...InputStyle, width: "100%" }}
              onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(136,189,242,0.4)")
              }
            />
          </div>
          <button
            onClick={handleBulk}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl text-sm font-semibold"
            style={{
              padding: "9px 16px",
              background: "rgba(189,221,252,0.3)",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              alignSelf: "flex-end",
            }}
          >
            <Grid3X3 size={14} /> Bulk Add
          </button>
        </div>
        <p className="text-sm font-normal mt-2" style={{ color: "#88BDF2" }}>
          Creates 10-A, 10-B, 10-C etc. automatically
        </p>
      </div>

      {/* Classes list */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-5"
        style={{ border: "1px solid rgba(136,189,242,0.22)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(136,189,242,0.18)",
            background: "rgba(189,221,252,0.08)",
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "#384959" }}>
              All Classes
            </p>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              {classes.length} sections total
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 100 }}
          >
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: "#88BDF2" }}
            />
          </div>
        ) : classes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ height: 100 }}
          >
            <GraduationCap size={28} style={{ color: "#BDDDFC" }} />
            <p
              className="text-sm font-normal mt-2"
              style={{ color: "#6A89A7" }}
            >
              No classes yet. Create your first above.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {Object.entries(gradeGroups)
              .sort()
              .map(([grade, secs]) => (
                <div key={grade}>
                  <p
                    className="text-sm font-medium uppercase mb-2"
                    style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
                  >
                    Grade / Class {grade}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {secs.map((cls, i) => {
                      const color = COLORS[i % COLORS.length];
                      const link = cls.academicYearLinks?.[0];
                      const teacher = link?.classTeacher;
                      const studentCount = cls._count?.studentEnrollments || 0;
                      return (
                        <div
                          key={cls.id}
                          className="rounded-xl"
                          style={{
                            padding: "12px 14px",
                            border: `1.5px solid ${link ? "rgba(136,189,242,0.35)" : "rgba(136,189,242,0.2)"}`,
                            background: link
                              ? "rgba(189,221,252,0.08)"
                              : "#fff",
                            minWidth: 160,
                          }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                                style={{ background: color + "18", color }}
                              >
                                {cls.grade}
                                {cls.section}
                              </div>
                              <div>
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: "#384959" }}
                                >
                                  {cls.name}
                                </p>
                                <p
                                  className="text-sm font-normal"
                                  style={{ color: "#6A89A7" }}
                                >
                                  <Users size={10} className="inline mr-0.5" />
                                  {studentCount} students
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setActivateModal({
                                    classId: cls.id,
                                    className: cls.name,
                                  });
                                  setActTeacherId(link?.classTeacher?.id || "");
                                }}
                                style={{
                                  padding: "5px 8px",
                                  background: "rgba(189,221,252,0.3)",
                                  border: "none",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  display: "flex",
                                }}
                                title="Activate for year"
                              >
                                <Check size={12} style={{ color: "#6A89A7" }} />
                              </button>
                              <button
                                onClick={() => handleDelete(cls.id)}
                                disabled={deleting === cls.id}
                                style={{
                                  padding: "5px 8px",
                                  background: "rgba(239,68,68,0.08)",
                                  border: "none",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  display: "flex",
                                }}
                              >
                                {deleting === cls.id ? (
                                  <Loader2
                                    size={12}
                                    className="animate-spin"
                                    color="#ef4444"
                                  />
                                ) : (
                                  <Trash2 size={12} color="#ef4444" />
                                )}
                              </button>
                            </div>
                          </div>
                          {teacher && (
                            <p
                              className="text-sm font-normal"
                              style={{ color: "#6A89A7" }}
                            >
                              Teacher: {teacher.firstName} {teacher.lastName}
                            </p>
                          )}
                          {!link && (
                            <p
                              className="text-sm font-normal"
                              style={{ color: "#88BDF2" }}
                            >
                              Not activated for any year
                            </p>
                          )}
                          {/* Timetable schedule info */}
                          {link && (
                            <div
                              className="mt-2 pt-2"
                              style={{
                                borderTop: "1px solid rgba(136,189,242,0.15)",
                              }}
                            >
                              {timetableCounts[cls.id] > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: "#10b981" }}
                                  />
                                  <p
                                    className="text-sm font-medium"
                                    style={{ color: "#065f46" }}
                                  >
                                    {timetableCounts[cls.id]} slot
                                    {timetableCounts[cls.id] !== 1
                                      ? "s"
                                      : ""}{" "}
                                    scheduled
                                  </p>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: "#88BDF2" }}
                                  />
                                  <p
                                    className="text-sm font-normal"
                                    style={{ color: "#88BDF2" }}
                                  >
                                    Timetable not set up yet
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl text-sm font-medium"
          style={{
            padding: "9px 18px",
            border: "1.5px solid rgba(136,189,242,0.4)",
            color: "#6A89A7",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          â† Back
        </button>
        <button
          onClick={onNext}
          disabled={classes.length === 0}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{
            padding: "9px 20px",
            background:
              classes.length === 0 ? "rgba(106,137,167,0.4)" : "#384959",
            border: "none",
            cursor: classes.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Build Timetables â†’
        </button>
      </div>

      {/* Activate modal */}
      {activateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl"
            style={{
              width: "min(420px,90vw)",
              padding: 24,
              border: "1px solid rgba(136,189,242,0.3)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "#384959" }}
                >
                  Activate {activateModal.className}
                </h3>
                <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                  Assign a class teacher for this academic year
                </p>
              </div>
              <button
                onClick={() => setActivateModal(null)}
                style={{
                  border: "none",
                  background: "rgba(189,221,252,0.2)",
                  borderRadius: 8,
                  padding: 7,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={15} style={{ color: "#6A89A7" }} />
              </button>
            </div>
            <div className="mb-3">
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#384959" }}
              >
                Academic Year
              </p>
              <select
                value={activeYearId}
                onChange={(e) => setActiveYearId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium outline-none"
                style={{
                  padding: "8px 11px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  color: "#384959",
                  fontFamily: "Inter, sans-serif",
                  background: "#fff",
                }}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#384959" }}
              >
                Class Teacher (optional)
              </p>
              <select
                value={actTeacherId}
                onChange={(e) => setActTeacherId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium outline-none"
                style={{
                  padding: "8px 11px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  color: "#384959",
                  fontFamily: "Inter, sans-serif",
                  background: "#fff",
                }}
              >
                <option value="">No class teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} â€” {t.designation}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActivateModal(null)}
                style={{
                  padding: "8px 16px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  borderRadius: 10,
                  color: "#6A89A7",
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
                onClick={handleActivate}
                disabled={actSaving}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background: "#384959",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  opacity: actSaving ? 0.7 : 1,
                }}
              >
                {actSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}{" "}
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
