// client/src/admin/pages/teachers/utils/downloadTeachersExcel.js
// Download all teacher data as a beautifully formatted Excel workbook.
// Usage: downloadTeachersExcel(teachers, { schoolName })

const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:    "1C3044",
    secondary:  "27435B",
    accent:     "88BDF2",
    accentBg:   "EEF4F8",
    zebra:      "F7FAFC",
    white:      "FFFFFF",
    activeGreen:   "1E4620",
    activeGreenBg: "E8F5E9",
    leaveOrange:   "7C4A00",
    leaveBg:       "FFF3E0",
    resignedGray:  "374151",
    resignedBg:    "F3F4F6",
    terminatedRed: "7A1C1C",
    terminatedBg:  "FFEBEE",
    bankBlue:      "1E3A5F",
    bankBlueBg:    "E8F0FB",
    border:     "D0E1ED",
    totalBg:    "E1EDF5",
  },
};

const F = DESIGN.fontName;

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtStatus(status) {
  if (!status) return "—";
  const map = {
    ACTIVE: "✓ Active",
    ON_LEAVE: "⏸ On Leave",
    RESIGNED: "↩ Resigned",
    TERMINATED: "✗ Terminated",
  };
  return map[status] || status;
}

function fmtEmployment(type) {
  if (!type) return "—";
  const map = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    TEMPORARY: "Temporary",
  };
  return map[type] || type;
}

function fmtSalary(val) {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n; // return number so ExcelJS applies ₹ numFmt
}

function fmtBloodGroup(val) {
  if (!val) return "—";
  return val.replace("_POS", "+").replace("_NEG", "-");
}

function applyStatusStyle(cell, status) {
  const C = DESIGN.colors;
  const styles = {
    ACTIVE:     { bg: C.activeGreenBg,  font: C.activeGreen },
    ON_LEAVE:   { bg: C.leaveBg,        font: C.leaveOrange },
    RESIGNED:   { bg: C.resignedBg,     font: C.resignedGray },
    TERMINATED: { bg: C.terminatedBg,   font: C.terminatedRed },
  };
  const s = styles[status] || { bg: C.accentBg, font: C.primary };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.bg } };
  cell.font = { name: F, size: 9, bold: true, color: { argb: s.font } };
}

function makeThinBorder(C) {
  return {
    top:    { style: "thin", color: { argb: C.border } },
    left:   { style: "thin", color: { argb: C.border } },
    bottom: { style: "thin", color: { argb: C.border } },
    right:  { style: "thin", color: { argb: C.border } },
  };
}

// ── Main export ────────────────────────────────────────────────────────────────
export function downloadTeachersExcel(teachers = [], options = {}) {
  const { schoolName = "School" } = options;
  const run = (ExcelJS) => _generate(ExcelJS, teachers, schoolName);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload = () => run(window.ExcelJS);
    script.onerror = () => console.error("[downloadTeachersExcel] ExcelJS failed to load");
    document.head.appendChild(script);
  }
}

