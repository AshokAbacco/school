// client/src/utils/downloadBiometricWideExcel.js
//
// Downloads ONE Excel sheet — ALL selected person types (e.g. Teacher + Staff
// together), ALL in a single table, fully unpaginated.
// - One ROW per person (fixed columns: Type, Name, Code, Bank details)
// - Two-row header: top row = merged date (e.g. "16 Jun") spanning its
//   In+Out pair; second row = "In" / "Out" sub-labels
// - A medium/dark border boxes off each date's In+Out pair from the next
// - Only covers the selected date range (not a forced full month)
// - Bank columns are simply "—" for person types with no bank fields
//   (e.g. Student, Admin, Finance) — nothing breaks, just blank
//
// Usage:
//   downloadBiometricWideExcel(persons, { schoolName, from, to, personTypes })
//
// `persons` = the `data` array returned by
//   GET /api/biometric/attendance-report?schoolId=&from=&to=&personTypes=TEACHER,STAFF
//   i.e. [{ personId, personType, name, code, bankName, bankAccountNo, ifscCode,
//           days:[{date,punchIn,punchOut,workedFmt,punchCount}] }]

const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:   "1C3044",
    secondary: "27435B",
    zebra:     "F7FAFC",
    white:     "FFFFFF",
    border:    "D0E1ED",
    green:     "166534",
    red:       "9F1239",
    amber:     "92400E",
  },
};

const PT_LABEL = { STUDENT: "Student", TEACHER: "Teacher", STAFF: "Staff", ADMIN: "School Admin", FINANCE: "Finance Admin" };
const PT_BADGE_COLOR = {
  STUDENT: "4338CA", TEACHER: "166534", STAFF: "9A3412", ADMIN: "7E22CE", FINANCE: "9F1239",
};

function monthLabel(from, to) {
  if (!from || !to) return "";
  const f = new Date(from + "T12:00:00+05:30");
  const t = new Date(to + "T12:00:00+05:30");
  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt(f)} — ${fmt(t)}`;
}

// Pure calendar-date arithmetic, NO timezone conversion — from/to are plain
// "YYYY-MM-DD" strings, so there's nothing to convert. (Round-tripping
// through a "+05:30" Date object here previously shifted results by a day.)
function buildDateRange(from, to) {
  const dates = [];
  if (!from || !to) return dates;

  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);

  let cur = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);

  while (cur <= end) {
    const d = new Date(cur);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
    cur += 24 * 60 * 60 * 1000;
  }
  return dates;
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function shortDateLabel(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1]}`;
}

