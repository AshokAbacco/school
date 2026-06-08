// client\src\utils\downloadStaffSalaryExcel.js
// Drop into your finance/utils/ folder.
// Usage: downloadStaffSalaryExcel(salaryList, { filter: "ALL" | "PAID" | "PENDING" | "HOLD", groupLabel, schoolName })

const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:     "1C3044",
    secondary:   "27435B",
    accent:      "EEF4F8",
    zebra:       "F7FAFC",
    white:       "FFFFFF",
    paidGreen:   "1E4620",
    paidGreenBg: "E8F5E9",
    holdOrange:  "7C4A00",
    holdBg:      "FFF3E0",
    pendingAmber:"6B4800",
    pendingBg:   "FFFDE7",
    dueRed:      "7A1C1C",
    dueRedBg:    "FFEBEE",
    border:      "D0E1ED",
    totalBg:     "E1EDF5",
  }
};

const fmt = (n) => Number(n || 0);
const monthName = (n) => new Date(0, n - 1).toLocaleString("default", { month: "long" });

function getStatusLabel(status) {
  if (status === "PAID") return "✓ PAID";
  if (status === "HOLD") return "⏸ HOLD";
  return "⏳ PENDING";
}

function applyStatusStyle(cell, status) {
  if (status === "PAID") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.paidGreenBg } };
    cell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.paidGreen } };
  } else if (status === "HOLD") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.holdBg } };
    cell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.holdOrange } };
  } else {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.pendingBg } };
    cell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.pendingAmber } };
  }
}

function getStaffName(r) {
  return r.staffName || r.adminName || r.financeName ||
    (r.staff ? `${r.staff.firstName || ""} ${r.staff.lastName || ""}`.trim() : "") ||
    (r.admin ? r.admin.name : "") ||
    (r.teacher ? `${r.teacher.firstName || ""} ${r.teacher.lastName || ""}`.trim() : "") ||
    "—";
}

function getStaffEmail(r) {
  return r.staffEmail || r.adminEmail || r.financeEmail ||
    r.staff?.email || r.admin?.email || r.teacher?.user?.email || "—";
}

function getStaffRole(r) {
  return r.staffRole || r.admin?.designation || r.teacher?.department ||
    r.staff?.role || r._userType || "—";
}

export function downloadStaffSalaryExcel(salaryList, options = {}) {

  console.log("DOWNLOAD CLICKED");
  console.log("Salary List:", salaryList);

  const { filter = "ALL", groupLabel = "Staff", schoolName = "School" } = options;

  const filtered =
    filter === "ALL"
      ? salaryList
      : salaryList.filter(r => r.status === filter);

  console.log("Filtered Records:", filtered);

  const run = (ExcelJS) =>
    _generate(
      ExcelJS,
      filtered,
      filter,
      groupLabel,
      schoolName
    );

  if (window.ExcelJS) {

    console.log("ExcelJS already loaded");

    run(window.ExcelJS);

  } else {

    console.log("Loading ExcelJS...");

    const script =
      document.createElement("script");

    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";

    script.onload = () => {

      console.log("ExcelJS Loaded Successfully");

      run(window.ExcelJS);
    };

    script.onerror = () => {

      console.error("ExcelJS FAILED TO LOAD");
    };

    document.head.appendChild(script);
  }
}

