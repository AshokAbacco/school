import { useEffect, useState, useCallback, memo } from "react";
import { ArrowLeft, Check, ChevronDown, BookOpen, Save, Loader2, AlertCircle, Pencil } from "lucide-react";
import { getToken } from "../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ─── Shared styles ─────────────────────────────────────────────────────────
const inp = (hasErr = false) => ({
  width: "100%", background: "#f0f5fb", outline: "none", fontFamily: "inherit",
  border: `1.5px solid ${hasErr ? "#fca5a5" : "rgba(30,60,110,0.12)"}`,
  borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1a2b4a", boxSizing: "border-box",
});
const sel = (disabled = false) => ({
  ...inp(), appearance: "none", cursor: disabled ? "default" : "pointer",
  paddingRight: 32, opacity: disabled ? 0.5 : 1,
});

// ─── Small helpers ─────────────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#7a8fa8", textTransform: "uppercase" }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#b91c1c", display: "flex", alignItems: "center", gap: 5, margin: 0 }}><AlertCircle size={12} />{error}</p>}
    </div>
  );
}

function Dropdown({ value, onChange, disabled, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} disabled={disabled} style={sel(disabled)}>{children}</select>
      <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#7a8fa8", pointerEvents: "none" }} />
    </div>
  );
}

// ─── Memoized student row ───────────────────────────────────────────────────
const StudentRow = memo(function StudentRow({ student, maxMarks, onUpdate }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 0.9fr 1.5fr", gap: 12, padding: "12px 16px", alignItems: "center", borderBottom: "1px solid #eef3f9" }}>
      <span style={{ fontSize: 13, color: "#4a6180", fontWeight: 600 }}>{student.rollNumber || "–"}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2b4a" }}>{student.studentName}</div>
        <div style={{ fontSize: 11, color: "#9aacbf" }}>{student.admissionNumber || student.email || ""}</div>
      </div>
      <input
        type="number" min="0" max={maxMarks}
        value={student.isAbsent ? "" : student.marksObtained}
        disabled={student.isAbsent}
        onChange={(e) => onUpdate(student.studentId, "marksObtained", e.target.value)}
        style={inp()} placeholder={`/${maxMarks}`}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4a6180", cursor: "pointer" }}>
        <input type="checkbox" checked={!!student.isAbsent} onChange={(e) => {
          onUpdate(student.studentId, "isAbsent", e.target.checked);
          if (e.target.checked) onUpdate(student.studentId, "marksObtained", "");
        }} />
        Absent
      </label>
      <input
        type="text" value={student.remarks || ""}
        onChange={(e) => onUpdate(student.studentId, "remarks", e.target.value)}
        style={inp()} placeholder="Remarks"
      />
    </div>
  );
});

