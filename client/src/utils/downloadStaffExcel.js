// client/src/utils/downloadStaffExcel.js
// Download all staff (Group B / Group C) data as a beautifully formatted Excel workbook.
// Usage: downloadStaffExcel(staff, { schoolName })

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
    groupBBg:   "E8F0FB",
    groupCBg:   "EEF4F8",
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
    INACTIVE: "✗ Inactive",
  };
  return map[status] || status;
}

function fmtSalary(val) {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n; // return number so ExcelJS applies ₹ numFmt
}

function applyStatusStyle(cell, status) {
  const C = DESIGN.colors;
  const styles = {
    ACTIVE:     { bg: C.activeGreenBg,  font: C.activeGreen },
    ON_LEAVE:   { bg: C.leaveBg,        font: C.leaveOrange },
    RESIGNED:   { bg: C.resignedBg,     font: C.resignedGray },
    TERMINATED: { bg: C.terminatedBg,   font: C.terminatedRed },
    INACTIVE:   { bg: C.resignedBg,     font: C.resignedGray },
  };
  const s = styles[status] || { bg: C.accentBg, font: C.primary };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: s.bg } };
  cell.font = { name: F, size: 9, bold: true, color: { argb: s.font } };
}

function applyGroupStyle(cell, group) {
  const C = DESIGN.colors;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: group === "Group C" ? C.groupCBg : C.groupBBg } };
  cell.font = { name: F, size: 9, bold: true, color: { argb: C.secondary } };
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
export function downloadStaffExcel(staff = [], options = {}) {
  const { schoolName = "School" } = options;
  const run = (ExcelJS) => _generate(ExcelJS, staff, schoolName);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload = () => run(window.ExcelJS);
    script.onerror = () => console.error("[downloadStaffExcel] ExcelJS failed to load");
    document.head.appendChild(script);
  }
}

