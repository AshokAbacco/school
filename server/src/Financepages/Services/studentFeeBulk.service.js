// server/src/Financepages/Services/studentFeeBulk.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Bulk Excel upload for Student Fees (Finance login → Student Fees).
//
//  1. buildFeeTemplate()  → .xlsx pre-filled with every ACTIVE student of a
//                           class + fee / payment columns to fill in.
//  2. processFeeUpload()  → parses the filled file, validates every row,
//                           detects duplicates (in the file AND in the DB),
//                           and — unless dryRun — saves all valid rows inside
//                           ONE database transaction (all-or-nothing).
//
// Records are written in exactly the same shape as the single-student flow
// (POST /addStudentFinance + PayModal → /recordSimplePayment), so they show up
// unchanged in the Student Fees list, invoices, payment history and reports.
// Existing fee / payment records are NEVER updated or overwritten.
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { saveSchoolBackup } from "../../utils/schoolBackup.service.js";

const prisma = new PrismaClient();

// ── Constants ────────────────────────────────────────────────────────────────
export const PAYMENT_MODES = ["UPI", "Net Banking", "Cash", "Card", "Cheque"];
const TEMPLATE_VERSION = "1";
const DATA_SHEET = "Fee Entry";
const META_SHEET = "_meta";
const MAX_ROWS = 2000;

// Standard fee columns → keys used by StudentList.feeBreakdown and the
// flat "...Paid" columns used by PayModal / reports / invoices.
const FEE_COLS = [
  { key: "collegeFee", detailKey: "collegeFee", header: "School Fee (₹)", paidField: "schoolFeePaid", catName: "School Fee", order: 1 },
  { key: "tuitionFee", detailKey: "tuitionFee", header: "Tuition Fee (₹)", paidField: "tuitionFeePaid", catName: "Tuition Fee", order: 2 },
  { key: "examFee", detailKey: "examFee", header: "Exam Fee (₹)", paidField: "examFeePaid", catName: "Exam Fee", order: 3 },
  { key: "transportFee", detailKey: "transportFee", header: "Transport Fee (₹)", paidField: "transportFeePaid", catName: "Transport Fee", order: 4 },
  { key: "booksFee", detailKey: "booksFee", header: "Books Fee (₹)", paidField: "booksFeePaid", catName: "Books Fee", order: 5 },
  { key: "labFee", detailKey: "labFee", header: "Lab Fee (₹)", paidField: "labFeePaid", catName: "Lab Fee", order: 6 },
];

// Column layout of the data sheet. `edit: true` columns are unlocked.
const COLUMNS = [
  { id: "sno", header: "S.No", width: 6 },
  { id: "studentId", header: "Student ID (System - do not edit)", width: 38 },
  { id: "admissionNo", header: "Admission No", width: 14 },
  { id: "rollNo", header: "Roll No", width: 9 },
  { id: "name", header: "Student Name", width: 26 },
  { id: "className", header: "Class", width: 14 },
  { id: "email", header: "Email", width: 28 },
  { id: "phone", header: "Phone", width: 15 },
  { id: "existing", header: "Existing Fee Record", width: 22 },
  ...FEE_COLS.map((f) => ({ id: f.key, header: f.header, width: 15, edit: true, money: true })),
  { id: "otherFeeName", header: "Other Fee Name", width: 18, edit: true },
  { id: "otherFeeAmount", header: "Other Fee Amount (₹)", width: 17, edit: true, money: true },
  { id: "totalFee", header: "Total Fee (₹)", width: 14 },
  { id: "feeDate", header: "Fee Entry Date (YYYY-MM-DD)", width: 20, edit: true, date: true },
  { id: "amountPaid", header: "Amount Paid (₹)", width: 15, edit: true, money: true },
  { id: "paymentMode", header: "Payment Mode", width: 15, edit: true },
  { id: "paymentDate", header: "Payment Date (YYYY-MM-DD)", width: 20, edit: true, date: true },
];
const COL_INDEX = Object.fromEntries(COLUMNS.map((c, i) => [c.id, i + 1]));
const HEADER_ROW = 4;

// ── Small helpers ────────────────────────────────────────────────────────────
export class BulkFeeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const className = (cs) =>
  cs?.name || `${cs?.grade ?? ""} ${cs?.section ?? ""}`.trim();

const round2 = (n) => Math.round(Number(n) * 100) / 100;

