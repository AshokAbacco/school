// client/src/admin/pages/Exams/components/excelMarksUtils.js
// Excel sample-download + upload-parsing helpers for AdminUploadResultModal.
// Supports both marking formats:
//   Standard: Roll No | Student | Marks / N | Absent | Remarks
//   Formative Assessment: Roll No | Student | R&R | CW | PW | ST | TOT | GRD | PER (%) | Absent | Remarks

import * as XLSX from "xlsx";

const GRADE_SCALE = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A"  },
  { min: 70, grade: "B"  },
  { min: 60, grade: "C"  },
  { min: 50, grade: "D"  },
  { min: 0,  grade: "F"  },
];
function calcGrade(pct) {
  if (pct == null || isNaN(pct)) return "";
  return GRADE_SCALE.find((g) => pct >= g.min)?.grade ?? "";
}

function safeFileToken(s) {
  return String(s || "").trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Sheet";
}

// ─── Download Sample Excel ──────────────────────────────────────────────────
export function downloadSampleExcel({ subjectName, maxMarks, examName, className, format, students }) {
  const isFA = format === "fa";

  const header = isFA
    ? ["Roll No", "Student", "R&R", "CW", "PW", "ST", "TOT", "GRD", "PER (%)", "Absent", "Remarks"]
    : ["Roll No", "Student", `Marks / ${maxMarks ?? ""}`, "Absent", "Remarks"];

  const rows = (students || []).map((s) => {
    if (isFA) {
      return [s.rollNumber || "", s.studentName || "", "", "", "", "", "", "", "", "No", ""];
    }
    return [s.rollNumber || "", s.studentName || "", "", "No", ""];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = header.map((h) => ({ wch: Math.max(12, String(h).length + 4) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Marks");

  const filename = `${safeFileToken(subjectName)}_${safeFileToken(examName)}_${safeFileToken(className)}_Sample.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Upload Excel: read raw rows out of the file ───────────────────────────
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) return reject(new Error("The Excel file has no sheets."));
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(new Error("Could not read that file — make sure it's a valid .xlsx/.csv export."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsArrayBuffer(file);
  });
}

function findCell(row, ...names) {
  const rowKeys = Object.keys(row);
  for (const name of names) {
    const found = rowKeys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return undefined;
}

function parseAbsent(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "ab", "absent"].includes(s);
}

function faTotal(components) {
  const { rr, cw, pw, st } = components || {};
  return [rr, cw, pw, st].reduce((sum, v) => {
    const n = Number(v);
    return sum + (v !== "" && v != null && !isNaN(n) ? n : 0);
  }, 0);
}

// ─── Match uploaded rows against the currently-loaded students, and turn
// them into { studentId: patch } updates ready to merge into state. ────────
export function matchExcelRowsToStudents(rows, students) {
  if (!rows?.length) throw new Error("The uploaded file has no data rows.");

  const headerKeys = Object.keys(rows[0]).map((k) => k.trim().toLowerCase());
  const isFA = headerKeys.some((k) => k === "r&r" || k.startsWith("r&r"));

  const byRoll = new Map();
  const byName = new Map();
  (students || []).forEach((s) => {
    if (s.rollNumber) byRoll.set(String(s.rollNumber).trim().toLowerCase(), s.studentId);
    if (s.studentName) byName.set(String(s.studentName).trim().toLowerCase(), s.studentId);
  });

  const updates = {};
  let matchedCount = 0;

  for (const row of rows) {
    const rollRaw = findCell(row, "Roll No", "RollNo", "Roll");
    const nameRaw = findCell(row, "Student", "Student Name", "Name");

    let studentId = null;
    if (rollRaw != null && String(rollRaw).trim() !== "") {
      studentId = byRoll.get(String(rollRaw).trim().toLowerCase());
    }
    if (!studentId && nameRaw) {
      studentId = byName.get(String(nameRaw).trim().toLowerCase());
    }
    if (!studentId) continue;

    matchedCount++;
    const absent  = parseAbsent(findCell(row, "Absent"));
    const remarks = String(findCell(row, "Remarks") ?? "");

    if (isFA) {
      const rr = findCell(row, "R&R", "RR");
      const cw = findCell(row, "CW");
      const pw = findCell(row, "PW");
      const st = findCell(row, "ST");
      const components = {
        rr: rr === "" || rr == null ? "" : String(rr),
        cw: cw === "" || cw == null ? "" : String(cw),
        pw: pw === "" || pw == null ? "" : String(pw),
        st: st === "" || st == null ? "" : String(st),
      };
      updates[studentId] = {
        components,
        marksObtained: absent ? "" : faTotal(components),
        isAbsent: absent,
        remarks,
      };
    } else {
      const marksKey = Object.keys(row).find((k) => k.trim().toLowerCase().startsWith("marks"));
      const marksVal = marksKey !== undefined ? row[marksKey] : findCell(row, "Marks Obtained");
      updates[studentId] = {
        marksObtained: absent || marksVal === "" || marksVal == null ? "" : Number(marksVal),
        isAbsent: absent,
        remarks,
      };
    }
  }

  if (!matchedCount) {
    throw new Error(
      "No matching students found in the uploaded file. Make sure Roll No or Student Name matches this class exactly."
    );
  }

  return { isFA, updates, matchedCount, totalRows: rows.length };
}

// ─── All-subjects workbook: one sheet per subject ──────────────────────────

// Excel sheet names: max 31 chars, no : \ / ? * [ ], must be unique in the book.
function safeSheetName(name, used) {
  let base = String(name || "Subject").replace(/[:\\/?*[\]]/g, "").slice(0, 31).trim() || "Subject";
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

// subjects: [{ name, maxMarks, format, students }] — one row per student, per subject sheet
export function downloadSampleExcelAllSubjects({ subjects, examName, className }) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();

  (subjects || []).forEach((subj) => {
    const isFA = subj.format === "fa";
    const header = isFA
      ? ["Roll No", "Student", "R&R", "CW", "PW", "ST", "TOT", "GRD", "PER (%)", "Absent", "Remarks"]
      : ["Roll No", "Student", `Marks / ${subj.maxMarks ?? ""}`, "Absent", "Remarks"];

    const rows = (subj.students || []).map((s) => (
      isFA
        ? [s.rollNumber || "", s.studentName || "", "", "", "", "", "", "", "", "No", ""]
        : [s.rollNumber || "", s.studentName || "", "", "No", ""]
    ));

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws["!cols"] = header.map((h) => ({ wch: Math.max(12, String(h).length + 4) }));

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(subj.name, usedNames));
  });

  const filename = `${safeFileToken(examName)}_${safeFileToken(className)}_AllSubjects_Sample.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Reads every sheet in the workbook → { sheetName: rows[] }
export function readExcelWorkbookAllSheets(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        if (!wb.SheetNames.length) return reject(new Error("The Excel file has no sheets."));
        const sheets = {};
        wb.SheetNames.forEach((name) => {
          sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
        });
        resolve(sheets);
      } catch (err) {
        reject(new Error("Could not read that file — make sure it's a valid .xlsx export."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeName(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Matches each sheet name to a subject (by name, then by code), and runs the
// same row-matching logic as the single-subject upload for each sheet found.
// subjects: [{ id, name, code, students }]
export function matchWorkbookToSubjects(sheets, subjects) {
  const bySubjectNorm = new Map();
  (subjects || []).forEach((s) => {
    bySubjectNorm.set(normalizeName(s.name), s);
    if (s.code) bySubjectNorm.set(normalizeName(s.code), s);
  });

  const results = [];        // { subjectId, subjectName, isFA, updates, matchedCount, totalRows }
  const unmatchedSheets = [];

  for (const [sheetName, rows] of Object.entries(sheets || {})) {
    if (!rows.length) continue;

    let subj = bySubjectNorm.get(normalizeName(sheetName));
    if (!subj) {
      // Excel may have appended " (2)" etc. to keep sheet names unique
      const stripped = sheetName.replace(/\s*\(\d+\)\s*$/, "");
      subj = bySubjectNorm.get(normalizeName(stripped));
    }
    if (!subj) {
      unmatchedSheets.push(sheetName);
      continue;
    }

    try {
      const { isFA, updates, matchedCount, totalRows } = matchExcelRowsToStudents(rows, subj.students);
      results.push({ subjectId: subj.id, subjectName: subj.name, isFA, updates, matchedCount, totalRows });
    } catch {
      unmatchedSheets.push(`${sheetName} (no matching students)`);
    }
  }

  if (!results.length) {
    throw new Error(
      unmatchedSheets.length
        ? `None of the sheet names matched a subject for this class (${unmatchedSheets.join(", ")}).`
        : "The uploaded file has no usable data."
    );
  }

  return { results, unmatchedSheets };
}

export { calcGrade };