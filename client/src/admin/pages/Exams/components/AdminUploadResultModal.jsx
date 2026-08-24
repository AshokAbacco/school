// client/src/admin/pages/Exams/components/AdminUploadResultModal.jsx
import { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import {
  X, ChevronDown, BookOpen, Save, Loader2, AlertCircle, Check,
  User, Hash, CheckSquare, Square, UploadCloud, FileDown, FileUp, Layers,
} from "lucide-react";
import {
  fetchExamGroups, fetchAllClassSections, fetchSchedulesForExam,
  fetchStudentsForSchedule, saveMarks, fetchSubExamGroups,
} from "./uploadResultsApi.js";
import { downloadSampleExcel, readExcelFile, matchExcelRowsToStudents, downloadSampleExcelAllSubjects, readExcelWorkbookAllSheets, matchWorkbookToSubjects } from "./excelMarksUtils.js";

// ─── Design tokens (mirrors teacher/AddResult.jsx palette) ─────────────────
const T = {
  navy: "#0f2744", blue: "#2563eb", blueLight: "#dbeafe",
  teal: "#0d9488", amber: "#d97706", amberLight: "#fef3c7",
  slate: "#64748b", slateLight: "#f1f5f9", border: "#e2e8f0",
  white: "#ffffff", bg: "#f8fafc", text: "#0f2744", textSub: "#64748b",
  red: "#dc2626", redLight: "#fef2f2", green: "#059669", greenLight: "#ecfdf5",
};

// ─── Marking formats ────────────────────────────────────────────────────────
const FORMATS = [
  { id: "standard", label: "Standard (Marks / 100)" },
  { id: "fa",        label: "Formative Assessment (R&R, CW, PW, ST)" },
];

const GRADE_SCALE = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A"  },
  { min: 70, grade: "B"  },
  { min: 60, grade: "C"  },
  { min: 50, grade: "D"  },
  { min: 0,  grade: "F"  },
];
function calcGrade(pct) {
  if (pct == null || isNaN(pct)) return "—";
  return GRADE_SCALE.find((g) => pct >= g.min)?.grade ?? "—";
}

// Sum of the 4 component fields → TOT (also written to marksObtained)
function faTotal(components) {
  const { rr, cw, pw, st } = components || {};
  return [rr, cw, pw, st].reduce((sum, v) => {
    const n = Number(v);
    return sum + (v !== "" && v != null && !isNaN(n) ? n : 0);
  }, 0);
}

// ─── small pieces ────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: T.slate }}>{label}</span>
      {children}
    </div>
  );
}

function Dropdown({ value, onChange, disabled, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: "100%", appearance: "none", cursor: disabled ? "default" : "pointer",
          background: T.slateLight, border: `1.5px solid ${T.border}`, borderRadius: 11,
          padding: "10px 34px 10px 14px", fontSize: 13.5, color: T.text,
          outline: "none", opacity: disabled ? 0.5 : 1,
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.slate }} />
    </div>
  );
}

function InfoChip({ label, value, accent = T.navy, bg = T.slateLight }) {
  return (
    <div style={{ background: T.slateLight, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.slate, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent, background: bg, display: "inline-block", borderRadius: 6, padding: "2px 8px" }}>{value}</div>
    </div>
  );
}

// ─── Student row (with selection checkbox) ─────────────────────────────────
const StudentRow = memo(function StudentRow({ student, maxMarks, onUpdate }) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "36px 70px 1fr 110px 88px 1fr",
        gap: 10, padding: "11px 14px", alignItems: "center",
        borderBottom: `1px solid ${T.border}`,
        opacity: student.selected ? 1 : 0.45,
        transition: "opacity 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={!!student.selected}
        onChange={(e) => onUpdate(student.studentId, "selected", e.target.checked)}
        style={{ width: 15, height: 15, accentColor: T.blue, cursor: "pointer" }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>{student.rollNumber || "–"}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: T.blueLight,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: T.blue, flexShrink: 0,
        }}>
          {student.studentName?.[0] || "S"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{student.studentName}</div>
          <div style={{ fontSize: 10.5, color: T.slate }}>{student.admissionNumber || student.email || ""}</div>
        </div>
      </div>
      <input
        type="number" min="0" max={maxMarks}
        value={student.isAbsent ? "" : (student.marksObtained ?? "")}
        disabled={student.isAbsent || !student.selected}
        onChange={(e) => onUpdate(student.studentId, "marksObtained", e.target.value)}
        placeholder={`0–${maxMarks}`}
        style={{
          width: "100%", textAlign: "center", background: T.white, border: `1.5px solid ${T.border}`,
          borderRadius: 9, padding: "7px 8px", fontSize: 13, color: T.text, outline: "none",
        }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.slate, cursor: "pointer", whiteSpace: "nowrap" }}>
        <input
          type="checkbox"
          checked={!!student.isAbsent}
          disabled={!student.selected}
          onChange={(e) => {
            onUpdate(student.studentId, "isAbsent", e.target.checked);
            if (e.target.checked) onUpdate(student.studentId, "marksObtained", "");
          }}
          style={{ width: 14, height: 14, accentColor: T.red, cursor: "pointer" }}
        />
        Absent
      </label>
      <input
        type="text"
        value={student.remarks || ""}
        disabled={!student.selected}
        onChange={(e) => onUpdate(student.studentId, "remarks", e.target.value)}
        placeholder="Optional remarks…"
        style={{
          width: "100%", background: T.white, border: `1.5px solid ${T.border}`,
          borderRadius: 9, padding: "7px 10px", fontSize: 12.5, color: T.text, outline: "none",
        }}
      />
    </div>
  );
});

