// client\src\utils\downloadStudentFinanceExcel.js
// Drop this file into your finance/utils/ folder.
// Call downloadStudentFinanceExcel(students, feeCategory, schoolInfo) from Studentfinance.jsx

/**
 * Generates a beautiful, highly professional Excel (.xlsx) report for student finance data.
 * Uses ExcelJS (via CDN) to provide advanced styling, custom colors, borders, and layouts.
 */

// ── Design Theme & Palettes ──────────────────────────────────────────────────
const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:     "1C3044", // Dark Navy (Headers, Titles)
    secondary:   "27435B", // Medium Navy (Subheaders)
    accent:      "EEF4F8", // Very Light Blue-Grey (Metadata/Spacers)
    zebra:       "F7FAFC", // Soft Tint for alternating rows
    white:       "FFFFFF",
    paidGreen:   "1E4620", // Dark green text
    paidGreenBg: "E8F5E9", // Light green pill
    dueRed:      "7A1C1C", // Dark red text
    dueRedBg:    "FFEBEE", // Light red pill
    partialBg:   "FFF3E0", // Light orange pill
    partialFg:   "6D4C41", // Dark orange text
    border:      "D0E1ED", // Soft blue-grey border
    totalBg:     "E1EDF5", // Prominent footer background
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseBreakdown = (raw) => {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};
const fmt = (n) => Number(n || 0);
const categoryLabel = (cat) =>
  cat === "SCHOOL" ? "School Fee" : cat === "TUITION" ? "Tuition Fee" : "Total Fee";

// ── Main Export ──────────────────────────────────────────────────────────────
export function downloadStudentFinanceExcel(students, feeCategory = "ALL", schoolInfo = {}) {
  const run = (ExcelJS) => _generateBeautifulExcel(ExcelJS, students, feeCategory, schoolInfo);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload = () => run(window.ExcelJS);
    document.head.appendChild(script);
  }
}

// ── Core Generator ───────────────────────────────────────────────────────────
async function _generateBeautifulExcel(ExcelJS, students, feeCategory, schoolInfo) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolInfo.name || "Finance System";
  
  const catLabel = categoryLabel(feeCategory);

  // Reusable border style
  const thinBorder = {
    top: { style: 'thin', color: { argb: DESIGN.colors.border } },
    left: { style: 'thin', color: { argb: DESIGN.colors.border } },
    bottom: { style: 'thin', color: { argb: DESIGN.colors.border } },
    right: { style: 'thin', color: { argb: DESIGN.colors.border } }
  };

  // 📄 SHEET 1: MAIN DETAILED REPORT
  _buildMainSheet(workbook, students, feeCategory, catLabel, schoolInfo, thinBorder);

  // 📄 SHEET 2: SUMMARY & METRICS
  _buildSummarySheet(workbook, students, thinBorder);

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  
  const today = new Date().toISOString().slice(0, 10);
  const catTag = feeCategory === "ALL" ? "All-Fees" : feeCategory === "SCHOOL" ? "School-Fee" : "Tuition-Fee";
  
  link.href = URL.createObjectURL(blob);
  link.download = `Beautiful_Fee_Report_${catTag}_${today}.xlsx`;
  link.click();
}

