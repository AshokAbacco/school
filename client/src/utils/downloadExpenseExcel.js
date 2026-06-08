// client/src/utils/downloadExpenseExcel.js
// Usage:
//   downloadExpenseExcel(expenseSections, { dateFilter: "today" | "thisWeek" | "thisMonth" | "all", schoolName })
//
// expenseSections shape (same as what Expense.jsx holds in state):
// [{ key, label, color, icon, total, items: [{ id, label, amount, icon }] }]
//
// NOTE: the backend currently does NOT return createdAt per item because the
// getExpenses controller strips it.  To support real date filtering you need
// to either:
//   a) add createdAt to the items returned by the controller (recommended), OR
//   b) keep the "all records" download as-is and add date columns manually later.
//
// For now this file supports BOTH modes:
//   • If items carry a `createdAt` field  → real date filtering works.
//   • If they don't                        → "today/week/month" filters show 0
//     rows and the user is told to add a date range instead.
//
// The file is intentionally self-contained so it can be dropped anywhere.

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
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function isoDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Returns { from: Date, to: Date, label: string } for the chosen preset.
 */
function getDateRange(preset, customFrom, customTo) {
  const now = new Date();

  if (preset === "today") {
    return {
      from: startOfDay(now),
      to: endOfDay(now),
      label: `Today (${isoDate(now)})`,
    };
  }
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return {
      from: startOfDay(y),
      to: endOfDay(y),
      label: `Yesterday (${isoDate(y)})`,
    };
  }
  if (preset === "thisWeek") {
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    return {
      from: startOfDay(mon),
      to: endOfDay(now),
      label: `This Week (${isoDate(mon)} – ${isoDate(now)})`,
    };
  }
  if (preset === "thisMonth") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: startOfDay(first),
      to: endOfDay(now),
      label: `This Month (${isoDate(first)} – ${isoDate(now)})`,
    };
  }
  if (preset === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last  = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: startOfDay(first),
      to: endOfDay(last),
      label: `Last Month (${isoDate(first)} – ${isoDate(last)})`,
    };
  }
  if (preset === "custom" && customFrom && customTo) {
    return {
      from: startOfDay(new Date(customFrom)),
      to: endOfDay(new Date(customTo)),
      label: `${isoDate(customFrom)} – ${isoDate(customTo)}`,
    };
  }
  // "all"
  return { from: null, to: null, label: "All Time" };
}

/**
 * Flatten expense sections into a row array and optionally date-filter them.
 * Each row: { category, label, amount, icon, createdAt? }
 */
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

  if (!from || !to) return rows; // "all" — no filter

  return rows.filter((r) => {
    if (!r.createdAt) return false; // no date → exclude when filtering
    return r.createdAt >= from && r.createdAt <= to;
  });
}

// ── public entry point ───────────────────────────────────────────────────────

/**
 * @param {Array}  expenseSections  - state array from Expense.jsx
 * @param {Object} options
 *   @param {string} options.preset       - "today"|"yesterday"|"thisWeek"|"thisMonth"|"lastMonth"|"custom"|"all"
 *   @param {string} [options.customFrom] - ISO date string for custom range start
 *   @param {string} [options.customTo]   - ISO date string for custom range end
 *   @param {string} [options.schoolName]
 */
export function downloadExpenseExcel(expenseSections, options = {}) {
  const {
    preset     = "all",
    customFrom = null,
    customTo   = null,
    schoolName = "School",
  } = options;

  const dateRange = getDateRange(preset, customFrom, customTo);
  const rows      = flattenAndFilter(expenseSections, dateRange.from, dateRange.to);

  const run = (ExcelJS) =>
    _generate(ExcelJS, rows, expenseSections, dateRange, schoolName);

  if (window.ExcelJS) {
    run(window.ExcelJS);
  } else {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    script.onload  = () => run(window.ExcelJS);
    script.onerror = () => console.error("ExcelJS failed to load");
    document.head.appendChild(script);
  }
}

