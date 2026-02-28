// client/src/admin/pages/classes/SubjectsPage.jsx
// Enhanced: Subject form now shows real grades from created classes
// and auto-assigns to class_subjects on create.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Search,
  Layers,
  Users,
  Layout,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  fetchClassSections,
  fetchAcademicYears,
  assignSubjectToClass,
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

const COLORS = [
  "#6A89A7",
  "#88BDF2",
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#384959",
];

function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
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
        maxWidth: 360,
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

const IS = {
  padding: "8px 11px",
  border: `1.5px solid rgba(136,189,242,0.4)`,
  borderRadius: 10,
  fontSize: 13,
  color: "#384959",
  fontFamily: "Inter, sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const Lbl = ({ children }) => (
  <label
    style={{
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: C.mid,
      marginBottom: 4,
      fontFamily: "Inter, sans-serif",
    }}
  >
    {children}
  </label>
);

const emptyForm = {
  name: "",
  code: "",
  description: "",
  gradeLevel: "",
  isElective: false,
  // assignment
  assignMode: "none", // "none" | "all" | "specific"
  selectedSections: [],
};

export default function SubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]); // all ClassSections
  const [activeYearId, setActiveYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // ── load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sd, cd, yd] = await Promise.all([
        fetchSubjects(search ? { search } : {}),
        fetchClassSections({}),
        fetchAcademicYears(),
      ]);
      setSubjects(sd.subjects || []);
      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      const active = yr.find((y) => y.isActive);
      if (active) setActiveYearId(active.id);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);
  // ── unique grades from created classes ───────────────────────────────────
  const uniqueGrades = [...new Set(classes.map((c) => c.grade))].sort((a, b) =>
    isNaN(a) || isNaN(b) ? a.localeCompare(b) : Number(a) - Number(b),
  );

  // sections that match the chosen gradeLevel
  const matchingSections = form.gradeLevel
    ? classes.filter((c) => c.grade === form.gradeLevel)
    : [];

  // ── open/close ───────────────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };
  const openEdit = (s) => {
    setForm({
      name: s.name,
      code: s.code || "",
      description: s.description || "",
      gradeLevel: s.gradeLevel || "",
      isElective: s.isElective,
      assignMode: "none",
      selectedSections: [],
    });
    setEditId(s.id);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const toggleSection = (id) => {
    setForm((f) => ({
      ...f,
      selectedSections: f.selectedSections.includes(id)
        ? f.selectedSections.filter((x) => x !== id)
        : [...f.selectedSections, id],
    }));
  };

  // ── save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim())
      return setToast({ type: "error", msg: "Subject name is required" });
    if (
      !editId &&
      form.assignMode === "specific" &&
      form.selectedSections.length === 0
    )
      return setToast({
        type: "error",
        msg: "Please select at least one class section",
      });

    setSaving(true);
    try {
      if (editId) {
        await updateSubject(editId, {
          name: form.name,
          code: form.code,
          description: form.description,
          gradeLevel: form.gradeLevel,
          isElective: form.isElective,
        });

        // ── also assign to classes if a mode is selected ──────────────
        let targets = [];
        if (form.assignMode === "all") {
          targets = form.gradeLevel ? matchingSections : classes;
        } else if (form.assignMode === "specific") {
          targets = classes.filter((c) => form.selectedSections.includes(c.id));
        }

        if (targets.length > 0 && activeYearId) {
          await Promise.allSettled(
            targets.map((sec) =>
              assignSubjectToClass(sec.id, {
                subjectId: editId,
                academicYearId: activeYearId,
              }),
            ),
          );
          setToast({
            type: "success",
            msg: `Subject updated & assigned to ${targets.length} class${targets.length > 1 ? "es" : ""}! ✓`,
          });
        } else {
          setToast({ type: "success", msg: "Subject updated" });
        }
      } else {
        const res = await createSubject({
          name: form.name,
          code: form.code,
          description: form.description,
          gradeLevel: form.gradeLevel,
          isElective: form.isElective,
        });
        const newId = res.subject?.id;

        // ── auto-assign to class_subjects ──────────────────────────────
        let targets = [];
        if (form.assignMode === "all") {
          targets = form.gradeLevel ? matchingSections : classes;
        } else if (form.assignMode === "specific") {
          targets = classes.filter((c) => form.selectedSections.includes(c.id));
        }

        if (targets.length > 0 && newId && activeYearId) {
          await Promise.allSettled(
            targets.map((sec) =>
              assignSubjectToClass(sec.id, {
                subjectId: newId,
                academicYearId: activeYearId,
              }),
            ),
          );
          setToast({
            type: "success",
            msg: `Subject created & assigned to ${targets.length} class${targets.length > 1 ? "es" : ""}! ✓`,
          });
        } else {
          setToast({ type: "success", msg: "Subject created" });
        }
      }
      closeForm();
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;

    setDeleting(id);

    try {
      const res = await deleteSubject(id);

      if (!res || res.message !== "Subject deleted") {
        throw new Error("Delete failed");
      }

      // Only remove if backend truly deleted
      setSubjects((prev) => prev.filter((s) => s.id !== id));

      setToast({ type: "success", msg: `"${name}" deleted` });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setDeleting(null);
    }
  };

  // ── group subjects by grade ───────────────────────────────────────────────
  const grouped = subjects.reduce((acc, s) => {
    const key = s.gradeLevel || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/classes")}
            className="flex items-center gap-1.5 rounded-xl text-sm font-medium mb-3"
            style={{
              padding: "6px 12px",
              border: `1.5px solid ${C.border}`,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
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
                  Subjects
                </h1>
              </div>
              <p className="text-sm ml-3" style={{ color: C.mid }}>
                Create subjects and assign them to your classes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openNew}
                className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  padding: "9px 16px",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Plus size={14} /> Add Subject
              </button>
              <button
                onClick={() => navigate("/classes/timetable")}
                className="flex items-center gap-2 rounded-xl text-sm font-semibold"
                style={{
                  padding: "9px 14px",
                  background: C.pale,
                  border: `1.5px solid ${C.border}`,
                  color: C.mid,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Next: Timetable <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Classes count info bar */}
        {classes.length > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl mb-4 text-sm"
            style={{
              padding: "10px 14px",
              background: "rgba(79,70,229,0.06)",
              border: "1.5px solid rgba(79,70,229,0.15)",
              color: "#4f46e5",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Layers size={14} />
            <span>
              <strong>
                {uniqueGrades.length} grade
                {uniqueGrades.length !== 1 ? "s" : ""}
              </strong>{" "}
              available ({classes.length} section
              {classes.length !== 1 ? "s" : ""}) — grades:{" "}
              {uniqueGrades.join(", ")}
            </span>
          </div>
        )}
        {classes.length === 0 && !loading && (
          <div
            className="flex items-center gap-2 rounded-xl mb-4 text-sm"
            style={{
              padding: "10px 14px",
              background: "rgba(245,158,11,0.07)",
              border: "1.5px solid rgba(245,158,11,0.25)",
              color: "#92400e",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <AlertCircle size={14} />
            No classes created yet.{" "}
            <button
              onClick={() => navigate("/classes/sections")}
              style={{
                fontWeight: 600,
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#92400e",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Create sections first →
            </button>
          </div>
        )}

        {/* Search */}
        <div
          className="flex items-center gap-2 mb-5 rounded-xl bg-white shadow-sm"
          style={{ padding: "8px 14px", border: `1px solid ${C.border}` }}
        >
          <Search size={15} style={{ color: C.light }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects…"
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
                display: "flex",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BookOpen size={32} style={{ color: C.border }} />
            <p className="text-sm" style={{ color: C.mid }}>
              No subjects yet. Click "Add Subject" to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => {
                if (a === "General") return 1;
                if (b === "General") return -1;
                return isNaN(a) || isNaN(b)
                  ? a.localeCompare(b)
                  : Number(a) - Number(b);
              })
              .map(([grade, list]) => (
                <div key={grade}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          grade === "General" ? C.pale : "rgba(79,70,229,0.1)",
                        color: grade === "General" ? C.mid : "#4f46e5",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {grade === "General"
                        ? "General / All Grades"
                        : `Grade ${grade}`}
                    </span>
                    <span className="text-xs" style={{ color: C.mid }}>
                      {list.length} subject{list.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {list.map((s, i) => (
                      <div
                        key={s.id}
                        className="bg-white rounded-2xl shadow-sm p-4"
                        style={{ border: `1px solid ${C.border}` }}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{
                                background: `${COLORS[i % COLORS.length]}18`,
                              }}
                            >
                              <BookOpen
                                size={13}
                                style={{ color: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <div>
                              <p
                                className="text-sm font-semibold"
                                style={{ color: C.primary }}
                              >
                                {s.name}
                              </p>
                              {s.code && (
                                <p className="text-xs" style={{ color: C.mid }}>
                                  {s.code}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(s)}
                              style={{
                                border: "none",
                                background: C.pale,
                                borderRadius: 7,
                                padding: 6,
                                cursor: "pointer",
                                display: "flex",
                              }}
                            >
                              <Edit2 size={12} style={{ color: C.mid }} />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              disabled={deleting === s.id}
                              style={{
                                border: "none",
                                background: "#fef2f2",
                                borderRadius: 7,
                                padding: 6,
                                cursor: "pointer",
                                display: "flex",
                              }}
                            >
                              {deleting === s.id ? (
                                <Loader2
                                  size={12}
                                  className="animate-spin"
                                  style={{ color: "#ef4444" }}
                                />
                              ) : (
                                <Trash2
                                  size={12}
                                  style={{ color: "#ef4444" }}
                                />
                              )}
                            </button>
                          </div>
                        </div>
                        {s.description && (
                          <p className="text-xs mt-1" style={{ color: C.mid }}>
                            {s.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.isElective && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(139,92,246,0.1)",
                                color: "#6d28d9",
                              }}
                            >
                              Elective
                            </span>
                          )}
                          {s._count?.classSubjects > 0 && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                              style={{
                                background: "rgba(16,185,129,0.1)",
                                color: "#065f46",
                              }}
                            >
                              <Check size={9} /> {s._count.classSubjects} class
                              {s._count.classSubjects !== 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
           SUBJECT FORM MODAL
      ════════════════════════════════════════════════════ */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl overflow-y-auto"
            style={{
              width: "min(520px,96vw)",
              maxHeight: "92vh",
              padding: 24,
              border: `1px solid ${C.border}`,
            }}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center mb-5">
              <h3
                className="text-base font-semibold"
                style={{ color: C.primary }}
              >
                {editId ? "Edit Subject" : "Add Subject"}
              </h3>
              <button
                onClick={closeForm}
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

            <div className="flex flex-col gap-4">
              {/* Subject Name */}
              <div>
                <Lbl>Subject Name *</Lbl>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Mathematics"
                  style={IS}
                />
              </div>

              {/* Code + Elective row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl>Subject Code</Lbl>
                  <input
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    placeholder="e.g. MATH101"
                    style={IS}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={() =>
                      setForm((f) => ({ ...f, isElective: !f.isElective }))
                    }
                    className="flex items-center gap-2"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: "0 0 8px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        border: `2px solid ${form.isElective ? "#8b5cf6" : "rgba(136,189,242,0.5)"}`,
                        borderRadius: 4,
                        background: form.isElective ? "#8b5cf6" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {form.isElective && (
                        <Check size={11} style={{ color: "#fff" }} />
                      )}
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: C.primary,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Elective subject
                    </span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <Lbl>Description (optional)</Lbl>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional description"
                  style={IS}
                />
              </div>

              {/* ── GRADE LEVEL ──────────────────────────────────────── */}
              <div>
                <Lbl>For Which Grade?</Lbl>
                {uniqueGrades.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          gradeLevel: "",
                          selectedSections: [],
                          assignMode: f.assignMode === "none" ? "none" : "none",
                        }))
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                        border: `1.5px solid ${form.gradeLevel === "" ? C.primary : C.border}`,
                        background: form.gradeLevel === "" ? C.primary : "#fff",
                        color: form.gradeLevel === "" ? "#fff" : C.mid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      All Grades
                    </button>
                    {uniqueGrades.map((g) => (
                      <button
                        key={g}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            gradeLevel: g,
                            selectedSections: [],
                          }))
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontFamily: "Inter, sans-serif",
                          border: `1.5px solid ${form.gradeLevel === g ? "#4f46e5" : C.border}`,
                          background:
                            form.gradeLevel === g ? "#4f46e5" : "#fff",
                          color: form.gradeLevel === g ? "#fff" : C.mid,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Grade {g}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      value={form.gradeLevel}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gradeLevel: e.target.value }))
                      }
                      placeholder="e.g. 10, FY (optional)"
                      style={IS}
                    />
                  </div>
                )}
              </div>

              {/* ── ASSIGN TO CLASSES ────────────────── */}
              {
                <div
                  className="rounded-xl"
                  style={{
                    padding: 14,
                    background: "rgba(79,70,229,0.04)",
                    border: "1.5px solid rgba(79,70,229,0.15)",
                  }}
                >
                  <p
                    className="text-sm font-semibold mb-3"
                    style={{
                      color: "#4f46e5",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <Layers
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {editId ? "Update Class Assignments" : "Assign to Classes"}
                  </p>

                  {/* 3 mode options */}
                  <div className="flex flex-col gap-2">
                    {/* None */}
                    {/* <button
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assignMode: "none",
                          selectedSections: [],
                        }))
                      }
                      className="flex items-center gap-3 rounded-xl text-left"
                      style={{
                        padding: "10px 12px",
                        border: `1.5px solid ${form.assignMode === "none" ? C.primary : C.border}`,
                        background:
                          form.assignMode === "none"
                            ? "rgba(56,73,89,0.06)"
                            : "#fff",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          flexShrink: 0,
                          border: `2px solid ${form.assignMode === "none" ? C.primary : C.border}`,
                          background:
                            form.assignMode === "none" ? C.primary : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {form.assignMode === "none" && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: C.primary }}
                        >
                          {editId
                            ? "Don't change assignments"
                            : "Don't assign now"}
                        </p>
                        <p className="text-xs" style={{ color: C.mid }}>
                          {editId
                            ? "Only update subject details above"
                            : "I'll assign manually later"}
                        </p>
                      </div>
                    </button> */}

                    {/* All sections of grade (or all grades) */}
                    {(() => {
                      const allTargets = form.gradeLevel
                        ? matchingSections
                        : classes;
                      const allLabel = form.gradeLevel
                        ? `All sections of Grade ${form.gradeLevel}`
                        : "All sections of All Grades";
                      const allSubLabel = `Assigns to all ${allTargets.length} section${allTargets.length !== 1 ? "s" : ""}: ${allTargets.map((s) => s.name).join(", ")}`;
                      return (
                        <button
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              assignMode: "all",
                              selectedSections: [],
                            }))
                          }
                          className="flex items-center gap-3 rounded-xl text-left"
                          style={{
                            padding: "10px 12px",
                            border: `1.5px solid ${form.assignMode === "all" ? "#10b981" : C.border}`,
                            background:
                              form.assignMode === "all"
                                ? "rgba(16,185,129,0.06)"
                                : "#fff",
                            cursor: "pointer",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              flexShrink: 0,
                              border: `2px solid ${form.assignMode === "all" ? "#10b981" : C.border}`,
                              background:
                                form.assignMode === "all" ? "#10b981" : "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {form.assignMode === "all" && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#fff",
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: C.primary }}
                            >
                              {allLabel}
                            </p>
                            <p className="text-xs" style={{ color: C.mid }}>
                              {allTargets.length > 0
                                ? allSubLabel
                                : "No sections found"}
                            </p>
                          </div>
                        </button>
                      );
                    })()}

                    {/* Choose specific sections */}
                    <button
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          assignMode: "specific",
                          selectedSections: [],
                        }))
                      }
                      className="flex items-center gap-3 rounded-xl text-left"
                      style={{
                        padding: "10px 12px",
                        border: `1.5px solid ${form.assignMode === "specific" ? "#f59e0b" : C.border}`,
                        background:
                          form.assignMode === "specific"
                            ? "rgba(245,158,11,0.06)"
                            : "#fff",
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          flexShrink: 0,
                          border: `2px solid ${form.assignMode === "specific" ? "#f59e0b" : C.border}`,
                          background:
                            form.assignMode === "specific" ? "#f59e0b" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {form.assignMode === "specific" && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: C.primary }}
                        >
                          Choose specific sections
                        </p>
                        <p className="text-xs" style={{ color: C.mid }}>
                          Pick exactly which classes get this subject
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Section picker — shows when "specific" is chosen */}
                  {form.assignMode === "specific" && (
                    <div className="mt-3">
                      <p
                        className="text-xs font-semibold mb-2"
                        style={{
                          color: C.mid,
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        Select classes:
                      </p>
                      {classes.length === 0 ? (
                        <p className="text-xs" style={{ color: C.mid }}>
                          No classes found. Create sections first.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {/* Group by grade for better UX */}
                          {uniqueGrades.map((grade) => {
                            const gradeSections = classes.filter(
                              (c) => c.grade === grade,
                            );
                            return (
                              <div key={grade} className="w-full">
                                <p
                                  className="text-xs font-semibold mb-1.5"
                                  style={{
                                    color: C.mid,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  Grade {grade}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {gradeSections.map((sec) => {
                                    const sel = form.selectedSections.includes(
                                      sec.id,
                                    );
                                    return (
                                      <button
                                        key={sec.id}
                                        onClick={() => toggleSection(sec.id)}
                                        style={{
                                          padding: "5px 11px",
                                          borderRadius: 20,
                                          fontSize: 12,
                                          fontFamily: "Inter, sans-serif",
                                          fontWeight: 600,
                                          border: `1.5px solid ${sel ? "#f59e0b" : C.border}`,
                                          background: sel
                                            ? "rgba(245,158,11,0.12)"
                                            : "#fff",
                                          color: sel ? "#92400e" : C.mid,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {sel && (
                                          <Check
                                            size={9}
                                            style={{
                                              display: "inline",
                                              marginRight: 4,
                                            }}
                                          />
                                        )}
                                        {sec.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {form.selectedSections.length > 0 && (
                        <p
                          className="text-xs mt-2 font-medium"
                          style={{
                            color: "#f59e0b",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          ✓ {form.selectedSections.length} section
                          {form.selectedSections.length > 1 ? "s" : ""} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>
              }
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={closeForm}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background: saving ? "rgba(106,137,167,0.5)" : C.primary,
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "Inter, sans-serif",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {saving
                  ? "Saving…"
                  : editId
                    ? "Update Subject"
                    : "Create & Assign"}
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
    </PageLayout>
  );
}
