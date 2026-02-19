// client/src/admin/pages/classes/SubjectsManagement.jsx
// Updated: Subjects can be global OR scoped to specific classes.
// When a class is selected, only that class's assigned subjects are shown in the timetable.

import { useState, useEffect, useCallback } from "react";
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
  ChevronDown,
  Users,
  GraduationCap,
  Link,
  Unlink,
} from "lucide-react";
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  fetchTeachersForDropdown,
  fetchClassSections,
  assignSubjectToClass,
  removeSubjectFromClass,
  fetchClassSectionById,
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

const emptyForm = {
  name: "",
  code: "",
  description: "",
  isElective: false,
  gradeLevel: "",
};

export default function SubjectsManagement({ onNext, onBack }) {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("ALL"); // "ALL" or classId
  const [classSubjectIds, setClassSubjectIds] = useState(new Set()); // subject IDs assigned to selected class
  const [classSubjectLinks, setClassSubjectLinks] = useState({}); // subjectId → classSubjectId (for deletion)

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [linking, setLinking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sd, td, cd] = await Promise.all([
        fetchSubjects(),
        fetchTeachersForDropdown(),
        fetchClassSections(),
      ]);
      setSubjects(sd.subjects || []);
      setTeachers(td.teachers || td.data || []);
      setClasses(cd.classSections || []);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load class-specific subjects when class changes
  useEffect(() => {
    if (selectedClassId === "ALL") {
      setClassSubjectIds(new Set());
      setClassSubjectLinks({});
      return;
    }
    fetchClassSectionById(selectedClassId)
      .then((d) => {
        const cls = d.classSection || d;
        const assigned = cls.classSubjects || [];
        const ids = new Set(assigned.map((cs) => cs.subjectId));
        const links = {};
        assigned.forEach((cs) => {
          links[cs.subjectId] = cs.id;
        });
        setClassSubjectIds(ids);
        setClassSubjectLinks(links);
      })
      .catch(() => {});
  }, [selectedClassId]);

  const handleSave = async () => {
    if (!form.name.trim())
      return setToast({ type: "error", msg: "Subject name is required" });
    setSaving(true);
    try {
      if (editId) {
        await updateSubject(editId, form);
        setToast({ type: "success", msg: "Subject updated" });
        setEditId(null);
      } else {
        const { subject } = await createSubject(form);
        setToast({ type: "success", msg: "Subject created" });
        // If a class is selected, auto-assign the new subject to that class
        if (selectedClassId !== "ALL" && subject?.id) {
          try {
            const { classSubject } = await assignSubjectToClass(
              selectedClassId,
              { subjectId: subject.id },
            );
            setClassSubjectIds((prev) => new Set([...prev, subject.id]));
            setClassSubjectLinks((prev) => ({
              ...prev,
              [subject.id]: classSubject.id,
            }));
          } catch (_) {}
        }
      }
      setForm(emptyForm);
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject?")) return;
    setDeleting(id);
    try {
      await deleteSubject(id);
      setToast({ type: "success", msg: "Subject deleted" });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setDeleting(null);
    }
  };

  const toggleAssignToClass = async (subjectId) => {
    if (selectedClassId === "ALL") return;
    setLinking(subjectId);
    try {
      if (classSubjectIds.has(subjectId)) {
        // Unassign
        const csId = classSubjectLinks[subjectId];
        if (csId) await removeSubjectFromClass(selectedClassId, csId);
        setClassSubjectIds((prev) => {
          const s = new Set(prev);
          s.delete(subjectId);
          return s;
        });
        setClassSubjectLinks((prev) => {
          const n = { ...prev };
          delete n[subjectId];
          return n;
        });
        setToast({ type: "success", msg: "Subject removed from class" });
      } else {
        // Assign
        const { classSubject } = await assignSubjectToClass(selectedClassId, {
          subjectId,
        });
        setClassSubjectIds((prev) => new Set([...prev, subjectId]));
        setClassSubjectLinks((prev) => ({
          ...prev,
          [subjectId]: classSubject.id,
        }));
        setToast({ type: "success", msg: "Subject assigned to class" });
      }
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLinking(null);
    }
  };

  const startEdit = (sub) => {
    setForm({
      name: sub.name,
      code: sub.code || "",
      description: sub.description || "",
      isElective: sub.isElective,
      gradeLevel: sub.gradeLevel || "",
    });
    setEditId(sub.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  // Subjects to display in list: if class selected, show assigned ones first
  const displaySubjects =
    selectedClassId === "ALL"
      ? subjects
      : [
          ...subjects.filter((s) => classSubjectIds.has(s.id)),
          ...subjects.filter((s) => !classSubjectIds.has(s.id)),
        ];

  const selectedCls = classes.find((c) => c.id === selectedClassId);

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Class filter banner */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-4"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "14px 20px",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(189,221,252,0.3)" }}
          >
            <GraduationCap size={14} style={{ color: "#6A89A7" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#384959" }}>
              Subject Scope
            </p>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Select a class to assign subjects specifically to that class, or
              view all subjects globally.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedClassId("ALL")}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              border: `2px solid ${selectedClassId === "ALL" ? "#384959" : "rgba(136,189,242,0.3)"}`,
              background: selectedClassId === "ALL" ? "#384959" : "#fff",
              color: selectedClassId === "ALL" ? "#fff" : "#6A89A7",
            }}
          >
            All Subjects (Global)
          </button>
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                border: `2px solid ${selectedClassId === cls.id ? "#384959" : "rgba(136,189,242,0.3)"}`,
                background: selectedClassId === cls.id ? "#384959" : "#fff",
                color: selectedClassId === cls.id ? "#fff" : "#384959",
              }}
            >
              {cls.name}
            </button>
          ))}
        </div>

        {selectedClassId !== "ALL" && (
          <div
            className="mt-3 rounded-xl flex items-start gap-2"
            style={{
              padding: "8px 12px",
              background: "rgba(189,221,252,0.15)",
              border: "1px solid rgba(136,189,242,0.25)",
            }}
          >
            <span>📌</span>
            <p className="text-sm font-normal" style={{ color: "#384959" }}>
              Showing subjects for <strong>{selectedCls?.name}</strong>.
              Subjects with the{" "}
              <span style={{ color: "#10b981", fontWeight: 600 }}>
                green link button
              </span>{" "}
              are assigned to this class. Use the link/unlink button to manage
              class-specific subjects.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-4"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "18px 20px",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(189,221,252,0.3)" }}
          >
            <BookOpen size={16} style={{ color: "#6A89A7" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#384959" }}>
              {editId ? "Edit Subject" : "Add Subject"}
            </h2>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              {selectedClassId !== "ALL"
                ? `Adding subject for ${selectedCls?.name} — it will be auto-assigned to this class`
                : "Define subjects taught in your institution"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            {
              key: "name",
              label: "Subject Name *",
              placeholder: "e.g. Mathematics",
            },
            { key: "code", label: "Subject Code", placeholder: "MATH101" },
            {
              key: "gradeLevel",
              label: "Grade Level",
              placeholder: "10, FY, All",
            },
          ].map((f) => (
            <div key={f.key}>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: "#384959" }}
              >
                {f.label}
              </p>
              <input
                value={form[f.key]}
                onChange={(e) =>
                  setForm((ff) => ({ ...ff, [f.key]: e.target.value }))
                }
                placeholder={f.placeholder}
                className="w-full rounded-xl text-sm font-normal outline-none"
                style={{
                  padding: "8px 11px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  color: "#384959",
                  fontFamily: "Inter, sans-serif",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(136,189,242,0.4)")
                }
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#384959" }}
            >
              Description
            </p>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
              className="w-full rounded-xl text-sm font-normal outline-none"
              style={{
                padding: "8px 11px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(136,189,242,0.4)")
              }
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mb-0.5">
            <input
              type="checkbox"
              checked={form.isElective}
              onChange={(e) =>
                setForm((f) => ({ ...f, isElective: e.target.checked }))
              }
            />
            <span className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Elective
            </span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
            style={{
              padding: "9px 18px",
              background: "#384959",
              border: "none",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : editId ? (
              <Check size={14} />
            ) : (
              <Plus size={14} />
            )}
            {editId ? "Update" : "Add Subject"}
          </button>
          {editId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 rounded-xl text-sm font-medium"
              style={{
                padding: "9px 14px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#6A89A7",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Subjects list */}
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
              {selectedClassId === "ALL"
                ? "All Subjects"
                : `Subjects for ${selectedCls?.name}`}
            </p>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              {selectedClassId === "ALL"
                ? `${subjects.length} subjects defined`
                : `${classSubjectIds.size} assigned to ${selectedCls?.name} · ${subjects.length} total`}
            </p>
          </div>
          {selectedClassId !== "ALL" && (
            <div
              className="flex items-center gap-2 text-sm font-normal"
              style={{ color: "#6A89A7" }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: "#10b981" }}
              />
              <span>Assigned to {selectedCls?.name}</span>
              <div
                className="w-3 h-3 rounded-full ml-2"
                style={{ background: "rgba(136,189,242,0.4)" }}
              />
              <span>Not assigned</span>
            </div>
          )}
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 120 }}
          >
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: "#88BDF2" }}
            />
          </div>
        ) : displaySubjects.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ height: 120 }}
          >
            <BookOpen size={28} style={{ color: "#BDDDFC" }} />
            <p
              className="text-sm font-normal mt-2"
              style={{ color: "#6A89A7" }}
            >
              No subjects yet. Add your first above.
            </p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ divideColor: "rgba(136,189,242,0.12)" }}
          >
            {displaySubjects.map((sub, idx) => {
              const color = COLORS[idx % COLORS.length];
              const isOpen = expanded === sub.id;
              const assignedTeachers =
                sub.TeacherAssignment?.map((a) => a.teacher) || [];
              const isAssignedToClass =
                selectedClassId !== "ALL" && classSubjectIds.has(sub.id);
              const isLinking = linking === sub.id;

              return (
                <div
                  key={sub.id}
                  style={{
                    borderLeft:
                      selectedClassId !== "ALL"
                        ? `3px solid ${isAssignedToClass ? "#10b981" : "transparent"}`
                        : "none",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer"
                    style={{
                      background: isOpen
                        ? "rgba(189,221,252,0.08)"
                        : "transparent",
                    }}
                    onClick={() => setExpanded(isOpen ? null : sub.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: color + "18", color }}
                      >
                        {sub.code
                          ? sub.code.slice(0, 2).toUpperCase()
                          : sub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#384959" }}
                        >
                          {sub.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.code && (
                            <span
                              className="text-sm font-medium px-2 py-0.5 rounded-lg"
                              style={{ background: color + "15", color }}
                            >
                              {sub.code}
                            </span>
                          )}
                          {sub.gradeLevel && (
                            <span
                              className="text-sm font-normal"
                              style={{ color: "#6A89A7" }}
                            >
                              Grade {sub.gradeLevel}
                            </span>
                          )}
                          {sub.isElective && (
                            <span
                              className="text-sm font-medium px-2 py-0.5 rounded-lg"
                              style={{
                                background: "rgba(245,158,11,0.12)",
                                color: "#b45309",
                              }}
                            >
                              Elective
                            </span>
                          )}
                          {isAssignedToClass && (
                            <span
                              className="text-sm font-medium px-2 py-0.5 rounded-lg"
                              style={{
                                background: "rgba(16,185,129,0.1)",
                                color: "#065f46",
                              }}
                            >
                              ✓ {selectedCls?.name}
                            </span>
                          )}
                          <span
                            className="text-sm font-normal"
                            style={{ color: "#88BDF2" }}
                          >
                            <Users size={11} className="inline mr-1" />
                            {assignedTeachers.length} teacher
                            {assignedTeachers.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Link/Unlink to class button */}
                      {selectedClassId !== "ALL" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAssignToClass(sub.id);
                          }}
                          disabled={isLinking}
                          title={
                            isAssignedToClass
                              ? `Remove from ${selectedCls?.name}`
                              : `Assign to ${selectedCls?.name}`
                          }
                          style={{
                            padding: "6px 8px",
                            background: isAssignedToClass
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(189,221,252,0.3)",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                          }}
                        >
                          {isLinking ? (
                            <Loader2
                              size={13}
                              className="animate-spin"
                              style={{ color: "#6A89A7" }}
                            />
                          ) : isAssignedToClass ? (
                            <Unlink size={13} style={{ color: "#10b981" }} />
                          ) : (
                            <Link size={13} style={{ color: "#6A89A7" }} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(sub);
                        }}
                        style={{
                          padding: "6px 8px",
                          background: "rgba(189,221,252,0.3)",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        <Edit2 size={13} style={{ color: "#6A89A7" }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sub.id);
                        }}
                        disabled={deleting === sub.id}
                        style={{
                          padding: "6px 8px",
                          background: "rgba(239,68,68,0.08)",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {deleting === sub.id ? (
                          <Loader2
                            size={13}
                            className="animate-spin"
                            color="#ef4444"
                          />
                        ) : (
                          <Trash2 size={13} color="#ef4444" />
                        )}
                      </button>
                      <ChevronDown
                        size={15}
                        style={{
                          color: "#6A89A7",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform .2s",
                        }}
                      />
                    </div>
                  </div>

                  {isOpen && (
                    <div
                      className="px-5 pb-4 pt-2"
                      style={{
                        background: "rgba(189,221,252,0.05)",
                        borderTop: "1px solid rgba(136,189,242,0.12)",
                      }}
                    >
                      <p
                        className="text-sm font-medium mb-2 uppercase"
                        style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
                      >
                        Teachers assigned to this subject
                      </p>
                      {assignedTeachers.length === 0 ? (
                        <p
                          className="text-sm font-normal"
                          style={{ color: "#88BDF2" }}
                        >
                          No teacher assignments yet — assign from the Timetable
                          Builder.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {assignedTeachers.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-2 rounded-xl"
                              style={{
                                padding: "6px 12px",
                                background: "rgba(189,221,252,0.2)",
                                border: "1px solid rgba(136,189,242,0.25)",
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                                style={{
                                  background: "rgba(106,137,167,0.2)",
                                  color: "#384959",
                                }}
                              >
                                {t.firstName?.[0]}
                                {t.lastName?.[0]}
                              </div>
                              <div>
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "#384959" }}
                                >
                                  {t.firstName} {t.lastName}
                                </p>
                                <p
                                  className="text-sm font-normal"
                                  style={{ color: "#6A89A7" }}
                                >
                                  {t.designation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {sub.description && (
                        <p
                          className="text-sm font-normal mt-2"
                          style={{ color: "#6A89A7" }}
                        >
                          {sub.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={subjects.length === 0}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{
            padding: "9px 20px",
            background:
              subjects.length === 0 ? "rgba(106,137,167,0.4)" : "#384959",
            border: "none",
            cursor: subjects.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Continue to Classes →
        </button>
      </div>

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