async function _generate(ExcelJS, teachers, schoolName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.created = new Date();

  const thinBorder = makeThinBorder(DESIGN.colors);

  _buildDetailSheet(workbook, teachers, schoolName, thinBorder);
  _buildBankSheet(workbook, teachers, schoolName, thinBorder);
  _buildSummarySheet(workbook, teachers, thinBorder);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const dateTag = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Teachers_${schoolName.replace(/\s+/g, "-")}_${dateTag}.xlsx`;
  link.click();
}

// ── Sheet 1: Teacher Records (profile + bank summary cols) ────────────────────
function _buildDetailSheet(workbook, teachers, schoolName, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Teacher Records", { views: [{ showGridLines: true }] });

  // 19 columns: 15 profile + 4 bank/finance
  ws.columns = [
    { width: 5  },  // #
    { width: 24 },  // Name
    { width: 28 },  // Email
    { width: 18 },  // Employee Code
    { width: 18 },  // Department
    { width: 20 },  // Designation
    { width: 16 },  // Employment Type
    { width: 14 },  // Status
    { width: 14 },  // Joining Date
    { width: 14 },  // Date of Birth
    { width: 12 },  // Gender
    { width: 16 },  // Phone
    { width: 14 },  // Blood Group
    { width: 20 },  // Qualification
    { width: 10 },  // Exp (yrs)
    { width: 16, style: { numFmt: '"₹"#,##0.00' } }, // Salary
    { width: 20 },  // Bank Name
    { width: 22 },  // Bank Account No
    { width: 16 },  // IFSC Code
  ];

  const TOTAL_COLS = 19;
  const lastCol = "S"; // column 19

  // Row 1: Title banner
  ws.mergeCells(`A1:${lastCol}1`);
  const r1 = ws.getRow(1); r1.height = 42;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — TEACHER DIRECTORY`;
  r1.getCell(1).font = { name: F, size: 15, bold: true, color: { argb: C.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Subtitle
  ws.mergeCells(`A2:${lastCol}2`);
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  r2.getCell(1).value = `Total: ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}   |   Generated: ${dateStr}`;
  r2.getCell(1).font = { name: F, size: 9, bold: true, color: { argb: C.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: group header labels
  ws.getRow(3).height = 18;
  // Profile group
  ws.mergeCells("A3:O3");
  const g1 = ws.getRow(3).getCell(1);
  g1.value = "PROFILE INFORMATION";
  g1.font  = { name: F, size: 9, bold: true, color: { argb: C.secondary } };
  g1.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.accentBg } };
  g1.alignment = { vertical: "middle", horizontal: "center" };
  // Bank group
  ws.mergeCells("P3:S3");
  const g2 = ws.getRow(3).getCell(16);
  g2.value = "BANK & FINANCE";
  g2.font  = { name: F, size: 9, bold: true, color: { argb: C.bankBlue } };
  g2.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.bankBlueBg } };
  g2.alignment = { vertical: "middle", horizontal: "center" };

  // Row 4: Column headers
  const HEADERS = [
    "#", "Full Name", "Email", "Employee Code", "Department",
    "Designation", "Employment Type", "Status", "Joining Date",
    "Date of Birth", "Gender", "Phone", "Blood Group", "Qualification", "Exp (yrs)",
    "Salary (₹)", "Bank Name", "Bank Account No", "IFSC Code",
  ];
  const r4 = ws.getRow(4); r4.height = 28;
  HEADERS.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value = h;
    cell.font  = { name: F, size: 10, bold: true, color: { argb: C.white } };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: i >= 15 ? C.bankBlue : C.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : i >= 15 ? "center" : "left" };
    cell.border = thinBorder;
  });

  // Data rows
  teachers.forEach((t, idx) => {
    const row = ws.getRow(idx + 5);
    row.height = 22;
    const bg   = idx % 2 === 1 ? C.zebra : C.white;
    const bgBk = idx % 2 === 1 ? "EDF4FC" : "F5F9FF"; // softer blue-tint for bank cols

    const name   = `${t.firstName || ""} ${t.lastName || ""}`.trim() || "—";
    const email  = t.user?.email || t.email || "—";
    const status = t.status || "ACTIVE";

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = name;
    row.getCell(3).value  = email;
    row.getCell(4).value  = t.employeeCode || "—";
    row.getCell(5).value  = t.department || "—";
    row.getCell(6).value  = t.designation || "—";
    row.getCell(7).value  = fmtEmployment(t.employmentType);
    row.getCell(8).value  = fmtStatus(status);
    row.getCell(9).value  = fmtDate(t.joiningDate);
    row.getCell(10).value = fmtDate(t.dateOfBirth);
    row.getCell(11).value = t.gender ? (t.gender.charAt(0) + t.gender.slice(1).toLowerCase()) : "—";
    row.getCell(12).value = t.phone || "—";
    row.getCell(13).value = fmtBloodGroup(t.bloodGroup);
    row.getCell(14).value = t.qualification || "—";
    row.getCell(15).value = t.experienceYears != null ? Number(t.experienceYears) : "—";
    // Bank & finance
    row.getCell(16).value = fmtSalary(t.salary);
    row.getCell(17).value = t.bankName || "—";
    row.getCell(18).value = t.bankAccountNo ? String(t.bankAccountNo) : "—";
    row.getCell(19).value = t.ifscCode || "—";

    // Style: profile columns
    for (let i = 1; i <= 15; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: F, size: 10, bold: i === 2 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 || i === 15 ? "center" : "left" };
    }
    // Style: bank columns
    for (let i = 16; i <= TOTAL_COLS; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgBk } };
      cell.font = { name: F, size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 16 ? "right" : "left" };
    }
    // Salary numFmt
    row.getCell(16).numFmt = '"₹"#,##0.00';
    // Colour-coded status
    applyStatusStyle(row.getCell(8), status);
  });

  // Footer row
  if (teachers.length > 0) {
    const fNum = teachers.length + 5;
    const footer = ws.getRow(fNum); footer.height = 26;
    ws.mergeCells(`A${fNum}:O${fNum}`);
    footer.getCell(1).value = `TOTAL — ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}`;

    const totalSalary = teachers.reduce((a, t) => a + (Number(t.salary) || 0), 0);
    footer.getCell(16).value  = totalSalary;
    footer.getCell(16).numFmt = '"₹"#,##0.00';

    const boldBorder = {
      top:    { style: "medium", color: { argb: C.secondary } },
      bottom: { style: "double", color: { argb: C.secondary } },
      left:   { style: "thin",   color: { argb: C.border } },
      right:  { style: "thin",   color: { argb: C.border } },
    };
    for (let i = 1; i <= TOTAL_COLS; i++) {
      const cell = footer.getCell(i);
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: i >= 16 ? "D6E8F8" : C.totalBg } };
      cell.font   = { name: F, size: 10, bold: true, color: { argb: i >= 16 ? C.bankBlue : C.primary } };
      cell.border = boldBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 16 ? "right" : "left" };
    }
  }
}