async function _generate(ExcelJS, records, filter, groupLabel, schoolName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;

  const thinBorder = {
    top:    { style: "thin", color: { argb: DESIGN.colors.border } },
    left:   { style: "thin", color: { argb: DESIGN.colors.border } },
    bottom: { style: "thin", color: { argb: DESIGN.colors.border } },
    right:  { style: "thin", color: { argb: DESIGN.colors.border } },
  };

  // ── Sheet 1: Detailed Records ─────────────────────────────────────────────
  _buildDetailSheet(workbook, records, filter, groupLabel, schoolName, thinBorder);

  // ── Sheet 2: Summary ──────────────────────────────────────────────────────
  _buildSummarySheet(workbook, records, groupLabel, thinBorder);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const today = new Date().toISOString().slice(0, 10);
  const filterTag = filter === "ALL" ? "All" : filter === "PAID" ? "Paid" : filter === "HOLD" ? "OnHold" : "Pending";
  const groupTag = groupLabel.replace(/\s+/g, "-");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Salary_${groupTag}_${filterTag}_${today}.xlsx`;
  link.click();
}

function _buildDetailSheet(workbook, records, filter, groupLabel, schoolName, thinBorder) {
  const filterLabel = filter === "ALL" ? "All Statuses" : filter === "PAID" ? "Paid Only" : filter === "HOLD" ? "On Hold" : "Pending Only";
  const ws = workbook.addWorksheet("Salary Records", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 5,  style: { alignment: { horizontal: "center" } } },
    { width: 26 },
    { width: 28 },
    { width: 20 },
    { width: 16, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 14, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 16, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 13, style: { alignment: { horizontal: "center" } } },
    { width: 16, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 14, style: { alignment: { horizontal: "center" } } },
    { width: 16, style: { alignment: { horizontal: "center" } } },
    { width: 14, style: { alignment: { horizontal: "center" } } },
  ];

  // Row 1: School title
  ws.mergeCells("A1:L1");
  const r1 = ws.getRow(1); r1.height = 40;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — ${groupLabel.toUpperCase()} SALARY LEDGER`;
  r1.getCell(1).font = { name: DESIGN.fontName, size: 15, bold: true, color: { argb: DESIGN.colors.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 2: Filter/date subtitle
  ws.mergeCells("A2:L2");
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  r2.getCell(1).value = `Filter: ${filterLabel}  |  ${records.length} records  |  Generated: ${dateStr}`;
  r2.getCell(1).font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.white } };
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Row 3: spacer
  ws.getRow(3).height = 8;

  // Row 4: Column headers
  const HEADERS = ["#", "Name", "Email", "Role / Dept", "Basic Salary", "Bonus", "Deductions", "Leave Days", "Net Salary", "Month / Year", "Payment Date", "Status"];
  const r4 = ws.getRow(4); r4.height = 28;
  HEADERS.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value = h;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
    cell.alignment = { vertical: "middle", horizontal: i <= 1 ? "left" : (i >= 4 && i <= 8 ? "right" : "center"), wrapText: true };
    cell.border = thinBorder;
  });

  // Data rows
  records.forEach((r, idx) => {
    const rowNum = idx + 5;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const isAlt = idx % 2 === 1;
    const bg = isAlt ? DESIGN.colors.zebra : DESIGN.colors.white;

    const name    = getStaffName(r);
    const email   = getStaffEmail(r);
    const role    = getStaffRole(r);
    const basic   = fmt(r.basicSalary);
    const bonus   = fmt(r.bonus);
    const deduct  = fmt(r.deductions);
    const leaves  = r.leaveDays ?? 0;
    const net     = fmt(r.netSalary);
    const period  = r.month && r.year ? `${monthName(r.month)} ${r.year}` : "—";
    const payDate = r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("en-IN") : "—";
    const status  = r.status || "PENDING";

    row.getCell(1).value  = idx + 1;
    row.getCell(2).value  = name;
    row.getCell(3).value  = email;
    row.getCell(4).value  = role;
    row.getCell(5).value  = basic;
    row.getCell(6).value  = bonus;
    row.getCell(7).value  = deduct;
    row.getCell(8).value  = `${leaves} day${leaves !== 1 ? "s" : ""}`;
    row.getCell(9).value  = net;
    row.getCell(10).value = period;
    row.getCell(11).value = payDate;
    row.getCell(12).value = getStatusLabel(status);

    for (let i = 1; i <= 12; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font = { name: DESIGN.fontName, size: 10, bold: i === 2 };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: i <= 2 ? "left" : i === 3 ? "left" : (i >= 5 && i <= 9 ? "right" : "center"),
      };
    }

    // Bonus green
    if (bonus > 0) {
      row.getCell(6).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.paidGreen } };
    }
    // Deduction red
    if (deduct > 0) {
      row.getCell(7).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.dueRed } };
    }
    // Net salary bold
    row.getCell(9).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };

    // Status pill
    applyStatusStyle(row.getCell(12), status);
  });

  // Footer totals
  const footerRowNum = records.length + 5;
  const footer = ws.getRow(footerRowNum);
  footer.height = 26;

  const totBasic  = records.reduce((a, r) => a + fmt(r.basicSalary), 0);
  const totBonus  = records.reduce((a, r) => a + fmt(r.bonus), 0);
  const totDeduct = records.reduce((a, r) => a + fmt(r.deductions), 0);
  const totNet    = records.reduce((a, r) => a + fmt(r.netSalary), 0);

  footer.getCell(1).value = "TOTALS";
  footer.getCell(2).value = `${records.length} records`;
  footer.getCell(5).value = totBasic;
  footer.getCell(6).value = totBonus;
  footer.getCell(7).value = totDeduct;
  footer.getCell(9).value = totNet;

  const boldBorder = {
    top:    { style: "medium", color: { argb: DESIGN.colors.secondary } },
    bottom: { style: "double", color: { argb: DESIGN.colors.secondary } },
    left:   { style: "thin",   color: { argb: DESIGN.colors.border } },
    right:  { style: "thin",   color: { argb: DESIGN.colors.border } },
  };
  for (let i = 1; i <= 12; i++) {
    const cell = footer.getCell(i);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border = boldBorder;
    cell.alignment = { vertical: "middle", horizontal: i <= 2 ? "left" : (i >= 5 && i <= 9 ? "right" : "center") };
  }
  footer.getCell(6).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.paidGreen } };
  footer.getCell(7).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.dueRed } };
  footer.getCell(9).font = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.primary } };
}

