// client/src/admin/pages/classes/components/BulkReadmissionUpload.jsx
import { useState, useRef, useCallback } from "react";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import {
  Upload,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
  UserPlus,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { readmitStudentBulk } from "../api/classesApi";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};

// ── Download Excel Template ───────────────────────────────────────────────────
export function downloadReadmissionTemplate(pendingStudents, allSections) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Student ID",
    "Student Name",
    "Old Admission No",
    "Last Class",
    "Last Academic Year",
    "New Admission Number",
    "Target Class Name",
    "Target Academic Year",
    "Reason (optional)",
  ];

  const dataRows = pendingStudents.map((s) => {
    const info = s.personalInfo;
    const enrollment = s.enrollments?.[0];
    return [
      s.id,
      `${info?.firstName || ""} ${info?.lastName || ""}`.trim(),
      enrollment?.admissionNumber || "",
      enrollment?.classSection?.name || "",
      enrollment?.academicYear?.name || "",
      "", "", "", "",
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws1["!cols"] = [
    { wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 18 },
    { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 28 },
  ];

  const range1 = XLSX.utils.decode_range(ws1["!ref"]);
  for (let R = range1.s.r; R <= range1.e.r; R++) {
    for (let C2 = range1.s.c; C2 <= range1.e.c; C2++) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C2 });
      if (ws1[ref]) { ws1[ref].t = "s"; ws1[ref].z = "@"; }
    }
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Re-admission");

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Class Name (copy this exactly into Sheet 1)"],
    ...allSections.map((s) => [s.name]),
  ]);
  ws2["!cols"] = [{ wch: 42 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Valid Classes");

  const ws3 = XLSX.utils.aoa_to_sheet([
    ["RE-ADMISSION BULK UPLOAD — INSTRUCTIONS"],
    [""],
    ["HOW TO FILL THIS FILE"],
    [""],
    ["Column", "Instructions"],
    ["Student ID", "DO NOT edit this column. It is used to identify the student."],
    ["Student Name", "Read-only reference. Do not edit."],
    ["Old Admission No", "Read-only reference. Do not edit."],
    ["Last Class", "Read-only reference. Do not edit."],
    ["Last Academic Year", "Read-only reference. Do not edit."],
    ["New Admission Number", "REQUIRED. Enter the new unique admission number for this student."],
    ["Target Class Name", "REQUIRED. Copy the exact class name from the 'Valid Classes' sheet (Sheet 2)."],
    ["Target Academic Year", "REQUIRED. Enter the target year name exactly as it exists, e.g. 2025-26."],
    ["Reason (optional)", "Optional. Enter reason for re-admission."],
    [""],
    ["IMPORTANT NOTES"],
    ["- Do not add or remove rows from the Students sheet."],
    ["- Do not rename any column headers."],
    ["- New Admission Number must be unique — no duplicates allowed."],
    ["- Target Class Name must exactly match a name from the Valid Classes sheet."],
    ["- Target Academic Year must match an existing year in the system."],
    ["- Rows with missing required fields will be skipped with an error report."],
  ]);
  ws3["!cols"] = [{ wch: 28 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Instructions");

  XLSX.writeFile(wb, "readmission_bulk_upload.xlsx");
}

// ── Parse uploaded Excel ──────────────────────────────────────────────────────
function parseReadmissionExcel(file, onParsed, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets["Re-admission"] || wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (raw.length < 2) {
        onError("File must have a header row and at least one data row.");
        return;
      }

      const [, ...dataRows] = raw;

      const parsed = dataRows
        .filter((r) => r.some((c) => String(c).trim() !== ""))
        .map((r, i) => {
          const studentId          = String(r[0] || "").trim();
          const studentName        = String(r[1] || "").trim();
          const oldAdmissionNo     = String(r[2] || "").trim();
          const lastClass          = String(r[3] || "").trim();
          const lastYear           = String(r[4] || "").trim();
          const newAdmissionNumber = String(r[5] || "").trim();
          const targetClassName    = String(r[6] || "").trim();
          const targetAcademicYear = String(r[7] || "").trim();
          const reason             = String(r[8] || "").trim();

          const errors = [];
          if (!studentId)          errors.push("Student ID is missing — do not delete column A");
          if (!newAdmissionNumber) errors.push("New Admission Number is required");
          if (!targetClassName)    errors.push("Target Class Name is required");
          if (!targetAcademicYear) errors.push("Target Academic Year is required");

          return {
            _row: i + 2,
            studentId, studentName, oldAdmissionNo, lastClass, lastYear,
            newAdmissionNumber, targetClassName, targetAcademicYear, reason,
            errors,
            status: "pending",
            serverError: null,
          };
        });

      onParsed(parsed);
    } catch (ex) {
      onError("Failed to parse file: " + ex.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Row status badge ──────────────────────────────────────────────────────────
function RowStatus({ row }) {
  if (row.status === "success")
    return (
      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#15803d" }}>
        <CheckCircle size={11} /> <span className="hidden sm:inline">Re-admitted</span>
      </span>
    );
  if (row.status === "error")
    return (
      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#dc2626" }}>
        <AlertCircle size={11} /> <span className="hidden sm:inline">Failed</span>
      </span>
    );
  if (row.errors.length)
    return (
      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: "#d97706" }}>
        <AlertCircle size={11} /> {row.errors.length}
      </span>
    );
  return <span className="text-xs font-semibold" style={{ color: "#15803d" }}>Ready</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BulkReadmissionUpload({
  onClose,
  onSuccess,
  pendingStudents = [],
  allSections = [],
  years = [],
}) {
  const [step, setStep]               = useState("upload");
  const [file, setFile]               = useState(null);
  const [rows, setRows]               = useState([]);
  const [dragOver, setDragOver]       = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const fileRef = useRef();

  const validCount   = rows.filter((r) => r.errors.length === 0).length;
  const invalidCount = rows.filter((r) => r.errors.length > 0).length;
  const successCount = rows.filter((r) => r.status === "success").length;
  const failCount    = rows.filter((r) => r.status === "error").length;

  const handleFile = useCallback((f) => {
    setFile(f);
    parseReadmissionExcel(
      f,
      (parsed) => { setRows(parsed); setStep("preview"); },
      (err) => alert(err),
    );
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleProcess = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (!valid.length) return;

    setProcessing(true);

    const students = valid.map((r) => {
      const section = allSections.find(
        (s) => s.name.trim().toLowerCase() === r.targetClassName.trim().toLowerCase(),
      );
      const year = years.find(
        (y) => y.name.trim().toLowerCase() === r.targetAcademicYear.trim().toLowerCase(),
      );
      return {
        studentId:          r.studentId,
        newAdmissionNumber: r.newAdmissionNumber,
        newClassSectionId:  section?.id || null,
        newAcademicYearId:  year?.id || null,
        reason:             r.reason || null,
        _row:               r._row,
        _targetClassName:   r.targetClassName,
        _targetYearName:    r.targetAcademicYear,
        _sectionFound:      !!section,
        _yearFound:         !!year,
      };
    });

    const updatedRows = [...rows];
    const toSend = [];

    for (const s of students) {
      const idx = updatedRows.findIndex((r) => r._row === s._row);
      if (!s._sectionFound) {
        updatedRows[idx] = { ...updatedRows[idx], status: "error", serverError: `Class "${s._targetClassName}" not found in the system` };
        continue;
      }
      if (!s._yearFound) {
        updatedRows[idx] = { ...updatedRows[idx], status: "error", serverError: `Academic year "${s._targetYearName}" not found in the system` };
        continue;
      }
      toSend.push(s);
    }

    if (toSend.length > 0) {
      try {
        const data = await readmitStudentBulk({
          students: toSend.map(({ studentId, newAdmissionNumber, newClassSectionId, newAcademicYearId, reason, _row }) => ({
            studentId, newAdmissionNumber, newClassSectionId, newAcademicYearId, reason, _row,
          })),
        });

        if (Array.isArray(data.results)) {
          data.results.forEach((result) => {
            const idx = updatedRows.findIndex((r) => r._row === result._row);
            if (idx === -1) return;
            updatedRows[idx] = {
              ...updatedRows[idx],
              status: result.success ? "success" : "error",
              serverError: result.error || null,
            };
          });
        }
      } catch (err) {
        toSend.forEach((s) => {
          const idx = updatedRows.findIndex((r) => r._row === s._row);
          if (idx !== -1)
            updatedRows[idx] = { ...updatedRows[idx], status: "error", serverError: err.message };
        });
      }
    }

    setRows(updatedRows);
    setProcessing(false);
    setStep("done");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-2 px-2 sm:py-4 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 900, background: C.card, border: `1px solid ${C.border}` }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: C.primary, borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Bulk Re-admission Upload
              </h2>
              <p className="text-xs text-white/60 hidden sm:block">
                Download Excel → Fill details → Upload to re-admit multiple students at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shrink-0 ml-2"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Step indicator ───────────────────────────────────────────────── */}
        <div
          className="flex items-center px-3 py-2 sm:px-6 sm:py-3 text-xs font-bold overflow-x-auto"
          style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
        >
          {[
            { id: "upload",  label: "1. Download & Upload" },
            { id: "preview", label: "2. Preview" },
            { id: "done",    label: "3. Results" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center shrink-0">
              {i > 0 && <div className="w-4 sm:w-6 h-px mx-1 sm:mx-2" style={{ background: C.border }} />}
              <span
                className="px-2 sm:px-3 py-1 rounded-full transition-all whitespace-nowrap"
                style={{
                  background: step === s.id ? C.primary : "transparent",
                  color: step === s.id ? "white" : C.mid,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div
          className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto"
          style={{ maxHeight: "75vh" }}
        >

          {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
          {step === "upload" && (
            <div className="space-y-4 sm:space-y-5">
              <div
                className="rounded-xl p-3 sm:p-4 space-y-2"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
              >
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm" style={{ color: "#1d4ed8" }}>
                  <Info size={14} /> How to use Bulk Re-admission
                </div>
                <ul className="text-xs space-y-1.5" style={{ color: "#1e40af" }}>
                  <li>• <strong>Step 1:</strong> Click "Download Template" below. The Excel will have all pending re-admission students pre-filled.</li>
                  <li>• <strong>Step 2:</strong> Open the file. Go to the <strong>"Re-admission"</strong> sheet and fill in the last 4 columns for each student.</li>
                  <li>• <strong>New Admission Number:</strong> Enter a unique admission number for the student's new enrollment.</li>
                  <li>• <strong>Target Class Name:</strong> Copy the exact class name from the <strong>"Valid Classes"</strong> sheet (Sheet 2) in the same file.</li>
                  <li>• <strong>Target Academic Year:</strong> Enter the year name exactly as it exists in the system (e.g. <code>2025-26</code>).</li>
                  <li>• <strong>Do NOT</strong> edit columns A–E — these are reference only.</li>
                  <li>• <strong>Step 3:</strong> Save the file and upload it here. The system will validate and process each row.</li>
                </ul>
              </div>

              <button
                onClick={() => downloadReadmissionTemplate(pendingStudents, allSections)}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 w-full sm:w-auto"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}
              >
                <Download size={15} />
                Download Template ({pendingStudents.length} student{pendingStudents.length !== 1 ? "s" : ""})
              </button>

              <label
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className="flex flex-col items-center justify-center gap-3 sm:gap-4 p-6 sm:p-10 rounded-2xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? C.light : C.border}`,
                  background: dragOver ? "rgba(136,189,242,0.08)" : C.bg,
                }}
              >
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(56,73,89,0.10)" }}
                >
                  <Upload size={22} style={{ color: C.primary }} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm" style={{ color: C.primary }}>
                    Drop your filled Excel file here
                  </p>
                  <p className="text-xs mt-1" style={{ color: C.mid }}>
                    or tap to browse · .xlsx supported
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
          )}

          {/* ── STEP 2: Preview ───────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Total",      val: rows.length,  color: C.primary },
                  { label: "Valid",      val: validCount,   color: "#15803d" },
                  { label: "Has Issues", val: invalidCount, color: "#d97706" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: `${c.color}12`, border: `1px solid ${c.color}30`, color: c.color }}
                  >
                    {c.val} {c.label}
                  </div>
                ))}
              </div>

              {/* File info */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold min-w-0" style={{ color: C.primary }}>
                  <FileSpreadsheet size={13} style={{ color: C.mid }} className="shrink-0" />
                  <span className="truncate">{file?.name}</span>
                </div>
                <button
                  onClick={() => { setStep("upload"); setRows([]); setFile(null); }}
                  className="flex items-center gap-1 text-xs font-semibold shrink-0 ml-2"
                  style={{ color: C.mid }}
                >
                  <RefreshCw size={11} /> <span className="hidden sm:inline">Change file</span>
                </button>
              </div>

              {/* Mobile cards */}
              <div className="block sm:hidden space-y-2">
                {rows.map((row) => (
                  <div
                    key={row._row}
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      border: `1px solid ${C.border}`,
                      background: row.errors.length ? "#fffbeb" : "white",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: C.primary }}>
                          {row.studentName || "—"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: C.mid }}>
                          Old Adm: {row.oldAdmissionNo || "—"}
                        </p>
                      </div>
                      <RowStatus row={row} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div>
                        <span style={{ color: C.mid }}>New No: </span>
                        <span style={{ color: row.newAdmissionNumber ? C.primary : "#d97706" }}>
                          {row.newAdmissionNumber || "Empty"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: C.mid }}>Year: </span>
                        <span style={{ color: row.targetAcademicYear ? C.primary : "#d97706" }}>
                          {row.targetAcademicYear || "Empty"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span style={{ color: C.mid }}>Class: </span>
                        <span style={{ color: row.targetClassName ? C.primary : "#d97706" }}>
                          {row.targetClassName || "Empty"}
                        </span>
                      </div>
                    </div>
                    {row.errors.length > 0 && (
                      <div>
                        <button
                          onClick={() => setExpandedRow(expandedRow === row._row ? null : row._row)}
                          className="flex items-center gap-1 text-[10px] font-bold"
                          style={{ color: "#d97706" }}
                        >
                          {expandedRow === row._row ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {expandedRow === row._row ? "Hide" : "Show"} issues
                        </button>
                        {expandedRow === row._row && (
                          <ul className="mt-1 space-y-0.5 pl-1">
                            {row.errors.map((e, i) => (
                              <li key={i} className="text-[11px] font-semibold" style={{ color: "#b45309" }}>· {e}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        {["Row", "Student", "Old Adm No", "New Adm No", "Target Class", "Year", "Status", ""].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: C.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <>
                          <tr
                            key={row._row}
                            style={{
                              borderBottom: `1px solid ${C.border}`,
                              background: row.errors.length ? "#fffbeb" : "white",
                            }}
                          >
                            <td className="px-3 py-2.5 font-mono" style={{ color: C.mid }}>#{row._row}</td>
                            <td className="px-3 py-2.5 font-semibold" style={{ color: C.primary }}>{row.studentName || "—"}</td>
                            <td className="px-3 py-2.5" style={{ color: C.mid }}>{row.oldAdmissionNo || "—"}</td>
                            <td className="px-3 py-2.5" style={{ color: C.primary }}>
                              {row.newAdmissionNumber || <span style={{ color: "#d97706" }}>Empty</span>}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: C.mid }}>
                              {row.targetClassName || <span style={{ color: "#d97706" }}>Empty</span>}
                            </td>
                            <td className="px-3 py-2.5" style={{ color: C.mid }}>
                              {row.targetAcademicYear || <span style={{ color: "#d97706" }}>Empty</span>}
                            </td>
                            <td className="px-3 py-2.5"><RowStatus row={row} /></td>
                            <td className="px-3 py-2.5">
                              {row.errors.length > 0 && (
                                <button
                                  onClick={() => setExpandedRow(expandedRow === row._row ? null : row._row)}
                                  className="flex items-center gap-1 text-[10px] font-bold"
                                  style={{ color: "#d97706" }}
                                >
                                  {expandedRow === row._row ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  Details
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedRow === row._row && row.errors.length > 0 && (
                            <tr key={`${row._row}-errors`}>
                              <td
                                colSpan={8}
                                className="px-4 py-2"
                                style={{ background: "#fffbeb", borderBottom: `1px solid ${C.border}` }}
                              >
                                <ul className="space-y-0.5">
                                  {row.errors.map((e, i) => (
                                    <li key={i} className="text-[11px] font-semibold" style={{ color: "#b45309" }}>· {e}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidCount > 0 && (
                <p className="text-xs" style={{ color: C.mid }}>
                  Rows with issues will be <strong>skipped</strong>. Only {validCount} valid rows will be processed.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 3: Done ──────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4 sm:p-5 flex flex-col items-center gap-3 text-center"
                style={{
                  background: successCount > 0 ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${successCount > 0 ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                <CheckCircle size={28} style={{ color: successCount > 0 ? "#16a34a" : "#dc2626" }} />
                <div>
                  <p className="font-bold text-sm sm:text-base" style={{ color: successCount > 0 ? "#15803d" : "#dc2626" }}>
                    {successCount > 0
                      ? `${successCount} student${successCount > 1 ? "s" : ""} re-admitted successfully!`
                      : "Re-admission failed"}
                  </p>
                  {failCount > 0 && (
                    <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{failCount} row(s) failed — see details below</p>
                  )}
                  {invalidCount > 0 && (
                    <p className="text-xs mt-1" style={{ color: "#d97706" }}>{invalidCount} row(s) skipped due to validation issues</p>
                  )}
                </div>
              </div>

              {/* Mobile result cards */}
              <div className="block sm:hidden space-y-2">
                {rows.map((row) => (
                  <div
                    key={row._row}
                    className="rounded-xl p-3 space-y-1.5"
                    style={{
                      border: `1px solid ${C.border}`,
                      background:
                        row.status === "success" ? "#f0fdf4"
                        : row.status === "error"  ? "#fef2f2"
                        : row.errors.length       ? "#fffbeb"
                        : "white",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: C.primary }}>{row.studentName}</p>
                      <RowStatus row={row} />
                    </div>
                    <p className="text-xs" style={{ color: C.mid }}>
                      New Adm: {row.newAdmissionNumber || "—"} · Class: {row.targetClassName || "—"}
                    </p>
                    {(row.serverError || row.errors[0]) && (
                      <p className="text-xs font-medium" style={{ color: "#dc2626" }}>
                        {row.serverError || row.errors[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop result table */}
              <div className="hidden sm:block rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                        {["Row", "Student", "New Adm No", "Target Class", "Result", "Message"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-bold" style={{ color: C.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row._row}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            background:
                              row.status === "success" ? "#f0fdf4"
                              : row.status === "error"  ? "#fef2f2"
                              : row.errors.length       ? "#fffbeb"
                              : "white",
                          }}
                        >
                          <td className="px-3 py-2.5 font-mono" style={{ color: C.mid }}>#{row._row}</td>
                          <td className="px-3 py-2.5 font-semibold" style={{ color: C.primary }}>{row.studentName}</td>
                          <td className="px-3 py-2.5" style={{ color: C.mid }}>{row.newAdmissionNumber || "—"}</td>
                          <td className="px-3 py-2.5" style={{ color: C.mid }}>{row.targetClassName || "—"}</td>
                          <td className="px-3 py-2.5"><RowStatus row={row} /></td>
                          <td className="px-3 py-2.5" style={{ color: "#dc2626" }}>
                            {row.serverError || (row.errors.length ? row.errors[0] : "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: `1px solid ${C.border}`, color: C.mid, background: "white" }}
          >
            <X size={14} /> {step === "done" ? "Close" : "Cancel"}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {step === "preview" && (
              <button
                onClick={handleProcess}
                disabled={processing || validCount === 0}
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all disabled:opacity-50"
                style={{ background: C.primary }}
              >
                {processing ? (
                  <><Loader2 size={14} className="animate-spin" /><span className="hidden sm:inline">Processing…</span><span className="sm:hidden">Wait…</span></>
                ) : (
                  <><UserPlus size={14} />Re-admit {validCount}<span className="hidden sm:inline"> Student{validCount !== 1 ? "s" : ""}</span></>
                )}
              </button>
            )}
            {step === "done" && successCount > 0 && (
              <button
                onClick={() => onSuccess?.()}
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#16a34a" }}
              >
                <CheckCircle size={14} /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}