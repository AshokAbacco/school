// client/src/utils/downloadExpenseExcel.js
//
// Usage:
//   downloadExpenseExcel(expenseSections, { preset, customFrom, customTo, schoolName })
//
// expenseSections shape:
// [{ key, label, color, icon, total, items: [{ id, label, amount, icon, createdAt? }] }]

const DESIGN = {
  fontName: "Segoe UI",
  colors: {
    primary:   "1C3044",
    secondary: "27435B",
    accent:    "EEF4F8",
    zebra:     "F7FAFC",
    white:     "FFFFFF",
    green:     "1E4620",
    greenBg:   "E8F5E9",
    red:       "7A1C1C",
    redBg:     "FFEBEE",
    border:    "D0E1ED",
    totalBg:   "E1EDF5",
    dayHeader: "2E4D66",
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function isoDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function startOfDay(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}

function getDateRange(preset, customFrom, customTo) {
  const now = new Date();
  if (preset === "today")
    return { from: startOfDay(now), to: endOfDay(now), label: `Today (${isoDate(now)})` };
  if (preset === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), label: `Yesterday (${isoDate(y)})` };
  }
  if (preset === "thisWeek") {
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { from: startOfDay(mon), to: endOfDay(now), label: `This Week (${isoDate(mon)} – ${isoDate(now)})` };
  }
  if (preset === "thisMonth") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(first), to: endOfDay(now), label: `This Month (${isoDate(first)} – ${isoDate(now)})` };
  }
  if (preset === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: startOfDay(first), to: endOfDay(last), label: `Last Month (${isoDate(first)} – ${isoDate(last)})` };
  }
  if (preset === "custom" && customFrom && customTo)
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)), label: `${isoDate(customFrom)} – ${isoDate(customTo)}` };
  return { from: null, to: null, label: "All Time" };
}

function flattenAndFilter(expenseSections, from, to) {
  const rows = [];
  for (const sec of expenseSections) {
    for (const item of sec.items) {
      rows.push({
        category:  sec.label,
        color:     sec.color,
        label:     item.label,
        amount:    Number(item.amount || 0),
        icon:      item.icon,
        createdAt: item.createdAt ? new Date(item.createdAt) : null,
      });
    }
  }
  if (!from || !to) return rows;
  return rows.filter((r) => r.createdAt && r.createdAt >= from && r.createdAt <= to);
}

// ── PUBLIC EXPORT ─────────────────────────────────────────────────────────────

export function downloadExpenseExcel(expenseSections, options = {}) {
  const {
    preset     = "all",
    customFrom = null,
    customTo   = null,
    schoolName = "School",
  } = options;

function boldBorder() {
  const c = { argb: DESIGN.colors.secondary };
  return { top: { style: "medium", color: c }, bottom: { style: "double", color: c },
           left: { style: "thin", color: { argb: DESIGN.colors.border } },
           right: { style: "thin", color: { argb: DESIGN.colors.border } } };
}

  const run = (ExcelJS) => _generate(ExcelJS, rows, expenseSections, dateRange, schoolName);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script    = document.createElement("script");
    script.src      = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload   = () => run(window.ExcelJS);
    script.onerror  = () => console.error("ExcelJS failed to load");
    document.head.appendChild(script);
  }
}

// ── workbook generator ────────────────────────────────────────────────────────

async function _generate(ExcelJS, rows, allSections, dateRange, schoolName) {
  const workbook   = new ExcelJS.Workbook();
  workbook.creator = schoolName;

function writeDataRows(ws, startRow, rows, colCount) {
  rows.forEach((row, idx) => {
    const rn  = startRow + idx;
    const wr  = ws.getRow(rn); wr.height = 22;
    const bg  = idx % 2 === 0 ? DESIGN.colors.white : DESIGN.colors.zebra;

    row.forEach((val, ci) => {
      const cell    = wr.getCell(ci + 1);
      cell.value     = val;
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font      = { name: DESIGN.fontName, size: 10 };
      cell.border    = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: ci === 0 ? "center" : ci === colCount - 1 ? "right" : "left" };
    });

    // Colour the amount column (last)
    wr.getCell(colCount).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red } };
  });
}

