// client/src/admin/pages/certificates/CertificateGenerate.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Loader2, FileBadge2, RefreshCw, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { getToken } from "../../../auth/storage";
import CertificateFilters from "./components/CertificateFilters";
import StudentSelector from "./components/StudentSelector";
import CertificatePreview from "./components/CertificatePreview";
import PdfViewer from "./components/PdfViewer";
import { C, API_URL, HALL_TICKET_THEMES, DEFAULT_HALL_TICKET_INSTRUCTIONS as DEFAULT_INSTRUCTIONS } from "./components/theme";

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const authJsonHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

const STEPS = ["Certificate Type", "Academic Year & Class", "Student", "Details & Generate"];

// Reuses the existing Examination Module's own APIs — no new backend
// endpoints or tables for exam data. See ExamsRoutes.js:
//   GET /api/exams/groups/:academicYearId        → list of Exams (AssessmentGroup)
//   GET /api/exams/schedules/admin/:groupId      → every section's timetable for that Exam
const EXAMS_BASE = `${API_URL}/api/exams`;

function deriveExamDay(examDate) {
  if (!examDate) return "";
  const d = new Date(examDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

function deriveSession(startTime) {
  if (!startTime) return "";
  const hour = parseInt(String(startTime).split(":")[0], 10);
  if (isNaN(hour)) return "";
  return hour < 12 ? "Morning" : "Afternoon";
}

export default function CertificateGenerate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [types, setTypes] = useState([]);
  const [certificateType, setCertificateType] = useState(searchParams.get("type") || "");
  const [academicYearId, setAcademicYearId] = useState(null);
  const [classSectionId, setClassSectionId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [editableFields, setEditableFields] = useState({});
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { certificate, pdfUrl }

  // ── Hall Ticket: Exam (AssessmentGroup) selection + auto-fetched timetable ──
  const [examGroups, setExamGroups] = useState([]);
  const [assessmentGroupId, setAssessmentGroupId] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [timetableError, setTimetableError] = useState("");

  const typeMeta = useMemo(() => types.find((t) => t.key === certificateType), [types, certificateType]);
  const isHallTicket = certificateType === "HALL_TICKET";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/certificates/types`, { headers: authHeaders() });
        const data = await res.json();
        setTypes(data.types || []);
      } catch (err) {
        console.error(err);
        toast.error("Could not load certificate types");
      }
    })();
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/certificates/school-settings`, { headers: authHeaders() });
        const data = await res.json();
        setSchoolInfo(data.settings || null);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  useEffect(() => {
    if (certificateType && step === 0) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the list of Exams (AssessmentGroups) for the chosen Academic Year —
  // straight from the existing Examination Module, only when generating a
  // Hall Ticket (other certificate types don't need an exam selection).
  useEffect(() => {
    if (!isHallTicket || !academicYearId) {
      setExamGroups([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${EXAMS_BASE}/groups/${academicYearId}`, { headers: authHeaders() });
        const data = await res.json();
        setExamGroups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load exams:", err);
        toast.error("Could not load exams for the selected academic year");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHallTicket, academicYearId]);

  // Reset the exam pick if the academic year changes underneath it
  useEffect(() => {
    setAssessmentGroupId(null);
  }, [academicYearId]);

  // Auto-fetch the exam timetable (subjects, dates, timings) for the chosen
  // Exam + Class/Section, straight from the Examination Module's own
  // schedules API — the admin never types a timetable in by hand here.
  const fetchExamTimetable = useCallback(async () => {
    if (!assessmentGroupId || !classSectionId) return;
    setLoadingTimetable(true);
    setTimetableError("");
    try {
      const res = await fetch(`${EXAMS_BASE}/schedules/admin/${assessmentGroupId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load exam timetable");
      const allSchedules = await res.json();

      const subjects = (Array.isArray(allSchedules) ? allSchedules : [])
        .filter((sc) => sc.classSectionId === classSectionId)
        .sort((a, b) => {
          const d = new Date(a.examDate) - new Date(b.examDate);
          if (d !== 0) return d;
          return String(a.startTime || "").localeCompare(String(b.startTime || ""));
        })
        .map((sc) => ({
          subjectName: sc.subject?.name || "",
          subjectCode: sc.subject?.code || "",
          examDate: sc.examDate,
          examDay: deriveExamDay(sc.examDate),
          startTime: sc.startTime || "",
          endTime: sc.endTime || "",
          session: deriveSession(sc.startTime),
          venue: sc.venue || "",
        }));

      const examMeta = examGroups.find((g) => g.id === assessmentGroupId);

      setEditableFields((p) => ({
        ...p,
        subjects,
        examName: examMeta?.name || p.examName,
        instructions: p.instructions ?? DEFAULT_INSTRUCTIONS,
        theme: p.theme || "GREEN",
      }));
      if (subjects.length === 0) {
        setTimetableError(
          "No exam timetable found in the Examination Module for this Exam + Class/Section combination."
        );
      }
    } catch (err) {
      console.error(err);
      setTimetableError("Could not load the exam timetable. Try refreshing.");
    } finally {
      setLoadingTimetable(false);
    }
  }, [assessmentGroupId, classSectionId, examGroups]);

  // Fetch automatically once we land on the Details step with everything
  // selected — this is what makes it "automatic", not a manual button-only flow.
  useEffect(() => {
    if (isHallTicket && step === 3 && assessmentGroupId && classSectionId) {
      fetchExamTimetable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHallTicket, step, assessmentGroupId, classSectionId]);

  const fetchStudentInfo = async (id) => {
    setLoadingStudent(true);
    try {
      const params = new URLSearchParams({
        ...(academicYearId ? { academicYearId } : {}),
        ...(classSectionId ? { classSectionId } : {}),
      });
      const res = await fetch(`${API_URL}/api/certificates/student/${id}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load student info");
      const data = await res.json();
      setStudentInfo(data.student);
      setEditableFields({});
    } catch (err) {
      console.error(err);
      toast.error("Could not load student details");
    } finally {
      setLoadingStudent(false);
    }
  };

  const handleSelectStudent = (id) => {
    setStudentId(id);
    fetchStudentInfo(id);
  };

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = () => {
    if (step === 0) return !!certificateType;
    if (step === 1) return true; // academic year / class-section optional filters
    if (step === 2) return !!studentId;
    return true;
  };

  const handleGenerate = async () => {
    if (!certificateType || !studentId) return;

    if (certificateType === "HALL_TICKET" && (!editableFields.subjects || editableFields.subjects.length === 0)) {
      toast.error("No exam timetable loaded yet. Pick an Exam in Step 2, or hit Refresh in Step 4.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/certificates/generate`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          certificateType,
          studentId,
          academicYear: studentInfo?.academicYear || undefined,
          academicYearId: academicYearId || undefined,
          classSectionId: classSectionId || undefined,
          editableFields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate certificate");
      setResult(data);
      toast.success("Certificate generated successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6" style={{ background: C.bg, minHeight: "100%" }}>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/admin/certificates")}
          className="p-2 rounded-lg border"
          style={{ borderColor: C.border, color: C.deep }}
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.deep }}>
            {typeMeta ? `Generate ${typeMeta.label}` : "Generate Certificate"}
          </h1>
          <p className="text-xs" style={{ color: C.textLight }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-6 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-shrink-0">
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{
                width: 26, height: 26,
                background: i <= step ? C.deep : C.white,
                color: i <= step ? "#fff" : C.textLight,
                border: `1px solid ${i <= step ? C.deep : C.border}`,
              }}
            >
              {i + 1}
            </div>
            <span
              className="text-xs ml-2 mr-4 whitespace-nowrap"
              style={{ color: i <= step ? C.deep : C.textLight, fontWeight: i === step ? 700 : 400 }}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px mr-4" style={{ background: C.border }} />
            )}
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ background: C.white, border: `1px solid ${C.border}` }}
      >
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setCertificateType(t.key);
                  setEditableFields({});
                }}
                className="text-left p-4 rounded-xl border transition-colors"
                style={{
                  borderColor: certificateType === t.key ? C.deep : C.border,
                  background: certificateType === t.key ? `${C.sky}22` : C.white,
                }}
              >
                <p className="font-bold text-sm" style={{ color: C.deep }}>{t.label}</p>
                <p className="text-xs mt-1" style={{ color: C.textLight }}>{t.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: C.slate }}>
                Academic Year &amp; Class / Section
              </label>
              <CertificateFilters
                academicYearId={academicYearId}
                onAcademicYearChange={setAcademicYearId}
                classSectionId={classSectionId}
                onClassSectionChange={setClassSectionId}
              />
            </div>

            {isHallTicket && (
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: C.slate }}>
                  Exam
                </label>
                <select
                  value={assessmentGroupId || ""}
                  onChange={(e) => setAssessmentGroupId(e.target.value || null)}
                  disabled={!academicYearId}
                  className="px-3 py-2 rounded-xl text-sm outline-none w-full max-w-xs disabled:opacity-50"
                  style={{ border: `1px solid ${C.border}`, background: C.white, color: C.text }}
                >
                  <option value="">
                    {!academicYearId ? "Select an academic year first" : "Select an exam"}
                  </option>
                  {examGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}{g.term?.name ? ` (${g.term.name})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1.5" style={{ color: C.textLight }}>
                  The subjects, dates and timings will be pulled automatically from this exam's
                  timetable in the Examination Module — nothing to type by hand.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <StudentSelector
            academicYearId={academicYearId}
            classSectionId={classSectionId}
            selectedStudentId={studentId}
            onSelect={handleSelectStudent}
          />
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {loadingStudent ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin" style={{ color: C.slate }} />
                </div>
              ) : (
                <EditableFieldsForm
                  certificateType={certificateType}
                  studentInfo={studentInfo}
                  editableFields={editableFields}
                  setEditableFields={setEditableFields}
                  loadingTimetable={loadingTimetable}
                  timetableError={timetableError}
                  onRefreshTimetable={fetchExamTimetable}
                  hasExamSelected={!!(assessmentGroupId && classSectionId)}
                />
              )}
            </div>

            <div>
              <p className="text-xs font-bold mb-2" style={{ color: C.slate }}>Live Preview</p>
              {!result ? (
                <CertificatePreview
                  certificateType={certificateType}
                  student={studentInfo}
                  school={schoolInfo}
                  editableFields={editableFields}
                />
              ) : (
                <PdfViewer url={result.pdfUrl} fileName={`${result.certificate.certificateNumber}.pdf`} />
              )}

              {!result && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl"
                  style={{ background: C.deep, color: "#fff", opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <FileBadge2 size={16} />}
                  {generating ? "Generating..." : "Generate PDF"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!result && (
        <div className="flex justify-between mt-5">
          <button
            onClick={goBack}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-lg border disabled:opacity-40"
            style={{ borderColor: C.border, color: C.deep }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-40"
              style={{ background: C.deep, color: "#fff" }}
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="flex justify-end mt-5">
          <button
            onClick={() => navigate("/admin/certificates/history")}
            className="text-sm font-bold px-4 py-2 rounded-lg border"
            style={{ borderColor: C.border, color: C.deep }}
          >
            Go to Certificate History
          </button>
        </div>
      )}
    </div>
  );
}

// ── Editable fields form, shaped per certificate type ───────────────────────
function EditableFieldsForm({
  certificateType, studentInfo, editableFields, setEditableFields,
  loadingTimetable, timetableError, onRefreshTimetable, hasExamSelected,
}) {
  const set = (key, value) => setEditableFields((p) => ({ ...p, [key]: value }));

  const inputStyle = {
    border: `1px solid ${C.border}`, background: C.white, color: C.text,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Auto-filled (read-only) summary */}
      <div className="rounded-xl p-3" style={{ background: C.bg, border: `1px solid ${C.borderLight}` }}>
        <p className="text-xs font-bold mb-2" style={{ color: C.slate }}>Auto-filled from student record</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" style={{ color: C.text }}>
          <span><b>Name:</b> {studentInfo?.studentName || "—"}</span>
          <span><b>Admission No:</b> {studentInfo?.admissionNumber || "—"}</span>
          <span><b>Roll No:</b> {studentInfo?.rollNumber || "—"}</span>
          <span><b>Class:</b> {studentInfo?.className || "—"}</span>
          <span><b>DOB:</b> {studentInfo?.dob ? new Date(studentInfo.dob).toLocaleDateString("en-IN") : "—"}</span>
          <span><b>Parent/Guardian:</b> {studentInfo?.parentOrGuardianName || "—"}</span>
        </div>
      </div>

      {certificateType === "TRANSFER_CERTIFICATE" && (
        <>
          <Field label="Reason for Leaving">
            <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              value={editableFields.reasonForLeaving || ""} onChange={(e) => set("reasonForLeaving", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Working Days">
              <input type="number" style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                value={editableFields.workingDays ?? ""} onChange={(e) => set("workingDays", e.target.value)} />
            </Field>
            <Field label="Present Days">
              <input type="number" style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                value={editableFields.presentDays ?? ""} onChange={(e) => set("presentDays", e.target.value)} />
            </Field>
          </div>
          <Field label="Conduct">
            <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              value={editableFields.conduct || ""} onChange={(e) => set("conduct", e.target.value)} placeholder="Good" />
          </Field>
          <Field label="Remarks">
            <textarea style={inputStyle} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              value={editableFields.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </>
      )}

      {(certificateType === "CONDUCT_CERTIFICATE" || certificateType === "CHARACTER_CERTIFICATE") && (
        <Field label="Conduct / Character">
          <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            value={editableFields.conduct || ""} onChange={(e) => set("conduct", e.target.value)} placeholder="Good" />
        </Field>
      )}

      {["STUDY_CERTIFICATE", "BONAFIDE_CERTIFICATE", "MIGRATION_CERTIFICATE", "CONDUCT_CERTIFICATE", "CHARACTER_CERTIFICATE"].includes(certificateType) && (
        <Field label="Remarks">
          <textarea style={inputStyle} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            value={editableFields.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
        </Field>
      )}

      {certificateType === "HALL_TICKET" && (
        <HallTicketFields
          editableFields={editableFields}
          set={set}
          inputStyle={inputStyle}
          loadingTimetable={loadingTimetable}
          timetableError={timetableError}
          onRefreshTimetable={onRefreshTimetable}
          hasExamSelected={hasExamSelected}
        />
      )}
    </div>
  );
}

function HallTicketFields({
  editableFields, set, inputStyle, loadingTimetable, timetableError, onRefreshTimetable, hasExamSelected,
}) {
  const subjects = editableFields.subjects || [];
  const selectedTheme = editableFields.theme || "GREEN";

  return (
    <>
      <div>
        <p className="text-xs font-bold mb-1.5" style={{ color: C.slate }}>Design Theme</p>
        <div className="flex gap-2 flex-wrap">
          {HALL_TICKET_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => set("theme", t.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors"
              style={{
                borderColor: selectedTheme === t.id ? t.primary : C.border,
                background: selectedTheme === t.id ? `${t.primary}14` : C.white,
                color: selectedTheme === t.id ? t.primary : C.text,
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{ width: 12, height: 12, background: t.primary, border: `1px solid ${t.accent}` }}
              />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hall Ticket Number">
          <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            value={editableFields.hallTicketNumber || ""} onChange={(e) => set("hallTicketNumber", e.target.value)} />
        </Field>
        <Field label="School Code">
          <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            value={editableFields.schoolCode || ""} onChange={(e) => set("schoolCode", e.target.value)} />
        </Field>
      </div>
      <Field label="Exam Centre">
        <input style={inputStyle} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          value={editableFields.examCentre || ""} onChange={(e) => set("examCentre", e.target.value)} />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: C.slate }}>
            Subjects &amp; Exam Schedule <span style={{ color: C.textLight, fontWeight: 400 }}>(from Examination Module)</span>
          </p>
          <button
            onClick={onRefreshTimetable}
            disabled={!hasExamSelected || loadingTimetable}
            className="flex items-center gap-1 text-xs font-bold disabled:opacity-40"
            style={{ color: C.deep }}
          >
            {loadingTimetable ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {!hasExamSelected ? (
          <p className="text-xs italic" style={{ color: C.textLight }}>
            Go back to Step 2 and pick an Exam to auto-load its timetable.
          </p>
        ) : loadingTimetable ? (
          <div className="flex items-center gap-2 text-xs py-3" style={{ color: C.textLight }}>
            <Loader2 size={14} className="animate-spin" /> Loading timetable…
          </div>
        ) : subjects.length === 0 ? (
          <div
            className="flex items-start gap-2 text-xs rounded-lg p-2.5"
            style={{ background: "#FFF7ED", color: "#9A5B13", border: "1px solid #FDE7C7" }}
          >
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{timetableError || "No subjects found for this exam yet."}</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${C.borderLight}` }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: C.bg, color: C.slate }}>
                  <th className="px-2 py-1.5 text-left font-bold">Subject</th>
                  <th className="px-2 py-1.5 text-left font-bold">Code</th>
                  <th className="px-2 py-1.5 text-left font-bold">Date</th>
                  <th className="px-2 py-1.5 text-left font-bold">Day</th>
                  <th className="px-2 py-1.5 text-left font-bold">Time</th>
                  <th className="px-2 py-1.5 text-left font-bold">Session</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>{s.subjectName}</td>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>{s.subjectCode || "—"}</td>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>
                      {s.examDate ? new Date(s.examDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>{s.examDay || "—"}</td>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>
                      {s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : "—"}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: C.text }}>{s.session || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Field label="Instructions (shown on the Hall Ticket, editable)">
        <textarea
          style={inputStyle}
          rows={5}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          value={editableFields.instructions ?? DEFAULT_INSTRUCTIONS}
          onChange={(e) => set("instructions", e.target.value)}
          placeholder="One instruction per line"
        />
      </Field>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold mb-1 block" style={{ color: C.slate }}>{label}</label>
      {children}
    </div>
  );
}