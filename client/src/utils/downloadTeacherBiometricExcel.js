// client/src/utils/downloadTeacherBiometricExcel.js
//
// Downloads ONE Excel workbook for a date range.
// - One SHEET per teacher (tab at the bottom of Excel = teacher name)
// - Click a tab -> that teacher's punch in/out for every day + bank info
// - Bank info block is skipped cleanly if the teacher has none on file
//
// Usage:
//   downloadTeacherBiometricExcel(teachers, { schoolName, from, to })
//
// `teachers` = the `data` array returned by
//   GET /api/biometric/teacher-attendance-report?schoolId=&from=&to=
//   i.e. [{ teacherId, name, employeeCode, bankName, bankAccountNo, ifscCode, days:[{date,punchIn,punchOut,workedFmt,punchCount}] }]

const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:   "1C3044",
    secondary: "27435B",
    accent:    "EEF4F8",
    zebra:     "F7FAFC",
    white:     "FFFFFF",
    border:    "D0E1ED",
    green:     "166534",
    greenBg:   "F0FDF4",
    red:       "9F1239",
    redBg:     "FFF1F2",
    amber:     "92400E",
    amberBg:   "FFFBEB",
  },
};

function monthLabel(from, to) {
  if (!from || !to) return "";
  const f = new Date(from + "T12:00:00+05:30");
  const t = new Date(to + "T12:00:00+05:30");
  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(f)} — ${fmt(t)}`;
}

// Excel sheet-tab rules: max 31 chars, cannot contain \ / * ? : [ ]
// Also de-duplicate tab names if two teachers share the same name.
function makeSafeSheetName(rawName, usedNames) {
  let name = String(rawName || "Teacher").replace(/[\\/*?:[\]]/g, "").trim();
  if (!name) name = "Teacher";
  if (name.length > 31) name = name.slice(0, 31);

  let finalName = name;
  let suffix = 2;
  while (usedNames.has(finalName)) {
    const cut = name.slice(0, 31 - String(suffix).length - 1);
    finalName = `${cut}-${suffix}`;
    suffix++;
  }
  usedNames.add(finalName);
  return finalName;
}

export function downloadTeacherBiometricExcel(teachers, options = {}) {
  const { schoolName = "School", from = "", to = "" } = options;

  const run = (ExcelJS) => _generate(ExcelJS, teachers || [], schoolName, from, to);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload = () => run(window.ExcelJS);
    script.onerror = () => console.error("ExcelJS FAILED TO LOAD");
    document.head.appendChild(script);
  }
}

async function _generate(ExcelJS, teachers, schoolName, from, to) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;

  const thinBorder = {
    top:    { style: "thin", color: { argb: DESIGN.colors.border } },
    left:   { style: "thin", color: { argb: DESIGN.colors.border } },
    bottom: { style: "thin", color: { argb: DESIGN.colors.border } },
    right:  { style: "thin", color: { argb: DESIGN.colors.border } },
  };

  if (!teachers.length) {
    const ws = workbook.addWorksheet("No Data");
    ws.getCell("A1").value = "No teacher punch records found for the selected date range.";
    ws.getCell("A1").font = { name: DESIGN.fontName, size: 12, bold: true };
  } else {
    const usedNames = new Set();
    for (const teacher of teachers) {
      const sheetName = makeSafeSheetName(teacher.name, usedNames);
      _buildTeacherSheet(workbook, sheetName, teacher, schoolName, from, to, thinBorder);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const periodTag = from && to ? `${from}_to_${to}` : new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Biometric_Attendance_${schoolName.replace(/\s+/g, "-")}_${periodTag}.xlsx`;
  link.click();
}

