// client/src/admin/pages/certificates/components/CertificatePreview.jsx
import { C, fmtDate, getHallTicketTheme, DEFAULT_HALL_TICKET_INSTRUCTIONS } from "./theme";

const TITLES = {
  TRANSFER_CERTIFICATE: "Transfer Certificate",
  HALL_TICKET: "Hall Ticket",
  STUDY_CERTIFICATE: "Study Certificate",
  BONAFIDE_CERTIFICATE: "Bonafide Certificate",
  CONDUCT_CERTIFICATE: "Conduct Certificate",
  CHARACTER_CERTIFICATE: "Character Certificate",
  MIGRATION_CERTIFICATE: "Migration Certificate",
};

const PROSE = {
  STUDY_CERTIFICATE: (d) =>
    `This is to certify that ${d.studentName || "________"}, studying in ${d.className || "________"} during the academic year ${d.academicYear || "________"}, is/was a bona fide student of this school. ${d.remarks || ""}`,
  BONAFIDE_CERTIFICATE: (d) =>
    `This is to certify that ${d.studentName || "________"} is a bona fide student of this school, studying in ${d.className || "________"} during the academic year ${d.academicYear || "________"}. ${d.remarks || ""}`,
  CONDUCT_CERTIFICATE: (d) =>
    `This is to certify that ${d.studentName || "________"} has maintained ${d.conduct || "good"} conduct throughout his/her stay in this institution. ${d.remarks || ""}`,
  CHARACTER_CERTIFICATE: (d) =>
    `This is to certify that ${d.studentName || "________"} bears a ${d.conduct || "good"} moral character to the best of our knowledge. ${d.remarks || ""}`,
  MIGRATION_CERTIFICATE: (d) =>
    `This is to certify that ${d.studentName || "________"} is hereby permitted to migrate to another institution/board for further studies. ${d.remarks || ""}`,
};

