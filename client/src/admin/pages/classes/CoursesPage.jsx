// client/src/admin/pages/classes/CoursesPage.jsx
// Degree/Diploma/PG admins — manage courses (BTech, BA etc.) and branches
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../components/PageLayout";
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createBranch,
  updateBranch,
  deleteBranch,
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
    const t = setTimeout(onClose, 3000);
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

// ── Branch row inside a course ────────────────────────────────────────────────
function BranchRow({ branch, courseId, onDelete, onUpdate, toast: setToast }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: branch.name,
    code: branch.code || "",
  });
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await updateBranch(courseId, branch.id, form);
      onUpdate(res.branch);
      setEditing(false);
      setToast({ type: "success", msg: "Branch updated" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "rgba(136,189,242,0.1)" }}
      >
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Branch name"
          style={{ ...IS, flex: 1 }}
        />
        <input
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          placeholder="Code"
          style={{ ...IS, width: 80 }}
        />
        <button
          onClick={handleUpdate}
          disabled={saving}
          style={{
            border: "none",
            background: "#384959",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            color: "#fff",
            fontSize: 12,
          }}
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{
            border: "none",
            background: C.pale,
            borderRadius: 8,
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          <X size={12} style={{ color: C.mid }} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={{ background: "rgba(136,189,242,0.06)" }}
    >
      <div className="flex items-center gap-2">
        <GitBranch size={12} style={{ color: C.mid }} />
        <span className="text-sm" style={{ color: C.primary }}>
          {branch.name}
        </span>
        {branch.code && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: C.pale, color: C.mid }}
          >
            {branch.code}
          </span>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => setEditing(true)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "3px 5px",
            borderRadius: 6,
          }}
        >
          <Pencil size={11} style={{ color: C.mid }} />
        </button>
        <button
          onClick={() => onDelete(branch.id)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "3px 5px",
            borderRadius: 6,
          }}
        >
          <Trash2 size={11} style={{ color: "#ef4444" }} />
        </button>
      </div>
    </div>
  );
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onDelete, onUpdate, setToast }) {
  const [expanded, setExpanded] = useState(false);
  const [branches, setBranches] = useState(course.branches || []);
  const [addingBranch, setAddingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", code: "" });
  const [savingBranch, setSavingBranch] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: course.name,
    code: course.code || "",
    totalSemesters: course.totalSemesters,
    hasBranches: course.hasBranches ?? false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleAddBranch = async () => {
    if (!branchForm.name.trim()) return;
    setSavingBranch(true);
    try {
      const res = await createBranch(course.id, branchForm);
      setBranches((prev) => [...prev, res.branch]);
      setBranchForm({ name: "", code: "" });
      setAddingBranch(false);
      setToast({ type: "success", msg: "Branch added" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm("Delete this branch?")) return;
    setDeletingBranch(branchId);
    try {
      await deleteBranch(course.id, branchId);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      setToast({ type: "success", msg: "Branch deleted" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setDeletingBranch(null);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const res = await updateCourse(course.id, {
        name: editForm.name,
        code: editForm.code,
        totalSemesters: editForm.totalSemesters,
        hasBranches: editForm.hasBranches,
      });
      onUpdate(res.course);
      setEditing(false);
      setToast({ type: "success", msg: "Course updated" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${C.border}`, background: C.card }}
    >
      {/* Course header */}
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            {/* Row 1: Name, Code, Semesters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Course Name
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Course name"
                  style={IS}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Code
                </label>
                <input
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="Code"
                  style={IS}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Total Semesters
                </label>
                <input
                  type="number"
                  value={editForm.totalSemesters}
                  min={1}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      totalSemesters: parseInt(e.target.value),
                    }))
                  }
                  placeholder="Semesters"
                  style={IS}
                />
              </div>
            </div>

            {/* Row 2: Has Branches toggle */}
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: C.mid,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Has branches / specializations?
              </label>
              <div className="flex gap-2">
                {[
                  { val: true, label: "Yes — has branches" },
                  { val: false, label: "No branches" },
                ].map(({ val, label }) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() =>
                      setEditForm((p) => ({ ...p, hasBranches: val }))
                    }
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: `1.5px solid ${editForm.hasBranches === val ? C.primary : "rgba(136,189,242,0.4)"}`,
                      background:
                        editForm.hasBranches === val
                          ? C.primary
                          : "transparent",
                      color: editForm.hasBranches === val ? "#fff" : C.mid,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Branch management — only when hasBranches */}
            {editForm.hasBranches && (
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(136,189,242,0.07)",
                  border: `1px dashed rgba(136,189,242,0.4)`,
                }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: C.mid }}>
                  BRANCHES
                </p>

                {/* Existing branches */}
                <div className="flex flex-col gap-1.5 mb-2">
                  {branches.map((branch) => (
                    <BranchRow
                      key={branch.id}
                      branch={branch}
                      courseId={course.id}
                      onDelete={handleDeleteBranch}
                      onUpdate={(updated) =>
                        setBranches((prev) =>
                          prev.map((b) => (b.id === updated.id ? updated : b)),
                        )
                      }
                      toast={setToast}
                    />
                  ))}
                  {branches.length === 0 && !addingBranch && (
                    <p className="text-xs py-1" style={{ color: C.mid }}>
                      No branches yet — add below
                    </p>
                  )}
                </div>

                {/* Add branch row */}
                {addingBranch ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Branch name (e.g. Computer Science)"
                      style={{ ...IS, flex: 1 }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddBranch()}
                    />
                    <input
                      value={branchForm.code}
                      onChange={(e) =>
                        setBranchForm((p) => ({ ...p, code: e.target.value }))
                      }
                      placeholder="Code (e.g. CSE)"
                      style={{ ...IS, width: 100 }}
                    />
                    <button
                      onClick={handleAddBranch}
                      disabled={savingBranch}
                      style={{
                        border: "none",
                        background: C.primary,
                        borderRadius: 8,
                        padding: "8px 12px",
                        cursor: "pointer",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {savingBranch ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setAddingBranch(false);
                        setBranchForm({ name: "", code: "" });
                      }}
                      style={{
                        border: "none",
                        background: C.pale,
                        borderRadius: 8,
                        padding: "8px 9px",
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <X size={12} style={{ color: C.mid }} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingBranch(true)}
                    style={{
                      border: "none",
                      background: C.pale,
                      borderRadius: 7,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.primary,
                      cursor: "pointer",
                    }}
                  >
                    + Add Branch
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: "6px 12px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  padding: "6px 14px",
                  background: C.primary,
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {savingEdit ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}
              >
                {(course.code || course.name.slice(0, 2))
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: C.primary }}>
                    {course.name}
                  </p>
                  {course.code && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        color: "#4f46e5",
                      }}
                    >
                      {course.code}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: C.mid }}>
                  {course.totalSemesters} Semesters • {branches.length} Branch
                  {branches.length !== 1 ? "es" : ""}
                  {course._count?.classSections > 0 &&
                    ` • ${course._count.classSections} Classes`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Pencil size={13} style={{ color: C.mid }} />
              </button>
              <button
                onClick={() => onDelete(course.id)}
                style={{
                  border: "none",
                  background: "rgba(239,68,68,0.07)",
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <Trash2 size={13} style={{ color: "#ef4444" }} />
              </button>
              <button
                onClick={() => setExpanded((p) => !p)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                {expanded ? (
                  <ChevronDown size={13} style={{ color: C.mid }} />
                ) : (
                  <ChevronRight size={13} style={{ color: C.mid }} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Branches */}
      {expanded && (
        <div
          className="px-5 pb-4 border-t space-y-2"
          style={{ borderColor: C.border, paddingTop: 12 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: C.mid }}>
              BRANCHES / SPECIALIZATIONS
            </p>
            <button
              onClick={() => setAddingBranch(true)}
              style={{
                border: "none",
                background: C.pale,
                borderRadius: 7,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                color: C.primary,
                cursor: "pointer",
              }}
            >
              + Add Branch
            </button>
          </div>

          {branches.length === 0 && !addingBranch && (
            <p className="text-xs py-2" style={{ color: C.mid }}>
              No branches yet — course has single track, or add branches below
            </p>
          )}

          {branches.map((branch) => (
            <BranchRow
              key={branch.id}
              branch={branch}
              courseId={course.id}
              onDelete={handleDeleteBranch}
              onUpdate={(updated) =>
                setBranches((prev) =>
                  prev.map((b) => (b.id === updated.id ? updated : b)),
                )
              }
              toast={setToast}
            />
          ))}

          {addingBranch && (
            <div className="flex items-center gap-2 pt-1">
              <input
                value={branchForm.name}
                onChange={(e) =>
                  setBranchForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Branch name (e.g. Computer Science)"
                style={{ ...IS, flex: 1 }}
              />
              <input
                value={branchForm.code}
                onChange={(e) =>
                  setBranchForm((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="Code"
                style={{ ...IS, width: 80 }}
              />
              <button
                onClick={handleAddBranch}
                disabled={savingBranch}
                style={{
                  border: "none",
                  background: C.primary,
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {savingBranch ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
              </button>
              <button
                onClick={() => {
                  setAddingBranch(false);
                  setBranchForm({ name: "", code: "" });
                }}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: "8px 9px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={13} style={{ color: C.mid }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const navigate = useNavigate();
  const config = useInstitutionConfig();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", totalSemesters: 8 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCourses();
      setCourses(res.courses || []);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim())
      return setToast({ type: "error", msg: "Course name is required" });
    if (!form.totalSemesters || form.totalSemesters < 1)
      return setToast({
        type: "error",
        msg: "Total semesters must be at least 1",
      });
    setSaving(true);
    try {
      const res = await createCourse({
        ...form,
        totalSemesters: Number(form.totalSemesters),
      });
      setCourses((prev) => [...prev, { ...res.course, branches: [] }]);
      setForm({ name: "", code: "", totalSemesters: 8 });
      setShowForm(false);
      setToast({ type: "success", msg: "Course created" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (
      !window.confirm("Delete this course? All branches will also be deleted.")
    )
      return;
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setToast({ type: "success", msg: "Course deleted" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    }
  };

  return (
    <PageLayout>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
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
                Courses
              </h1>
              <p className="text-sm" style={{ color: C.mid }}>
                Manage {config.courseLabel?.toLowerCase() || "courses"} and
                their branches
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm font-bold text-white rounded-xl"
            style={{
              padding: "9px 18px",
              background: C.primary,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add Course
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div
            className="rounded-2xl shadow-sm p-5 mb-5"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: C.primary }}>
                New Course
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={14} style={{ color: C.mid }} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-1">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.mid,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Course Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. BTech, BA, BCom"
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
                  Code (optional)
                </label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="e.g. CS, ME"
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
                  Total Semesters <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.totalSemesters}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, totalSemesters: e.target.value }))
                  }
                  style={IS}
                />
              </div>
            </div>
            <p className="text-xs mb-4" style={{ color: C.mid }}>
              You can add branches (e.g. CSE, ECE) after creating the course by
              expanding it below.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <BookOpen size={14} />
                )}
                {saving ? "Creating…" : "Create Course"}
              </button>
            </div>
          </div>
        )}

        {/* Courses list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : courses.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center gap-2 py-20"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <BookOpen size={32} style={{ color: C.light }} />
            <p className="text-sm font-medium" style={{ color: C.mid }}>
              No courses yet
            </p>
            <p className="text-xs" style={{ color: C.light }}>
              Add courses like BTech, BA, BCom
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={handleDeleteCourse}
                onUpdate={(updated) =>
                  setCourses((prev) =>
                    prev.map((c) =>
                      c.id === updated.id ? { ...c, ...updated } : c,
                    ),
                  )
                }
                setToast={setToast}
              />
            ))}
          </div>
        )}
      </div>
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