function writeTotalRow(ws, rowNum, colCount, labelCol, label, total) {
  const r = ws.getRow(rowNum); r.height = 28;
  for (let i = 1; i <= colCount; i++) {
    const cell = r.getCell(i);
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border    = boldBorder();
    cell.alignment = { vertical: "middle", horizontal: i <= labelCol ? "left" : "right" };
  }
  r.getCell(1).value       = label;
  r.getCell(colCount).value = total;
  r.getCell(colCount).font  = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.red } };
}

function _buildDetailSheet(workbook, rows, dateRange, schoolName, thinBorder) {
  const ws = workbook.addWorksheet("Expense Records", { views: [{ showGridLines: true }] });

function buildDetailSheet(workbook, rows, dateRange, schoolName) {
  const ws = workbook.addWorksheet("Expense Records", { views: [{ showGridLines: true }] });
  ws.columns = [
    { width: 5,  style: { alignment: { horizontal: "center" } } },
    { width: 26 },
    { width: 30 },
    { width: 20, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 22, style: { alignment: { horizontal: "center" } } },
  ];

  // Row 1 — title
  ws.mergeCells("A1:E1");
  const r1 = ws.getRow(1); r1.height = 40;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — EXPENSE LEDGER`;
  Object.assign(r1.getCell(1), {
    font:      { name: DESIGN.fontName, size: 15, bold: true, color: { argb: DESIGN.colors.white } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } },
    alignment: { vertical: "middle", horizontal: "center" },
  });

  // Row 2 — date range info
  ws.mergeCells("A2:E2");
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  r2.getCell(1).value = `Date Range: ${dateRange.label}  |  ${rows.length} record${rows.length !== 1 ? "s" : ""}  |  Generated: ${dateStr}`;
  Object.assign(r2.getCell(1), {
    font:      { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.white } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } },
    alignment: { vertical: "middle", horizontal: "center" },
  });

  ws.getRow(3).height = 8; // spacer

  // Row 4 — column headers
  const headers = ["#", "Category", "Expense Item", "Amount (₹)", "Date Added"];
  const r4 = ws.getRow(4); r4.height = 28;
  headers.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value     = h;
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : i >= 3 ? "right" : "left" };
    cell.border    = thinBorder;
  });

  if (rows.length === 0) {
    ws.mergeCells("A5:E5");
    const warn = ws.getRow(5); warn.height = 30;
    warn.getCell(1).value = dateRange.from
      ? `⚠ No expenses found for the selected date range (${dateRange.label}). Ensure the backend returns "createdAt" per item.`
      : "⚠ No expense records found.";
    warn.getCell(1).font      = { name: DESIGN.fontName, size: 10, italic: true, color: { argb: DESIGN.colors.red } };
    warn.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.redBg } };
    warn.getCell(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    warn.getCell(1).border    = thinBorder();
    return;
  }

  // Data rows
  rows.forEach((row, idx) => {
    const wsRow  = ws.getRow(idx + 5);
    wsRow.height = 22;
    const bg     = idx % 2 === 0 ? DESIGN.colors.white : DESIGN.colors.zebra;

    wsRow.getCell(1).value = idx + 1;
    wsRow.getCell(2).value = row.category;
    wsRow.getCell(3).value = row.label;
    wsRow.getCell(4).value = row.amount;
    wsRow.getCell(5).value = row.createdAt
      ? row.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    for (let i = 1; i <= 5; i++) {
      const cell = wsRow.getCell(i);
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font      = { name: DESIGN.fontName, size: 10, bold: i === 3 };
      cell.border    = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "center" : i === 4 ? "right" : "left" };
    }
    wsRow.getCell(4).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red } };
  });

  // Footer
  const footer  = ws.getRow(rows.length + 5);
  footer.height = 26;
  const total   = rows.reduce((a, r) => a + r.amount, 0);

  footer.getCell(1).value = "TOTAL";
  footer.getCell(2).value = `${rows.length} items`;
  footer.getCell(4).value = total;

  const boldBorder = {
    top:    { style: "medium", color: { argb: DESIGN.colors.secondary } },
    bottom: { style: "double", color: { argb: DESIGN.colors.secondary } },
    left:   { style: "thin",   color: { argb: DESIGN.colors.border } },
    right:  { style: "thin",   color: { argb: DESIGN.colors.border } },
  };
  for (let i = 1; i <= 5; i++) {
    const cell = fr.getCell(i);
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border    = boldBorder;
    cell.alignment = { vertical: "middle", horizontal: i <= 2 ? "left" : "right" };
  }
  footer.getCell(4).font = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.red } };
}

// ── Sheet: Category Summary (existing) ───────────────────────────────────────

function _buildCategorySheet(workbook, rows, allSections, dateRange, thinBorder) {
  const ws = workbook.addWorksheet("Category Summary", { views: [{ showGridLines: true }] });

  ws.columns = [
    { width: 30 },
    { width: 14, style: { alignment: { horizontal: "right" } } },
    { width: 22, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 14, style: { alignment: { horizontal: "right" } } },
  ];

  // Title
  ws.mergeCells("A1:D1");
  const r1 = ws.getRow(1); r1.height = 34;
  r1.getCell(1).value = `EXPENSE CATEGORY SUMMARY — ${dateRange.label.toUpperCase()}`;
  Object.assign(r1.getCell(1), {
    font:      { name: DESIGN.fontName, size: 12, bold: true, color: { argb: DESIGN.colors.white } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } },
    alignment: { vertical: "middle", horizontal: "center" },
  });

  // Sub-header
  const r2 = ws.getRow(2); r2.height = 24;
  ["Category", "Items", "Total Amount (₹)", "% of Total"].forEach((h, i) => {
    const cell = r2.getCell(i + 1);
    cell.value     = h;
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    cell.border    = thinBorder;
  });

  const grandTotal = rows.reduce((a, r) => a + r.amount, 0);
  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.category]) catMap[r.category] = { count: 0, total: 0 };
    catMap[r.category].count++;
    catMap[r.category].total += r.amount;
  }

  allSections.forEach(({ label }, idx) => {
    const count = catMap[label]?.count || 0;
    const total = catMap[label]?.total || 0;
    const row   = ws.getRow(idx + 3);
    row.height  = 22;
    const bg    = idx % 2 === 0 ? DESIGN.colors.white : DESIGN.colors.zebra;

    row.getCell(1).value = label;
    row.getCell(2).value = count;
    row.getCell(3).value = total;
    row.getCell(4).value = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) + "%" : "0%";

    for (let i = 1; i <= 4; i++) {
      const cell = row.getCell(i);
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font      = { name: DESIGN.fontName, size: 10, ...(i === 2 && total > 0 ? { bold: true, color: { argb: DESIGN.colors.red } } : {}) };
      cell.border    = thinBorder();
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    });
  });

  writeTotalRow(ws, catRows.length + 3, 4, 1, "GRAND TOTAL", grandTotal);
  ws.getRow(catRows.length + 3).getCell(2).value = rows.length;
  ws.getRow(catRows.length + 3).getCell(4).value = "100%";
}

// ── Daily report ──────────────────────────────────────────────────────────────

/**
 * Groups rows by calendar day.
 * Returns Map<"YYYY-MM-DD" → { label: string, rows: [...] }> sorted ascending.
 */
function groupByDay(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.createdAt) continue;
    const key = r.createdAt.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: isoDate(r.createdAt),
        rows: [],
      });
    }
    if (total > 0)
      row.getCell(3).font = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red } };
  });

  // Grand total row
  const footer  = ws.getRow(allSections.length + 3);
  footer.height = 28;
  footer.getCell(1).value = "GRAND TOTAL";
  footer.getCell(2).value = rows.length;
  footer.getCell(3).value = grandTotal;
  footer.getCell(4).value = "100%";

  const boldBorder = {
    top:    { style: "medium", color: { argb: DESIGN.colors.secondary } },
    bottom: { style: "double", color: { argb: DESIGN.colors.secondary } },
    left:   { style: "thin",   color: { argb: DESIGN.colors.border } },
    right:  { style: "thin",   color: { argb: DESIGN.colors.border } },
  };
  for (let i = 1; i <= 4; i++) {
    const cell = footer.getCell(i);
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font      = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border    = boldBorder;
    cell.alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "right" };
  }
  footer.getCell(3).font = { name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.red } };
}