// ─── Student row — Formative Assessment format (R&R / CW / PW / ST) ───────
const FA_FIELD_COLS = "36px 60px 1fr 54px 54px 54px 54px 56px 46px 34px 70px 1fr";
const FA_MINI_INPUT = {
  width: "100%", textAlign: "center", background: T.white, border: `1.5px solid ${T.border}`,
  borderRadius: 8, padding: "6px 4px", fontSize: 12.5, color: T.text, outline: "none",
};

const StudentRowFA = memo(function StudentRowFA({ student, maxMarks, onUpdate }) {
  const components = student.components || { rr: "", cw: "", pw: "", st: "" };
  const tot = student.isAbsent ? null : faTotal(components);
  const pct = tot != null && maxMarks > 0 ? Math.round((tot / maxMarks) * 1000) / 10 : null;
  const grd = pct != null ? calcGrade(pct) : "—";

  const updateComponent = (field, value) => {
    const nextComponents = { ...components, [field]: value };
    onUpdate(student.studentId, "components", nextComponents);
    onUpdate(student.studentId, "marksObtained", student.isAbsent ? "" : faTotal(nextComponents));
  };

  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: FA_FIELD_COLS,
        gap: 8, padding: "11px 14px", alignItems: "center",
        borderBottom: `1px solid ${T.border}`,
        opacity: student.selected ? 1 : 0.45,
        transition: "opacity 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={!!student.selected}
        onChange={(e) => onUpdate(student.studentId, "selected", e.target.checked)}
        style={{ width: 15, height: 15, accentColor: T.blue, cursor: "pointer" }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>{student.rollNumber || "–"}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%", background: T.blueLight,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10.5, fontWeight: 800, color: T.blue, flexShrink: 0,
        }}>
          {student.studentName?.[0] || "S"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{student.studentName}</div>
          <div style={{ fontSize: 10, color: T.slate }}>{student.admissionNumber || student.email || ""}</div>
        </div>
      </div>

      {["rr", "cw", "pw", "st"].map((f) => (
        <input
          key={f}
          type="number" min="0"
          value={student.isAbsent ? "" : (components[f] ?? "")}
          disabled={student.isAbsent || !student.selected}
          onChange={(e) => updateComponent(f, e.target.value)}
          style={FA_MINI_INPUT}
        />
      ))}

      <span style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: T.navy }}>{tot ?? "—"}</span>
      <span style={{
        textAlign: "center", fontSize: 11, fontWeight: 800, color: T.blue,
        background: T.blueLight, borderRadius: 6, padding: "2px 0",
      }}>{grd}</span>
      <span style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: T.slate }}>{pct != null ? `${pct}%` : "—"}</span>

      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Absent">
        <input
          type="checkbox"
          checked={!!student.isAbsent}
          disabled={!student.selected}
          onChange={(e) => {
            onUpdate(student.studentId, "isAbsent", e.target.checked);
            if (e.target.checked) onUpdate(student.studentId, "marksObtained", "");
          }}
          style={{ width: 14, height: 14, accentColor: T.red, cursor: "pointer" }}
        />
      </label>

      <input
        type="text"
        value={student.remarks || ""}
        disabled={!student.selected}
        onChange={(e) => onUpdate(student.studentId, "remarks", e.target.value)}
        placeholder="Optional remarks…"
        style={{
          width: "100%", background: T.white, border: `1.5px solid ${T.border}`,
          borderRadius: 9, padding: "7px 10px", fontSize: 12.5, color: T.text, outline: "none",
        }}
      />
    </div>
  );
});

// Fetches + normalizes one subject's student list into the shape stored in
// subjectData[subjectId]. Standalone (not a hook) so it can be reused both
// by the lazy per-tab loader and by the "load everything for bulk Excel" flow.
async function fetchSubjectEntry(subj) {
  const j = await fetchStudentsForSchedule(subj.scheduleId);
  const students = (j.data?.students || []).map((s) => ({
    ...s,
    selected: true,
    components: s.components || { rr: "", cw: "", pw: "", st: "" },
  }));
  return {
    scheduleId: subj.scheduleId,
    scheduleInfo: j.data?.schedule,
    students,
    loading: false,
  };
}