// ── Sheet 2: Bank & Finance details ───────────────────────────────────────────
function _buildBankSheet(workbook, teachers, schoolName, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Bank & Finance", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 5  },  // #
    { width: 24 },  // Name
    { width: 18 },  // Employee Code
    { width: 18 },  // Department
    { width: 16 },  // Employment Type
    { width: 14 },  // Status
    { width: 16, style: { numFmt: '"₹"#,##0.00' } }, // Salary
    { width: 22 },  // Bank Name
    { width: 24 },  // Bank Account No
    { width: 16 },  // IFSC Code
    { width: 18 },  // PAN Number
    { width: 18 },  // Aadhaar Number
  ];

  const TOTAL_COLS = 12;
  const lastCol = "L";

  // Row 1: Title
  ws.mergeCells(`A1:${lastCol}1`);
  const r1 = ws.getRow(1); r1.height = 42;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — BANK & FINANCE DETAILS`;
  r1.getCell(1).font = { name: F, size: 15, bold: true, color: { argb: C.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.bankBlue } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Subtitle
  ws.mergeCells(`A2:${lastCol}2`);
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const withBank = teachers.filter(t => t.bankAccountNo || t.bankName).length;
  r2.getCell(1).value = `${teachers.length} teachers   |   ${withBank} with bank details   |   Generated: ${dateStr}`;
  r2.getCell(1).font = { name: F, size: 9, bold: true, color: { argb: C.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: Confidentiality notice
  ws.mergeCells(`A3:${lastCol}3`);
  const r3 = ws.getRow(3); r3.height = 20;
  r3.getCell(1).value = "⚠  CONFIDENTIAL — This sheet contains sensitive financial and identification data. Handle with care.";
  r3.getCell(1).font  = { name: F, size: 9, bold: true, color: { argb: "7A1C1C" } };
  r3.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E0" } };
  r3.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 4: blank spacer
  ws.getRow(4).height = 6;

  // Row 5: Column headers
  const HEADERS = [
    "#", "Full Name", "Employee Code", "Department", "Employment Type", "Status",
    "Salary (₹)", "Bank Name", "Bank Account No", "IFSC Code", "PAN Number", "Aadhaar Number",
  ];
  const r5 = ws.getRow(5); r5.height = 28;
  HEADERS.forEach((h, i) => {
    const cell = r5.getCell(i + 1);
    cell.value = h;
    cell.font  = { name: F, size: 10, bold: true, color: { argb: C.white } };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.bankBlue } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 || i === 6 ? "center" : "left" };
    cell.border = thinBorder;
  });

  // Data rows
  teachers.forEach((t, idx) => {
    const row = ws.getRow(idx + 6);
    row.height = 22;
    const bg   = idx % 2 === 1 ? "EDF4FC" : C.white;
    const status = t.status || "ACTIVE";
    const name   = `${t.firstName || ""} ${t.lastName || ""}`.trim() || "—";

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = name;
    row.getCell(3).value  = t.employeeCode || "—";
    row.getCell(4).value  = t.department || "—";
    row.getCell(5).value  = fmtEmployment(t.employmentType);
    row.getCell(6).value  = fmtStatus(status);
    row.getCell(7).value  = fmtSalary(t.salary);
    row.getCell(8).value  = t.bankName || "—";
    row.getCell(9).value  = t.bankAccountNo ? String(t.bankAccountNo) : "—";
    row.getCell(10).value = t.ifscCode || "—";
    row.getCell(11).value = t.panNumber || "—";
    row.getCell(12).value = t.aadhaarNumber ? String(t.aadhaarNumber) : "—";

    for (let i = 1; i <= TOTAL_COLS; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: F, size: 10, bold: i === 2 };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 1 ? "center" : i === 7 ? "right" : "left",
      };
    }
    row.getCell(7).numFmt = '"₹"#,##0.00';
    applyStatusStyle(row.getCell(6), status);

    // Highlight missing bank details with a soft warning tint
    if (!t.bankAccountNo && !t.bankName) {
      for (let i = 8; i <= 10; i++) {
        row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9E6" } };
        row.getCell(i).font = { name: F, size: 10, color: { argb: "A0522D" }, italic: true };
      }
    }
  });

  // Footer
  if (teachers.length > 0) {
    const fNum = teachers.length + 6;
    const footer = ws.getRow(fNum); footer.height = 28;
    ws.mergeCells(`A${fNum}:F${fNum}`);
    footer.getCell(1).value = `TOTAL — ${teachers.length} teacher${teachers.length !== 1 ? "s" : ""}  |  ${withBank} with bank details`;

    const totalSalary = teachers.reduce((a, t) => a + (Number(t.salary) || 0), 0);
    footer.getCell(7).value  = totalSalary;
    footer.getCell(7).numFmt = '"₹"#,##0.00';

    const boldBorder = {
      top:    { style: "medium", color: { argb: C.bankBlue } },
      bottom: { style: "double", color: { argb: C.bankBlue } },
      left:   { style: "thin",   color: { argb: C.border } },
      right:  { style: "thin",   color: { argb: C.border } },
    };
    for (let i = 1; i <= TOTAL_COLS; i++) {
      const cell = footer.getCell(i);
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "D6E8F8" } };
      cell.font   = { name: F, size: 10, bold: true, color: { argb: C.bankBlue } };
      cell.border = boldBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 || i === 7 ? "right" : "left" };
    }

    // KPI row: salary stats
    const sals = teachers.map(t => Number(t.salary) || 0).filter(s => s > 0);
    const avgSal = sals.length ? (totalSalary / sals.length) : 0;
    const maxSal = sals.length ? Math.max(...sals) : 0;
    const minSal = sals.length ? Math.min(...sals) : 0;

    const kpiStartRow = fNum + 2;
    ws.mergeCells(`A${kpiStartRow}:L${kpiStartRow}`);
    const kpiTitle = ws.getRow(kpiStartRow); kpiTitle.height = 22;
    kpiTitle.getCell(1).value = "KEY METRICS";
    kpiTitle.getCell(1).font  = { name: F, size: 10, bold: true, color: { argb: C.white } };
    kpiTitle.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
    kpiTitle.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

    const kpis = [
      ["Total Salary Outflow",     `₹${totalSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Average Salary",           `₹${avgSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Highest Salary",           `₹${maxSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Lowest Salary",            `₹${minSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Teachers with Bank Info",  `${withBank} of ${teachers.length}`],
      ["Missing Bank Details",     `${teachers.length - withBank} teacher${teachers.length - withBank !== 1 ? "s" : ""}`],
    ];

    kpis.forEach(([label, val], ki) => {
      const rowNum = kpiStartRow + 1 + ki;
      const row = ws.getRow(rowNum); row.height = 22;
      ws.mergeCells(`C${rowNum}:L${rowNum}`);
      row.getCell(1).value = label;
      row.getCell(3).value = val;
      const bg = ki % 2 === 0 ? C.white : "F0F7FF";
      for (let i = 1; i <= TOTAL_COLS; i++) {
        const cell = row.getCell(i);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.border = thinBorder;
        cell.font = { name: F, size: 10, bold: i === 1 };
        cell.alignment = { vertical: "middle", horizontal: i <= 2 ? "left" : "left" };
      }
    });
  }
}

