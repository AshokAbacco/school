import { useEffect, useState, useCallback, memo } from "react";
import {
  ArrowLeft, Check, ChevronDown, BookOpen,
  Save, Loader2, AlertCircle, Pencil, User, Hash, FileText,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ─── Design tokens ────────────────────────────────────────────────────────
const T = {
  navy:        "#0f2744",
  navyMid:     "#1e3a5f",
  blue:        "#2563eb",
  blueSoft:    "#3b82f6",
  blueLight:   "#dbeafe",
  teal:        "#0d9488",
  tealLight:   "#ccfbf1",
  amber:       "#d97706",
  amberLight:  "#fef3c7",
  slate:       "#64748b",
  slateLight:  "#f1f5f9",
  border:      "#e2e8f0",
  borderFocus: "#3b82f6",
  white:       "#ffffff",
  bg:          "#f0f6ff",
  text:        "#0f2744",
  textSub:     "#64748b",
  red:         "#dc2626",
  redLight:    "#fef2f2",
  green:       "#059669",
  greenLight:  "#ecfdf5",
};

// ─── Global styles injected once ─────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ar-root {
    font-family: 'DM Sans', sans-serif;
    background: ${T.bg};
    min-height: 100%;
    padding: clamp(16px, 4vw, 36px) clamp(14px, 4vw, 28px);
    color: ${T.text};
  }

  .ar-title { font-family: 'Sora', sans-serif; }

  /* ── Fade up animation ── */
  @keyframes arFadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ar-fade { animation: arFadeUp 0.4s ease both; }
  .ar-fade-1 { animation-delay: 0.05s; }
  .ar-fade-2 { animation-delay: 0.10s; }
  .ar-fade-3 { animation-delay: 0.15s; }
  .ar-fade-4 { animation-delay: 0.20s; }

  /* ── Card ── */
  .ar-card {
    background: ${T.white};
    border-radius: 20px;
    border: 1.5px solid ${T.border};
    box-shadow: 0 4px 24px rgba(15,39,68,0.07), 0 1px 4px rgba(15,39,68,0.04);
    overflow: hidden;
  }

  /* ── Section header strip ── */
  .ar-section-label {
    font-family: 'Sora', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${T.slate};
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
  }
  .ar-section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${T.border};
  }

  /* ── Input / select base ── */
  .ar-field-wrap { display: flex; flex-direction: column; gap: 6px; }
  .ar-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${T.slate};
  }
  .ar-input, .ar-select {
    width: 100%;
    background: ${T.slateLight};
    border: 1.5px solid ${T.border};
    border-radius: 11px;
    padding: 10px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    color: ${T.text};
    outline: none;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  }
  .ar-input:focus, .ar-select:focus {
    border-color: ${T.borderFocus};
    background: ${T.white};
    box-shadow: 0 0 0 3px ${T.blueLight};
  }
  .ar-input:disabled, .ar-select:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .ar-select { appearance: none; cursor: pointer; padding-right: 36px; }
  .ar-select-wrap { position: relative; }
  .ar-select-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${T.slate};
  }

  /* ── Filter grid — 3 cols → 2 cols → 1 col ── */
  .ar-filter-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 720px) {
    .ar-filter-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 480px) {
    .ar-filter-grid { grid-template-columns: 1fr; }
  }

  /* ── Info pill strip ── */
  .ar-info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  @media (max-width: 780px) {
    .ar-info-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 420px) {
    .ar-info-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ── Students table wrapper ── */
  .ar-table-outer {
    border: 1.5px solid ${T.border};
    border-radius: 14px;
    overflow: hidden;
  }
  .ar-table-head {
    display: grid;
    grid-template-columns: 80px 1fr 110px 90px 1fr;
    gap: 10px;
    padding: 11px 16px;
    background: ${T.slateLight};
    border-bottom: 1px solid ${T.border};
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${T.slate};
  }
  /* On mobile, table becomes stacked cards */
  @media (max-width: 640px) {
    .ar-table-head { display: none; }
  }

  /* ── Student row ── */
  .ar-student-row {
    display: grid;
    grid-template-columns: 80px 1fr 110px 90px 1fr;
    gap: 10px;
    padding: 12px 16px;
    align-items: center;
    border-bottom: 1px solid ${T.border};
    transition: background 0.15s;
  }
  .ar-student-row:last-child { border-bottom: none; }
  .ar-student-row:hover { background: ${T.slateLight}; }

  @media (max-width: 640px) {
    .ar-student-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px;
    }
    .ar-student-row + .ar-student-row { border-top: 1px solid ${T.border}; }
  }

  /* ── Absent checkbox styled ── */
  .ar-absent-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: ${T.slate};
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .ar-absent-label input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: ${T.red};
    cursor: pointer;
  }

  /* ── Mobile row label ── */
  .ar-mob-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${T.slate};
    margin-bottom: 4px;
  }
  .ar-mob-field { display: none; }
  @media (max-width: 640px) { .ar-mob-field { display: block; } }

  /* ── Mobile 2-col grid inside a row ── */
  .ar-mob-grid {
    display: none;
  }
  @media (max-width: 640px) {
    .ar-mob-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
  }

  /* ── Back + action buttons ── */
  .ar-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 11px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.14s, box-shadow 0.14s, opacity 0.14s;
    border: none;
    outline: none;
    white-space: nowrap;
  }
  .ar-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .ar-btn:active:not(:disabled) { transform: translateY(0); }
  .ar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .ar-btn-ghost {
    background: ${T.white};
    border: 1.5px solid ${T.border};
    color: ${T.slate};
  }
  .ar-btn-ghost:hover:not(:disabled) { border-color: #94a3b8; }

  .ar-btn-primary {
    background: linear-gradient(135deg, ${T.navyMid}, ${T.navy});
    color: ${T.white};
    box-shadow: 0 4px 16px rgba(15,39,68,0.22);
  }
  .ar-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 22px rgba(15,39,68,0.30); }

  .ar-btn-edit {
    background: linear-gradient(135deg, ${T.blue}, ${T.navyMid});
    color: ${T.white};
    box-shadow: 0 4px 16px rgba(37,99,235,0.22);
  }

  /* ── Footer bar ── */
  .ar-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid ${T.border};
    background: ${T.slateLight};
    flex-wrap: wrap;
  }
  @media (max-width: 480px) {
    .ar-footer { justify-content: stretch; }
    .ar-footer .ar-btn { flex: 1; justify-content: center; }
  }

  /* ── Error banner ── */
  .ar-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    background: ${T.redLight};
    border: 1px solid #fecaca;
    border-radius: 12px;
    font-size: 13px;
    color: ${T.red};
    margin-bottom: 18px;
  }

  /* ── Success screen ── */
  .ar-success {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .ar-success-card {
    background: ${T.white};
    border-radius: 24px;
    padding: clamp(36px, 6vw, 64px) clamp(32px, 6vw, 72px);
    text-align: center;
    box-shadow: 0 12px 48px rgba(15,39,68,0.12);
    border: 1.5px solid ${T.border};
    max-width: 400px;
    width: 100%;
  }

  /* ── Header ── */
  .ar-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
    flex-wrap: wrap;
  }
  .ar-header-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ar-header-titles h1 {
    font-family: 'Sora', sans-serif;
    font-size: clamp(17px, 4vw, 22px);
    font-weight: 800;
    color: ${T.navy};
    line-height: 1.2;
  }
  .ar-header-titles p {
    font-size: 12px;
    color: ${T.slate};
    margin-top: 2px;
  }