export default function CertificatePreview({ certificateType, student, school, editableFields = {} }) {
  const merged = { ...student, ...editableFields };

  if (certificateType === "HALL_TICKET") {
    return <HallTicketPreview merged={merged} school={school} />;
  }

  const title = TITLES[certificateType] || "Certificate";

  return (
    <div
      className="rounded-xl p-6 mx-auto"
      style={{
        border: `2px solid ${C.deep}`,
        background: "#fffdf8",
        maxWidth: 560,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div className="text-center border-b pb-3 mb-3" style={{ borderColor: C.deep }}>
        <p className="font-bold uppercase tracking-wide" style={{ fontSize: 18, color: C.deep }}>
          {school?.schoolName || "Your School Name"}
        </p>
        <p className="text-xs mt-1" style={{ color: C.textLight }}>
          {school?.schoolAddress || "School address"}
        </p>
      </div>

      <p
        className="text-center font-bold uppercase mb-4"
        style={{ color: "#7a1f1f", textDecoration: "underline", letterSpacing: 1 }}
      >
        {title}
      </p>

      {certificateType === "TRANSFER_CERTIFICATE" ? (
        <div className="text-sm space-y-1.5" style={{ color: C.text }}>
          <Row label="Admission Number" value={merged.admissionNumber} />
          <Row label="Student Name" value={merged.studentName} />
          <Row label="Parent / Guardian" value={merged.parentOrGuardianName} />
          <Row label="Class" value={merged.className} />
          <Row label="Working Days" value={merged.workingDays} />
          <Row label="Days Present" value={merged.presentDays} />
          <Row label="Conduct" value={merged.conduct || "Good"} />
          <Row label="Reason for Leaving" value={merged.reasonForLeaving} />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-justify" style={{ color: C.text }}>
          {PROSE[certificateType] ? PROSE[certificateType](merged) : "Certificate preview"}
        </p>
      )}

      <div className="flex justify-between items-end mt-8 pt-3 text-xs" style={{ color: C.textLight, borderTop: `1px dashed ${C.border}` }}>
        <span className="leading-relaxed">
          Certificate No: <b>________</b><br />
          Date of Issue: <b>{fmtDate(new Date())}</b>
        </span>
        <span className="text-center" style={{ width: 130 }}>
          <span className="block" style={{ borderTop: `1px solid ${C.text}`, width: 110, margin: "0 auto" }} />
          <span className="block mt-1">Principal Signature</span>
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="font-bold" style={{ color: C.deep, minWidth: 140 }}>{label}:</span>
      <span>{value || "________"}</span>
    </div>
  );
}

// ── Hall Ticket mock preview — mirrors the actual PDF's card-based, themed
// layout (header/student-info/exam-cards/schedule/instructions/footer) so
// what staff see before generating matches what comes out.
function HallTicketPreview({ merged, school }) {
  const theme = getHallTicketTheme(merged.theme);
  const subjects = merged.subjects || [];
  const instructions = (merged.instructions || DEFAULT_HALL_TICKET_INSTRUCTIONS)
    .split("\n").map((l) => l.trim()).filter(Boolean);

  const firstSubject = subjects[0] || null;
  const examStart = firstSubject?.startTime || null;

  return (
    <div
      className="rounded-lg mx-auto overflow-hidden"
      style={{ border: `2px solid ${theme.primary}`, maxWidth: 560, fontFamily: "'Segoe UI', sans-serif" }}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center gap-3 text-white"
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
      >
        <div className="w-9 h-9 rounded flex-shrink-0 bg-white/90 flex items-center justify-center text-[8px] font-bold" style={{ color: theme.primary }}>
          LOGO
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-base leading-tight truncate">{school?.schoolName || "Your School Name"}</p>
          <p className="text-[10px] opacity-90 truncate">{school?.schoolAddress || "School address"}</p>
          {school?.schoolMotto && <p className="text-[9px] italic opacity-80 truncate">"{school.schoolMotto}"</p>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: theme.accent, color: "#1a1a1a" }}>
            {merged.examName || "Examination"}
          </span>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/50 bg-white/20">
            AY {merged.academicYear || "________"}
          </span>
        </div>
      </div>

      <div className="p-3">
        {/* Student info */}
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-16 rounded flex-shrink-0 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 border" style={{ borderColor: theme.primary }}>
            Photo
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] flex-1" style={{ color: C.text }}>
            <MiniField label="Student Name" value={merged.studentName} theme={theme} />
            <MiniField label="Father's Name" value={merged.fatherName || merged.parentOrGuardianName} theme={theme} />
            <MiniField label="Admission No" value={merged.admissionNumber} theme={theme} />
            <MiniField label="Roll Number" value={merged.rollNumber} theme={theme} />
            <MiniField label="Class & Section" value={merged.className} theme={theme} />
            <MiniField label="Date of Birth" value={merged.dob ? fmtDate(merged.dob) : null} theme={theme} />
            <MiniField label="Gender" value={merged.gender} theme={theme} />
            <MiniField label="Contact Number" value={merged.contactNumber} theme={theme} />
          </div>
        </div>

        {/* Exam info cards */}
        <p className="text-[10px] font-extrabold uppercase mb-1.5" style={{ color: theme.primary, borderBottom: `2px solid ${theme.accent}`, display: "inline-block" }}>
          Exam Information
        </p>
        <div className="flex gap-2 mb-3">
          {[
            { label: "Exam Centre", value: merged.examCentre },
            { label: "Reporting Time", value: examStart ? "30 min before start" : null },
            { label: "Exam Start Time", value: examStart },
          ].map((c) => (
            <div key={c.label} className="flex-1 text-center rounded p-2" style={{ background: `${theme.primary}0d`, border: `1px solid ${theme.primary}33` }}>
              <p className="text-[8px] font-bold uppercase" style={{ color: theme.secondary }}>{c.label}</p>
              <p className="text-[11px] font-extrabold" style={{ color: theme.primary }}>{c.value || "________"}</p>
            </div>
          ))}
        </div>

        {/* Schedule */}
        <p className="text-[10px] font-extrabold uppercase mb-1.5" style={{ color: theme.primary, borderBottom: `2px solid ${theme.accent}`, display: "inline-block" }}>
          Examination Schedule
        </p>
        {subjects.length ? (
          <table className="w-full text-[10px] mb-3" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: theme.primary, color: "#fff" }}>
                <th className="text-left px-1.5 py-1 font-bold">Subject</th>
                <th className="text-left px-1.5 py-1 font-bold">Date</th>
                <th className="text-left px-1.5 py-1 font-bold">Day</th>
                <th className="text-left px-1.5 py-1 font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td className="px-1.5 py-1">{s.subjectName}</td>
                  <td className="px-1.5 py-1">{s.examDate ? fmtDate(s.examDate) : "—"}</td>
                  <td className="px-1.5 py-1">{s.examDay || "—"}</td>
                  <td className="px-1.5 py-1">{s.startTime && s.endTime ? `${s.startTime}-${s.endTime}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[10px] italic mb-3" style={{ color: C.textLight }}>No exam timetable loaded yet</p>
        )}

        {/* Instructions */}
        <p className="text-[10px] font-extrabold uppercase mb-1.5" style={{ color: theme.primary, borderBottom: `2px solid ${theme.accent}`, display: "inline-block" }}>
          Instructions
        </p>
        <ul className="text-[9.5px] list-disc pl-4 space-y-0.5 mb-3" style={{ color: C.text }}>
          {instructions.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 text-[10px]" style={{ color: C.text }}>
        <span>Date of Issue: <b>{fmtDate(new Date())}</b></span>
        <span className="text-center">
          <span className="block" style={{ borderTop: `1px solid ${C.text}`, width: 90, margin: "0 auto 2px" }} />
          Principal Signature
        </span>
      </div>
    </div>
  );
}

function MiniField({ label, value, theme }) {
  return (
    <div>
      <div className="text-[8px] font-bold uppercase" style={{ color: theme.secondary }}>{label}</div>
      <div className="font-semibold">{value || "________"}</div>
    </div>
  );
}