export function downloadBiometricWideExcel(persons, options = {}) {
  const { schoolName = "School", from = "", to = "", personTypes = [] } = options;

  const run = (ExcelJS) => _generate(ExcelJS, persons || [], schoolName, from, to, personTypes);

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

async function _generate(ExcelJS, persons, schoolName, from, to, personTypes) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;

  const thinBorder = {
    top:    { style: "thin", color: { argb: DESIGN.colors.border } },
    left:   { style: "thin", color: { argb: DESIGN.colors.border } },
    bottom: { style: "thin", color: { argb: DESIGN.colors.border } },
    right:  { style: "thin", color: { argb: DESIGN.colors.border } },
  };
  const dateGroupBorder = (isLastColOfGroup) => ({
    top:    { style: "thin",   color: { argb: DESIGN.colors.border } },
    left:   { style: "thin",   color: { argb: DESIGN.colors.border } },
    bottom: { style: "thin",   color: { argb: DESIGN.colors.border } },
    right:  { style: isLastColOfGroup ? "medium" : "thin", color: { argb: isLastColOfGroup ? DESIGN.colors.primary : DESIGN.colors.border } },
  });

  const dateRange = buildDateRange(from, to);
  const FIXED_COUNT = 7; // #, Type, Name, Code, Bank Name, Account No., IFSC
  const ws = workbook.addWorksheet("Biometric Attendance", { views: [{ showGridLines: true, state: "frozen", xSplit: FIXED_COUNT, ySplit: 5 }] });

  // ── Fixed columns + dynamic date columns ──────────────────────────────────
  const fixedCols = [
    { header: "#",             width: 5  },
    { header: "Type",          width: 14 },
    { header: "Name",          width: 24 },
    { header: "Code / Role",   width: 16 },
    { header: "Bank Name",     width: 18 },
    { header: "Account No.",   width: 18 },
    { header: "IFSC Code",     width: 14 },
  ];
  const dateColWidths = [];
  dateRange.forEach(() => { dateColWidths.push(11, 11); });
  const allColWidths = [...fixedCols.map((c) => c.width), ...dateColWidths];
  ws.columns = allColWidths.map((w) => ({ width: w }));

  const totalCols = allColWidths.length;
  const lastColLetter = ws.getColumn(totalCols).letter;

  // ── Title bar ──────────────────────────────────────────────────────────────
  const typeLabel = personTypes.length ? personTypes.map((t) => PT_LABEL[t] || t).join(", ") : "All Types";
  ws.mergeCells(`A1:${lastColLetter}1`);
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — BIOMETRIC ATTENDANCE (${typeLabel.toUpperCase()})`;
  r1.getCell(1).font = { name: DESIGN.fontName, size: 14, bold: true, color: { argb: DESIGN.colors.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells(`A2:${lastColLetter}2`);
  const r2 = ws.getRow(2); r2.height = 22;
  r2.getCell(1).value = `Period: ${monthLabel(from, to)}  |  ${persons.length} record${persons.length !== 1 ? "s" : ""}`;
  r2.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  ws.getRow(3).height = 6; // spacer

  // ── Two-row header ────────────────────────────────────────────────────────
  const dateRowNum = 4;
  const subRowNum  = 5;
  const dateRow = ws.getRow(dateRowNum); dateRow.height = 22;
  const subRow  = ws.getRow(subRowNum);  subRow.height  = 20;

  fixedCols.forEach((c, i) => {
    const colIdx = i + 1;
    const colLetter = ws.getColumn(colIdx).letter;
    ws.mergeCells(`${colLetter}${dateRowNum}:${colLetter}${subRowNum}`);
    const cell = dateRow.getCell(colIdx);
    cell.value = c.header;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
    subRow.getCell(colIdx).border = thinBorder;
    subRow.getCell(colIdx).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
  });

  dateRange.forEach((dateStr, dIdx) => {
    const inColIdx  = FIXED_COUNT + dIdx * 2 + 1;
    const outColIdx = FIXED_COUNT + dIdx * 2 + 2;
    const inLetter  = ws.getColumn(inColIdx).letter;
    const outLetter = ws.getColumn(outColIdx).letter;

    ws.mergeCells(`${inLetter}${dateRowNum}:${outLetter}${dateRowNum}`);
    const dateCell = dateRow.getCell(inColIdx);
    dateCell.value = shortDateLabel(dateStr);
    dateCell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    dateCell.alignment = { vertical: "middle", horizontal: "center" };
    dateCell.border = dateGroupBorder(false);
    dateRow.getCell(outColIdx).border = dateGroupBorder(true);
    dateRow.getCell(outColIdx).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };

    const inSub  = subRow.getCell(inColIdx);
    const outSub = subRow.getCell(outColIdx);
    inSub.value  = "In";
    outSub.value = "Out";
    [inSub, outSub].forEach((cell) => {
      cell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    inSub.border  = dateGroupBorder(false);
    outSub.border = dateGroupBorder(true);
  });

  const headerRowNum = subRowNum;

  // ── Data rows — one per person (any type) ─────────────────────────────────
  if (!persons.length) {
    ws.mergeCells(`A${headerRowNum + 1}:${lastColLetter}${headerRowNum + 1}`);
    const emptyRow = ws.getRow(headerRowNum + 1);
    emptyRow.getCell(1).value = "No punch records found for the selected date range / types.";
    emptyRow.getCell(1).font = { name: DESIGN.fontName, size: 11, italic: true, color: { argb: "9CA3AF" } };
    emptyRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
    emptyRow.height = 30;
  }

  persons.forEach((p, idx) => {
    const rowNum = headerRowNum + 1 + idx;
    const row = ws.getRow(rowNum); row.height = 20;
    const bg = idx % 2 === 1 ? DESIGN.colors.zebra : DESIGN.colors.white;

    const dayMap = new Map((p.days || []).map((d) => [d.date, d]));

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = PT_LABEL[p.personType] || p.personType || "—";
    row.getCell(3).value = p.name || "—";
    row.getCell(4).value = p.code || "—";
    row.getCell(5).value = p.bankName || "—";
    row.getCell(6).value = p.bankAccountNo || "—";
    row.getCell(7).value = p.ifscCode || "—";

    for (let i = 1; i <= 7; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: DESIGN.fontName, size: 10, bold: i === 3 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "center" : "left" };
    }
    // Type column colored like the on-screen badge
    row.getCell(2).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: PT_BADGE_COLOR[p.personType] || "374151" } };

    dateRange.forEach((dateStr, dIdx) => {
      const inColIdx  = FIXED_COUNT + dIdx * 2 + 1;
      const outColIdx = FIXED_COUNT + dIdx * 2 + 2;
      const d = dayMap.get(dateStr);

      const inCell  = row.getCell(inColIdx);
      const outCell = row.getCell(outColIdx);

      inCell.value  = d?.punchIn  || "—";
      outCell.value = d ? (d.punchOut || "No Exit") : "—";

      inCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      outCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      inCell.border  = dateGroupBorder(false);
      outCell.border = dateGroupBorder(true);
      inCell.alignment  = { vertical: "middle", horizontal: "center" };
      outCell.alignment = { vertical: "middle", horizontal: "center" };
      inCell.font  = { name: DESIGN.fontName, size: 9 };
      outCell.font = { name: DESIGN.fontName, size: 9 };

      if (d?.punchIn)  inCell.font  = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.green } };
      if (d?.punchOut) outCell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.red } };
      else if (d && !d.punchOut) outCell.font = { name: DESIGN.fontName, size: 9, italic: true, color: { argb: DESIGN.colors.amber } };
    });
  });

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