// ─── Main component ────────────────────────────────────────────────────────
// editRecord shape (from Result.jsx): { markId, examId, classSectionId, subjectId }
export default function AddResult({ onBack, onSaved, editRecord = null }) {
  const token   = getToken();
  const headers = { Authorization: `Bearer ${token}` };
  const isEdit  = !!editRecord;

  // ── Step 1: Exam
  const [exams,          setExams]          = useState([]);
  const [examId,         setExamId]         = useState("");
  const [loadingExams,   setLoadingExams]   = useState(true);

  // ── Step 2: Class (teacher's timetable classes only)
  const [classes,        setClasses]        = useState([]);
  const [classId,        setClassId]        = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  // ── Step 3: Subject (teacher's subjects in selected class × exam)
  const [subjects,        setSubjects]        = useState([]);
  const [subjectId,       setSubjectId]       = useState("");
  const [allSchedules,    setAllSchedules]    = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // ── Step 4: Students
  const [scheduleId,   setScheduleId]   = useState("");
  const [students,     setStudents]     = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [loadingRows,  setLoadingRows]  = useState(false);

  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState("");

  // ── 1. Load exams + teacher's classes in parallel on mount ─────────────
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

  // ── 2. Pre-fill exam + class once both lists are ready (edit mode only) ─
  useEffect(() => {
    if (!isEdit || loadingExams || loadingClasses) return;
    if (editRecord.examId)         setExamId(editRecord.examId);
    if (editRecord.classSectionId) setClassId(editRecord.classSectionId);
  }, [loadingExams, loadingClasses]);

  // ── 3. When exam OR class changes → reload subjects ────────────────────
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
          // Pre-fill subject in edit mode
          if (isEdit && editRecord.subjectId) setSubjectId(editRecord.subjectId);
        } else {
          setError(j.message || "Failed to load subjects");
        }
      })
      .finally(() => setLoadingSubjects(false));
  }, [examId, classId]);

  // ── 4. When subject changes → auto-resolve scheduleId ──────────────────
  useEffect(() => {
    setScheduleId(""); setStudents([]); setScheduleInfo(null);
    if (!subjectId || !examId) return;
    const match = allSchedules.find(
      (s) => s.subject.id === subjectId && s.assessmentGroup.id === examId,
    );
    if (match) setScheduleId(match.id);
  }, [subjectId, examId, allSchedules]);

  // ── 5. Load students when scheduleId is resolved ───────────────────────
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

  // Stable updater — memo on StudentRow won't break
  const updateStudent = useCallback((studentId, key, value) => {
    setStudents((prev) => prev.map((s) => s.studentId === studentId ? { ...s, [key]: value } : s));
  }, []);

  const handleSave = async () => {
    if (!scheduleId) return setError("Select all filters first");
    for (const s of students) {
      if (!s.isAbsent && s.marksObtained !== "") {
        const v = Number(s.marksObtained);
        if (isNaN(v) || v < 0)                      return setError(`Invalid marks for ${s.studentName}`);
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
      setTimeout(() => { setDone(false); onSaved?.(); }, 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight: "70vh", background: "#dde8f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "52px 60px", textAlign: "center", boxShadow: "0 8px 32px rgba(26,43,74,0.12)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#e6f7f1", border: "2px solid #9de0c5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Check size={32} color="#0d7a55" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1a2b4a", margin: 0 }}>Marks {isEdit ? "Updated" : "Saved"}!</p>
        <p style={{ fontSize: 13, color: "#9aacbf", marginTop: 8 }}>Returning to results page…</p>
      </div>
    </div>
  );

  const loadingInit = loadingExams || loadingClasses;

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100%", background: "#dde8f4", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "28px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid rgba(30,60,110,0.12)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4a6180" }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: isEdit ? "#e8f0fb" : "#c2d8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isEdit ? <Pencil size={20} color="#2563a8" /> : <BookOpen size={22} color="#1a2b4a" />}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a2b4a", margin: 0 }}>
                {isEdit ? "Edit Exam Result" : "Add Exam Result"}
              </h1>
              <p style={{ fontSize: 12, color: "#7a8fa8", margin: 0 }}>
                {isEdit ? "Update marks for this class" : "Your classes and subjects only"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>{error}</div>
        )}

        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 2px 12px rgba(26,43,74,0.08)", overflow: "hidden" }}>
          <div style={{ height: 5, background: isEdit ? "linear-gradient(90deg,#2563a8,#7c3aed)" : "linear-gradient(90deg,#2563a8,#0a8a6e,#d97706)" }} />

          {/* ── Exam / Class / Subject selects ── */}
          <div style={{ padding: "24px 28px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9aacbf", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>
              {isEdit ? "Editing" : "Select"} Exam · Class · Subject
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

              {/* Exam */}
              <Field label="Exam">
                <Dropdown value={examId} onChange={(e) => setExamId(e.target.value)} disabled={loadingInit}>
                  <option value="">{loadingInit ? "Loading…" : "Select Exam"}</option>
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.term?.name ? ` – ${e.term.name}` : ""}</option>
                  ))}
                </Dropdown>
              </Field>

              {/* Class — teacher's timetable classes only */}
              <Field label="Class">
                <Dropdown value={classId} onChange={(e) => setClassId(e.target.value)} disabled={loadingInit}>
                  <option value="">{loadingInit ? "Loading…" : classes.length === 0 ? "No classes assigned" : "Select Class"}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Dropdown>
              </Field>

              {/* Subject — filtered by class + exam */}
              <Field label="Subject">
                <Dropdown
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId || loadingSubjects}
                >
                  <option value="">
                    {!classId ? "Select class first" : loadingSubjects ? "Loading…" : subjects.length === 0 ? "No subjects found" : "Select Subject"}
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                  ))}
                </Dropdown>
              </Field>

            </div>
          </div>

          {/* Schedule info strip */}
          {scheduleInfo && (
            <div style={{ padding: "0 28px 24px" }}>
              <div style={{ height: 1, background: "#eaf0f8", marginBottom: 20 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  ["Exam",      scheduleInfo.examName],
                  ["Class",     scheduleInfo.classSectionName],
                  ["Subject",   scheduleInfo.subjectName],
                  ["Max Marks", scheduleInfo.maxMarks],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#f6f9fd", border: "1px solid #e1ebf7", borderRadius: 12, padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#8aa0b8", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2b4a" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: "#eaf0f8" }} />

          {/* Students table */}
          <div style={{ padding: "22px 28px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9aacbf", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 14px" }}>Student Marks Entry</p>

            {loadingRows ? (
              <div style={{ padding: 30, textAlign: "center", color: "#7a8fa8" }}>Loading students…</div>
            ) : !scheduleId ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9aacbf" }}>
                {!classId ? "Select a class to begin" : !subjectId ? "Select a subject to load students" : "Resolving schedule…"}
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9aacbf" }}>No students found for this class</div>
            ) : (
              <div style={{ border: "1px solid #e5edf7", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 0.9fr 1.5fr", gap: 12, padding: "12px 16px", background: "#f6f9fd", borderBottom: "1px solid #e5edf7", fontSize: 11, fontWeight: 700, color: "#7a8fa8", textTransform: "uppercase" }}>
                  {["Roll No", "Student", "Marks", "Absent", "Remarks"].map((h) => <div key={h}>{h}</div>)}
                </div>
                {students.map((s) => (
                  <StudentRow key={s.studentId} student={s} maxMarks={scheduleInfo?.maxMarks || 100} onUpdate={updateStudent} />
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ padding: "18px 28px", borderTop: "1px solid #eaf0f8", background: "#f6f9fd", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onBack} style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(30,60,110,0.15)", background: "#fff", color: "#4a6180", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !scheduleId || !students.length}
              style={{ padding: "9px 22px", borderRadius: 10, background: saving ? "#6b7c99" : isEdit ? "#2563a8" : "#1a2b4a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", border: "none", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(26,43,74,0.25)" }}>
              {saving ? <Loader2 size={15} /> : <Save size={15} />}
              {saving ? "Saving…" : isEdit ? "Update Marks" : "Save All Marks"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#9aacbf", fontSize: 11, marginTop: 24 }}>
          School Exam Management System · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}