// ── workbook generator ───────────────────────────────────────────────────────

async function _generate(ExcelJS, rows, allSections, dateRange, schoolName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;

  const thinBorder = {
    top:    { style: "thin", color: { argb: DESIGN.colors.border } },
    left:   { style: "thin", color: { argb: DESIGN.colors.border } },
    bottom: { style: "thin", color: { argb: DESIGN.colors.border } },
    right:  { style: "thin", color: { argb: DESIGN.colors.border } },
  };

  _buildDetailSheet(workbook, rows, dateRange, schoolName, thinBorder);
  _buildCategorySheet(workbook, rows, allSections, dateRange, thinBorder);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const today    = new Date().toISOString().slice(0, 10);
  const rangeTag = dateRange.label.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const link     = document.createElement("a");
  link.href      = URL.createObjectURL(blob);
  link.download  = `Expenses_${schoolName.replace(/\s+/g, "-")}_${rangeTag}_${today}.xlsx`;
  link.click();
}

// ── Sheet 1: Detailed Expense Records ────────────────────────────────────────

function _buildDetailSheet(workbook, rows, dateRange, schoolName, thinBorder) {
  const ws = workbook.addWorksheet("Expense Records", {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 5,  style: { alignment: { horizontal: "center" } } },  // #
    { width: 26 },                                                    // Category
    { width: 30 },                                                    // Item
    { width: 20, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } }, // Amount
    { width: 22, style: { alignment: { horizontal: "center" } } },   // Date Added
  ];

  // Row 1 — school / title
  ws.mergeCells("A1:E1");
  const r1 = ws.getRow(1); r1.height = 40;
  r1.getCell(1).value = `${schoolName.toUpperCase()} — EXPENSE LEDGER`;
  Object.assign(r1.getCell(1), {
    font:      { name: DESIGN.fontName, size: 15, bold: true, color: { argb: DESIGN.colors.white } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.primary } },
    alignment: { vertical: "middle", horizontal: "center" },
  });

  // Row 2 — date range / record count
  ws.mergeCells("A2:E2");
  const r2 = ws.getRow(2); r2.height = 22;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  r2.getCell(1).value =
    `Date Range: ${dateRange.label}  |  ${rows.length} record${rows.length !== 1 ? "s" : ""}  |  Generated: ${dateStr}`;
  Object.assign(r2.getCell(1), {
    font:      { name: DESIGN.fontName, size: 9, bold: true, color: { argb: DESIGN.colors.white } },
    fill:      { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } },
    alignment: { vertical: "middle", horizontal: "center" },
  });

  // Row 3 — spacer
  ws.getRow(3).height = 8;

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

  // No-date warning (shown when filtering by date but items have no createdAt)
  const hasDateFilter = dateRange.from !== null;
  const missingDates  = hasDateFilter && rows.length === 0 &&
    !_anyItemHasDates(/* passed via closure — checked below */);

  if (rows.length === 0) {
    ws.mergeCells("A5:E5");
    const warn = ws.getRow(5);
    warn.height = 30;
    warn.getCell(1).value =
      hasDateFilter
        ? `⚠ No expenses found for the selected date range (${dateRange.label}). If you expected data, ensure the backend returns "createdAt" for each expense item.`
        : "⚠ No expense records found.";
    warn.getCell(1).font      = { name: DESIGN.fontName, size: 10, italic: true, color: { argb: "7A1C1C" } };
    warn.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.redBg } };
    warn.getCell(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    warn.getCell(1).border    = thinBorder;
    return;
  }

  // Data rows
  rows.forEach((row, idx) => {
    const rowNum  = idx + 5;
    const wsRow   = ws.getRow(rowNum);
    wsRow.height  = 22;
    const bg      = idx % 2 === 0 ? DESIGN.colors.white : DESIGN.colors.zebra;

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
      cell.alignment = {
        vertical:   "middle",
        horizontal: i === 1 ? "center" : i === 4 ? "right" : "left",
      };
    }

    // Amount in colour
    wsRow.getCell(4).font = {
      name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red },
    };
  });

  // Footer total row
  const footerNum = rows.length + 5;
  const footer    = ws.getRow(footerNum);
  footer.height   = 26;

  const total = rows.reduce((a, r) => a + r.amount, 0);

  footer.getCell(1).value = "TOTAL";
  footer.getCell(2).value = `${rows.length} items`;
  footer.getCell(4).value = total;
  footer.getCell(5).value = "";

  const boldBorder = {
    top:    { style: "medium", color: { argb: DESIGN.colors.secondary } },
    bottom: { style: "double", color: { argb: DESIGN.colors.secondary } },
    left:   { style: "thin",   color: { argb: DESIGN.colors.border } },
    right:  { style: "thin",   color: { argb: DESIGN.colors.border } },
  };

  for (let i = 1; i <= 5; i++) {
    const cell = footer.getCell(i);
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.totalBg } };
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.primary } };
    cell.border    = boldBorder;
    cell.alignment = { vertical: "middle", horizontal: i === 1 || i === 2 ? "left" : "right" };
  }
  footer.getCell(4).font = {
    name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.red },
  };
}

