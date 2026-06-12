// client/src/admin/pages/classes/CreateSectionsPage.jsx
// Supports SCHOOL (grade select 1-10), PUC (grade select + stream),
// DEGREE/DIPLOMA/PG (course → branch → semester dropdown)
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Users,
  UploadCloud,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import {
  fetchClassSections,
  createClassSection,
  deleteClassSection,
  activateClassForYear,
  fetchAcademicYears,
  fetchTeachersForDropdown,
  fetchStreams,
  fetchCourses,
} from "./api/classesApi";
import {
  useInstitutionConfig,
  getSemesterOptions,
} from "./hooks/useInstitutionConfig";
import * as XLSX from "xlsx";

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
   fontFamily: "'Inter', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
  background: "#fff",
};

const LabelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#6A89A7",
  marginBottom: 4,
   fontFamily: "'Inter', sans-serif",
};

// ── Small helpers ─────────────────────────────────────────────────────────────

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

const Inp = ({ label, ...props }) => (
  <div>
    {label && <label style={LabelStyle}>{label}</label>}
    <input {...props} style={{ ...IS, ...props.style }} />
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div>
    {label && <label style={LabelStyle}>{label}</label>}
    <select {...props} style={{ ...IS, cursor: "pointer", ...props.style }}>
      {children}
    </select>
  </div>
);