async function _generate(ExcelJS, staff, schoolName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.created = new Date();

  const thinBorder = makeThinBorder(DESIGN.colors);

  _buildDetailSheet(workbook, staff, schoolName, thinBorder);
  _buildBankSheet(workbook, staff, schoolName, thinBorder);
  _buildSummarySheet(workbook, staff, thinBorder);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const dateTag = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Staff_${schoolName.replace(/\s+/g, "-")}_${dateTag}.xlsx`;
  link.click();
}

// ── Sheet 1: Staff Records (profile + bank summary cols) ──────────────────────
function _buildDetailSheet(workbook, staff, schoolName, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Staff Records", { views: [{ showGridLines: true }] });

  // 15 columns: 11 profile + 4 bank/finance
  ws.columns = [
    { width: 5  },  // #
    { width: 24 },  // Name
    { width: 18 },  // Employee Code
    { width: 28 },  // Email
    { width: 16 },  // Phone
    { width: 20 },  // Role
    { width: 12 },  // Group
    { width: 14 },  // Status
    { width: 14 },  // Joining Date
    { width: 12 },  // Login Access
    { width: 16, style: { numFmt: '"₹"#,##0.00' } }, // Salary
    { width: 20 },  // Bank Name
    { width: 22 },  // Bank Account No
    { width: 16 },  // IFSC Code
  ];

  const TOTAL_COLS = 14;
  const lastCol = "N"; // column 14

  // Row 1: Title banner
  ws.mergeCells(`A1:${lastCol}1`);
  const r1 = ws.getRow(1); r1.height = 42;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — STAFF DIRECTORY`;
  r1.getCell(1).font = { name: F, size: 15, bold: true, color: { argb: C.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Subtitle
  ws.mergeCells(`A2:${lastCol}2`);
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  r2.getCell(1).value = `Total: ${staff.length} staff member${staff.length !== 1 ? "s" : ""}   |   Generated: ${dateStr}`;
  r2.getCell(1).font = { name: F, size: 9, bold: true, color: { argb: C.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: group header labels
  ws.getRow(3).height = 18;
  // Profile group
  ws.mergeCells("A3:J3");
  const g1 = ws.getRow(3).getCell(1);
  g1.value = "PROFILE INFORMATION";
  g1.font  = { name: F, size: 9, bold: true, color: { argb: C.secondary } };
  g1.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.accentBg } };
  g1.alignment = { vertical: "middle", horizontal: "center" };
  // Bank group
  ws.mergeCells("K3:N3");
  const g2 = ws.getRow(3).getCell(11);
  g2.value = "BANK & FINANCE";
  g2.font  = { name: F, size: 9, bold: true, color: { argb: C.bankBlue } };
  g2.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.bankBlueBg } };
  g2.alignment = { vertical: "middle", horizontal: "center" };

  // Row 4: Column headers
  const HEADERS = [
    "#", "Full Name", "Employee Code", "Email", "Phone",
    "Role", "Group", "Status", "Joining Date", "Login Access",
    "Salary (₹)", "Bank Name", "Bank Account No", "IFSC Code",
  ];
  const r4 = ws.getRow(4); r4.height = 28;
  HEADERS.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value = h;
    cell.font  = { name: F, size: 10, bold: true, color: { argb: C.white } };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: i >= 10 ? C.bankBlue : C.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : i >= 10 ? "center" : "left" };
    cell.border = thinBorder;
  });

  // Data rows
  staff.forEach((s, idx) => {
    const row = ws.getRow(idx + 5);
    row.height = 22;
    const bg   = idx % 2 === 1 ? C.zebra : C.white;
    const bgBk = idx % 2 === 1 ? "EDF4FC" : "F5F9FF"; // softer blue-tint for bank cols

    const name   = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "—";
    const status = s.status || "ACTIVE";
    const hasLogin = !!s.user;

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = name;
    row.getCell(3).value  = s.employeeCode || "—";
    row.getCell(4).value  = s.user?.email || s.email || "—";
    row.getCell(5).value  = s.phone || "—";
    row.getCell(6).value  = s.role || "—";
    row.getCell(7).value  = s.groupType || "—";
    row.getCell(8).value  = fmtStatus(status);
    row.getCell(9).value  = fmtDate(s.joiningDate);
    row.getCell(10).value = hasLogin ? (s.user?.isActive ? "Active" : "Disabled") : "No Login";
    // Bank & finance
    row.getCell(11).value = fmtSalary(s.basicSalary);
    row.getCell(12).value = s.bankName || "—";
    row.getCell(13).value = s.bankAccountNo ? String(s.bankAccountNo) : "—";
    row.getCell(14).value = s.ifscCode || "—";

    // Style: profile columns
    for (let i = 1; i <= 10; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: F, size: 10, bold: i === 2 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "center" : i === 10 ? "center" : "left" };
    }
    // Style: bank columns
    for (let i = 11; i <= TOTAL_COLS; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgBk } };
      cell.font = { name: F, size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 11 ? "right" : "left" };
    }
    // Salary numFmt
    row.getCell(11).numFmt = '"₹"#,##0.00';
    // Colour-coded status & group
    applyStatusStyle(row.getCell(8), status);
    applyGroupStyle(row.getCell(7), s.groupType);
  });

  // Footer row
  if (staff.length > 0) {
    const fNum = staff.length + 5;
    const footer = ws.getRow(fNum); footer.height = 26;
    ws.mergeCells(`A${fNum}:J${fNum}`);
    footer.getCell(1).value = `TOTAL — ${staff.length} staff member${staff.length !== 1 ? "s" : ""}`;

    const totalSalary = staff.reduce((a, s) => a + (Number(s.basicSalary) || 0), 0);
    footer.getCell(11).value  = totalSalary;
    footer.getCell(11).numFmt = '"₹"#,##0.00';

    const boldBorder = {
      top:    { style: "medium", color: { argb: C.secondary } },
      bottom: { style: "double", color: { argb: C.secondary } },
      left:   { style: "thin",   color: { argb: C.border } },
      right:  { style: "thin",   color: { argb: C.border } },
    };
    for (let i = 1; i <= TOTAL_COLS; i++) {
      const cell = footer.getCell(i);
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: i >= 11 ? "D6E8F8" : C.totalBg } };
      cell.font   = { name: F, size: 10, bold: true, color: { argb: i >= 11 ? C.bankBlue : C.primary } };
      cell.border = boldBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 11 ? "right" : "left" };
    }
  }
}