// ── Sheet 2: Category Summary ─────────────────────────────────────────────────

function _buildCategorySheet(workbook, rows, allSections, dateRange, thinBorder) {
  const ws = workbook.addWorksheet("Category Summary", {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 30 },
    { width: 14, style: { alignment: { horizontal: "center" } } },
    { width: 22, style: { numFmt: '"₹"#,##0.00', alignment: { horizontal: "right" } } },
    { width: 14, style: { alignment: { horizontal: "center" } } },
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
  ["Category", "Items", "Total Amount (₹)", "% of Total"].forEach((h, i) => {
    const cell = ws.getRow(2).getCell(i + 1);
    cell.value     = h;
    cell.font      = { name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.white } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: DESIGN.colors.secondary } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    cell.border    = thinBorder;
  });
  ws.getRow(2).height = 24;

  const grandTotal = rows.reduce((a, r) => a + r.amount, 0);

  // Group filtered rows by category
  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.category]) catMap[r.category] = { count: 0, total: 0 };
    catMap[r.category].count++;
    catMap[r.category].total += r.amount;
  }

  // Use allSections order so categories stay consistent even if filtered to 0
  const catRows = allSections.map((sec) => ({
    label: sec.label,
    count: catMap[sec.label]?.count || 0,
    total: catMap[sec.label]?.total || 0,
  }));

  catRows.forEach(({ label, count, total }, idx) => {
    const rowNum = idx + 3;
    const row    = ws.getRow(rowNum);
    row.height   = 22;
    const bg     = idx % 2 === 0 ? DESIGN.colors.white : DESIGN.colors.zebra;
    const pct    = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) + "%" : "0%";

    row.getCell(1).value = label;
    row.getCell(2).value = count;
    row.getCell(3).value = total;
    row.getCell(4).value = pct;

    for (let i = 1; i <= 4; i++) {
      const cell = row.getCell(i);
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font      = { name: DESIGN.fontName, size: 10 };
      cell.border    = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: i === 1 ? "left" : "right" };
    }

    // Highlight amount column
    if (total > 0) {
      row.getCell(3).font = {
        name: DESIGN.fontName, size: 10, bold: true, color: { argb: DESIGN.colors.red },
      };
    }
  });

  // Grand total row
  const footerNum = catRows.length + 3;
  const footer    = ws.getRow(footerNum);
  footer.height   = 28;

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
  footer.getCell(3).font = {
    name: DESIGN.fontName, size: 11, bold: true, color: { argb: DESIGN.colors.red },
  };
}

// tiny helper used in warning check
function _anyItemHasDates() {
  return false; // placeholder — warning is shown when rows.length === 0 after date filter
}