`;

// ─── Field wrapper ────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="ar-field-wrap">
      <label className="ar-label">{label}</label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: T.red, display: "flex", alignItems: "center", gap: 5 }}>
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

// ─── Dropdown ────────────────────────────────────────────────────────────
function Dropdown({ value, onChange, disabled, children }) {
  return (
    <div className="ar-select-wrap">
      <select className="ar-select" value={value} onChange={onChange} disabled={disabled}>
        {children}
      </select>
      <ChevronDown size={14} className="ar-select-icon" />
    </div>
  );
}

// ─── Info chip ───────────────────────────────────────────────────────────
function InfoChip({ label, value, accent }) {
  const accents = {
    blue:  { bg: T.blueLight,  text: "#1d4ed8" },
    teal:  { bg: T.tealLight,  text: "#0f766e" },
    amber: { bg: T.amberLight, text: "#92400e" },
    navy:  { bg: "#dbeafe",    text: T.navy    },
  };
  const a = accents[accent] || accents.navy;
  return (
    <div style={{
      background: T.slateLight, border: `1.5px solid ${T.border}`,
      borderRadius: 12, padding: "11px 14px",
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.slate, marginBottom: 5 }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: a.text,
        background: a.bg, display: "inline-block",
        borderRadius: 6, padding: "2px 8px",
      }}>{value}</div>
    </div>
  );
}

// ─── Memoized student row ─────────────────────────────────────────────────
const StudentRow = memo(function StudentRow({ student, maxMarks, onUpdate, index }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;

  return (
    <div
      className="ar-student-row ar-fade"
      style={{ animationDelay: `${0.02 * index}s` }}
    >
      {/* Roll No — desktop */}
      <span style={{ fontSize: 12, fontWeight: 700, color: T.slate, fontFamily: "'Sora', sans-serif" }} className="ar-desktop-only">
        {student.rollNumber || "–"}
      </span>

      {/* Student info */}
      <div>
        {/* mobile: show roll + name together */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: T.blueLight, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: T.blue, flexShrink: 0,
          }}>
            {student.studentName?.[0] || "S"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>{student.studentName}</div>
            <div style={{ fontSize: 11, color: T.slate }}>
              <span className="ar-mobile-roll">#{student.rollNumber || "–"} · </span>
              {student.admissionNumber || student.email || ""}
            </div>
          </div>
        </div>
      </div>

      {/* Marks */}
      <div>
        <div className="ar-mob-label" style={{ display: "none" }}>Marks / {maxMarks}</div>
        <input
          type="number" min="0" max={maxMarks}
          value={student.isAbsent ? "" : (student.marksObtained ?? "")}
          disabled={student.isAbsent}
          onChange={(e) => onUpdate(student.studentId, "marksObtained", e.target.value)}
          className="ar-input"
          placeholder={`0–${maxMarks}`}
          style={{ textAlign: "center" }}
        />
      </div>

      {/* Absent */}
      <div>
        <label className="ar-absent-label">
          <input
            type="checkbox"
            checked={!!student.isAbsent}
            onChange={(e) => {
              onUpdate(student.studentId, "isAbsent", e.target.checked);
              if (e.target.checked) onUpdate(student.studentId, "marksObtained", "");
            }}
          />
          Absent
        </label>
      </div>

      {/* Remarks */}
      <div>
        <input
          type="text"
          value={student.remarks || ""}
          onChange={(e) => onUpdate(student.studentId, "remarks", e.target.value)}
          className="ar-input"
          placeholder="Optional remarks…"
        />
      </div>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────
export default function AddResult({ onBack, onSaved, editRecord = null }) {
  const token   = getToken();
  const headers = { Authorization: `Bearer ${token}` };
  const isEdit  = !!editRecord;

  const [exams,           setExams]           = useState([]);
  const [examId,          setExamId]          = useState("");
  const [loadingExams,    setLoadingExams]     = useState(true);
  const [classes,         setClasses]         = useState([]);
  const [classId,         setClassId]         = useState("");
  const [loadingClasses,  setLoadingClasses]  = useState(true);
  const [subjects,        setSubjects]        = useState([]);
  const [subjectId,       setSubjectId]       = useState("");
  const [allSchedules,    setAllSchedules]    = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [scheduleId,      setScheduleId]      = useState("");
  const [students,        setStudents]        = useState([]);
  const [scheduleInfo,    setScheduleInfo]    = useState(null);
  const [loadingRows,     setLoadingRows]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [done,            setDone]            = useState(false);
  const [error,           setError]           = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/results/exams`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/results/teacher/classes`, { headers }).then((r) => r.json()),
    ]).then(([ej, cj]) => {
      if (ej.success) setExams(ej.data || []);
      else setError(ej.message || "Failed to load exams");
      if (cj.success) setClasses(cj.classes || []);
      else setError(cj.message || "Failed to load your classes");
    }).finally(() => {
      setLoadingExams(false);
      setLoadingClasses(false);
    });
  }, []);

  useEffect(() => {
    if (!isEdit || loadingExams || loadingClasses) return;
    if (editRecord.examId)         setExamId(editRecord.examId);
    if (editRecord.classSectionId) setClassId(editRecord.classSectionId);
  }, [loadingExams, loadingClasses]);

  useEffect(() => {
    setSubjectId(""); setSubjects([]); setAllSchedules([]);
    setScheduleId(""); setStudents([]); setScheduleInfo(null);
    if (!classId) return;
    setLoadingSubjects(true);
    const params = examId ? `?assessmentGroupId=${examId}` : "";
    fetch(`${API}/api/results/teacher/classes/${classId}/subjects${params}`, { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setSubjects(j.subjects || []);
          setAllSchedules(j.schedules || []);
          if (isEdit && editRecord.subjectId) setSubjectId(editRecord.subjectId);
        } else setError(j.message || "Failed to load subjects");
      })
      .finally(() => setLoadingSubjects(false));
  }, [examId, classId]);

  useEffect(() => {
    setScheduleId(""); setStudents([]); setScheduleInfo(null);
    if (!subjectId || !examId) return;
    const match = allSchedules.find(
      (s) => s.subject.id === subjectId && s.assessmentGroup.id === examId
    );
    if (match) setScheduleId(match.id);
  }, [subjectId, examId, allSchedules]);

  useEffect(() => {
    if (!scheduleId) { setStudents([]); setScheduleInfo(null); return; }
    setLoadingRows(true);
    fetch(`${API}/api/results/schedule/${scheduleId}/students`, { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setScheduleInfo(j.data.schedule); setStudents(j.data.students || []); }
        else setError(j.message || "Failed to load students");
      })
      .finally(() => setLoadingRows(false));
  }, [scheduleId]);

  const updateStudent = useCallback((studentId, key, value) => {
    setStudents((prev) =>
      prev.map((s) => s.studentId === studentId ? { ...s, [key]: value } : s)
    );
  }, []);

  const handleSave = async () => {
    if (!scheduleId) return setError("Select all filters first");
    for (const s of students) {
      if (!s.isAbsent && s.marksObtained !== "") {
        const v = Number(s.marksObtained);
        if (isNaN(v) || v < 0) return setError(`Invalid marks for ${s.studentName}`);
        if (v > Number(scheduleInfo?.maxMarks || 0)) return setError(`Marks exceed ${scheduleInfo?.maxMarks} for ${s.studentName}`);
      }
    }
    setSaving(true); setError("");
    try {
      const j = await fetch(`${API}/api/results/schedule/${scheduleId}/marks`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          students: students.map((s) => ({
            studentId:     s.studentId,
            marksObtained: s.isAbsent ? null : s.marksObtained,
            isAbsent:      !!s.isAbsent,
            remarks:       s.remarks || "",
          })),
        }),
      }).then((r) => r.json());
      if (!j.success) throw new Error(j.message);
      setDone(true);
      setTimeout(() => { setDone(false); onSaved?.(); }, 1400);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────
  if (done) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="ar-root ar-success">
        <div className="ar-success-card ar-fade">
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: T.greenLight, border: `2px solid #6ee7b7`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <Check size={34} color={T.green} strokeWidth={2.5} />
          </div>
          <h2 className="ar-title" style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 8 }}>
            Marks {isEdit ? "Updated" : "Saved"}!
          </h2>
          <p style={{ fontSize: 13, color: T.slate }}>Returning to results…</p>
        </div>
      </div>
    </>
  );

  const loadingInit = loadingExams || loadingClasses;

  const filledCount  = students.filter((s) => s.isAbsent || (s.marksObtained !== "" && s.marksObtained !== undefined && s.marksObtained !== null)).length;
  const absentCount  = students.filter((s) => s.isAbsent).length;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {/* extra inline style for mobile-only elements */}
      <style>{`
        .ar-mobile-roll { display: none; }
        @media (max-width: 640px) { .ar-mobile-roll { display: inline; } }
        .ar-desktop-only { display: block; }
        @media (max-width: 640px) { .ar-desktop-only { display: none; } }
      `}</style>

      <div className="ar-root">
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="ar-header ar-fade">
            <button className="ar-btn ar-btn-ghost" onClick={onBack}>
              <ArrowLeft size={15} /> Back
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <div
                className="ar-header-icon"
                style={{ background: isEdit ? T.blueLight : "#dbeafe" }}
              >
                {isEdit
                  ? <Pencil size={20} color={T.blue} />
                  : <BookOpen size={22} color={T.navy} />
                }
              </div>
              <div className="ar-header-titles">
                <h1>{isEdit ? "Edit Exam Result" : "Add Exam Result"}</h1>
                <p>{isEdit ? "Update existing marks entry" : "Enter marks for your assigned classes"}</p>
              </div>
            </div>

            {/* Progress badge (shows when students loaded) */}
            {students.length > 0 && (
              <div style={{
                background: T.blueLight, border: `1px solid #bfdbfe`,
                borderRadius: 10, padding: "6px 14px",
                fontSize: 12, fontWeight: 700, color: T.blue,
                flexShrink: 0,
              }}>
                {filledCount}/{students.length} entered
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="ar-error ar-fade">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Main card ── */}
          <div className="ar-card ar-fade ar-fade-1">

            {/* Accent bar */}
            <div style={{
              height: 4,
              background: isEdit
                ? `linear-gradient(90deg, ${T.blue}, #7c3aed)`
                : `linear-gradient(90deg, ${T.navy}, ${T.teal}, ${T.amber})`,
            }} />

            {/* ── Filter section ── */}
            <div style={{ padding: "22px 24px 20px" }}>
              <p className="ar-section-label">
                <BookOpen size={12} />
                {isEdit ? "Editing" : "Select"} Exam · Class · Subject
              </p>

              <div className="ar-filter-grid">
                <Field label="Exam">
                  <Dropdown value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loadingInit}>
                    <option value="">{loadingInit ? "Loading…" : "Select exam"}</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}{e.term?.name ? ` – ${e.term.name}` : ""}
                      </option>
                    ))}
                  </Dropdown>
                </Field>

                <Field label="Class">
                  <Dropdown value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingInit}>
                    <option value="">
                      {loadingInit ? "Loading…" : classes.length === 0 ? "No classes assigned" : "Select class"}
                    </option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Dropdown>
                </Field>

                <Field label="Subject">
                  <Dropdown
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!classId || loadingSubjects}
                  >
                    <option value="">
                      {!classId ? "Select class first" : loadingSubjects ? "Loading…" : subjects.length === 0 ? "No subjects found" : "Select subject"}
                    </option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                    ))}
                  </Dropdown>
                </Field>
              </div>
            </div>

            {/* ── Info strip ── */}
            {scheduleInfo && (
              <>
                <div style={{ height: 1, background: T.border, margin: "0 24px" }} />
                <div style={{ padding: "18px 24px" }}>
                  <p className="ar-section-label">
                    <Hash size={12} />
                    Schedule Info
                  </p>
                  <div className="ar-info-grid">
                    <InfoChip label="Exam"      value={scheduleInfo.examName}          accent="blue" />
                    <InfoChip label="Class"     value={scheduleInfo.classSectionName}  accent="teal" />
                    <InfoChip label="Subject"   value={scheduleInfo.subjectName}       accent="amber" />
                    <InfoChip label="Max Marks" value={scheduleInfo.maxMarks}          accent="navy" />
                  </div>
                </div>
              </>
            )}

            <div style={{ height: 1, background: T.border }} />

            {/* ── Students section ── */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <p className="ar-section-label" style={{ marginBottom: 0, flex: 1 }}>
                  <User size={12} />
                  Student Marks Entry
                </p>
                {students.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.green, background: T.greenLight, border: `1px solid #a7f3d0`, borderRadius: 8, padding: "3px 10px" }}>
                      {filledCount} filled
                    </span>
                    {absentCount > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.red, background: T.redLight, border: `1px solid #fecaca`, borderRadius: 8, padding: "3px 10px" }}>
                        {absentCount} absent
                      </span>
                    )}
                  </div>
                )}
              </div>

              {loadingRows ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <Loader2 size={22} color={T.blue} style={{ animation: "spin 0.8s linear infinite" }} />
                  <p style={{ fontSize: 13, color: T.slate, marginTop: 10 }}>Loading students…</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : !scheduleId ? (
                <div style={{
                  padding: "36px 20px", textAlign: "center",
                  background: T.slateLight, borderRadius: 14,
                  border: `2px dashed ${T.border}`,
                }}>
                  <BookOpen size={28} color={T.border} style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>
                    {!classId ? "Select a class to get started"
                      : !subjectId ? "Now select a subject to load students"
                      : "Resolving schedule…"}
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div style={{
                  padding: "32px 20px", textAlign: "center",
                  background: T.slateLight, borderRadius: 14,
                }}>
                  <p style={{ fontSize: 13, color: T.slate }}>No students found for this class.</p>
                </div>
              ) : (
                <div className="ar-table-outer">
                  <div className="ar-table-head">
                    {["Roll No", "Student", `Marks / ${scheduleInfo?.maxMarks}`, "Absent", "Remarks"].map((h) => (
                      <div key={h}>{h}</div>
                    ))}
                  </div>
                  {students.map((s, i) => (
                    <StudentRow
                      key={s.studentId}
                      student={s}
                      maxMarks={scheduleInfo?.maxMarks || 100}
                      onUpdate={updateStudent}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="ar-footer">
              <button className="ar-btn ar-btn-ghost" onClick={onBack}>
                Cancel
              </button>
              <button
                className={`ar-btn ${isEdit ? "ar-btn-edit" : "ar-btn-primary"}`}
                onClick={handleSave}
                disabled={saving || !scheduleId || !students.length}
              >
                {saving
                  ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Saving…</>
                  : <><Save size={14} /> {isEdit ? "Update Marks" : "Save All Marks"}</>
                }
              </button>
            </div>
          </div>

          <p style={{ textAlign: "center", color: T.slate, fontSize: 11, marginTop: 24 }}>
            School Exam Management System · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}