// ── Sheet 3: Summary ───────────────────────────────────────────────────────────
function _buildSummarySheet(workbook, teachers, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Summary", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 32 },
    { width: 20, style: { alignment: { horizontal: "right" } } },
  ];

  // Title
  ws.mergeCells("A1:B1");
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = "TEACHER SUMMARY";
  r1.getCell(1).font = { name: F, size: 13, bold: true, color: { argb: C.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  ["Category", "Count"].forEach((h, i) => {
    const cell = ws.getRow(2).getCell(i + 1);
    cell.value = h;
    cell.font = { name: F, size: 10, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    cell.border = thinBorder;
  });
  ws.getRow(2).height = 24;

  const byStatus = (s) => teachers.filter((t) => (t.status || "ACTIVE") === s).length;
  const byEmp    = (e) => teachers.filter((t) => t.employmentType === e).length;
  const byGender = (g) => teachers.filter((t) => t.gender === g).length;
  const byDept   = {};
  teachers.forEach((t) => {
    const d = t.department || "Unassigned";
    byDept[d] = (byDept[d] || 0) + 1;
  });
  const withBank = teachers.filter(t => t.bankAccountNo || t.bankName).length;

  const sections = [
    { label: "── BY STATUS ──", isHeader: true },
    { label: "✓ Active",       value: byStatus("ACTIVE"),     status: "ACTIVE" },
    { label: "⏸ On Leave",     value: byStatus("ON_LEAVE"),   status: "ON_LEAVE" },
    { label: "↩ Resigned",     value: byStatus("RESIGNED"),   status: "RESIGNED" },
    { label: "✗ Terminated",   value: byStatus("TERMINATED"), status: "TERMINATED" },
    { label: "── TOTAL ──",    value: teachers.length,        isTotal: true },

    { label: "", isSpace: true },

    { label: "── BY EMPLOYMENT TYPE ──", isHeader: true },
    { label: "Full Time",  value: byEmp("FULL_TIME") },
    { label: "Part Time",  value: byEmp("PART_TIME") },
    { label: "Contract",   value: byEmp("CONTRACT") },
    { label: "Temporary",  value: byEmp("TEMPORARY") },

    { label: "", isSpace: true },

    { label: "── BY GENDER ──", isHeader: true },
    { label: "Male",   value: byGender("MALE") },
    { label: "Female", value: byGender("FEMALE") },
    { label: "Other",  value: byGender("OTHER") },

    { label: "", isSpace: true },

    { label: "── BANK DETAILS ──", isHeader: true },
    { label: "With Bank Info",    value: withBank },
    { label: "Missing Bank Info", value: teachers.length - withBank },

    { label: "", isSpace: true },

    { label: "── BY DEPARTMENT ──", isHeader: true },
    ...Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({ label: dept, value: count })),
  ];

  sections.forEach((item, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum); row.height = 22;

    if (item.isSpace) { row.height = 10; return; }

    ws.mergeCells(`A${rowNum}:B${rowNum}`);

    if (item.isHeader) {
      row.getCell(1).value = item.label;
      row.getCell(1).font  = { name: F, size: 9, bold: true, color: { argb: C.secondary } };
      row.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.accentBg } };
      row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      return;
    }

    try { ws.unMergeCells(`A${rowNum}:B${rowNum}`); } catch (_) {}

    const bg = idx % 2 === 0 ? C.white : C.zebra;
    row.getCell(1).value = item.label;
    row.getCell(2).value = item.value ?? "";

    if (item.isTotal) {
      for (let i = 1; i <= 2; i++) {
        row.getCell(i).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
        row.getCell(i).font   = { name: F, size: 11, bold: true, color: { argb: C.primary } };
        row.getCell(i).border = {
          top:    { style: "medium", color: { argb: C.secondary } },
          bottom: { style: "double", color: { argb: C.secondary } },
          left:   thinBorder.left, right: thinBorder.right,
        };
        row.getCell(i).alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "right" };
      }
    } else if (item.status) {
      applyStatusStyle(row.getCell(1), item.status);
      row.getCell(1).border = thinBorder;
      row.getCell(2).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      row.getCell(2).font   = { name: F, size: 10 };
      row.getCell(2).border = thinBorder;
      row.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    } else {
      for (let i = 1; i <= 2; i++) {
        row.getCell(i).fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        row.getCell(i).font   = { name: F, size: 10 };
        row.getCell(i).border = thinBorder;
        row.getCell(i).alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "right" };
      }
    }
  });
}