// ── Sheet 2: Bank & Finance details ───────────────────────────────────────────
function _buildBankSheet(workbook, staff, schoolName, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Bank & Finance", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 5  },  // #
    { width: 24 },  // Name
    { width: 18 },  // Employee Code
    { width: 20 },  // Role
    { width: 12 },  // Group
    { width: 14 },  // Status
    { width: 16, style: { numFmt: '"₹"#,##0.00' } }, // Salary
    { width: 22 },  // Bank Name
    { width: 24 },  // Bank Account No
    { width: 16 },  // IFSC Code
  ];

  const TOTAL_COLS = 10;
  const lastCol = "J";

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
  const withBank = staff.filter(s => s.bankAccountNo || s.bankName).length;
  r2.getCell(1).value = `${staff.length} staff   |   ${withBank} with bank details   |   Generated: ${dateStr}`;
  r2.getCell(1).font = { name: F, size: 9, bold: true, color: { argb: C.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: Confidentiality notice
  ws.mergeCells(`A3:${lastCol}3`);
  const r3 = ws.getRow(3); r3.height = 20;
  r3.getCell(1).value = "⚠  CONFIDENTIAL — This sheet contains sensitive financial data. Handle with care.";
  r3.getCell(1).font  = { name: F, size: 9, bold: true, color: { argb: "7A1C1C" } };
  r3.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E0" } };
  r3.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 4: blank spacer
  ws.getRow(4).height = 6;

  // Row 5: Column headers
  const HEADERS = [
    "#", "Full Name", "Employee Code", "Role", "Group", "Status",
    "Salary (₹)", "Bank Name", "Bank Account No", "IFSC Code",
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
  staff.forEach((s, idx) => {
    const row = ws.getRow(idx + 6);
    row.height = 22;
    const bg   = idx % 2 === 1 ? "EDF4FC" : C.white;
    const status = s.status || "ACTIVE";
    const name   = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "—";

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = name;
    row.getCell(3).value  = s.employeeCode || "—";
    row.getCell(4).value  = s.role || "—";
    row.getCell(5).value  = s.groupType || "—";
    row.getCell(6).value  = fmtStatus(status);
    row.getCell(7).value  = fmtSalary(s.basicSalary);
    row.getCell(8).value  = s.bankName || "—";
    row.getCell(9).value  = s.bankAccountNo ? String(s.bankAccountNo) : "—";
    row.getCell(10).value = s.ifscCode || "—";

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
    if (!s.bankAccountNo && !s.bankName) {
      for (let i = 8; i <= 9; i++) {
        row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9E6" } };
        row.getCell(i).font = { name: F, size: 10, color: { argb: "A0522D" }, italic: true };
      }
    }
  });

  // Footer
  if (staff.length > 0) {
    const fNum = staff.length + 6;
    const footer = ws.getRow(fNum); footer.height = 28;
    ws.mergeCells(`A${fNum}:E${fNum}`);
    footer.getCell(1).value = `TOTAL — ${staff.length} staff  |  ${withBank} with bank details`;

    const totalSalary = staff.reduce((a, s) => a + (Number(s.basicSalary) || 0), 0);
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
    const sals = staff.map(s => Number(s.basicSalary) || 0).filter(v => v > 0);
    const avgSal = sals.length ? (totalSalary / sals.length) : 0;
    const maxSal = sals.length ? Math.max(...sals) : 0;
    const minSal = sals.length ? Math.min(...sals) : 0;

    const kpiStartRow = fNum + 2;
    ws.mergeCells(`A${kpiStartRow}:J${kpiStartRow}`);
    const kpiTitle = ws.getRow(kpiStartRow); kpiTitle.height = 22;
    kpiTitle.getCell(1).value = "KEY METRICS";
    kpiTitle.getCell(1).font  = { name: F, size: 10, bold: true, color: { argb: C.white } };
    kpiTitle.getCell(1).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: C.secondary } };
    kpiTitle.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

    const kpis = [
      ["Total Salary Outflow",   `₹${totalSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Average Salary",         `₹${avgSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Highest Salary",         `₹${maxSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Lowest Salary",          `₹${minSal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
      ["Staff with Bank Info",   `${withBank} of ${staff.length}`],
      ["Missing Bank Details",   `${staff.length - withBank} staff member${staff.length - withBank !== 1 ? "s" : ""}`],
    ];

    kpis.forEach(([label, val], ki) => {
      const rowNum = kpiStartRow + 1 + ki;
      const row = ws.getRow(rowNum); row.height = 22;
      ws.mergeCells(`C${rowNum}:J${rowNum}`);
      row.getCell(1).value = label;
      row.getCell(3).value = val;
      const bg = ki % 2 === 0 ? C.white : "F0F7FF";
      for (let i = 1; i <= TOTAL_COLS; i++) {
        const cell = row.getCell(i);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.border = thinBorder;
        cell.font = { name: F, size: 10, bold: i === 1 };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });
  }
}

// ── Sheet 3: Summary ───────────────────────────────────────────────────────────
function _buildSummarySheet(workbook, staff, thinBorder) {
  const C = DESIGN.colors;
  const ws = workbook.addWorksheet("Summary", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 32 },
    { width: 20, style: { alignment: { horizontal: "right" } } },
  ];

  // Title
  ws.mergeCells("A1:B1");
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = "STAFF SUMMARY";
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

  const byStatus = (s) => staff.filter((t) => (t.status || "ACTIVE") === s).length;
  const byGroup  = (g) => staff.filter((t) => t.groupType === g).length;
  const byRole   = {};
  staff.forEach((t) => {
    const r = t.role || "Unassigned";
    byRole[r] = (byRole[r] || 0) + 1;
  });
  const withBank  = staff.filter(t => t.bankAccountNo || t.bankName).length;
  const withLogin = staff.filter(t => !!t.user).length;
  const withCode  = staff.filter(t => t.employeeCode).length;

  const sections = [
    { label: "── BY STATUS ──", isHeader: true },
    { label: "✓ Active",       value: byStatus("ACTIVE"),     status: "ACTIVE" },
    { label: "⏸ On Leave",     value: byStatus("ON_LEAVE"),   status: "ON_LEAVE" },
    { label: "↩ Resigned",     value: byStatus("RESIGNED"),   status: "RESIGNED" },
    { label: "✗ Terminated",   value: byStatus("TERMINATED"), status: "TERMINATED" },
    { label: "── TOTAL ──",    value: staff.length,           isTotal: true },

    { label: "", isSpace: true },

    { label: "── BY GROUP ──", isHeader: true },
    { label: "Group B", value: byGroup("Group B") },
    { label: "Group C", value: byGroup("Group C") },

    { label: "", isSpace: true },

    { label: "── LOGIN & ID ──", isHeader: true },
    { label: "With Login Access",  value: withLogin },
    { label: "Without Login",      value: staff.length - withLogin },
    { label: "With Employee Code", value: withCode },

    { label: "", isSpace: true },

    { label: "── BANK DETAILS ──", isHeader: true },
    { label: "With Bank Info",    value: withBank },
    { label: "Missing Bank Info", value: staff.length - withBank },

    { label: "", isSpace: true },

    { label: "── BY ROLE ──", isHeader: true },
    ...Object.entries(byRole)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ label: role, value: count })),
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