function _buildSummarySheet(workbook, records, groupLabel, thinBorder) {
  const ws = workbook.addWorksheet("Summary", { views: [{ showGridLines: true }] });
  ws.columns = [
    { width: 30 },
    { width: 20, style: { alignment: { horizontal: "center" } } },
    { width: 24, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
  ];

  // Title
  ws.mergeCells("A1:C1");
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = `${groupLabel.toUpperCase()} — SALARY SUMMARY`;
  r1.getCell(1).font = { name: DESIGN.fontName, size: 13, bold: true, color: { argb: DESIGN.colors.white } };
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } };
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

  // Sub header
  const subHeaders = ["Category", "Count / Value", "Total Payout (₹)"];
  const r2 = ws.getRow(2); r2.height = 24;
  subHeaders.forEach((h, i) => {
    const cell = r2.getCell(i + 1);
    cell.value = h;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    cell.border = thinBorder;
  });

  const paid    = records.filter(r => r.status === "PAID");
  const pending = records.filter(r => !r.status || r.status === "PENDING");
  const hold    = records.filter(r => r.status === "HOLD");

  const netOf = (arr) => arr.reduce((a, r) => a + fmt(r.netSalary), 0);

  const rows = [
    { label: "✓ Paid Salaries",      count: paid.length,    total: netOf(paid),    status: "PAID" },
    { label: "⏳ Pending Salaries",   count: pending.length, total: netOf(pending), status: "PENDING" },
    { label: "⏸ On Hold Salaries",   count: hold.length,    total: netOf(hold),    status: "HOLD" },
    { label: "📊 Total All Salaries", count: records.length, total: netOf(records), status: null },
  ];

  rows.forEach((item, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum); row.height = 24;
    const bg = idx % 2 === 1 ? DESIGN.colors.zebra : DESIGN.colors.white;

    row.getCell(1).value = item.label;
    row.getCell(2).value = item.count;
    row.getCell(3).value = item.total;

    for (let i = 1; i <= 3; i++) {
      const cell = row.getCell(i);
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "right" };
      cell.font = { name: DESIGN.fontName, size: 10, bold: idx === rows.length - 1 };
    }

    if (item.status) {
      applyStatusStyle(row.getCell(1), item.status);
      row.getCell(1).font.bold = false;
    } else {
      // Total row
      for (let i = 1; i <= 3; i++) {
        row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
        row.getCell(i).font = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.primary } };
        row.getCell(i).border = {
          top: { style: "medium", color: { argb: DESIGN.colors.secondary } },
          bottom: { style: "double", color: { argb: DESIGN.colors.secondary } },
          left: thinBorder.left, right: thinBorder.right,
        };
      }
    }
  });

  // Spacer
  ws.getRow(7).height = 12;

  // KPI block
  ws.mergeCells("A8:C8");
  const r8 = ws.getRow(8); r8.height = 22;
  r8.getCell(1).value = "KEY METRICS";
  r8.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
  r8.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
  r8.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

  const totNet = netOf(records);
  const paidPct = records.length > 0 ? ((paid.length / records.length) * 100).toFixed(1) + "%" : "0%";
  const avgNet = records.length > 0 ? (totNet / records.length).toFixed(2) : 0;

  const kpis = [
    ["Payment Collection Rate",     paidPct],
    ["Average Net Salary",          `₹${Number(avgNet).toLocaleString("en-IN")}`],
    ["Highest Net Salary",          `₹${Math.max(...records.map(r => fmt(r.netSalary)), 0).toLocaleString("en-IN")}`],
    ["Total Bonus Disbursed",       `₹${records.reduce((a, r) => a + fmt(r.bonus), 0).toLocaleString("en-IN")}`],
    ["Total Deductions Applied",    `₹${records.reduce((a, r) => a + fmt(r.deductions), 0).toLocaleString("en-IN")}`],
    ["Report Generated On",         new Date().toLocaleString("en-IN")],
  ];

  kpis.forEach(([label, val], idx) => {
    const rowNum = idx + 9;
    const row = ws.getRow(rowNum); row.height = 22;
    ws.mergeCells(`B${rowNum}:C${rowNum}`);
    row.getCell(1).value = label;
    row.getCell(2).value = val;
    const bg = idx % 2 === 1 ? DESIGN.colors.zebra : DESIGN.colors.white;
    [row.getCell(1), row.getCell(2)].forEach((cell, ci) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = thinBorder;
      cell.font = { name: DESIGN.fontName, size: 10, bold: ci === 0 };
      cell.alignment = { vertical: "middle", horizontal: ci === 0 ? "left" : "center" };
    });
  });
}