function _buildTeacherSheet(workbook, sheetName, teacher, schoolName, from, to, thinBorder) {
  const ws = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 6 },
    { width: 18 },
    { width: 16, style: { alignment: { horizontal: "center" } } },
    { width: 16, style: { alignment: { horizontal: "center" } } },
    { width: 16, style: { alignment: { horizontal: "center" } } },
    { width: 10, style: { alignment: { horizontal: "center" } } },
  ];

  // ── Title bar ──────────────────────────────────────────────────────────────
  ws.mergeCells("A1:F1");
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — BIOMETRIC ATTENDANCE`;
  r1.getCell(1).font = { name: DESIGN.fontName, size: 14, bold: true, color: { argb: DESIGN.colors.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells("A2:F2");
  const r2 = ws.getRow(2); r2.height = 22;
  r2.getCell(1).value = `Period: ${monthLabel(from, to)}`;
  r2.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // ── Teacher info block ────────────────────────────────────────────────────
  let row = 4;
  const infoLine = (label, value) => {
    ws.mergeCells(`A${row}:B${row}`);
    ws.mergeCells(`C${row}:F${row}`);
    const r = ws.getRow(row); r.height = 20;
    r.getCell(1).value = label;
    r.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: "6B7280" } };
    r.getCell(1).alignment = { vertical: "middle" };
    r.getCell(3).value = value || "—";
    r.getCell(3).font = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.primary } };
    r.getCell(3).alignment = { vertical: "middle" };
    row++;
  };

  infoLine("Teacher Name", teacher.name);
  infoLine("Employee Code", teacher.employeeCode);

  const hasBankInfo = teacher.bankName || teacher.bankAccountNo || teacher.ifscCode;
  if (hasBankInfo) {
    row++; // spacer
    ws.mergeCells(`A${row}:F${row}`);
    const bankHeader = ws.getRow(row); bankHeader.height = 20;
    bankHeader.getCell(1).value = "BANK DETAILS";
    bankHeader.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    bankHeader.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    bankHeader.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    row++;
    if (teacher.bankName)      infoLine("Bank Name", teacher.bankName);
    if (teacher.bankAccountNo) infoLine("Account No.", teacher.bankAccountNo);
    if (teacher.ifscCode)      infoLine("IFSC Code", teacher.ifscCode);
  }

  row += 1; // spacer before table

  // ── Daily attendance table header ─────────────────────────────────────────
  const headerRowNum = row;
  const headers = ["#", "Date", "Punch In", "Punch Out", "Worked Hours", "Punches"];
  const hRow = ws.getRow(headerRowNum); hRow.height = 24;
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });

  const days = teacher.days || [];
  days.forEach((d, idx) => {
    const rowNum = headerRowNum + 1 + idx;
    const r = ws.getRow(rowNum); r.height = 20;
    const bg = idx % 2 === 1 ? DESIGN.colors.zebra : DESIGN.colors.white;

    const dateFmt = new Date(d.date + "T12:00:00+05:30").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    r.getCell(1).value = idx + 1;
    r.getCell(2).value = dateFmt;
    r.getCell(3).value = d.punchIn || "—";
    r.getCell(4).value = d.punchOut || "Still In / No Exit";
    r.getCell(5).value = d.workedFmt || "—";
    r.getCell(6).value = d.punchCount;

    for (let i = 1; i <= 6; i++) {
      const cell = r.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: DESIGN.fontName, size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "center" : i === 2 ? "left" : "center" };
    }

    // Punch-in green, punch-out red/amber
    r.getCell(3).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.green } };
    if (d.punchOut) {
      r.getCell(4).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red } };
    } else {
      r.getCell(4).font = { name: DESIGN.fontName, size: 10, italic: true, color: { argb: DESIGN.colors.amber } };
    }
  });

  if (!days.length) {
    const emptyRow = ws.getRow(headerRowNum + 1);
    ws.mergeCells(`A${headerRowNum + 1}:F${headerRowNum + 1}`);
    emptyRow.getCell(1).value = "No punch records found for this teacher in the selected date range.";
    emptyRow.getCell(1).font = { name: DESIGN.fontName, size: 10, italic: true, color: { argb: "9CA3AF" } };
    emptyRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    emptyRow.height = 26;
  }
}