// ─── Main modal ─────────────────────────────────────────────────────────────
export default function AdminUploadResultModal({ presetClass, onClose, onSaved }) {
  const [exams, setExams]               = useState([]);
  const [examId, setExamId]             = useState("");
  const [classes, setClasses]           = useState([]);
  const [classId, setClassId]           = useState(presetClass?.classSectionId || "");
  const [loadingInit, setLoadingInit]   = useState(true);

  const [schedules, setSchedules]       = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [activeSubjectId, setActiveSubjectId] = useState("");
  // subjectData[subjectId] = { scheduleId, scheduleInfo, students, loading, touched }
  const [subjectData, setSubjectData]   = useState({});

  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  // ── Sub Exam (optional) — exams filed under the default "Assessment" term.
  // Kept as a parallel, standard-format-only entry table so it can't disturb
  // the existing main-exam flow (FA format, Excel import) in any way.
  const [subExamGroups, setSubExamGroups]     = useState([]);
  const [subExamId, setSubExamId]             = useState("");
  const [loadingSubExams, setLoadingSubExams] = useState(false);
  const [subSchedules, setSubSchedules]       = useState([]);
  const [loadingSubSchedules, setLoadingSubSchedules] = useState(false);
  // subSubjectData[subjectId] = { scheduleId, students, loading }
  const [subSubjectData, setSubSubjectData]   = useState({});

  useEffect(() => {
    setLoadingSubExams(true);
    fetchSubExamGroups()
      .then((j) => setSubExamGroups(j.data || []))
      .catch(() => {}) // optional feature — fail silently, dropdown just stays empty
      .finally(() => setLoadingSubExams(false));
  }, []);

  useEffect(() => {
    setSubSchedules([]);
    setSubSubjectData({});
    if (!subExamId) return;
    setLoadingSubSchedules(true);
    fetchSchedulesForExam(subExamId)
      .then((j) => setSubSchedules(j.data || []))
      .catch((e) => setError(e.message || "Failed to load sub exam schedules"))
      .finally(() => setLoadingSubSchedules(false));
  }, [subExamId]);

  // Sub-exam schedule for the currently active MAIN subject, matched by subjectId
  const subSubjectForActive = useMemo(() => {
    if (!subExamId || !classId || !activeSubjectId) return null;
    const s = subSchedules.find((sc) => sc.classSectionId === classId && sc.subjectId === activeSubjectId);
    if (!s) return null;
    return { id: s.subjectId, scheduleId: s.id, maxMarks: s.maxMarks, passingMarks: s.passingMarks };
  }, [subExamId, classId, activeSubjectId, subSchedules]);

  // Lazily load students for the active subject's SUB exam schedule
  useEffect(() => {
    if (!subSubjectForActive) return;
    if (subSubjectData[subSubjectForActive.id]?.students) return;

    setSubSubjectData((prev) => ({
      ...prev,
      [subSubjectForActive.id]: { ...(prev[subSubjectForActive.id] || {}), loading: true },
    }));

    fetchStudentsForSchedule(subSubjectForActive.scheduleId)
      .then((j) => {
        const students = (j.data?.students || []).map((s) => ({ ...s, selected: true }));
        setSubSubjectData((prev) => ({
          ...prev,
          [subSubjectForActive.id]: { scheduleId: subSubjectForActive.scheduleId, students, loading: false },
        }));
      })
      .catch((e) => {
        setError(e.message || "Failed to load sub exam students");
        setSubSubjectData((prev) => ({ ...prev, [subSubjectForActive.id]: { ...(prev[subSubjectForActive.id] || {}), loading: false } }));
      });
  }, [subSubjectForActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSubStudent = useCallback((studentId, key, value) => {
    if (!subSubjectForActive) return;
    const subjId = subSubjectForActive.id;
    setSubSubjectData((prev) => {
      const cur = prev[subjId];
      if (!cur) return prev;
      return {
        ...prev,
        [subjId]: {
          ...cur,
          students: cur.students.map((s) => s.studentId === studentId ? { ...s, [key]: value } : s),
        },
      };
    });
  }, [subSubjectForActive]);

  // ── Initial load: exams + all classes (unrestricted) ──
  useEffect(() => {
    Promise.all([fetchExamGroups(), fetchAllClassSections()])
      .then(([ej, cj]) => {
        const examList = ej.data || [];
        setExams(examList);
        if (examList.length) setExamId(examList[0].id);
        setClasses(cj.classSections || cj.data || []);
      })
      .catch((e) => setError(e.message || "Failed to load exams / classes"))
      .finally(() => setLoadingInit(false));
  }, []);

  // ── When exam changes: fetch ALL schedules for that exam (every class + subject) ──
  useEffect(() => {
    setSchedules([]);
    setSubjectData({});
    setActiveSubjectId("");
    if (!examId) return;
    setLoadingSchedules(true);
    fetchSchedulesForExam(examId)
      .then((j) => setSchedules(j.data || []))
      .catch((e) => setError(e.message || "Failed to load schedules"))
      .finally(() => setLoadingSchedules(false));
  }, [examId]);

  // ── Subjects scheduled for the selected class, within the selected exam ──
  const subjectsForClass = useMemo(() => {
    if (!classId) return [];
    const map = new Map();
    schedules
      .filter((s) => s.classSectionId === classId)
      .forEach((s) => {
        if (!map.has(s.subjectId)) {
          map.set(s.subjectId, {
            id: s.subjectId,
            name: s.subject?.name || "Subject",
            code: s.subject?.code || "",
            scheduleId: s.id,
            maxMarks: s.maxMarks,
            passingMarks: s.passingMarks,
          });
        }
      });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules, classId]);

  // Reset active subject whenever the class or its subject list changes
  useEffect(() => {
    setSubjectData({});
    setActiveSubjectId(subjectsForClass[0]?.id || "");
  }, [classId, subjectsForClass.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazily load students for the active subject's schedule ──
  useEffect(() => {
    if (!activeSubjectId) return;
    const subj = subjectsForClass.find((s) => s.id === activeSubjectId);
    if (!subj) return;
    if (subjectData[activeSubjectId]?.students) return; // already loaded/cached

    setSubjectData((prev) => ({
      ...prev,
      [activeSubjectId]: { ...(prev[activeSubjectId] || {}), loading: true },
    }));

    fetchSubjectEntry(subj)
      .then((entry) => {
        setSubjectData((prev) => ({ ...prev, [activeSubjectId]: entry }));
      })
      .catch((e) => {
        setError(e.message || "Failed to load students");
        setSubjectData((prev) => ({ ...prev, [activeSubjectId]: { ...(prev[activeSubjectId] || {}), loading: false } }));
      });
  }, [activeSubjectId, subjectsForClass]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStudent = useCallback((studentId, key, value) => {
    setSubjectData((prev) => {
      const cur = prev[activeSubjectId];
      if (!cur) return prev;
      return {
        ...prev,
        [activeSubjectId]: {
          ...cur,
          students: cur.students.map((s) => s.studentId === studentId ? { ...s, [key]: value } : s),
        },
      };
    });
  }, [activeSubjectId]);

  const toggleSelectAll = useCallback((checked) => {
    setSubjectData((prev) => {
      const cur = prev[activeSubjectId];
      if (!cur) return prev;
      return {
        ...prev,
        [activeSubjectId]: { ...cur, students: cur.students.map((s) => ({ ...s, selected: checked })) },
      };
    });
  }, [activeSubjectId]);

  // ── Marking format per subject tab (defaults to "standard") ──
  const setSubjectFormat = useCallback((format) => {
    setSubjectData((prev) => {
      const cur = prev[activeSubjectId];
      if (!cur) return prev;
      return { ...prev, [activeSubjectId]: { ...cur, format } };
    });
  }, [activeSubjectId]);

  // ── Excel: download a sample sheet for the active subject ──
  const [excelError, setExcelError]     = useState("");
  const [excelNotice, setExcelNotice]   = useState("");
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const excelInputRef = useRef(null);

  const handleDownloadSample = () => {
    const data = subjectData[activeSubjectId];
    const subj = subjectsForClass.find((s) => s.id === activeSubjectId);
    if (!data?.students?.length || !subj) return;
    downloadSampleExcel({
      subjectName: subj.name,
      maxMarks:    subj.maxMarks,
      examName:    exams.find((e) => e.id === examId)?.name || "Exam",
      className:   classes.find((c) => c.id === classId)
        ? `Grade ${classes.find((c) => c.id === classId).grade}${classes.find((c) => c.id === classId).section ? "-" + classes.find((c) => c.id === classId).section : ""}`
        : "Class",
      format: data.format || "standard",
      students: data.students,
    });
  };

  const handleUploadExcelClick = () => {
    setExcelError(""); setExcelNotice("");
    excelInputRef.current?.click();
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const subjId = activeSubjectId;
    const cur = subjectData[subjId];
    if (!cur?.students?.length) return;

    setUploadingExcel(true);
    setExcelError(""); setExcelNotice("");
    try {
      const rows = await readExcelFile(file);
      const { isFA, updates, matchedCount, totalRows } = matchExcelRowsToStudents(rows, cur.students);

      setSubjectData((prev) => {
        const c = prev[subjId];
        if (!c) return prev;
        return {
          ...prev,
          [subjId]: {
            ...c,
            format: isFA ? "fa" : "standard",
            students: c.students.map((s) => (updates[s.studentId] ? { ...s, ...updates[s.studentId] } : s)),
          },
        };
      });

      setExcelNotice(
        matchedCount < totalRows
          ? `Matched ${matchedCount} of ${totalRows} rows. Unmatched rows were skipped (check Roll No / Student spelling).`
          : `Matched all ${matchedCount} students from the uploaded file.`
      );
    } catch (err) {
      setExcelError(err.message || "Failed to process the uploaded Excel file");
    } finally {
      setUploadingExcel(false);
    }
  };

  const activeData    = subjectData[activeSubjectId];
  const activeSubject = subjectsForClass.find((s) => s.id === activeSubjectId);
  const activeStudents = activeData?.students || [];
  const activeFormat   = activeData?.format || "standard";
  const selectedCount  = activeStudents.filter((s) => s.selected).length;
  const allSelected    = activeStudents.length > 0 && selectedCount === activeStudents.length;

  useEffect(() => {
    setExcelError(""); setExcelNotice("");
  }, [activeSubjectId]);

  // ── Excel: ALL subjects at once (multi-sheet workbook) ──
  const [bulkBusy, setBulkBusy]     = useState(false);
  const [bulkError, setBulkError]   = useState("");
  const [bulkNotice, setBulkNotice] = useState("");
  const bulkInputRef = useRef(null);

  // Fetches any subject in this class whose students haven't been loaded yet,
  // merges them into subjectData, and returns the up-to-date map.
  const ensureAllSubjectsLoaded = async () => {
    const missing = subjectsForClass.filter((s) => !subjectData[s.id]?.students);
    if (!missing.length) return subjectData;

    const fetched = await Promise.all(
      missing.map(async (s) => [s.id, await fetchSubjectEntry(s)])
    );
    const merged = { ...subjectData };
    fetched.forEach(([id, entry]) => { merged[id] = entry; });
    setSubjectData(merged);
    return merged;
  };

  const handleDownloadAllSample = async () => {
    if (!subjectsForClass.length) return;
    setBulkError(""); setBulkNotice("");
    setBulkBusy(true);
    try {
      const data = await ensureAllSubjectsLoaded();
      const subjectsPayload = subjectsForClass.map((s) => ({
        name: s.name,
        maxMarks: s.maxMarks,
        format: data[s.id]?.format || "standard",
        students: data[s.id]?.students || [],
      }));
      downloadSampleExcelAllSubjects({
        subjects: subjectsPayload,
        examName: exams.find((e) => e.id === examId)?.name || "Exam",
        className: (() => {
          const c = classes.find((cc) => cc.id === classId);
          return c ? `Grade ${c.grade}${c.section ? "-" + c.section : ""}` : "Class";
        })(),
      });
    } catch (err) {
      setBulkError(err.message || "Failed to prepare the sample file");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleUploadAllClick = () => {
    setBulkError(""); setBulkNotice("");
    bulkInputRef.current?.click();
  };

  const handleAllSubjectsFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBulkBusy(true);
    setBulkError(""); setBulkNotice("");
    try {
      const data = await ensureAllSubjectsLoaded();
      const sheets = await readExcelWorkbookAllSheets(file);

      const subjectsForMatch = subjectsForClass.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        students: data[s.id]?.students || [],
      }));

      const { results, unmatchedSheets } = matchWorkbookToSubjects(sheets, subjectsForMatch);

      setSubjectData((prev) => {
        const next = { ...prev };
        results.forEach(({ subjectId, isFA, updates }) => {
          const cur = next[subjectId];
          if (!cur) return;
          next[subjectId] = {
            ...cur,
            format: isFA ? "fa" : "standard",
            students: cur.students.map((s) => (updates[s.studentId] ? { ...s, ...updates[s.studentId] } : s)),
          };
        });
        return next;
      });

      const totalMatched = results.reduce((sum, r) => sum + r.matchedCount, 0);
      const subjNames = results.map((r) => r.subjectName).join(", ");
      setBulkNotice(
        `Filled ${totalMatched} student entr${totalMatched !== 1 ? "ies" : "y"} across ${results.length} subject${results.length !== 1 ? "s" : ""} (${subjNames}).` +
        (unmatchedSheets.length ? ` Sheets not matched to a subject: ${unmatchedSheets.join(", ")}.` : "")
      );
    } catch (err) {
      setBulkError(err.message || "Failed to process the uploaded Excel file");
    } finally {
      setBulkBusy(false);
    }
  };

  // Which subject tabs already have data ready to save (visited + selections made)
  const loadedSubjectIds = Object.keys(subjectData).filter((id) => subjectData[id]?.students?.length);

  const handleSaveAll = async () => {
    setError("");
    if (!loadedSubjectIds.length) return setError("Enter marks for at least one subject first");

    // validate all loaded subjects before saving anything
    for (const subjId of loadedSubjectIds) {
      const data = subjectData[subjId];
      const subjMeta = subjectsForClass.find((s) => s.id === subjId);
      const selected = data.students.filter((s) => s.selected);
      if (!selected.length) continue;
      for (const s of selected) {
        if (!s.isAbsent && s.marksObtained !== "" && s.marksObtained != null) {
          const v = Number(s.marksObtained);
          if (isNaN(v) || v < 0) return setError(`Invalid marks for ${s.studentName} (${subjMeta?.name})`);
          if (v > Number(subjMeta?.maxMarks || 0)) return setError(`Marks exceed ${subjMeta?.maxMarks} for ${s.studentName} (${subjMeta?.name})`);
        }
      }
    }

    setSaving(true);
    const failed = [];
    try {
      for (const subjId of loadedSubjectIds) {
        const data = subjectData[subjId];
        const subjMeta = subjectsForClass.find((s) => s.id === subjId);
        const selected = data.students.filter((s) => s.selected);
        if (!selected.length) continue; // nothing checked for this subject — skip
        try {
          await saveMarks(data.scheduleId, selected.map((s) => ({
            studentId:     s.studentId,
            marksObtained: s.isAbsent ? null : s.marksObtained,
            isAbsent:      !!s.isAbsent,
            remarks:       s.remarks || "",
            // Only persist the component breakdown for subjects marked with
            // the Formative Assessment format — standard-format subjects
            // keep sending components: null (cleared, if previously set).
            components:    data.format === "fa" ? s.components : null,
          })));
        } catch (e) {
          failed.push(subjMeta?.name || subjId);
        }
      }

      // ── Also persist Sub Exam entries (if any subject has one loaded) ──
      for (const [subjId, subData] of Object.entries(subSubjectData)) {
        if (!subData?.students?.length) continue;
        const selected = subData.students.filter((s) => s.selected);
        if (!selected.length) continue;
        const subjMeta = subjectsForClass.find((s) => s.id === subjId);
        try {
          await saveMarks(subData.scheduleId, selected.map((s) => ({
            studentId:     s.studentId,
            marksObtained: s.isAbsent ? null : s.marksObtained,
            isAbsent:      !!s.isAbsent,
            remarks:       s.remarks || "",
            components:    null,
          })));
        } catch (e) {
          failed.push(`${subjMeta?.name || subjId} (Sub Exam)`);
        }
      }

      if (failed.length) {
        setError(`Failed to save: ${failed.join(", ")}. Other subjects were saved — please retry the failed ones.`);
      } else {
        setDone(true);
        setTimeout(() => { setDone(false); onSaved?.(); }, 1400);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === classId);
  const totalFilledAcrossSubjects = loadedSubjectIds.reduce((sum, id) => {
    const st = subjectData[id]?.students || [];
    return sum + st.filter((s) => s.selected && (s.isAbsent || s.marksObtained !== "")).length;
  }, 0);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,39,68,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 9999, padding: "20px 20px" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 1120, maxHeight: "96vh", overflowY: "auto", borderRadius: 20, background: T.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: T.greenLight, border: "2px solid #6ee7b7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Check size={34} color={T.green} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 8 }}>Results Uploaded!</h2>
            <p style={{ fontSize: 13, color: T.slate }}>Marks saved for {totalFilledAcrossSubjects} student entr{totalFilledAcrossSubjects !== 1 ? "ies" : "y"}.</p>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: T.white, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 2, borderRadius: "20px 20px 0 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: T.blueLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <UploadCloud size={21} color={T.navy} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: T.navy, margin: 0 }}>Upload Exam Results</h1>
                <p style={{ fontSize: 12, color: T.textSub, margin: "2px 0 0" }}>Select class, students &amp; enter subject-wise marks — for any class in the school</p>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <X size={15} color={T.slate} />
              </button>
            </div>

            {error && (
              <div style={{ margin: "16px 24px 0", display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 12, background: T.redLight, border: "1.5px solid #fca5a5", color: T.red, fontSize: 13 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* ── Filter section ── */}
            <div style={{ padding: "20px 24px 4px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Field label="Exam">
                  <Dropdown value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loadingInit}>
                    <option value="">{loadingInit ? "Loading…" : "Select exam"}</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}{e.term?.name ? ` – ${e.term.name}` : ""}</option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Class">
                  <Dropdown value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingInit}>
                    <option value="">{loadingInit ? "Loading…" : "Select class"}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>Grade {c.grade}{c.section ? ` – ${c.section}` : ""}</option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Sub Exam (Optional)">
                  <Dropdown value={subExamId} onChange={(e) => setSubExamId(e.target.value)} disabled={loadingSubExams}>
                    <option value="">{loadingSubExams ? "Loading…" : "None"}</option>
                    {subExamGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </Dropdown>
                </Field>
              </div>

              {selectedClass && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 6 }}>
                  <InfoChip label="Class" value={`Grade ${selectedClass.grade}${selectedClass.section ? ` – ${selectedClass.section}` : ""}`} accent="#1d4ed8" bg={T.blueLight} />
                  <InfoChip label="Subjects scheduled" value={subjectsForClass.length} accent="#0f766e" bg="#ccfbf1" />
                  <InfoChip label="Selected this subject" value={activeSubjectId ? `${selectedCount}/${activeStudents.length}` : "—"} accent="#92400e" bg={T.amberLight} />
                </div>
              )}
            </div>

            <div style={{ height: 1, background: T.border, margin: "8px 24px" }} />

            {/* ── Subject tabs ── */}
            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.slate, margin: 0 }}>
                  <BookOpen size={12} /> Subjects — click each to enter its marks
                </p>

                {classId && subjectsForClass.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleDownloadAllSample}
                      disabled={bulkBusy}
                      title="Download one Excel file with a sheet per subject, for the whole class"
                      style={{
                        display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                        color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe",
                        borderRadius: 8, padding: "6px 12px",
                        cursor: bulkBusy ? "default" : "pointer", opacity: bulkBusy ? 0.65 : 1,
                      }}
                    >
                      {bulkBusy
                        ? <Loader2 size={13} style={{ animation: "adminSpin 0.8s linear infinite" }} />
                        : <Layers size={13} />}
                      Download All Subjects Sample
                    </button>

                    <button
                      onClick={handleUploadAllClick}
                      disabled={bulkBusy}
                      title="Upload one Excel file covering every subject at once"
                      style={{
                        display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                        color: T.navy, background: T.blueLight, border: "1px solid #bfdbfe",
                        borderRadius: 8, padding: "6px 12px",
                        cursor: bulkBusy ? "default" : "pointer", opacity: bulkBusy ? 0.65 : 1,
                      }}
                    >
                      {bulkBusy
                        ? <Loader2 size={13} style={{ animation: "adminSpin 0.8s linear infinite" }} />
                        : <FileUp size={13} />}
                      Upload All Subjects
                    </button>
                    <input
                      ref={bulkInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleAllSubjectsFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                )}
              </div>

              {bulkError && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                  background: T.redLight, border: "1.5px solid #fca5a5", color: T.red, fontSize: 12.5,
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{bulkError}</span>
                </div>
              )}
              {bulkNotice && !bulkError && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                  background: "#f5f3ff", border: "1.5px solid #ddd6fe", color: "#7c3aed", fontSize: 12.5,
                }}>
                  <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{bulkNotice}</span>
                </div>
              )}

              {loadingSchedules ? (
                <div style={{ padding: "16px 0", textAlign: "center", color: T.slate, fontSize: 13 }}>
                  <Loader2 size={16} style={{ animation: "adminSpin 0.8s linear infinite", display: "inline", marginRight: 8 }} /> Loading subjects…
                </div>
              ) : !classId ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: T.slate, fontSize: 13 }}>Select a class to see its scheduled subjects.</div>
              ) : subjectsForClass.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: T.slate, fontSize: 13 }}>No subjects scheduled for this class in the selected exam.</div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {subjectsForClass.map((s) => {
                    const d = subjectData[s.id];
                    const filled = d?.students?.filter((x) => x.selected && (x.isAbsent || x.marksObtained !== "")).length || 0;
                    const active = s.id === activeSubjectId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSubjectId(s.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 20,
                          border: `1.5px solid ${active ? T.navy : T.border}`,
                          background: active ? T.navy : T.white,
                          color: active ? "#fff" : T.slate,
                          cursor: "pointer", transition: "all .15s",
                        }}
                      >
                        {s.name}{s.code ? ` (${s.code})` : ""}
                        {d?.students?.length ? (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 20,
                            background: active ? "rgba(255,255,255,0.18)" : T.greenLight,
                            color: active ? "#fff" : T.green,
                          }}>
                            {filled}/{d.students.length}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Sub Exam ("Assessment") marks — only when a Sub Exam is selected
                 and it has a schedule for the currently active subject ── */}
            {activeSubjectId && subExamId && (
              <div style={{ padding: "18px 24px 0" }}>
                <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7c3aed", margin: "0 0 12px" }}>
                  <Layers size={12} /> {activeSubject?.name} — Assessment Marks (Sub Exam)
                  {subSubjectForActive?.maxMarks ? ` (Max ${subSubjectForActive.maxMarks})` : ""}
                </p>

                {loadingSubSchedules ? (
                  <div style={{ padding: "16px 0", textAlign: "center", color: T.slate, fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: "adminSpin 0.8s linear infinite", display: "inline", marginRight: 8 }} /> Loading sub exam…
                  </div>
                ) : !subSubjectForActive ? (
                  <div style={{ padding: "16px 20px", textAlign: "center", background: "#f5f3ff", border: "1.5px solid #ddd6fe", borderRadius: 14, marginBottom: 8 }}>
                    <p style={{ fontSize: 12.5, color: "#7c3aed", margin: 0 }}>
                      No sub exam schedule found for {activeSubject?.name} in this class. Create one via Exams → Add Exam under the "Assessment" term first.
                    </p>
                  </div>
                ) : subSubjectData[activeSubjectId]?.loading ? (
                  <div style={{ padding: "24px 0", textAlign: "center" }}>
                    <Loader2 size={18} color="#7c3aed" style={{ animation: "adminSpin 0.8s linear infinite" }} />
                  </div>
                ) : (
                  <div style={{ border: "1.5px solid #ddd6fe", borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "36px 70px 1fr 110px 88px 1fr", gap: 10,
                      padding: "10px 14px", background: "#f5f3ff", borderBottom: "1px solid #ddd6fe",
                      fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c3aed",
                    }}>
                      <span></span>
                      <span>Roll No</span>
                      <span>Student</span>
                      <span>Marks / {subSubjectForActive.maxMarks}</span>
                      <span>Absent</span>
                      <span>Remarks</span>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                      {(subSubjectData[activeSubjectId]?.students || []).map((s) => (
                        <StudentRow key={s.studentId} student={s} maxMarks={subSubjectForActive.maxMarks || 100} onUpdate={updateSubStudent} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Students table for active subject ── */}
            {activeSubjectId && (
              <div style={{ padding: "18px 24px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.slate, margin: 0 }}>
                    <User size={12} /> {activeSubject?.name} — {subExamId ? "Final Exam" : "Student"} Marks {activeSubject?.maxMarks ? `(Max ${activeSubject.maxMarks})` : ""}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {/* Format selector — left of Select all / Unselect all */}
                    <div style={{ position: "relative", minWidth: 210 }}>
                      <select
                        value={activeFormat}
                        onChange={(e) => setSubjectFormat(e.target.value)}
                        style={{
                          width: "100%", appearance: "none", cursor: "pointer",
                          background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 8,
                          padding: "6px 28px 6px 10px", fontSize: 12, fontWeight: 700, color: T.navy, outline: "none",
                        }}
                      >
                        {FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.slate }} />
                    </div>

                    {activeStudents.length > 0 && (
                      <>
                        <button
                          onClick={handleDownloadSample}
                          title="Download a blank Excel sheet for this subject's students"
                          style={{
                            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                            color: T.teal, background: "#ecfdf5", border: "1px solid #a7f3d0",
                            borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                          }}
                        >
                          <FileDown size={13} /> Download Sample Excel
                        </button>

                        <button
                          onClick={handleUploadExcelClick}
                          disabled={uploadingExcel}
                          title="Upload a filled Excel sheet to bulk-fill marks"
                          style={{
                            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                            color: T.amber, background: T.amberLight, border: "1px solid #fde68a",
                            borderRadius: 8, padding: "5px 12px",
                            cursor: uploadingExcel ? "default" : "pointer",
                            opacity: uploadingExcel ? 0.65 : 1,
                          }}
                        >
                          {uploadingExcel
                            ? <Loader2 size={13} style={{ animation: "adminSpin 0.8s linear infinite" }} />
                            : <FileUp size={13} />}
                          {uploadingExcel ? "Reading…" : "Upload Excel"}
                        </button>
                        <input
                          ref={excelInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleExcelFileChange}
                          style={{ display: "none" }}
                        />
                      </>
                    )}

                    {activeStudents.length > 0 && (
                      <button
                        onClick={() => toggleSelectAll(!allSelected)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
                          color: T.blue, background: T.blueLight, border: "1px solid #bfdbfe",
                          borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                        }}
                      >
                        {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                        {allSelected ? "Unselect all" : "Select all students"}
                      </button>
                    )}
                  </div>
                </div>

                {excelError && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                    background: T.redLight, border: "1.5px solid #fca5a5", color: T.red, fontSize: 12.5,
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{excelError}</span>
                  </div>
                )}
                {excelNotice && !excelError && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                    background: T.greenLight, border: "1.5px solid #a7f3d0", color: T.green, fontSize: 12.5,
                  }}>
                    <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{excelNotice}</span>
                  </div>
                )}

                {activeData?.loading ? (
                  <div style={{ padding: "32px 0", textAlign: "center" }}>
                    <Loader2 size={20} color={T.blue} style={{ animation: "adminSpin 0.8s linear infinite" }} />
                    <p style={{ fontSize: 13, color: T.slate, marginTop: 10 }}>Loading students…</p>
                  </div>
                ) : activeStudents.length === 0 ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", background: T.slateLight, borderRadius: 14 }}>
                    <p style={{ fontSize: 13, color: T.slate }}>No students found for this class.</p>
                  </div>
                ) : activeFormat === "fa" ? (
                  <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: FA_FIELD_COLS, gap: 8,
                      padding: "10px 14px", background: T.slateLight, borderBottom: `1px solid ${T.border}`,
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: T.slate,
                    }}>
                      <span></span>
                      <span>Roll No</span>
                      <span>Student</span>
                      <span style={{ textAlign: "center" }}>R&amp;R</span>
                      <span style={{ textAlign: "center" }}>CW</span>
                      <span style={{ textAlign: "center" }}>PW</span>
                      <span style={{ textAlign: "center" }}>ST</span>
                      <span style={{ textAlign: "center" }}>TOT</span>
                      <span style={{ textAlign: "center" }}>GRD</span>
                      <span style={{ textAlign: "center" }}>PER(%)</span>
                      <span style={{ textAlign: "center" }}>Absent</span>
                      <span>Remarks</span>
                    </div>
                    <div style={{ maxHeight: 360, overflowY: "auto" }}>
                      {activeStudents.map((s) => (
                        <StudentRowFA key={s.studentId} student={s} maxMarks={activeSubject?.maxMarks || 100} onUpdate={updateStudent} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "36px 70px 1fr 110px 88px 1fr", gap: 10,
                      padding: "10px 14px", background: T.slateLight, borderBottom: `1px solid ${T.border}`,
                      fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.slate,
                    }}>
                      <span></span>
                      <span>Roll No</span>
                      <span>Student</span>
                      <span>Marks / {activeSubject?.maxMarks}</span>
                      <span>Absent</span>
                      <span>Remarks</span>
                    </div>
                    <div style={{ maxHeight: 360, overflowY: "auto" }}>
                      {activeStudents.map((s) => (
                        <StudentRow key={s.studentId} student={s} maxMarks={activeSubject?.maxMarks || 100} onUpdate={updateStudent} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Footer ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 24px", background: T.white, borderTop: `1px solid ${T.border}`, position: "sticky", bottom: 0, borderRadius: "0 0 20px 20px" }}>
              <span style={{ fontSize: 12, color: T.slate }}>
                {loadedSubjectIds.length > 0
                  ? `${loadedSubjectIds.length} subject${loadedSubjectIds.length !== 1 ? "s" : ""} ready to save`
                  : "Pick a subject tab and enter marks"}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{ padding: "10px 18px", borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.white, color: T.slate, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving || !loadedSubjectIds.length}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 11,
                    border: "none", background: saving || !loadedSubjectIds.length ? "#94a3b8" : `linear-gradient(135deg, ${T.navy}, ${T.teal})`,
                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving || !loadedSubjectIds.length ? "default" : "pointer",
                  }}
                >
                  {saving ? <><Loader2 size={14} style={{ animation: "adminSpin 0.8s linear infinite" }} /> Saving…</> : <><Save size={14} /> Save All Marks</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes adminSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}