// Today's date in IST as YYYY-MM-DD (the app works in Asia/Kolkata).
const todayIST = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const isValidYMD = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const pad = (n) => String(n).padStart(2, "0");

// Unwrap ExcelJS cell values (formula results, rich text, hyperlinks …)
function rawCell(cell) {
  let v = cell?.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) v = v.result;
    else if ("richText" in v) v = v.richText.map((r) => r.text).join("");
    else if ("text" in v) v = v.text;
    else if ("error" in v) return null;
  }
  return v;
}

const cellText = (cell) => {
  const v = rawCell(cell);
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

// → { empty } | { value } | { error }
function parseMoney(cell) {
  const v = rawCell(cell);
  if (v === null || v === undefined || String(v).trim() === "") return { empty: true };
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).replace(/[₹,\s]/g, "").replace(/^rs\.?/i, ""));
  if (!Number.isFinite(n)) return { error: `"${v}" is not a valid amount` };
  if (n < 0) return { error: "amount cannot be negative" };
  return { value: round2(n) };
}

// Accepts real Excel dates, serial numbers, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY.
function parseDate(cell) {
  const v = rawCell(cell);
  if (v === null || v === undefined || String(v).trim() === "") return { empty: true };
  let ymd = null;
  if (v instanceof Date) {
    // ExcelJS returns Excel dates as UTC midnight
    if (!Number.isNaN(v.getTime())) ymd = v.toISOString().slice(0, 10);
  } else if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400000));
    if (!Number.isNaN(d.getTime())) ymd = d.toISOString().slice(0, 10);
  } else {
    const s = String(v).trim();
    let m;
    if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) ymd = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) ymd = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  }
  if (!ymd || !isValidYMD(ymd)) return { error: `"${cellText(cell)}" is not a valid date (use YYYY-MM-DD)` };
  return { value: ymd };
}

const normName = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// ── Shared DB lookups ────────────────────────────────────────────────────────
async function getClassForSchool(schoolId, classSectionId) {
  if (!classSectionId) throw new BulkFeeError("Please select a class.");
  const cs = await prisma.classSection.findFirst({
    where: { id: classSectionId, schoolId, deletedAt: null },
    select: { id: true, name: true, grade: true, section: true },
  });
  if (!cs) throw new BulkFeeError("Selected class was not found for your school.", 404);
  return cs;
}

// Active students of the class (deduped by student id), sorted by name.
async function getClassStudents(schoolId, classSectionId) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      classSectionId,
      status: "ACTIVE",
      student: { schoolId, deletedAt: null },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          personalInfo: { select: { phone: true } },
        },
      },
    },
    orderBy: { student: { name: "asc" } },
  });
  const map = new Map();
  for (const e of enrollments) {
    if (!e.student || map.has(e.student.id)) continue;
    map.set(e.student.id, {
      id: e.student.id,
      name: e.student.name ?? "",
      email: e.student.email ?? "",
      phone: e.student.personalInfo?.phone ?? "",
      admissionNumber: e.admissionNumber ?? "",
      rollNumber: e.rollNumber ?? "",
    });
  }
  return map;
}