function BulkRow({ row, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input
        placeholder="Section (Optional)"
        value={row.section}
        onChange={(e) => onChange("section", e.target.value)}
        style={{ ...IS, flex: 1 }}
      />
      <input
        placeholder="Capacity"
        type="number"
        min={1}
        value={row.capacity}
        onChange={(e) => onChange("capacity", e.target.value)}
        style={{ ...IS, width: 110 }}
      />
      <button
        onClick={onRemove}
        style={{
          border: "none",
          background: "rgba(239,68,68,0.08)",
          borderRadius: 8,
          padding: "8px 9px",
          cursor: "pointer",
          display: "flex",
          flexShrink: 0,
        }}
      >
        <X size={13} style={{ color: "#ef4444" }} />
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function CreateSectionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = useInstitutionConfig();
  const { showStream, showCourse, gradeInputType, gradeLabel } = config;

  const [mode, setMode] = useState("single");
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [activeYearId, setActiveYearId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [streams, setStreams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Excel upload state ─────────────────────────────────────────────────────
  const [xlFile, setXlFile] = useState(null);
  const [xlRows, setXlRows] = useState([]);   // parsed preview rows
  const [xlErrors, setXlErrors] = useState([]); // row-level validation errors
  const [xlUploading, setXlUploading] = useState(false);
  const [xlResult, setXlResult] = useState(null); // {created, skipped, errors[]}

  // ── Single form state ──────────────────────────────────────────────────────
  const [sForm, setSForm] = useState({
    grade: "",
    section: "",
    capacity: "",
    streamId: "",
    combinationId: "",
    courseId: "",
    branchId: "",
  });

  // ── Bulk form state ────────────────────────────────────────────────────────
  const [bGrade, setBGrade] = useState("");
  const [bStreamId, setBStreamId] = useState("");
  const [bCombinationId, setBCombinationId] = useState("");
  const [bCourseId, setBCourseId] = useState("");
  const [bBranchId, setBBranchId] = useState("");
  const [bRows, setBRows] = useState([
    { id: 1, section: "A", capacity: "" },
    { id: 2, section: "B", capacity: "" },
  ]);

  // Activate modal
  const [activateModal, setActivateModal] = useState(null);
  const [actTeacherId, setActTeacherId] = useState("");
  const [actSaving, setActSaving] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const calls = [
        fetchClassSections(),
        fetchAcademicYears(),
        fetchTeachersForDropdown(),
      ];
      if (showStream) calls.push(fetchStreams());
      if (showCourse) calls.push(fetchCourses());

      const results = await Promise.all(calls);
      const [cd, yd, td, ...extra] = results;

      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      setYears(yr);
      const active = yr.find((y) => y.isActive);
      if (active) setActiveYearId(active.id);
      setTeachers(td.data || []);

      if (showStream && extra[0]) setStreams(extra[0].streams || []);
      if (showCourse) {
        const courseRes = extra[showStream ? 1 : 0];
        setCourses(courseRes?.courses || []);
      }
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  }, [showStream, showCourse]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Stream change handlers ─────────────────────────────────────────────────
  const handleSingleStreamChange = (streamId) => {
    setSForm((f) => ({ ...f, streamId, combinationId: "", grade: "" }));
  };

  const handleBulkStreamChange = (streamId) => {
    setBStreamId(streamId);
    setBCombinationId("");
    setBGrade("");
  };

  // ── Course change handlers ─────────────────────────────────────────────────
  const handleSingleCourseChange = (courseId) => {
    setSForm((f) => ({ ...f, courseId, branchId: "", grade: "" }));
  };

  const handleBulkCourseChange = (courseId) => {
    setBCourseId(courseId);
    setBBranchId("");
    setBGrade("");
  };

  // ── Single create ──────────────────────────────────────────────────────────
  const handleSingle = async () => {
    if (!sForm.grade.trim())
      return setToast({ type: "error", msg: `${gradeLabel} is required` });
    if (showStream && !sForm.streamId)
      return setToast({ type: "error", msg: "Stream is required for PUC" });

    const selectedStream = streams.find((s) => s.id === sForm.streamId);
    if (showStream && selectedStream?.hasCombinations && !sForm.combinationId)
      return setToast({
        type: "error",
        msg: "Subject group / combination is required",
      });
    if (showCourse && !sForm.courseId)
      return setToast({ type: "error", msg: "Course is required" });

    const selectedCourse = courses.find((c) => c.id === sForm.courseId);
    if (showCourse && selectedCourse?.hasBranches && !sForm.branchId)
      return setToast({
        type: "error",
        msg: "Branch is required for this course",
      });

    setSaving(true);
    try {
      const payload = {
        grade: sForm.grade.trim(),
        ...(sForm.section.trim() ? { section: sForm.section.trim() } : {}),
        ...(sForm.capacity ? { capacity: Number(sForm.capacity) } : {}),
      };
      if (showStream && sForm.streamId) payload.streamId = sForm.streamId;
      if (showStream && sForm.combinationId)
        payload.combinationId = sForm.combinationId;
      if (showCourse && sForm.courseId) payload.courseId = sForm.courseId;
      if (showCourse && sForm.branchId) payload.branchId = sForm.branchId;

      const res = await createClassSection(payload);
      const newClass = res.classSection || res.data || res;
      if (newClass?.id) {
        setClasses((prev) => [...prev, newClass]);
      } else {
        await load();
      }
      setToast({
        type: "success",
        msg: `${sForm.grade}${sForm.section.trim() ? `-${sForm.section.trim()}` : ""} created`,
      });
      setSForm({
        grade: "",
        section: "",
        capacity: "",
        streamId: "",
        combinationId: "",
        courseId: "",
        branchId: "",
      });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk create ────────────────────────────────────────────────────────────
  const handleBulk = async () => {
    if (!bGrade.trim())
      return setToast({ type: "error", msg: `${gradeLabel} is required` });
    if (showStream && !bStreamId)
      return setToast({ type: "error", msg: "Stream is required for PUC" });

    const selectedBulkStream = streams.find((s) => s.id === bStreamId);
    if (showStream && selectedBulkStream?.hasCombinations && !bCombinationId)
      return setToast({
        type: "error",
        msg: "Subject group / combination is required",
      });
    if (showCourse && !bCourseId)
      return setToast({ type: "error", msg: "Course is required" });

    const selectedBulkCourse = courses.find((c) => c.id === bCourseId);
    if (showCourse && selectedBulkCourse?.hasBranches && !bBranchId)
      return setToast({
        type: "error",
        msg: "Branch is required for this course",
      });

      const sections = bRows.map((r) => ({
        section: r.section?.trim() || null,
        capacity: r.capacity ? Number(r.capacity) : undefined,
      }));

      if (sections.length === 0)
        return setToast({ type: "error", msg: "Add at least one class" });

    setSaving(true);
    try {
      const payload = { grade: bGrade.trim(), sections };
      if (showStream && bStreamId) payload.streamId = bStreamId;
      if (showStream && bCombinationId) payload.combinationId = bCombinationId;
      if (showCourse && bCourseId) payload.courseId = bCourseId;
      if (showCourse && bBranchId) payload.branchId = bBranchId;

      const res = await createClassSection(payload);
      setToast({
        type: "success",
        msg: `${res.classSections?.length || 0} class(es) created${res.errors?.length ? `, ${res.errors.length} skipped` : ""}`,
      });
      setBGrade("");
      setBStreamId("");
      setBCombinationId("");
      setBCourseId("");
      setBBranchId("");
      setBRows([
        { id: 1, section: "A", capacity: "" },
        { id: 2, section: "B", capacity: "" },
        { id: 3, section: "C", capacity: "" },
      ]);
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk row helpers ───────────────────────────────────────────────────────
  const addBulkRow = () =>
    setBRows((prev) => [
      ...prev,
      { id: Date.now(), section: "", capacity: "" },
    ]);
  const updateBulkRow = (id, field, val) =>
    setBRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    );
  const removeBulkRow = (id) =>
    setBRows((prev) => prev.filter((r) => r.id !== id));

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class section?")) return;
    setDeleting(id);
    try {
      setClasses((prev) => prev.filter((cls) => cls.id !== id));
      await deleteClassSection(id);
      setToast({ type: "success", msg: "Class deleted" });
    } catch (err) {
      load();
      setToast({ type: "error", msg: err.message });
    } finally {
      setDeleting(null);
    }
  };

  // ── Activate ───────────────────────────────────────────────────────────────
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
        msg: `${activateModal.className} activated`,
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

  // ── Excel upload helpers ───────────────────────────────────────────────────

  /** Download the sample template (base64-encoded xlsx embedded inline) */
  const downloadTemplate = () => {
    // Build a minimal template on-the-fly using SheetJS
    const headers = ["Grade", "Section", "Capacity"];
    const examples = [
      [" 1", "A", 40],
      [" 1", "B", 38],
      [" 11", "A", 35],
      ["Semester 1", "A", 60],
    ]; 
    const wsData = [headers, ...examples];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Class Sections");
    XLSX.writeFile(wb, "class_sections_template.xlsx");
  };

  /** Parse the uploaded file and populate preview */
  const handleXlFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlFile(file);
    setXlResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        // Find header row (row that has "Grade" in first cell, case-insensitive)
        const headerIdx = raw.findIndex(
          (r) => String(r[0]).toLowerCase().replace(/[^a-z]/g, "") === "grade"
        );
        if (headerIdx === -1) {
          setXlErrors(["Could not find a header row with 'Grade' in the first column."]);
          setXlRows([]);
          return;
        }

        const dataRows = raw.slice(headerIdx + 1).filter((r) =>
          r.some((cell) => String(cell).trim() !== "")
        );

        const parsed = [];
        const errs = [];
        dataRows.forEach((r, i) => {
          const grade = String(r[0] ?? "").trim();
          const section = String(r[1] ?? "").trim() || null;
          const capacity = r[2] !== "" ? Number(r[2]) : undefined;
          const streamOrCourse = String(r[3] ?? "").trim();
          const branch = String(r[4] ?? "").trim();
          if (!grade) {
            errs.push(`Row ${i + 1}: Grade is required`);
            return;
          }

          if (capacity !== undefined && (isNaN(capacity) || capacity < 1)) {
            errs.push(`Row ${i + 1}: Capacity must be a positive number`);
            return;
          }

          parsed.push({ grade, section, capacity, streamOrCourse, branch, rowNum: i + 1 });
        });

        setXlRows(parsed);
        setXlErrors(errs);
      } catch (err) {
        setXlErrors([`Failed to read file: ${err.message}`]);
        setXlRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  /** Submit parsed rows to the API */
  const handleXlUpload = async () => {
    if (xlRows.length === 0) return;
    setXlUploading(true);
    setXlResult(null);

    // Group rows by grade (and streamOrCourse/branch as context text only)
    // Because our API accepts { grade, sections: [{section, capacity}] }
    // We call once per unique grade+stream combo
    const groups = {};
    for (const row of xlRows) {
      const key = `${row.grade}||${row.streamOrCourse}||${row.branch}`;
      if (!groups[key]) groups[key] = { grade: row.grade, streamOrCourse: row.streamOrCourse, branch: row.branch, sections: [] };
      groups[key].sections.push({ section: row.section, ...(row.capacity ? { capacity: row.capacity } : {}) });
    }

    let totalCreated = 0;
    const allErrors = [];

    for (const group of Object.values(groups)) {
      try {
        const payload = {
          grade: group.grade,
          sections: group.sections,
        };
        // Note: streamOrCourse and branch are name strings from Excel;
        // the backend expects IDs. We pass them as hints in a note field
        // only if the school type needs them — for SCHOOL type they are ignored.
        // To support PUC/Degree, the user should use the Bulk form (which has dropdowns).
        // Here we proceed as a basic school upload.
        const res = await createClassSection(payload);
        totalCreated += res.classSections?.length || 0;
        if (res.errors?.length) allErrors.push(...res.errors);
      } catch (err) {
        allErrors.push(err.message);
      }
    }

    setXlResult({ created: totalCreated, errors: allErrors });
    if (totalCreated > 0) {
      setToast({ type: "success", msg: `${totalCreated} section(s) created from Excel` });
      load();
    } else {
      setToast({ type: "error", msg: "No sections were created" });
    }
    setXlUploading(false);
    setXlFile(null);
    setXlRows([]);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const gradeGroups = classes.reduce((acc, cls) => {
    (acc[cls.grade] = acc[cls.grade] || []).push(cls);
    return acc;
  }, {});

  const selectedSingleCourse = courses.find((c) => c.id === sForm.courseId);
  const selectedSingleStream = streams.find((s) => s.id === sForm.streamId);

  const singleGridCols = showCourse
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    : showStream
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 md:grid-cols-3";

  // ── Semester options helper ────────────────────────────────────────────────
  const getSemOpts = (courseId) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? getSemesterOptions(course.totalSemesters) : [];
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/classes")}
            className="flex items-center gap-1.5 rounded-xl text-sm font-medium mb-3"
            style={{
              padding: "6px 12px",
              border: `1.5px solid ${C.border}`,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
               fontFamily: "'Inter', sans-serif",
            }}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: C.primary }}
            />
            <h1 className="text-xl font-semibold" style={{ color: C.primary }}>
              Create Class Sections
            </h1>
          </div>
          <p className="text-sm ml-3" style={{ color: C.mid }}>
            Add individual sections or create multiple sections at once
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          {[
            { key: "single", label: "Single Section" },
            { key: "bulk", label: "Bulk Create" },
            { key: "excel", label: "Excel Upload" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                 fontFamily: "'Inter', sans-serif",
                border: `1.5px solid ${mode === m.key ? C.primary : C.border}`,
                background: mode === m.key ? C.primary : "#fff",
                color: mode === m.key ? "#fff" : C.mid,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {m.key === "excel" && <FileSpreadsheet size={13} />}
              {m.label}
            </button>
          ))}
        </div>

        {/* ── SINGLE FORM ─────────────────────────────────────────────────── */}
        {mode === "single" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-5 mb-5"
            style={{ border: `1px solid ${C.border}` }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: C.primary }}
            >
              New Section
            </h2>

            <div className={`grid ${singleGridCols} gap-3 mb-4`}>
              {/* ── PUC: Stream ────────────────────────────────────────────── */}
              {showStream && (
                <Sel
                  label="Stream *"
                  value={sForm.streamId}
                  onChange={(e) => handleSingleStreamChange(e.target.value)}
                >
                  <option value="">Select Stream</option>
                  {streams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Sel>
              )}

              {/* ── PUC: Combination (only if stream has combinations) ──────── */}
              {showStream && selectedSingleStream?.hasCombinations && (
                <Sel
                  label="Group / Combination *"
                  value={sForm.combinationId}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, combinationId: e.target.value }))
                  }
                >
                  <option value="">Select Group</option>
                  {(selectedSingleStream?.combinations || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ""}
                    </option>
                  ))}
                </Sel>
              )}

              {/* ── Degree: Course ─────────────────────────────────────────── */}
              {showCourse && (
                <Sel
                  label={`${config.courseLabel || "Course"} *`}
                  value={sForm.courseId}
                  onChange={(e) => handleSingleCourseChange(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ""}
                    </option>
                  ))}
                </Sel>
              )}

              {/* ── Degree: Branch ─────────────────────────────────────────── */}
              {showCourse && (
                <Sel
                  label={`${config.branchLabel || "Branch"}`}
                  value={sForm.branchId}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, branchId: e.target.value }))
                  }
                  disabled={!sForm.courseId}
                  style={{ opacity: sForm.courseId ? 1 : 0.5 }}
                >
                  <option value="">Select Branch (optional)</option>
                  {(selectedSingleCourse?.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ""}
                    </option>
                  ))}
                </Sel>
              )}

              {/* ── Grade / Semester ───────────────────────────────────────── */}
              {gradeInputType === "semester" ? (
                <Sel
                  label={`${gradeLabel} *`}
                  value={sForm.grade}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, grade: e.target.value }))
                  }
                  disabled={!sForm.courseId}
                  style={{ opacity: sForm.courseId ? 1 : 0.5 }}
                >
                  <option value="">Select {gradeLabel}</option>
                  {getSemOpts(sForm.courseId).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Sel>
              ) : gradeInputType === "select" ? (
                <Sel
                  label={`${gradeLabel} *`}
                  value={sForm.grade}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, grade: e.target.value }))
                  }
                >
                  <option value="">Select {gradeLabel}</option>
                  {config.gradeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Sel>
              ) : (
                <Inp
                  label={`${gradeLabel} *`}
                  placeholder="e.g. lkg, ukg, nursery, grade 1"
                  value={sForm.grade}
                  onChange={(e) =>
                    setSForm((f) => ({ ...f, grade: e.target.value }))
                  }
                />
              )}

              {/* ── Section ────────────────────────────────────────────────── */}
              <Inp
                label="Section (Optional)"
                placeholder="e.g. A, B, 1"
                value={sForm.section}
                onChange={(e) =>
                  setSForm((f) => ({ ...f, section: e.target.value }))
                }
              />

              {/* ── Capacity ───────────────────────────────────────────────── */}
              <div>
                <label style={LabelStyle}>
                  Student Capacity{" "}
                  <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: C.light, flexShrink: 0 }} />
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 40"
                    value={sForm.capacity}
                    onChange={(e) =>
                      setSForm((f) => ({ ...f, capacity: e.target.value }))
                    }
                    style={{ ...IS, flex: 1 }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSingle}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
              style={{
                padding: "9px 20px",
                background: saving ? "rgba(106,137,167,0.5)" : C.primary,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Create Section
            </button>
          </div>
        )}

        {/* ── BULK FORM ────────────────────────────────────────────────────── */}
        {mode === "bulk" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-5 mb-5"
            style={{ border: `1px solid ${C.border}` }}
          >
            <h2
              className="text-sm font-semibold mb-4"
              style={{ color: C.primary }}
            >
              Bulk Create Sections
            </h2>

            {/* Top row */}
            <div
              className={`grid gap-3 mb-4 ${showCourse ? "grid-cols-1 md:grid-cols-3" : showStream ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
              style={{ maxWidth: showCourse ? "100%" : 480 }}
            >
              {/* PUC: Stream */}
              {showStream && (
                <Sel
                  label="Stream *"
                  value={bStreamId}
                  onChange={(e) => handleBulkStreamChange(e.target.value)}
                >
                  <option value="">Select Stream</option>
                  {streams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Sel>
              )}

              {/* PUC: Combination */}
              {showStream &&
                streams.find((s) => s.id === bStreamId)?.hasCombinations && (
                  <Sel
                    label="Group / Combination *"
                    value={bCombinationId}
                    onChange={(e) => setBCombinationId(e.target.value)}
                  >
                    <option value="">Select Group</option>
                    {(
                      streams.find((s) => s.id === bStreamId)?.combinations ||
                      []
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.code ? ` (${c.code})` : ""}
                      </option>
                    ))}
                  </Sel>
                )}

              {/* Degree: Course */}
              {showCourse && (
                <Sel
                  label={`${config.courseLabel || "Course"} *`}
                  value={bCourseId}
                  onChange={(e) => handleBulkCourseChange(e.target.value)}
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ""}
                    </option>
                  ))}
                </Sel>
              )}

              {/* Degree: Branch */}
              {showCourse && (
                <Sel
                  label={`${config.branchLabel || "Branch"}`}
                  value={bBranchId}
                  onChange={(e) => setBBranchId(e.target.value)}
                  disabled={!bCourseId}
                  style={{ opacity: bCourseId ? 1 : 0.5 }}
                >
                  <option value="">Select Branch (optional)</option>
                  {(
                    courses.find((c) => c.id === bCourseId)?.branches || []
                  ).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ""}
                    </option>
                  ))}
                </Sel>
              )}

              {/* Grade / Semester */}
              {gradeInputType === "semester" ? (
                <Sel
                  label={`${gradeLabel} *`}
                  value={bGrade}
                  onChange={(e) => setBGrade(e.target.value)}
                  disabled={!bCourseId}
                  style={{ opacity: bCourseId ? 1 : 0.5 }}
                >
                  <option value="">Select {gradeLabel}</option>
                  {getSemOpts(bCourseId).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Sel>
              ) : gradeInputType === "select" ? (
                <Sel
                  label={`${gradeLabel} *`}
                  value={bGrade}
                  onChange={(e) => setBGrade(e.target.value)}
                >
                  <option value="">Select {gradeLabel}</option>
                  {config.gradeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Sel>
              ) : (
                <Inp
                  label={`${gradeLabel} *`}
                  placeholder="e.g. lkg, ukg, nursery, grade 1"
                  value={bGrade}
                  onChange={(e) => setBGrade(e.target.value)}
                  style={{ maxWidth: 220 }}
                />
              )}
            </div>

            {/* Sections rows */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2">
                <p
                  className="text-xs font-semibold uppercase"
                  style={{ color: C.mid, letterSpacing: "0.5px" }}
                >
                  Sections
                </p>
                <p className="text-xs" style={{ color: C.light }}>
                  — set different capacity per section
                </p>
              </div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <p
                  className="text-xs font-medium"
                  style={{ color: C.mid, flex: 1 }}
                >
                  Section Name
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: C.mid, width: 110 }}
                >
                  Capacity (students)
                </p>
                <div style={{ width: 30 }} />
              </div>
              <div className="flex flex-col gap-2">
                {bRows.map((row) => (
                  <BulkRow
                    key={row.id}
                    row={row}
                    onChange={(field, val) => updateBulkRow(row.id, field, val)}
                    onRemove={() => removeBulkRow(row.id)}
                  />
                ))}
              </div>
              <button
                onClick={addBulkRow}
                style={{
                  marginTop: 8,
                  border: `1.5px dashed ${C.border}`,
                  background: "transparent",
                  borderRadius: 10,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                   fontFamily: "'Inter', sans-serif",
                }}
              >
                <Plus size={12} /> Add Section
              </button>
            </div>

            <button
              onClick={handleBulk}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white mt-4"
              style={{
                padding: "9px 20px",
                background: saving ? "rgba(106,137,167,0.5)" : C.primary,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                 fontFamily: "'Inter', sans-serif",
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <GraduationCap size={14} />
              )}
              Create {bRows.length} Class(es)
            </button>
          </div>
        )}

        {/* ── EXCEL UPLOAD FORM ───────────────────────────────────────────── */}
        {mode === "excel" && (
          <div
            className="bg-white rounded-2xl shadow-sm p-5 mb-5"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: C.primary }}>
                  Bulk Upload via Excel
                </h2>
                <p className="text-xs mt-0.5" style={{ color: C.mid }}>
                  Download the template, fill in your sections, then upload.
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 rounded-xl text-xs font-semibold"
                style={{
                  padding: "7px 14px",
                  border: `1.5px solid ${C.border}`,
                  background: "#fff",
                  color: C.primary,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Download size={13} /> Download Template
              </button>
            </div>

            {/* Drop zone */}
            <label
              htmlFor="xl-upload"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "32px 20px",
                border: `2px dashed ${xlFile ? C.primary : "rgba(136,189,242,0.5)"}`,
                borderRadius: 14,
                background: xlFile ? "rgba(56,73,89,0.04)" : C.bg,
                cursor: "pointer",
                marginBottom: 16,
                transition: "border 0.2s",
              }}
            >
              <UploadCloud size={28} style={{ color: xlFile ? C.primary : C.light }} />
              {xlFile ? (
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: C.primary }}>
                    {xlFile.name}
                  </p>
                  <p className="text-xs" style={{ color: C.mid }}>
                    {xlRows.length} valid row(s) found
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: C.primary }}>
                    Click to select an Excel file
                  </p>
                  <p className="text-xs" style={{ color: C.mid }}>
                    .xlsx or .xls — use the template format
                  </p>
                </div>
              )}
              <input
                id="xl-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleXlFileChange}
              />
            </label>

            {/* Validation errors */}
            {xlErrors.length > 0 && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: "#dc2626" }}>
                  {xlErrors.length} issue(s) found — fix these rows before uploading:
                </p>
                {xlErrors.map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: "#dc2626" }}>
                    • {e}
                  </p>
                ))}
              </div>
            )}

            {/* Preview table */}
            {xlRows.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <p
                  className="text-xs font-semibold uppercase mb-2"
                  style={{ color: C.mid, letterSpacing: "0.5px" }}
                >
                  Preview — {xlRows.length} row(s)
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Row", "Grade", "Section", "Capacity", "Stream/Course", "Branch"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "6px 10px",
                              background: C.pale,
                              color: C.primary,
                              fontWeight: 600,
                              textAlign: "left",
                              borderBottom: `1px solid ${C.border}`,
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {xlRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "5px 10px", color: C.light }}>{r.rowNum}</td>
                        <td style={{ padding: "5px 10px", color: C.primary, fontWeight: 500 }}>{r.grade}</td>
                        <td style={{ padding: "5px 10px", color: C.primary }}>{r.section}</td>
                        <td style={{ padding: "5px 10px", color: C.mid }}>{r.capacity ?? "—"}</td>
                        <td style={{ padding: "5px 10px", color: C.mid }}>{r.streamOrCourse || "—"}</td>
                        <td style={{ padding: "5px 10px", color: C.mid }}>{r.branch || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Upload result */}
            {xlResult && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{
                  background: xlResult.created > 0 ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${xlResult.created > 0 ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: xlResult.created > 0 ? "#15803d" : "#dc2626" }}
                >
                  ✓ {xlResult.created} section(s) created
                  {xlResult.errors.length > 0 &&
                    `, ${xlResult.errors.length} skipped`}
                </p>
                {xlResult.errors.map((e, i) => (
                  <p key={i} className="text-xs mt-0.5" style={{ color: "#dc2626" }}>
                    • {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleXlUpload}
                disabled={xlUploading || xlRows.length === 0 || xlErrors.length > 0}
                className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  padding: "9px 20px",
                  background:
                    xlRows.length === 0 || xlErrors.length > 0
                      ? "rgba(106,137,167,0.4)"
                      : xlUploading
                      ? "rgba(106,137,167,0.5)"
                      : C.primary,
                  border: "none",
                  cursor:
                    xlUploading || xlRows.length === 0 || xlErrors.length > 0
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {xlUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                Upload {xlRows.length > 0 ? `${xlRows.length} Section(s)` : ""}
              </button>
              {xlFile && (
                <button
                  onClick={() => {
                    setXlFile(null);
                    setXlRows([]);
                    setXlErrors([]);
                    setXlResult(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.mid,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Info note for PUC/Degree */}
            <p
              className="text-xs mt-3 rounded-lg px-3 py-2"
              style={{ background: "rgba(189,221,252,0.2)", color: C.mid }}
            >
              ℹ️ Excel upload works best for <strong style={{ color: C.primary }}>regular schools (Grade 1–10)</strong>.
              For PUC (Stream) or Degree (Course/Branch) sections, use the{" "}
              <button
                onClick={() => setMode("bulk")}
                style={{ background: "none", border: "none", color: C.primary, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}
              >
                Bulk Create
              </button>{" "}
              tab which has the correct dropdowns.
            </p>
          </div>
        )}

        {/* ── EXISTING SECTIONS LIST ───────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl shadow-sm p-5"
          style={{ border: `1px solid ${C.border}` }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: C.primary }}
          >
            All Sections ({classes.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2
                size={20}
                className="animate-spin"
                style={{ color: C.light }}
              />
            </div>
          ) : classes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: C.mid }}>
              No sections created yet
            </p>
          ) : (
            Object.entries(gradeGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, secs]) => (
                <div key={grade} className="mb-5">
                  <p
                    className="text-xs font-semibold uppercase mb-2"
                    style={{ color: C.mid, letterSpacing: "0.5px" }}
                  >
                    {grade}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {secs.map((cls) => {
                      const link = cls.academicYearLinks?.[0];
                      const teacher = link?.classTeacher;
                      const students = cls._count?.studentEnrollments || 0;
                      return (
                        <div
                          key={cls.id}
                          className="rounded-xl p-4"
                          style={{
                            border: `1px solid ${C.border}`,
                            background: C.bg,
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
                                style={{ background: C.pale, color: C.primary }}
                              >
                                {cls.section || "—"}
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
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{
                                        background: "rgba(59,130,246,0.1)",
                                        color: "#1d4ed8",
                                      }}
                                    >
                                      {cls.stream.name}
                                    </span>
                                  )}
                                  {cls.branch && (
                                    <span
                                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                      style={{
                                        background: "rgba(168,85,247,0.1)",
                                        color: "#6d28d9",
                                      }}
                                    >
                                      {cls.branch.code || cls.branch.name}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Users
                                      size={11}
                                      style={{ color: C.light }}
                                    />
                                    <span
                                      className="text-xs"
                                      style={{ color: C.mid }}
                                    >
                                      {students} students
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!link && (
                                <button
                                  onClick={() =>
                                    setActivateModal({
                                      classId: cls.id,
                                      className: cls.name,
                                    })
                                  }
                                  style={{
                                    border: "none",
                                    background: C.pale,
                                    borderRadius: 7,
                                    padding: "4px 9px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: C.primary,
                                    cursor: "pointer",
                                     fontFamily: "'Inter', sans-serif",
                                  }}
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(cls.id)}
                                disabled={deleting === cls.id}
                                style={{
                                  border: "none",
                                  background: "rgba(239,68,68,0.07)",
                                  borderRadius: 7,
                                  padding: "5px 6px",
                                  cursor: "pointer",
                                  display: "flex",
                                }}
                              >
                                {deleting === cls.id ? (
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
                          {teacher && (
                            <p className="text-xs" style={{ color: C.mid }}>
                              Teacher: {teacher.firstName} {teacher.lastName}
                            </p>
                          )}
                          {link && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(16,185,129,0.1)",
                                color: "#065f46",
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: "#10b981" }}
                              />
                              {link.academicYear?.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ── ACTIVATE MODAL ────────────────────────────────────────────────── */}
      {activateModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6"
            style={{
              width: "min(420px,90vw)",
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: C.primary }}
                >
                  Activate {activateModal.className}
                </h3>
                <p className="text-sm" style={{ color: C.mid }}>
                  Set class teacher for this academic year
                </p>
              </div>
              <button
                onClick={() => setActivateModal(null)}
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

            <div className="mb-3">
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
              >
                Academic Year
              </label>
              <select
                value={activeYearId}
                onChange={(e) => setActiveYearId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium outline-none"
                style={{
                  padding: "8px 11px",
                  border: `1.5px solid ${C.border}`,
                  color: C.primary,
                   fontFamily: "'Inter', sans-serif",
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
              <label
                className="text-sm font-medium block mb-1"
                style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
              >
                Class Teacher (optional)
              </label>
              <select
                value={actTeacherId}
                onChange={(e) => setActTeacherId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium outline-none"
                style={{
                  padding: "8px 11px",
                  border: `1.5px solid ${C.border}`,
                  color: C.primary,
                   fontFamily: "'Inter', sans-serif",
                  background: "#fff",
                }}
              >
                <option value="">No class teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} – {t.designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setActivateModal(null)}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
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
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                  opacity: actSaving ? 0.7 : 1,
                }}
              >
                {actSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
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
    </>
  );
}