function _buildMainSheet(workbook, students, feeCategory, catLabel, schoolInfo, thinBorder) {
  const ws = workbook.addWorksheet("Detailed Fee Report", {
    views: [{ showGridLines: true }]
  });

  // Setup Column properties (Widths & Default alignments)
  ws.columns = [
    { width: 6, style: { alignment: { horizontal: 'center' } } },               // #
    { width: 26 },                                                              // Student Name
    { width: 30 },                                                              // Email
    { width: 18, style: { alignment: { horizontal: 'center' } } },               // Class/Course
    { width: 18, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }, // Total Fee
    { width: 18, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }, // Amount Paid
    { width: 18, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }, // Amount Due
    { width: 16, style: { alignment: { horizontal: 'center' } } },               // Payment Mode
    { width: 16, style: { alignment: { horizontal: 'center' } } },               // Payment Date
    { width: 15, style: { alignment: { horizontal: 'center' } } }                // Status
  ];

  // 1. Header Block: School Title
  ws.mergeCells('A1:J1');
  const titleRow = ws.getRow(1);
  titleRow.height = 40;
  titleRow.getCell(1).value = (schoolInfo.name || "Student Finance Ledger").toUpperCase();
  titleRow.getCell(1).font = { name: DESIGN.fontName, size: 16, bold: true, color: { argb: DESIGN.colors.white } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primary } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Subtitle Row
  ws.mergeCells('A2:J2');
  const subRow = ws.getRow(2);
  subRow.height = 24;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  subRow.getCell(1).value = `📊 ${catLabel} Report  |  Generated on ${dateStr}`;
  subRow.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
  subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.secondary } };
  subRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Metadata Address Row
  ws.mergeCells('A3:E3');
  ws.mergeCells('F3:J3');
  const metaRow = ws.getRow(3);
  metaRow.height = 22;
  const addr = [schoolInfo.address, schoolInfo.city].filter(Boolean).join(", ") || "N/A";
  
  metaRow.getCell(1).value = `📍 Address: ${addr}`;
  metaRow.getCell(6).value = `📞 Phone: ${schoolInfo.phone || "N/A"}`;
  
  [metaRow.getCell(1), metaRow.getCell(6)].forEach(cell => {
    cell.font = { name: DESIGN.fontName, size: 9, italic: true, color: { argb: "4A5568" } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  
  // Fill background of meta row
  for(let i = 1; i <= 10; i++) {
    metaRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.accent } };
    metaRow.getCell(i).border = thinBorder;
  }

  // 4. Spacer row
  ws.getRow(4).height = 10;

  // 5. Table Column Headers
  const HEADERS = [
    "#", "Student Name", "Email", "Class / Course",
    `${catLabel} Total`, "Amount Paid", "Amount Due",
    "Payment Mode", "Payment Date", "Status"
  ];
  const headRow = ws.getRow(5);
  headRow.height = 28;
  HEADERS.forEach((h, idx) => {
    const cell = headRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primary } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 1 || idx === 2 ? 'left' : (idx >= 4 && idx <= 6 ? 'right' : 'center'), wrapText: true };
    cell.border = thinBorder;
  });

  // 6. Data Row Population
  let currentRowNum = 6;
  students.forEach((s, idx) => {
    const row = ws.getRow(currentRowNum);
    row.height = 22;

    const bd = parseBreakdown(s.feeBreakdown);
    const displayFee  = feeCategory === "SCHOOL"  ? fmt(bd.collegeFee) : feeCategory === "TUITION" ? fmt(bd.tuitionFee) : fmt(s.fees);
    const displayPaid = feeCategory === "SCHOOL"  ? fmt(s.schoolFeePaid) : feeCategory === "TUITION" ? fmt(s.tuitionFeePaid) : fmt(s.paidAmount);
    const displayDue  = Math.max(0, displayFee - displayPaid);
    const isPaid      = displayFee > 0 && displayDue <= 0;
    const status      = isPaid ? "PAID" : displayDue > 0 && displayPaid > 0 ? "PARTIAL" : "UNPAID";

    // Values assignment
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = s.name || "—";
    row.getCell(3).value = s.email || "—";
    row.getCell(4).value = s.course || "—";
    row.getCell(5).value = displayFee;
    row.getCell(6).value = displayPaid;
    row.getCell(7).value = displayDue;
    row.getCell(8).value = s.paymentMode || "—";
    row.getCell(9).value = s.paymentDate ? new Date(s.paymentDate).toLocaleDateString("en-IN") : "—";
    row.getCell(10).value = status;

    // Apply Zebra alternating background & fonts
    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? DESIGN.colors.zebra : DESIGN.colors.white;

    for (let i = 1; i <= 10; i++) {
      const cell = row.getCell(i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: DESIGN.fontName, size: 10, bold: i === 2 }; // Bold student names
      cell.border = thinBorder;
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: i === 2 || i === 3 ? 'left' : (i >= 5 && i <= 7 ? 'right' : 'center') 
      };
    }

    // Colorizing monetary values explicitly to look premium
    row.getCell(6).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.paidGreen } };
    if (displayDue > 0) {
      row.getCell(7).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.dueRed }, bold: true };
    }

    // Status Pill Coloring Styling
    const statusCell = row.getCell(10);
    statusCell.font = { name: DESIGN.fontName, size: 9, bold: true };
    if (status === "PAID") {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.paidGreenBg } };
      statusCell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.paidGreen } };
    } else if (status === "PARTIAL") {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.partialBg } };
      statusCell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.partialFg } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.dueRedBg } };
      statusCell.font = { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.dueRed } };
    }

    currentRowNum++;
  });

  // 7. Summary Total Footer Row
  const totalRow = ws.getRow(currentRowNum);
  totalRow.height = 26;

  const totFee = students.reduce((a, s) => a + (feeCategory === "SCHOOL" ? fmt(parseBreakdown(s.feeBreakdown).collegeFee) : feeCategory === "TUITION" ? fmt(parseBreakdown(s.feeBreakdown).tuitionFee) : fmt(s.fees)), 0);
  const totPaid = students.reduce((a, s) => a + (feeCategory === "SCHOOL" ? fmt(s.schoolFeePaid) : feeCategory === "TUITION" ? fmt(s.tuitionFeePaid) : fmt(s.paidAmount)), 0);
  const totDue = Math.max(0, totFee - totPaid);
  const collectedPct = totFee > 0 ? Math.round((totPaid / totFee) * 100) : 0;

  totalRow.getCell(1).value = "TOTALS";
  totalRow.getCell(2).value = `${students.length} Students`;
  totalRow.getCell(5).value = totFee;
  totalRow.getCell(6).value = totPaid;
  totalRow.getCell(7).value = totDue;
  totalRow.getCell(10).value = `${collectedPct}% collected`;

  // Apply clean thick bottom/double border style for totals row
  for(let i = 1; i <= 10; i++) {
    const cell = totalRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border = {
      top: { style: 'medium', color: { argb: DESIGN.colors.secondary } },
      bottom: { style: 'double', color: { argb: DESIGN.colors.secondary } },
      left: { style: 'thin', color: { argb: DESIGN.colors.border } },
      right: { style: 'thin', color: { argb: DESIGN.colors.border } }
    };
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: i === 1 || i === 2 ? 'left' : (i >= 5 && i <= 7 ? 'right' : 'center') 
    };
  }
  totalRow.getCell(6).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.paidGreen } };
  totalRow.getCell(7).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.dueRed } };
}