// Existing (non-deleted) fee records for the given students → Map(studentId → record)
async function getExistingFeeRecords(db, schoolId, studentIds) {
  if (studentIds.length === 0) return new Map();
  const rows = await db.studentList.findMany({
    where: { schoolId, deletedAt: null, studentId: { in: studentIds } },
    select: { id: true, studentId: true, fees: true, paymentStatus: true, paidAmount: true },
  });
  return new Map(rows.map((r) => [r.studentId, r]));
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. TEMPLATE
// ═════════════════════════════════════════════════════════════════════════════
export async function buildFeeTemplate({ schoolId, classSectionId }) {
  const cs = await getClassForSchool(schoolId, classSectionId);
  const students = await getClassStudents(schoolId, classSectionId);
  if (students.size === 0)
    throw new BulkFeeError(`No active students found in ${className(cs)}.`);

  const [school, classFee, existing] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.classFee.findFirst({ where: { classSectionId } }).catch(() => null),
    getExistingFeeRecords(prisma, schoolId, [...students.keys()]),
  ]);
  const defaultSchoolFee = Number(classFee?.feeAmount || 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Finance - Student Fees";
  wb.created = new Date();

  // ── Data sheet ──
  const ws = wb.addWorksheet(DATA_SHEET, {
    views: [{ state: "frozen", xSplit: 5, ySplit: HEADER_ROW }],
  });
  ws.columns = COLUMNS.map((c) => ({ key: c.id, width: c.width }));

  const lastCol = COLUMNS.length;
  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = `${school?.name || "School"} — Bulk Fee Upload — Class: ${className(cs)}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  ws.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F556C" } };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value =
    "Fill only the yellow columns. Grey columns come from the system — do not edit or reorder them. " +
    "Leave a student's fee columns empty to skip that student. See the 'Instructions' sheet.";
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: "FF92400E" } };
  ws.getCell(2, 1).alignment = { wrapText: true };
  ws.getRow(2).height = 30;

  const hdr = ws.getRow(HEADER_ROW);
  COLUMNS.forEach((c, i) => {
    const cell = hdr.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: c.edit ? "FF1E2C3A" : "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.edit ? "FFFDE68A" : "FF2E3F52" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
  });
  hdr.height = 34;

  let r = HEADER_ROW + 1;
  let sno = 1;
  const firstFeeCol = ws.getColumn(COL_INDEX[FEE_COLS[0].key]).letter;
  const lastFeeCol = ws.getColumn(COL_INDEX[FEE_COLS[FEE_COLS.length - 1].key]).letter;
  const otherAmtCol = ws.getColumn(COL_INDEX.otherFeeAmount).letter;

  for (const st of students.values()) {
    const ex = existing.get(st.id);
    const row = ws.getRow(r);
    row.getCell(COL_INDEX.sno).value = sno++;
    row.getCell(COL_INDEX.studentId).value = st.id;
    row.getCell(COL_INDEX.admissionNo).value = st.admissionNumber;
    row.getCell(COL_INDEX.rollNo).value = st.rollNumber;
    row.getCell(COL_INDEX.name).value = st.name;
    row.getCell(COL_INDEX.className).value = className(cs);
    row.getCell(COL_INDEX.email).value = st.email;
    row.getCell(COL_INDEX.phone).value = st.phone;
    row.getCell(COL_INDEX.existing).value = ex
      ? `YES – ₹${Number(ex.fees || 0).toLocaleString("en-IN")} (will be skipped)`
      : "No";
    if (!ex && defaultSchoolFee > 0) row.getCell(COL_INDEX.collegeFee).value = defaultSchoolFee;
    row.getCell(COL_INDEX.totalFee).value = {
      formula: `SUM(${firstFeeCol}${r}:${lastFeeCol}${r})+N(${otherAmtCol}${r})`,
    };

    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (c.edit) {
        cell.protection = { locked: false };
        if (!ex) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ex ? "FFFEE2E2" : "FFF1F5F9" } };
      }
      if (c.money || c.id === "totalFee") cell.numFmt = "#,##0.00";
      if (c.date) cell.numFmt = "yyyy-mm-dd";
      if (c.money)
        cell.dataValidation = {
          type: "decimal", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true,
          showErrorMessage: true, errorTitle: "Invalid amount", error: "Enter a number of 0 or more.",
        };
      if (c.date)
        cell.dataValidation = {
          type: "date", operator: "greaterThan", formulae: [new Date(Date.UTC(2000, 0, 1))], allowBlank: true,
          showErrorMessage: true, errorTitle: "Invalid date", error: "Enter a date as YYYY-MM-DD.",
        };
      if (c.id === "paymentMode")
        cell.dataValidation = {
          type: "list", allowBlank: true, formulae: [`"${PAYMENT_MODES.join(",")}"`],
          showErrorMessage: true, errorTitle: "Invalid mode", error: `Choose one of: ${PAYMENT_MODES.join(", ")}`,
        };
    });
    r++;
  }

  // Light protection (no password) so system columns aren't edited by accident.
  await ws.protect("", {
    selectLockedCells: true, selectUnlockedCells: true,
    formatColumns: true, formatRows: true, sort: true, autoFilter: true,
  });

  // ── Instructions sheet ──
  const ins = wb.addWorksheet("Instructions");
  ins.columns = [{ width: 4 }, { width: 110 }];
  const lines = [
    ["", `Bulk Fee Upload — ${className(cs)}`],
    ["", ""],
    ["1", "Fill the yellow columns on the 'Fee Entry' sheet. Do NOT change Student ID, Name or Class, and do not add new students."],
    ["2", "Fee columns: enter the final amount (after any discount). At least one fee amount is required for a student to be added."],
    ["3", "Other Fee Name / Amount: optional extra fee (e.g. 'Sports Fee'). If you enter one, enter both."],
    ["4", "Fee Entry Date: optional. If left empty, the Payment Date selected in the app is used. Future dates are not allowed."],
    ["5", `Amount Paid: optional. If entered, Payment Mode (${PAYMENT_MODES.join(" / ")}) is required. Payment Date defaults to the Fee Entry Date. It cannot exceed the Total Fee.`],
    ["6", "Students marked 'YES' in 'Existing Fee Record' already have fees — those rows are skipped and nothing is overwritten. Use Edit / Pay in the app for them."],
    ["7", "Rows with all fee and payment columns empty are ignored (not uploaded)."],
    ["8", "Keep the file as .xlsx. Upload it on the same class it was downloaded for. Errors are shown in the app — fix them in this file and upload again; rows already saved will be reported as duplicates, not saved twice."],
  ];
  lines.forEach((l, i) => {
    const row = ins.getRow(i + 1);
    row.values = l;
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    if (i === 0) row.getCell(2).font = { bold: true, size: 14 };
  });

  // ── Hidden metadata (used to verify the upload matches the class) ──
  const meta = wb.addWorksheet(META_SHEET, { state: "veryHidden" });
  meta.addRows([
    ["version", TEMPLATE_VERSION],
    ["schoolId", schoolId],
    ["classSectionId", cs.id],
    ["className", className(cs)],
    ["generatedAt", new Date().toISOString()],
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  const safe = className(cs).replace(/[^A-Za-z0-9_-]+/g, "_");
  return { buffer, fileName: `Fee_Upload_${safe}_${todayIST()}.xlsx` };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. PARSE + VALIDATE + SAVE
// ═════════════════════════════════════════════════════════════════════════════
function readMeta(wb) {
  const ws = wb.getWorksheet(META_SHEET);
  if (!ws) return {};
  const out = {};
  ws.eachRow((row) => {
    const k = cellText(row.getCell(1));
    if (k) out[k] = cellText(row.getCell(2));
  });
  return out;
}

// Locate the header row and map our column ids → actual column numbers,
// matching by header text so a re-ordered column is still read correctly.
function mapHeaders(ws) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = COLUMNS.map((c) => ({ id: c.id, key: norm(c.header) }));
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const found = {};
    row.eachCell((cell, col) => {
      const t = norm(cellText(cell));
      const w = wanted.find((x) => x.key === t);
      if (w) found[w.id] = col;
    });
    if (found.studentId && found.name) {
      const required = ["studentId", "name", ...FEE_COLS.map((f) => f.key), "amountPaid", "paymentMode"];
      const missing = required.filter((id) => !found[id]);
      if (missing.length)
        throw new BulkFeeError(
          `Template columns are missing: ${missing.map((id) => COLUMNS[COL_INDEX[id] - 1].header).join(", ")}. Please download a fresh template.`,
        );
      return { headerRow: r, cols: found };
    }
  }
  throw new BulkFeeError("This file is not a valid fee upload template (header row not found). Please download the template again.");
}

function parseRow(ws, r, cols, defaultFeeDate, today) {
  const row = ws.getRow(r);
  const get = (id) => (cols[id] ? row.getCell(cols[id]) : null);
  const reasons = [];

  const out = {
    row: r,
    studentId: cellText(get("studentId")),
    name: cellText(get("name")),
    fees: {},
    otherFeeName: cellText(get("otherFeeName")),
    otherFeeAmount: 0,
    totalFee: 0,
    feeDate: null,
    amountPaid: 0,
    paymentMode: null,
    paymentDate: null,
    reasons,
  };

  let anyInput = false;
  for (const f of FEE_COLS) {
    const p = parseMoney(get(f.key));
    if (p.error) { reasons.push(`${f.header.replace(" (₹)", "")}: ${p.error}`); anyInput = true; }
    else if (!p.empty) { out.fees[f.key] = p.value; anyInput = true; }
  }
  const other = parseMoney(get("otherFeeAmount"));
  if (other.error) { reasons.push(`Other Fee Amount: ${other.error}`); anyInput = true; }
  else if (!other.empty) { out.otherFeeAmount = other.value; anyInput = true; }
  if (out.otherFeeName) anyInput = true;

  const paid = parseMoney(get("amountPaid"));
  const modeText = cellText(get("paymentMode"));
  const payDateP = parseDate(get("paymentDate"));
  if (paid.error) reasons.push(`Amount Paid: ${paid.error}`);
  else if (!paid.empty) out.amountPaid = paid.value;
  if (!paid.empty || modeText) anyInput = true;

  out.blank = !anyInput;
  if (out.blank) return out;

  // Other fee: both name and amount, or neither
  if (out.otherFeeAmount > 0 && !out.otherFeeName) reasons.push("Other Fee Name is required when Other Fee Amount is entered");
  if (out.otherFeeName && !(out.otherFeeAmount > 0)) reasons.push("Other Fee Amount is required when Other Fee Name is entered");

  out.totalFee = round2(
    Object.values(out.fees).reduce((s, v) => s + v, 0) + (out.otherFeeName ? out.otherFeeAmount : 0),
  );
  if (!(out.totalFee > 0)) reasons.push("Enter at least one fee amount greater than 0");

  // Fee entry date
  const fd = parseDate(get("feeDate"));
  if (fd.error) reasons.push(`Fee Entry Date: ${fd.error}`);
  else out.feeDate = fd.empty ? defaultFeeDate : fd.value;
  if (out.feeDate && out.feeDate > today) reasons.push("Fee Entry Date cannot be in the future");

  // Payment
  if (out.amountPaid > 0) {
    const mode = PAYMENT_MODES.find((m) => m.toLowerCase() === modeText.toLowerCase());
    if (!modeText) reasons.push("Payment Mode is required when Amount Paid is entered");
    else if (!mode) reasons.push(`Payment Mode "${modeText}" is invalid (use ${PAYMENT_MODES.join(", ")})`);
    else out.paymentMode = mode;

    if (payDateP.error) reasons.push(`Payment Date: ${payDateP.error}`);
    else out.paymentDate = payDateP.empty ? out.feeDate : payDateP.value;
    if (out.paymentDate && out.paymentDate > today) reasons.push("Payment Date cannot be in the future");

    if (out.totalFee > 0 && out.amountPaid > out.totalFee)
      reasons.push(`Amount Paid (₹${out.amountPaid}) is more than Total Fee (₹${out.totalFee})`);
  } else if (modeText && paid.empty) {
    reasons.push("Payment Mode entered but Amount Paid is empty");
  }

  return out;
}

// Build the StudentList payload exactly like Addstudent.jsx → /addStudentFinance
function buildStudentListData(rec, st, cs, schoolId) {
  const feeBreakdownDetails = {};
  const flat = {};
  for (const f of FEE_COLS) {
    const amt = rec.fees[f.key] || 0;
    flat[f.key] = amt;
    feeBreakdownDetails[f.detailKey] = { amount: amt, discountType: "none", discountValue: 0, total: amt };
  }
  const customFees = rec.otherFeeName && rec.otherFeeAmount > 0
    ? [{ label: rec.otherFeeName, amount: rec.otherFeeAmount, discountType: "none", discountValue: 0, total: rec.otherFeeAmount }]
    : [];

  const feeBreakdown = JSON.stringify({
    ...flat,
    miscFee: 0,
    customFees,
    feeBreakdownDetails,
  });

  // Waterfall the paid amount across categories (same order PayModal uses
  // for "Full Fee"), then custom fees.
  let remaining = rec.amountPaid;
  const paidFields = {};
  for (const f of FEE_COLS) {
    const take = Math.min(flat[f.key], Math.max(0, remaining));
    paidFields[f.paidField] = round2(take);
    remaining = round2(remaining - take);
  }
  const customFeeBreakdown = {};
  for (const c of customFees) {
    const take = Math.min(c.total, Math.max(0, remaining));
    if (take > 0) customFeeBreakdown[c.label] = round2(take);
    remaining = round2(remaining - take);
  }

  const paid = rec.amountPaid > 0;
  const paymentDate = paid ? new Date(`${rec.paymentDate}T00:00:00+05:30`) : null;

  return {
    studentList: {
      studentId: st.id,
      name: st.name,
      email: st.email || "",
      phone: st.phone || "",
      course: className(cs) || null,
      fees: rec.totalFee,
      feeBreakdown,
      feeDate: new Date(rec.feeDate),
      schoolId,
      ...(paid && {
        paidAmount: rec.amountPaid,
        paymentStatus: rec.amountPaid >= rec.totalFee ? "PAID" : "PARTIAL",
        paymentMode: rec.paymentMode,
        paymentDate,
        ...paidFields,
      }),
    },
    paymentLog: paid
      ? {
          amount: rec.amountPaid,
          paymentMode: rec.paymentMode,
          paidAt: paymentDate,
          ...paidFields,
          customFeeBreakdown,
        }
      : null,
    categories: [
      ...FEE_COLS.map((f) => ({ name: f.catName, order: f.order, amount: flat[f.key], paid: paidFields[f.paidField] })),
      ...customFees.map((c, i) => ({ name: c.label, order: 10 + i, amount: c.total, paid: customFeeBreakdown[c.label] || 0 })),
    ].filter((c) => c.amount > 0),
  };
}

async function tableExists(table) {
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

function invoicePrefix(school) {
  const raw = (school.invoicePrefix || school.code || "SCH").toString();
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "SCH";
}

export async function processFeeUpload({ schoolId, userId, classSectionId, fileBuffer, defaultFeeDate, dryRun }) {
  if (!fileBuffer?.length) throw new BulkFeeError("Please choose an Excel file to upload.");
  const today = todayIST();
  const fallbackDate = defaultFeeDate && isValidYMD(defaultFeeDate) ? defaultFeeDate : today;
  if (fallbackDate > today) throw new BulkFeeError("The selected Payment Date cannot be in the future.");

  const cs = await getClassForSchool(schoolId, classSectionId);

  // ── Read workbook ──
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(fileBuffer);
  } catch {
    throw new BulkFeeError("Could not read the file. Please upload the .xlsx template (old .xls / CSV files are not supported).");
  }
  const meta = readMeta(wb);
  if (meta.schoolId && meta.schoolId !== schoolId)
    throw new BulkFeeError("This template was generated for a different school.");
  if (meta.classSectionId && meta.classSectionId !== cs.id)
    throw new BulkFeeError(
      `This template is for class "${meta.className || "another class"}", but "${className(cs)}" is selected. Select the matching class or download a new template.`,
    );

  const ws = wb.getWorksheet(DATA_SHEET) || wb.worksheets.find((w) => w.state !== "veryHidden" && w.name !== "Instructions");
  if (!ws) throw new BulkFeeError("The 'Fee Entry' sheet was not found in the file.");
  const { headerRow, cols } = mapHeaders(ws);

  // ── Parse rows ──
  const records = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sid = cellText(row.getCell(cols.studentId));
    const nm = cellText(row.getCell(cols.name));
    if (!sid && !nm) continue; // completely empty line
    records.push(parseRow(ws, r, cols, fallbackDate, today));
    if (records.length > MAX_ROWS) throw new BulkFeeError(`Too many rows. Maximum ${MAX_ROWS} per upload.`);
  }
  if (records.length === 0) throw new BulkFeeError("The file has no student rows.");

  // ── Match against class + DB ──
  const students = await getClassStudents(schoolId, cs.id);
  const existing = await getExistingFeeRecords(prisma, schoolId, [...new Set(records.map((r) => r.studentId).filter(Boolean))]);
  const seen = new Map(); // studentId → first row number (non-blank rows)

  for (const rec of records) {
    if (rec.blank) { rec.status = "blank"; continue; }

    if (!rec.studentId) {
      rec.status = "invalid";
      rec.reasons.unshift("Student ID is missing (do not edit system columns)");
      continue;
    }
    const st = students.get(rec.studentId);
    if (!st) {
      rec.status = "invalid";
      rec.reasons.unshift(`Student is not an active student of ${className(cs)}`);
      continue;
    }
    if (rec.name && normName(rec.name) !== normName(st.name)) {
      rec.status = "invalid";
      rec.reasons.unshift(`Student Name "${rec.name}" does not match the record ("${st.name}")`);
      continue;
    }
    rec.name = st.name;

    if (seen.has(rec.studentId)) {
      rec.status = "duplicate";
      rec.reasons = [`Duplicate in file — same student as row ${seen.get(rec.studentId)}`];
      continue;
    }
    seen.set(rec.studentId, rec.row);

    const ex = existing.get(rec.studentId);
    if (ex) {
      rec.status = "duplicate";
      rec.reasons = [
        `Fee record already exists (₹${Number(ex.fees || 0).toLocaleString("en-IN")}, ${ex.paymentStatus || "Unpaid"}) — not overwritten`,
      ];
      continue;
    }

    rec.status = rec.reasons.length ? "invalid" : "ready";
  }

  const ready = records.filter((r) => r.status === "ready");

  // ── Save ──
  if (!dryRun && ready.length > 0) {
    const [hasPaymentLog, hasCategories] = await Promise.all([
      tableExists("student_payment_log"),
      tableExists("fee_categories"),
    ]);
    const useCategories = hasCategories && prisma.feeCategory && prisma.studentFeeCategory;

    const created = await prisma.$transaction(
      async (tx) => {
        // Serialize bulk uploads per school so two simultaneous uploads
        // can't both insert the same student.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"bulk-fee:" + schoolId}))`;

        // Re-check duplicates inside the transaction (race-safe).
        const fresh = await getExistingFeeRecords(tx, schoolId, ready.map((r) => r.studentId));
        const toSave = [];
        for (const rec of ready) {
          if (fresh.has(rec.studentId)) {
            rec.status = "duplicate";
            rec.reasons = ["Fee record was created by another user just now — not overwritten"];
          } else toSave.push(rec);
        }

        // Reserve invoice numbers for all payments in one atomic update.
        const payCount = hasPaymentLog ? toSave.filter((r) => r.amountPaid > 0).length : 0;
        let nextSeq = 0;
        let prefix = "SCH";
        if (payCount > 0) {
          const school = await tx.school.update({
            where: { id: schoolId },
            data: { invoiceSeq: { increment: payCount } },
            select: { invoiceSeq: true, invoicePrefix: true, code: true },
          });
          prefix = invoicePrefix(school);
          nextSeq = school.invoiceSeq - payCount + 1;
        }

        const out = [];
        for (const rec of toSave) {
          const st = students.get(rec.studentId);
          const data = buildStudentListData(rec, st, cs, schoolId);
          const sl = await tx.studentList.create({ data: data.studentList });

          if (data.paymentLog && hasPaymentLog) {
            const invoiceNumber = `${prefix}-INV-${String(nextSeq++).padStart(5, "0")}`;
            await tx.studentPaymentLog.create({
              data: {
                ...data.paymentLog,
                studentListId: sl.id,
                invoiceNumber,
                createdBy: userId ? String(userId) : null,
              },
            });
            rec.invoiceNumber = invoiceNumber;
          }

          if (useCategories) {
            for (const c of data.categories) {
              const cat = await tx.feeCategory.upsert({
                where: { name_schoolId: { name: c.name, schoolId } },
                create: { name: c.name, order: c.order, schoolId },
                update: { isActive: true },
              });
              const sfc = await tx.studentFeeCategory.create({
                data: { studentListId: sl.id, categoryId: cat.id, totalAmount: c.amount, paidAmount: c.paid, schoolId },
              });
              if (c.paid > 0) {
                await tx.studentFeeCategoryPayment.create({
                  data: {
                    studentFeeCategoryId: sfc.id,
                    amount: c.paid,
                    paymentMode: rec.paymentMode || "Cash",
                    createdBy: userId || null,
                  },
                });
              }
            }
          }

          rec.status = "added";
          rec.studentListId = sl.id;
          out.push(sl);
        }
        return out;
      },
      { timeout: 120000, maxWait: 20000 },
    );

    // Backups are best-effort and happen only after a successful commit.
    await Promise.allSettled(
      created.map((sl) =>
        saveSchoolBackup({ schoolId, module: "studentList", recordId: String(sl.id), data: sl, action: "create" }),
      ),
    );
  }

  const count = (s) => records.filter((r) => r.status === s).length;
  const summary = {
    totalRecords: records.length,
    added: count("added"),
    ready: count("ready"),
    duplicates: count("duplicate"),
    invalid: count("invalid"),
    skippedBlank: count("blank"),
  };

  return {
    dryRun: !!dryRun,
    className: className(cs),
    summary,
    rows: records.map((r) => ({
      row: r.row,
      studentId: r.studentId,
      name: r.name,
      status: r.status,
      totalFee: r.totalFee,
      amountPaid: r.amountPaid,
      paymentMode: r.paymentMode,
      feeDate: r.feeDate,
      invoiceNumber: r.invoiceNumber || null,
      reasons: r.reasons,
    })),
  };
}