function _buildSummarySheet(workbook, students, thinBorder) {
  const ws = workbook.addWorksheet("Dashboard Summary", {
    views: [{ showGridLines: true }]
  });

  ws.columns = [
    { width: 32 }, 
    { width: 22, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }, 
    { width: 22, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }, 
    { width: 22, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: 'right' } } }
  ];

  // Title Block
  ws.mergeCells('A1:D1');
  const r1 = ws.getRow(1); r1.height = 35;
  r1.getCell(1).value = "FINANCIAL SUMMARY BREAKDOWN";
  r1.getCell(1).font = { name: DESIGN.fontName, size: 13, bold: true, color: { argb: DESIGN.colors.white } };
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.primary } };
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Subheaders
  const subheaders = ["Category Component", "Total Target", "Collected Amount", "Remaining Balance"];
  const r2 = ws.getRow(2); r2.height = 24;
  subheaders.forEach((h, idx) => {
    const cell = r2.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.secondary } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'right' };
    cell.border = thinBorder;
  });

  // Calculate streams
  const streams = [
    { label: "Full Fees Ledger (All Combined)", getT: (s)=>fmt(s.fees), getP: (s)=>fmt(s.paidAmount) },
    { label: "Institutional School Fees Portion", getT: (s)=>fmt(parseBreakdown(s.feeBreakdown).collegeFee), getP: (s)=>fmt(s.schoolFeePaid) },
    { label: "Academic Tuition Fees Portion", getT: (s)=>fmt(parseBreakdown(s.feeBreakdown).tuitionFee), getP: (s)=>fmt(s.tuitionFeePaid) }
  ];

  streams.forEach((st, idx) => {
    const rowNum = idx + 3;
    const r = ws.getRow(rowNum); r.height = 22;
    
    const t = students.reduce((acc, s) => acc + st.getT(s), 0);
    const p = students.reduce((acc, s) => acc + st.getP(s), 0);
    const d = Math.max(0, t - p);

    r.getCell(1).value = st.label;
    r.getCell(2).value = t;
    r.getCell(3).value = p;
    r.getCell(4).value = d;

    const rowBg = idx % 2 === 1 ? DESIGN.colors.zebra : DESIGN.colors.white;
    for(let i = 1; i <= 4; i++) {
      const cell = r.getCell(i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.font = { name: DESIGN.fontName, size: 10, bold: i === 1 };
    }
    r.getCell(3).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.paidGreen } };
    if(d > 0) r.getCell(4).font = { name: DESIGN.fontName, size: 10, color: { argb: DESIGN.colors.dueRed }, bold: true };
  });

  // Spacer
  ws.getRow(6).height = 15;

  // Metric KPIs Block
  ws.mergeCells('A7:B7');
  const r7 = ws.getRow(7); r7.height = 24;
  r7.getCell(1).value = "📊 KEY PERFORMANCE METRICS";
  r7.getCell(1).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
  r7.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DESIGN.colors.secondary } };
  r7.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  const totF = students.reduce((a, s) => a + fmt(s.fees), 0);
  const totP = students.reduce((a, s) => a + fmt(s.paidAmount), 0);
  const paidCnt = students.filter(s => fmt(s.fees) > 0 && fmt(s.paidAmount) >= fmt(s.fees)).length;
  const partCnt = students.filter(s => fmt(s.paidAmount) > 0 && fmt(s.paidAmount) < fmt(s.fees)).length;
  const unpdCnt = students.filter(s => fmt(s.paidAmount) === 0).length;
  const colPct  = totF > 0 ? ((totP / totF) * 100).toFixed(1) + "%" : "0%";

  const metrics = [
    ["Total Managed Enrollment Count", `${students.length} Registered Students`],
    ["Fully Cleared Accounts (PAID)", `${paidCnt} Accounts`],
    ["Partially Cleared Accounts", `${partCnt} Accounts`],
    ["Zero Collection Accounts (UNPAID)", `${unpdCnt} Accounts`],
    ["Net Revenue Collection Rate (%)", colPct],
    ["Ledger Compilation Timestamp", new Date().toLocaleString("en-IN")]
  ];

  metrics.forEach(([lbl, val], idx) => {
    const rowNum = idx + 8;
    const r = ws.getRow(rowNum); r.height = 22;
    ws.mergeCells(`B${rowNum}:D${rowNum}`);
    
    r.getCell(1).value = lbl;
    r.getCell(2).value = val;

    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? DESIGN.colors.zebra : DESIGN.colors.white;

    [r.getCell(1), r.getCell(2)].forEach((cell, cellIdx) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.font = { 
        name: DESIGN.fontName, 
        size: 10, 
        bold: cellIdx === 0,
        color: lbl.includes("Rate") && cellIdx === 1 ? { argb: DESIGN.colors.paidGreen } : undefined 
      };
      cell.alignment = { vertical: 'middle', horizontal: cellIdx === 0 ? 'left' : 'center' };
    });
  });
}