// ─────────────────────────────────────────────────────────────────────────────
// FeesInvoce.jsx — Fee Receipts & Statement
//
//  • One receipt per payment (instalment). Each receipt shows, per category:
//      Total | Paid Earlier | Paid Now | Balance
//    so the 2nd instalment receipt correctly includes the 1st instalment.
//  • Every receipt also lists ALL payments of the student (paid / pending
//    status, balance after each payment) and the outstanding balance.
//  • Fee Statement view: cumulative Total | Paid | Balance + full history.
//  • Preview (in-app PDF viewer), Print, Download for:
//      – the selected receipt
//      – any single receipt from the history table
//      – all receipts in one PDF (one page per payment)
//      – the fee statement
//  • Hide/Show category rows (excluded from on-screen totals, print & PDF).
//
//  Exports used elsewhere:
//    fmt, buildCategoryRows, generateFeeReceiptPdf, amountInWords
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Files,
  Layers,
  Loader2,
  Printer,
  Receipt,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── helpers ─────────────────────────────────────────────────────────────────
export const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

const todayLabel = () => fmtDate(new Date().toISOString());

const getToken = () => {
  try {
    return JSON.parse(localStorage.getItem("auth") || "{}")?.token;
  } catch {
    return null;
  }
};

const cleanPrefix = (p) =>
  (p || "SCH")
    .toString()
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 6) || "SCH";

// ── Amount in words (Indian numbering) ───────────────────────────────────────
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}
function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? twoDigits(r) : ""]
    .filter(Boolean)
    .join(" ");
}
function intToWords(n) {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  return [
    crore ? `${intToWords(crore)} Crore` : "",
    lakh ? `${twoDigits(lakh)} Lakh` : "",
    thousand ? `${twoDigits(thousand)} Thousand` : "",
    n ? threeDigits(n) : "",
  ]
    .filter(Boolean)
    .join(" ");
}
export function amountInWords(num) {
  const n = Math.round(Math.abs(Number(num) || 0));
  return `Rupees ${intToWords(n)} Only`;
}

// ── jsPDF loader (works even if the page didn't preload it) ──────────────────
let jsPdfPromise = null;
function ensureJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf);
  if (!jsPdfPromise) {
    jsPdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.async = true;
      s.onload = () => resolve(window.jspdf);
      s.onerror = () => {
        jsPdfPromise = null;
        reject(new Error("Could not load the PDF library"));
      };
      document.head.appendChild(s);
    });
  }
  return jsPdfPromise;
}

// ── Load logo → base64 for jsPDF (cached per URL) ────────────────────────────
const logoCache = new Map();
async function loadLogoForPDF(logoUrl) {
  if (!logoUrl) return null;
  if (logoCache.has(logoUrl)) return logoCache.get(logoUrl);
  try {
    const proxyUrl = `${API_URL}/api/image-proxy?url=${encodeURIComponent(
      logoUrl,
    )}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const blob = await res.blob();
    if (!blob || blob.size === 0) throw new Error("empty response");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = String(dataUrl).split(",")[1];
    if (!base64) throw new Error("base64 split failed");
    const mime = blob.type || "image/png";
    const result = { base64, format: /jpe?g/.test(mime) ? "JPEG" : "PNG" };
    logoCache.set(logoUrl, result);
    return result;
  } catch (err) {
    console.warn("[PDF Logo] proxy failed:", err.message);
    logoCache.set(logoUrl, null);
    return null;
  }
}

// ── Build category rows (ALL-TIME / fallback view) ───────────────────────────
// Exported — Studentfinance.jsx uses it as a fallback when a student has no
// payment history yet.
export function buildCategoryRows(student) {
  const customPaidMap = student.customPaidMap || {};

  if (
    Array.isArray(student.feeCategories) &&
    student.feeCategories.length > 0
  ) {
    return student.feeCategories.map((sfc) => {
      const name = sfc.category?.name || "Fee";
      const total = Number(sfc.totalAmount || 0);
      const mapped = customPaidMap[name.toLowerCase().trim()];
      const paid =
        mapped !== undefined ? Number(mapped) : Number(sfc.paidAmount || 0);
      return {
        id: name,
        name,
        total,
        paid,
        pending: Math.max(0, total - paid),
      };
    });
  }

  let bd = {};
  try {
    bd = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : {};
  } catch {}

  const KEY_LABEL = {
    collegeFee: ["School Fee", "schoolFeePaid"],
    tuitionFee: ["Tuition Fee", "tuitionFeePaid"],
    examFee: ["Exam Fee", "examFeePaid"],
    transportFee: ["Transport Fee", "transportFeePaid"],
    booksFee: ["Books Fee", "booksFeePaid"],
    labFee: ["Lab Fee", "labFeePaid"],
    miscFee: ["Miscellaneous", "miscFeePaid"],
  };

  const rows = [];
  for (const [key, [label, paidField]] of Object.entries(KEY_LABEL)) {
    const entry = bd[key];
    const total = entry
      ? Number(
          typeof entry === "object" ? entry.total ?? entry.amount ?? 0 : entry,
        )
      : 0;
    if (total <= 0) continue;
    const paid = Number(student[paidField] || 0);
    rows.push({
      id: label,
      name: label,
      total,
      paid,
      pending: Math.max(0, total - paid),
    });
  }

  if (Array.isArray(bd.customFees)) {
    bd.customFees.forEach((c) => {
      const total = Number(c.total ?? c.amount ?? 0);
      if (total <= 0 || !c.label) return;
      const paid = Number(customPaidMap[c.label.toLowerCase().trim()] || 0);
      rows.push({
        id: c.label,
        name: c.label,
        total,
        paid,
        pending: Math.max(0, total - paid),
      });
    });
  }

  if (rows.length === 0) {
    const total = Number(student.fees || 0);
    const paid = Number(student.paidAmount || 0);
    rows.push({
      id: "Total Fees",
      name: "Total Fees",
      total,
      paid,
      pending: Math.max(0, total - paid),
    });
  }
  return rows;
}

// ── Normalise a payment-history entry into receipt rows ──────────────────────
// Works with the new backend (previousPaid/summary) and degrades gracefully
// for older responses that only had amount/cumulativePaid/pending.
export function receiptRowsFromTxn(txn) {
  if (!txn || !Array.isArray(txn.items)) return [];
  return txn.items.map((it, i) => {
    const now = Number(it.amount || 0);
    const cum = Number(it.cumulativePaid ?? now);
    const prev = Number(it.previousPaid ?? Math.max(0, cum - now));
    const total = Number(it.totalAmount || 0);
    return {
      id: it.categoryName || `row_${i}`,
      name: it.categoryName || "Fee",
      total,
      prev,
      now,
      paid: prev + now,
      balance: Number(it.pending ?? Math.max(0, total - prev - now)),
      auto: Number(it.autoApplied || 0),
    };
  });
}

// Cumulative (statement) rows = state after the latest payment.
function statementRowsFrom(history, fallbackRows) {
  if (history.length > 0) {
    return receiptRowsFromTxn(history[0]).map((r) => ({
      ...r,
      now: 0,
      prev: r.paid,
    }));
  }
  return (fallbackRows || []).map((r) => ({
    id: r.id || r.name,
    name: r.name,
    total: r.total,
    prev: r.paid,
    now: 0,
    paid: r.paid,
    balance: r.pending,
  }));
}

function sumRows(rows) {
  return rows.reduce(
    (a, r) => ({
      total: a.total + r.total,
      prev: a.prev + r.prev,
      now: a.now + r.now,
      paid: a.paid + r.paid,
      balance: a.balance + r.balance,
    }),
    { total: 0, prev: 0, now: 0, paid: 0, balance: 0 },
  );
}

function txnSummary(txn) {
  if (txn?.summary) return txn.summary;
  const t = sumRows(receiptRowsFromTxn(txn));
  return {
    totalFees: t.total,
    previousPaid: t.prev,
    paidNow: t.now,
    totalPaid: t.paid,
    balance: t.balance,
  };
}

function receiptNumber(txn, student, prefix) {
  if (txn?.invoiceNumber) return txn.invoiceNumber;
  const seq = txn?.receiptNo || txn?.installmentNo || 1;
  return `${cleanPrefix(prefix)}-RCPT-${student.id}-${String(seq).padStart(
    3,
    "0",
  )}`;
}

const statementNumber = (student, prefix) =>
  `${cleanPrefix(prefix)}-STMT-${String(student.id).padStart(5, "0")}`;

const finalInvoiceNumber = (student, prefix) =>
  `${cleanPrefix(prefix)}-FINV-${String(student.id).padStart(5, "0")}`;

const fmtShortDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Kolkata",
  });

// category name → dates (oldest first) on which something was paid against it
export function categoryPaidDates(history) {
  const map = {};
  [...history].reverse().forEach((t) =>
    (t.items || []).forEach((it) => {
      if (Number(it.amount) > 0)
        (map[it.categoryName] ||= []).push(fmtShortDate(t.date));
    }),
  );
  return map;
}

// one group per payment (oldest first) with the categories it covered
export function paymentGroups(history) {
  return [...history].reverse().map((t) => {
    const s = txnSummary(t);
    const lines = (t.items || [])
      .filter((it) => Number(it.amount) > 0)
      .map((it) => ({ name: it.categoryName, amount: Number(it.amount) }));
    if (lines.length === 0)
      lines.push({ name: "Fee payment", amount: s.paidNow });
    return { txn: t, s, lines };
  });
}

function paymentPeriod(history) {
  if (!history.length) return "—";
  const first = fmtDate(history[history.length - 1].date);
  const last = fmtDate(history[0].date);
  return first === last ? first : `${first} – ${last}`;
}

// Explains money in a payment that was saved without a fee category
export function unallocatedNote(txn, { rupee = "₹" } = {}) {
  const u = txn?.unallocated;
  if (!u || !(u.amount > 0)) return "";
  const r = (n) => `${rupee}${fmt(n)}`;
  const from = u.orphanLabels?.length
    ? ` (saved under "${u.orphanLabels.join(
        '", "',
      )}", which is no longer in this student's fee list)`
    : "";
  const applied = (u.appliedTo || [])
    .map((a) => `${a.categoryName} ${r(a.amount)}`)
    .join(", ");
  return (
    `${r(
      u.amount,
    )} of this payment was recorded without a fee category${from}. ` +
    (applied ? `It has been adjusted against: ${applied}. ` : "") +
    (u.excess > 0
      ? `${r(u.excess)} exceeds all pending fees and is shown as advance. `
      : "")
  ).trim();
}

const statusText = (balance, paid) =>
  balance <= 0 ? "FULLY PAID" : paid > 0 ? "PARTIALLY PAID" : "UNPAID";

// ═════════════════════════════════════════════════════════════════════════════
// PDF ENGINE (jsPDF, A4, mm)
// ═════════════════════════════════════════════════════════════════════════════
const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CW = PAGE_W - M * 2;
const BOTTOM = 272;

const COL = {
  navy: [28, 48, 68],
  navy2: [39, 67, 91],
  light: [240, 247, 252],
  stripe: [248, 251, 253],
  hilite: [255, 248, 220],
  text: [30, 50, 70],
  muted: [95, 118, 138],
  green: [26, 110, 62],
  red: [170, 40, 40],
  line: [208, 226, 238],
  white: [255, 255, 255],
};

const rs = (n) => `Rs. ${fmt(n)}`;

function fit(doc, text, width) {
  const s = String(text ?? "");
  if (doc.getTextWidth(s) <= width) return s;
  let t = s;
  while (t.length > 1 && doc.getTextWidth(t + "…") > width) t = t.slice(0, -1);
  return t + "…";
}

function setFont(doc, size, style = "normal", color = COL.text) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function drawHeader(doc, ctx, { title, docNo, bandLeft, bandMid, bandRight }) {
  const H = 36;
  doc.setFillColor(...COL.navy);
  doc.rect(0, 0, PAGE_W, H, "F");

  let tx = M;
  if (ctx.logo) {
    try {
      doc.setFillColor(...COL.white);
      doc.roundedRect(M, 6, 24, 24, 3, 3, "F");
      doc.addImage(
        `data:image/${ctx.logo.format.toLowerCase()};base64,${ctx.logo.base64}`,
        ctx.logo.format,
        M + 1.5,
        7.5,
        21,
        21,
      );
      tx = M + 29;
    } catch (e) {
      console.warn("addImage failed:", e);
    }
  }

  const textW = PAGE_W - M - 62 - tx;
  setFont(doc, 15, "bold", COL.white);
  doc.text(fit(doc, ctx.school.name || "School", textW), tx, 14);
  setFont(doc, 8, "normal", [180, 205, 220]);
  if (ctx.school.address) doc.text(fit(doc, ctx.school.address, textW), tx, 21);
  if (ctx.school.phone)
    doc.text(fit(doc, `Phone: ${ctx.school.phone}`, textW), tx, 27);

  const bx = PAGE_W - M - 58;
  doc.setFillColor(...COL.white);
  doc.roundedRect(bx, 7, 58, 22, 3, 3, "F");
  setFont(doc, 10, "bold", COL.navy);
  doc.text(title, bx + 29, 15, { align: "center" });
  setFont(doc, 8.5, "bold", COL.navy2);
  doc.text(fit(doc, docNo, 54), bx + 29, 23, { align: "center" });

  doc.setFillColor(...COL.navy2);
  doc.rect(0, H, PAGE_W, 8, "F");
  setFont(doc, 8.5, "normal", [200, 220, 232]);
  if (bandLeft) doc.text(bandLeft, M, H + 5.5);
  if (bandMid) doc.text(bandMid, PAGE_W / 2, H + 5.5, { align: "center" });
  if (bandRight) doc.text(bandRight, PAGE_W - M, H + 5.5, { align: "right" });
  return H + 8;
}

function drawStudentBox(doc, y, student, rightExtra) {
  const h = 25;
  doc.setFillColor(...COL.light);
  doc.setDrawColor(...COL.line);
  doc.roundedRect(M, y, CW, h, 2.5, 2.5, "FD");

  const L = [
    ["Student Name", student.name || "—"],
    ["Class / Course", student.course || "—"],
    ["Student ID", `#${student.id}`],
  ];
  const R = [
    ["Parent Phone", student.phone || "—"],
    ["Email", student.email || "—"],
    rightExtra || ["", ""],
  ];
  const half = CW / 2;
  [L, R].forEach((col, ci) => {
    const x = M + 4 + ci * half;
    col.forEach(([lbl, val], ri) => {
      if (!lbl) return;
      const yy = y + 7 + ri * 7;
      setFont(doc, 7.5, "bold", COL.muted);
      doc.text(lbl.toUpperCase(), x, yy);
      setFont(doc, 9, "bold", COL.text);
      doc.text(fit(doc, val, half - 36), x + 30, yy);
    });
  });
  return y + h + 6;
}

function sectionTitle(doc, y, text) {
  setFont(doc, 8.5, "bold", COL.navy);
  doc.text(text, M, y);
  doc.setDrawColor(...COL.line);
  doc.setLineWidth(0.3);
  doc.line(M + doc.getTextWidth(text) + 3, y - 1, PAGE_W - M, y - 1);
  return y + 3;
}

function ensureSpace(doc, y, need) {
  if (y + need <= BOTTOM) return y;
  doc.addPage();
  return 16;
}

// cols: [{ label, x, align }] — x is the left edge (align left) or right edge
// rows: [{ cells: [{ text, color, bold }], fill }]
function drawTable(doc, y, cols, rows, footer) {
  const RH = 7.2;
  const header = () => {
    doc.setFillColor(...COL.navy);
    doc.rect(M, y, CW, 8, "F");
    setFont(doc, 8, "bold", COL.white);
    cols.forEach((c) =>
      doc.text(c.label, c.x, y + 5.4, { align: c.align || "left" }),
    );
    y += 8;
  };
  y = ensureSpace(doc, y, 8 + RH * 2);
  header();

  rows.forEach((r, i) => {
    if (y + RH > BOTTOM) {
      doc.addPage();
      y = 16;
      header();
    }
    const fill = r.fill || (i % 2 === 0 ? COL.stripe : COL.white);
    doc.setFillColor(...fill);
    doc.rect(M, y, CW, RH, "F");
    r.cells.forEach((cell, ci) => {
      const c = cols[ci];
      setFont(doc, 8.5, cell.bold ? "bold" : "normal", cell.color || COL.text);
      doc.text(
        cell.maxW ? fit(doc, cell.text, cell.maxW) : String(cell.text ?? ""),
        c.x,
        y + 4.9,
        {
          align: c.align || "left",
        },
      );
    });
    y += RH;
  });

  if (footer) {
    y = ensureSpace(doc, y, 8);
    doc.setFillColor(...COL.navy);
    doc.rect(M, y, CW, 8, "F");
    footer.forEach((cell, ci) => {
      if (cell == null) return;
      const c = cols[ci];
      setFont(doc, 8.5, "bold", cell.color || COL.white);
      doc.text(String(cell.text ?? cell), c.x, y + 5.4, {
        align: c.align || "left",
      });
    });
    y += 8;
  }
  doc.setDrawColor(...COL.line);
  doc.setLineWidth(0.2);
  return y + 5;
}

function drawSummaryBlock(doc, y, lines, wordsLabel, wordsAmount) {
  const boxW = 78;
  const lh = 6.6;
  const boxH = lines.length * lh + 5;
  y = ensureSpace(doc, y, boxH + 2);
  const bx = PAGE_W - M - boxW;

  // Amount in words (left)
  const wW = CW - boxW - 6;
  doc.setFillColor(...COL.light);
  doc.setDrawColor(...COL.line);
  doc.roundedRect(M, y, wW, boxH, 2.5, 2.5, "FD");
  setFont(doc, 7.5, "bold", COL.muted);
  doc.text(wordsLabel.toUpperCase(), M + 4, y + 7);
  setFont(doc, 9.5, "bold", COL.text);
  doc.text(
    doc.splitTextToSize(amountInWords(wordsAmount), wW - 8).slice(0, 3),
    M + 4,
    y + 13.5,
  );

  // Summary box (right) — text colour shares jsPDF's fill register, reset it
  doc.setFillColor(...COL.light);
  doc.setDrawColor(...COL.line);
  doc.roundedRect(bx, y, boxW, boxH, 2.5, 2.5, "FD");
  lines.forEach((ln, i) => {
    const yy = y + 7 + i * lh;
    if (ln.divider) {
      doc.setDrawColor(...COL.navy);
      doc.setLineWidth(0.35);
      doc.line(bx + 4, yy - 4.6, bx + boxW - 4, yy - 4.6);
    }
    setFont(
      doc,
      ln.strong ? 9.5 : 8.5,
      ln.strong ? "bold" : "normal",
      ln.strong ? COL.navy : COL.muted,
    );
    doc.text(ln.label, bx + 4, yy);
    setFont(doc, ln.strong ? 9.5 : 8.5, "bold", ln.color || COL.text);
    doc.text(rs(ln.value), bx + boxW - 4, yy, { align: "right" });
  });
  return y + boxH + 7;
}

function drawHistoryTable(doc, y, history, highlightId, student, prefix) {
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, "PAYMENT HISTORY (ALL INSTALMENTS)");
  const cols = [
    { label: "#", x: M + 3 },
    { label: "Date", x: M + 10 },
    { label: "Receipt No", x: M + 38 },
    { label: "Mode", x: M + 84 },
    { label: "Amount Paid", x: M + 122, align: "right" },
    { label: "Balance After", x: M + 148, align: "right" },
    { label: "Status", x: M + CW - 3, align: "right" },
  ];
  const oldestFirst = [...history].reverse();
  const rows = oldestFirst.map((t, i) => {
    const s = txnSummary(t);
    const isThis = t.id === highlightId;
    return {
      fill: isThis ? COL.hilite : undefined,
      cells: [
        { text: t.installmentNo || i + 1 },
        { text: fmtDate(t.date) },
        { text: receiptNumber(t, student, prefix), maxW: 44 },
        { text: t.paymentMode || t.items?.[0]?.paymentMode || "—", maxW: 18 },
        { text: rs(s.paidNow), color: COL.green, bold: true },
        { text: rs(s.balance), color: s.balance > 0 ? COL.red : COL.green },
        {
          text: isThis ? "THIS RECEIPT" : "PAID",
          color: COL.green,
          bold: isThis,
        },
      ],
    };
  });
  const last = history[0] ? txnSummary(history[0]) : null;
  if (last && last.balance > 0) {
    rows.push({
      fill: [253, 240, 240],
      cells: [
        { text: "" },
        { text: "Outstanding", bold: true, color: COL.red },
        { text: "" },
        { text: "" },
        { text: "" },
        { text: rs(last.balance), bold: true, color: COL.red },
        { text: "PENDING", bold: true, color: COL.red },
      ],
    });
  }
  const totalPaid = oldestFirst.reduce((a, t) => a + txnSummary(t).paidNow, 0);
  return drawTable(doc, y, cols, rows, [
    null,
    { text: "TOTAL" },
    { text: `${history.length} payment(s)` },
    null,
    { text: rs(totalPaid) },
    null,
    null,
  ]);
}

function drawSignatures(doc, y) {
  // may use the space down to the footer band (signatures are short)
  y += 4;
  if (y + 20 > PAGE_H - 15) {
    doc.addPage();
    y = 16;
  }
  setFont(doc, 7.5, "normal", COL.muted);
  doc.text(
    "Note: Fees once paid are not refundable. Please keep this receipt for future reference.",
    M,
    y,
  );
  y += 13;
  doc.setDrawColor(...COL.muted);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + 55, y);
  doc.line(PAGE_W - M - 55, y, PAGE_W - M, y);
  setFont(doc, 8, "bold", COL.text);
  doc.text("Parent / Payer Signature", M, y + 4.5);
  doc.text("Authorised Signatory", PAGE_W - M, y + 4.5, { align: "right" });
  return y + 8;
}

function drawFooters(doc, schoolName) {
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...COL.navy);
    doc.rect(0, PAGE_H - 12, PAGE_W, 12, "F");
    setFont(doc, 7.5, "normal", [180, 205, 220]);
    doc.text(
      `${
        schoolName || "School"
      } · Computer-generated document — no signature required if issued online.`,
      M,
      PAGE_H - 5,
    );
    doc.text(`Page ${i} of ${n}`, PAGE_W - M, PAGE_H - 5, { align: "right" });
  }
}

function drawReceiptPage(doc, ctx, txn, hidden) {
  const s = txnSummary(txn);
  const allRows = receiptRowsFromTxn(txn);
  const rows = allRows.filter((r) => !hidden?.has(r.id));
  const t = rows.length
    ? sumRows(rows)
    : {
        total: s.totalFees,
        prev: s.previousPaid,
        now: s.paidNow,
        paid: s.totalPaid,
        balance: s.balance,
      };
  const totalInst = txn.totalInstallments || ctx.history.length || 1;

  let y = drawHeader(doc, ctx, {
    title: "FEE RECEIPT",
    docNo: receiptNumber(txn, ctx.student, ctx.prefix),
    bandLeft: `Receipt Date: ${fmtDate(txn.date)}`,
    bandMid: `Instalment ${txn.installmentNo || 1} of ${totalInst}`,
    bandRight: `Status: ${statusText(t.balance, t.paid)}`,
  });
  y = drawStudentBox(doc, y + 6, ctx.student, [
    "Payment Mode",
    txn.paymentMode || txn.items?.[0]?.paymentMode || "Cash",
  ]);

  y = sectionTitle(doc, y, "FEE DETAILS");
  const cols = [
    { label: "#", x: M + 3 },
    { label: "Fee Category", x: M + 10 },
    { label: "Total Fee", x: M + 96, align: "right" },
    { label: "Paid Earlier", x: M + 124, align: "right" },
    { label: "Paid Now", x: M + 152, align: "right" },
    { label: "Balance", x: M + CW - 3, align: "right" },
  ];
  y = drawTable(
    doc,
    y,
    cols,
    rows.map((r, i) => ({
      cells: [
        { text: i + 1 },
        { text: r.name, maxW: 62, bold: true },
        { text: rs(r.total) },
        { text: rs(r.prev), color: COL.muted },
        {
          text: rs(r.now) + (r.auto > 0 ? "*" : ""),
          color: r.now > 0 ? COL.green : COL.muted,
          bold: r.now > 0,
        },
        {
          text: rs(r.balance),
          color: r.balance > 0 ? COL.red : COL.green,
          bold: true,
        },
      ],
    })),
    [
      null,
      { text: "TOTAL" },
      { text: rs(t.total) },
      { text: rs(t.prev) },
      { text: rs(t.now), color: [125, 223, 176] },
      {
        text: rs(t.balance),
        color: t.balance > 0 ? [249, 168, 168] : [125, 223, 176],
      },
    ],
  );
  const note = unallocatedNote(txn, { rupee: "Rs. " });
  if (note) {
    setFont(doc, 7.5, "italic", COL.muted);
    const lines = doc.splitTextToSize("* " + note, CW);
    y = ensureSpace(doc, y - 2, lines.length * 3.5 + 3);
    doc.text(lines, M, y);
    y += lines.length * 3.5 + 3;
  }

  y = drawSummaryBlock(
    doc,
    y,
    [
      { label: "Total Fees", value: t.total },
      { label: "Paid Earlier", value: t.prev },
      { label: "Paid Now (this receipt)", value: t.now, color: COL.green },
      { label: "Total Paid till date", value: t.paid, color: COL.green },
      {
        label: "Balance Due",
        value: t.balance,
        color: t.balance > 0 ? COL.red : COL.green,
        strong: true,
        divider: true,
      },
    ],
    "Amount received (in words)",
    t.now,
  );

  y = drawHistoryTable(doc, y, ctx.history, txn.id, ctx.student, ctx.prefix);
  drawSignatures(doc, y);
}

function drawStatementPage(doc, ctx, hidden) {
  const rows = statementRowsFrom(ctx.history, ctx.fallbackRows).filter(
    (r) => !hidden?.has(r.id),
  );
  const t = sumRows(rows);

  let y = drawHeader(doc, ctx, {
    title: "FEE STATEMENT",
    docNo: statementNumber(ctx.student, ctx.prefix),
    bandLeft: `Statement Date: ${todayLabel()}`,
    bandMid: `${ctx.history.length} payment(s) recorded`,
    bandRight: `Status: ${statusText(t.balance, t.paid)}`,
  });
  const lastPay = ctx.history[0] ? fmtDate(ctx.history[0].date) : "—";
  y = drawStudentBox(doc, y + 6, ctx.student, ["Last Payment", lastPay]);

  y = sectionTitle(doc, y, "FEE SUMMARY BY CATEGORY");
  const cols = [
    { label: "#", x: M + 3 },
    { label: "Fee Category", x: M + 10 },
    { label: "Total Fee", x: M + 110, align: "right" },
    { label: "Paid", x: M + 145, align: "right" },
    { label: "Balance", x: M + CW - 3, align: "right" },
  ];
  y = drawTable(
    doc,
    y,
    cols,
    rows.map((r, i) => ({
      cells: [
        { text: i + 1 },
        { text: r.name, maxW: 80, bold: true },
        { text: rs(r.total) },
        { text: rs(r.paid), color: COL.green },
        {
          text: r.balance > 0 ? rs(r.balance) : "Cleared",
          color: r.balance > 0 ? COL.red : COL.green,
          bold: true,
        },
      ],
    })),
    [
      null,
      { text: "TOTAL" },
      { text: rs(t.total) },
      { text: rs(t.paid), color: [125, 223, 176] },
      {
        text: rs(t.balance),
        color: t.balance > 0 ? [249, 168, 168] : [125, 223, 176],
      },
    ],
  );

  y = drawSummaryBlock(
    doc,
    y,
    [
      { label: "Total Fees", value: t.total },
      { label: "Total Paid", value: t.paid, color: COL.green },
      {
        label: "Balance Due",
        value: t.balance,
        color: t.balance > 0 ? COL.red : COL.green,
        strong: true,
        divider: true,
      },
    ],
    "Total paid (in words)",
    t.paid,
  );

  if (ctx.history.length > 0)
    y = drawHistoryTable(doc, y, ctx.history, null, ctx.student, ctx.prefix);
  drawSignatures(doc, y);
}

function drawFinalInvoicePage(doc, ctx, hidden) {
  const rows = statementRowsFrom(ctx.history, ctx.fallbackRows).filter(
    (r) => !hidden?.has(r.id),
  );
  const t = sumRows(rows);
  const isFull = t.balance <= 0 && t.total > 0;
  const dates = categoryPaidDates(ctx.history);
  const groups = paymentGroups(ctx.history);

  let y = drawHeader(doc, ctx, {
    title: isFull ? "FINAL INVOICE" : "FEE INVOICE",
    docNo: finalInvoiceNumber(ctx.student, ctx.prefix),
    bandLeft: `Invoice Date: ${todayLabel()}`,
    bandMid: `${ctx.history.length} payment(s) received`,
    bandRight: `Status: ${statusText(t.balance, t.paid)}`,
  });
  y = drawStudentBox(doc, y + 6, ctx.student, [
    "Payment Period",
    paymentPeriod(ctx.history),
  ]);

  // 1. Category summary with the dates each category was paid
  y = sectionTitle(doc, y, "FEE SUMMARY BY CATEGORY");
  const catCols = [
    { label: "#", x: M + 3 },
    { label: "Fee Category", x: M + 10 },
    { label: "Total Fee", x: M + 76, align: "right" },
    { label: "Paid", x: M + 100, align: "right" },
    { label: "Balance", x: M + 122, align: "right" },
    { label: "Paid On", x: M + 126 },
  ];
  const datesText = (d = []) =>
    d.length === 0
      ? "—"
      : d.length <= 3
      ? d.join(", ")
      : `${d[0]} … ${d[d.length - 1]} (${d.length} times)`;
  y = drawTable(
    doc,
    y,
    catCols,
    rows.map((r, i) => ({
      cells: [
        { text: i + 1 },
        { text: r.name, maxW: 38, bold: true },
        { text: rs(r.total) },
        { text: rs(r.paid), color: COL.green },
        {
          text: r.balance > 0 ? rs(r.balance) : "Cleared",
          color: r.balance > 0 ? COL.red : COL.green,
          bold: true,
        },
        { text: datesText(dates[r.name]), maxW: CW - 128, color: COL.muted },
      ],
    })),
    [
      null,
      { text: "TOTAL" },
      { text: rs(t.total) },
      { text: rs(t.paid), color: [125, 223, 176] },
      {
        text: rs(t.balance),
        color: t.balance > 0 ? [249, 168, 168] : [125, 223, 176],
      },
      null,
    ],
  );

  // 2. Every payment with date, receipt, mode and what it paid for
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, "PAYMENT-WISE DETAILS");
  const payCols = [
    { label: "#", x: M + 3 },
    { label: "Paid On", x: M + 10 },
    { label: "Receipt No", x: M + 35 },
    { label: "Mode", x: M + 79 },
    { label: "Fee Category", x: M + 101 },
    { label: "Amount", x: M + 155, align: "right" },
    { label: "Balance After", x: M + CW - 3, align: "right" },
  ];
  const payRows = [];
  groups.forEach((g, gi) => {
    const fill = gi % 2 === 0 ? COL.stripe : COL.white;
    g.lines.forEach((ln, li) => {
      const first = li === 0;
      payRows.push({
        fill,
        cells: [
          { text: first ? g.txn.installmentNo || gi + 1 : "" },
          { text: first ? fmtDate(g.txn.date) : "", bold: true },
          {
            text: first ? receiptNumber(g.txn, ctx.student, ctx.prefix) : "",
            maxW: 42,
          },
          {
            text: first
              ? g.txn.paymentMode || g.txn.items?.[0]?.paymentMode || "—"
              : "",
            maxW: 20,
          },
          { text: ln.name, maxW: 40 },
          { text: rs(ln.amount), color: COL.green },
          {
            text: first ? rs(g.s.balance) : "",
            color: g.s.balance > 0 ? COL.red : COL.green,
          },
        ],
      });
    });
    if (g.lines.length > 1) {
      payRows.push({
        fill,
        cells: [
          { text: "" },
          { text: "" },
          { text: "" },
          { text: "" },
          { text: "Payment total", bold: true, color: COL.muted },
          { text: rs(g.s.paidNow), bold: true, color: COL.green },
          { text: "" },
        ],
      });
    }
  });
  const totalPaid = groups.reduce((a, g) => a + g.s.paidNow, 0);
  y = drawTable(doc, y, payCols, payRows, [
    null,
    { text: "TOTAL" },
    { text: `${groups.length} payment(s)` },
    null,
    null,
    { text: rs(totalPaid), color: [125, 223, 176] },
    {
      text: rs(t.balance),
      color: t.balance > 0 ? [249, 168, 168] : [125, 223, 176],
    },
  ]);

  // 3. Totals + words
  y = drawSummaryBlock(
    doc,
    y,
    [
      { label: "Total Fees", value: t.total },
      { label: "Total Paid", value: t.paid, color: COL.green },
      {
        label: "Balance Due",
        value: t.balance,
        color: t.balance > 0 ? COL.red : COL.green,
        strong: true,
        divider: true,
      },
    ],
    "Total amount received (in words)",
    t.paid,
  );

  // 4. Status banner
  y = ensureSpace(doc, y, 14);
  doc.setFillColor(...(isFull ? [237, 247, 241] : [253, 240, 240]));
  doc.setDrawColor(...(isFull ? COL.green : COL.red));
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CW, 11, 2, 2, "FD");
  setFont(doc, 10, "bold", isFull ? COL.green : COL.red);
  doc.text(
    isFull
      ? "ALL FEES PAID IN FULL — NO DUES PENDING"
      : `PROVISIONAL — BALANCE DUE ${rs(
          t.balance,
        )}. Final invoice is issued once fully paid.`,
    PAGE_W / 2,
    y + 7,
    { align: "center" },
  );
  drawSignatures(doc, y + 14);
}

/**
 * Build a fee PDF.
 * @param {object}  o
 * @param {"receipt"|"all"|"statement"|"final"} o.mode
 * @param {object}  o.student       StudentList row
 * @param {Array}   o.history       /paymentHistory response (newest first)
 * @param {string}  [o.txnId]       receipt to print (mode "receipt"); default newest
 * @param {object}  o.school        { name, address, phone }
 * @param {string}  [o.logoUrl]
 * @param {string}  [o.invoicePrefix]
 * @param {Set}     [o.hiddenRows]  category names to leave out (receipt/statement)
 * @param {Array}   [o.fallbackRows] buildCategoryRows(student) — used when no history
 * @returns {Promise<{doc: any, filename: string, title: string}>}
 */
export async function generateFeeReceiptPdf(o) {
  const { jsPDF } = await ensureJsPdf();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const history = Array.isArray(o.history) ? o.history : [];
  const ctx = {
    student: o.student,
    history,
    school: o.school || {},
    prefix: o.invoicePrefix,
    fallbackRows: o.fallbackRows || buildCategoryRows(o.student),
    logo: await loadLogoForPDF(o.logoUrl),
  };
  const safeName = (o.student.name || "Student").replace(/[^\w]+/g, "_");
  let filename;
  let title;

  if (o.mode === "all" && history.length > 0) {
    [...history].reverse().forEach((txn, i) => {
      if (i > 0) doc.addPage();
      drawReceiptPage(doc, ctx, txn, null);
    });
    filename = `Fee_Receipts_All_${safeName}.pdf`;
    title = `All receipts (${history.length})`;
  } else if (o.mode === "final" && history.length > 0) {
    drawFinalInvoicePage(doc, ctx, o.hiddenRows);
    const no = finalInvoiceNumber(o.student, o.invoicePrefix);
    filename = `Final_Invoice_${safeName}_${no}.pdf`;
    title = `Final invoice ${no}`;
  } else if (o.mode === "receipt" && history.length > 0) {
    const txn = history.find((t) => t.id === o.txnId) || history[0];
    drawReceiptPage(doc, ctx, txn, o.hiddenRows);
    const no = receiptNumber(txn, o.student, o.invoicePrefix);
    filename = `Fee_Receipt_${safeName}_${no}.pdf`;
    title = `Receipt ${no}`;
  } else {
    drawStatementPage(doc, ctx, o.hiddenRows);
    filename = `Fee_Statement_${safeName}.pdf`;
    title = "Fee statement";
  }

  drawFooters(doc, ctx.school.name);
  doc.setProperties({
    title: filename.replace(/\.pdf$/, ""),
    subject: "Fee receipt",
    creator: ctx.school.name || "School",
  });
  return { doc, filename, title };
}

// ═════════════════════════════════════════════════════════════════════════════
// UI
// ═════════════════════════════════════════════════════════════════════════════
function StatusBadge({ balance, paid }) {
  const full = balance <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        full
          ? "bg-[#edf7f1] border-[#b2dfc6] text-[#1a6e3e]"
          : paid > 0
          ? "bg-[#fef6e7] border-[#fde68a] text-[#92400e]"
          : "bg-[#fdf0f0] border-[#f5c2c2] text-[#a33030]"
      }`}
    >
      {full ? <CheckCircle2 size={10} /> : <Clock size={10} />}
      {statusText(balance, paid)}
    </span>
  );
}

function ToolbarBtn({
  onClick,
  icon: Icon,
  children,
  primary,
  disabled,
  title,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
        primary
          ? "bg-[#1C3044] border-[#1C3044] text-white hover:bg-[#27435B]"
          : "bg-white border-[#c8dff0] text-[#1C3044] hover:bg-[#f0f7fc]"
      }`}
    >
      <Icon size={13} /> {children}
    </button>
  );
}

// ── In-app PDF preview ───────────────────────────────────────────────────────
function PdfPreview({ preview, onClose }) {
  const frameRef = useRef(null);

  const doPrint = () => {
    try {
      frameRef.current?.contentWindow?.focus();
      frameRef.current?.contentWindow?.print();
    } catch {
      window.open(preview.url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[94vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#1C3044] flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Eye size={15} color="#fff" />
            <span className="text-white text-sm font-bold truncate">
              Preview · {preview.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={doPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg border border-white/30 bg-white/15 hover:bg-white/25"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={() => preview.doc.save(preview.filename)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg border border-white/30 bg-white/15 hover:bg-white/25"
            >
              <Download size={13} /> Download
            </button>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg border border-white/30 bg-white/15 hover:bg-white/25"
            >
              <ExternalLink size={13} /> Open
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <iframe
          ref={frameRef}
          title="Receipt preview"
          src={preview.url}
          className="flex-1 w-full bg-[#525659]"
        />
        <div className="px-4 py-1.5 text-[10.5px] text-[#4A6B80] bg-[#f8fafc] border-t border-[#e0eef6] sm:hidden">
          Preview not showing on your phone? Tap <strong>Open</strong> or{" "}
          <strong>Download</strong>.
        </div>
      </div>
    </div>
  );
}

// Payment-wise details (Final Invoice view)
function FinalPaymentsTable({ history, student, invoicePrefix }) {
  const groups = paymentGroups(history);
  const total = groups.reduce((a, g) => a + g.s.paidNow, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] min-w-[640px]">
        <thead>
          <tr className="bg-[#f0f7fc] text-[#4A6B80]">
            {[
              "#",
              "Paid On",
              "Receipt No",
              "Mode",
              "Fee Category",
              "Amount",
              "Balance After",
            ].map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                  i >= 5 ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g, gi) => (
            <React.Fragment key={g.txn.id}>
              {g.lines.map((ln, li) => (
                <tr
                  key={li}
                  className={`${li === 0 ? "border-t border-[#e0eef6]" : ""} ${
                    gi % 2 ? "bg-white" : "bg-[#f8fafc]"
                  }`}
                >
                  <td className="px-3 py-1.5 text-[#8fa3b1]">
                    {li === 0 ? g.txn.installmentNo : ""}
                  </td>
                  <td className="px-3 py-1.5 font-semibold text-[#1C3044] whitespace-nowrap">
                    {li === 0 ? fmtDate(g.txn.date) : ""}
                  </td>
                  <td className="px-3 py-1.5 text-[#27435B] whitespace-nowrap">
                    {li === 0
                      ? receiptNumber(g.txn, student, invoicePrefix)
                      : ""}
                  </td>
                  <td className="px-3 py-1.5 text-[#4A6B80]">
                    {li === 0
                      ? g.txn.paymentMode ||
                        g.txn.items?.[0]?.paymentMode ||
                        "—"
                      : ""}
                  </td>
                  <td className="px-3 py-1.5 text-[#1C3044]">{ln.name}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-[#1a6e3e]">
                    ₹{fmt(ln.amount)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right ${
                      g.s.balance > 0 ? "text-[#a33030]" : "text-[#1a6e3e]"
                    }`}
                  >
                    {li === 0 ? `₹${fmt(g.s.balance)}` : ""}
                  </td>
                </tr>
              ))}
              {g.lines.length > 1 && (
                <tr className={gi % 2 ? "bg-white" : "bg-[#f8fafc]"}>
                  <td colSpan={4} />
                  <td className="px-3 py-1.5 font-bold text-[#4A6B80]">
                    Payment total
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-[#1a6e3e]">
                    ₹{fmt(g.s.paidNow)}
                  </td>
                  <td />
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[#1C3044] text-white font-bold">
            <td className="px-3 py-2" colSpan={5}>
              TOTAL · {groups.length} payment(s)
            </td>
            <td className="px-3 py-2 text-right text-[#7ddfb0]">
              ₹{fmt(total)}
            </td>
            <td className="px-3 py-2 text-right">
              ₹{fmt(groups.length ? groups[groups.length - 1].s.balance : 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function InvoiceModal({
  student,
  onClose,
  schoolName,
  schoolAddress,
  schoolPhone,
  schoolLogoUrl,
  invoicePrefix,
}) {
  const [logoUrl, setLogoUrl] = useState(schoolLogoUrl || null);
  const [fallbackRows, setFallbackRows] = useState(() =>
    buildCategoryRows(student),
  );
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("receipt"); // "receipt" | "final" | "statement"
  const [hiddenRows, setHiddenRows] = useState(new Set());
  const [busy, setBusy] = useState(""); // which action is generating
  const [preview, setPreview] = useState(null);

  const school = {
    name: schoolName,
    address: schoolAddress,
    phone: schoolPhone,
  };

  // ── Logo ──
  useEffect(() => {
    if (logoUrl) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/school/logo`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch {}
    })();
  }, []);

  // ── Payment history (+ category fallback for students with no payments) ──
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${getToken()}` };
      try {
        const [hRes, cRes] = await Promise.all([
          fetch(`${API_URL}/api/finance/paymentHistory/${student.id}`, {
            headers,
          }),
          fetch(`${API_URL}/api/finance/studentFeeCategories/${student.id}`, {
            headers,
          }).catch(() => null),
        ]);
        if (!alive) return;
        if (hRes.ok) {
          const data = await hRes.json();
          const list = Array.isArray(data) ? data : [];
          setHistory(list);
          setSelectedId(list[0]?.id || null);
          if (list.length === 0) setView("statement");
        } else {
          setView("statement");
        }
        if (cRes?.ok) {
          const cats = await cRes.json();
          if (Array.isArray(cats) && cats.length > 0)
            setFallbackRows(
              buildCategoryRows({ ...student, feeCategories: cats }),
            );
        }
      } catch (e) {
        console.error("[FeesInvoice] load failed:", e.message);
        setView("statement");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [student.id]);

  // Revoke preview blob URLs
  useEffect(
    () => () => preview?.url && URL.revokeObjectURL(preview.url),
    [preview],
  );

  const selectedTxn =
    history.find((t) => t.id === selectedId) || history[0] || null;
  const isReceipt = view === "receipt" && !!selectedTxn;
  const isFinal = view === "final" && history.length > 0;
  const paidDates = useMemo(() => categoryPaidDates(history), [history]);

  const baseRows = useMemo(
    () =>
      isReceipt
        ? receiptRowsFromTxn(selectedTxn)
        : statementRowsFrom(history, fallbackRows),
    [isReceipt, selectedTxn, history, fallbackRows],
  );
  const visibleRows = baseRows.filter((r) => !hiddenRows.has(r.id));
  const tot = sumRows(visibleRows);
  const paidPct =
    tot.total > 0 ? Math.min(100, Math.round((tot.paid / tot.total) * 100)) : 0;
  const docNo = isReceipt
    ? receiptNumber(selectedTxn, student, invoicePrefix)
    : isFinal
    ? finalInvoiceNumber(student, invoicePrefix)
    : statementNumber(student, invoicePrefix);
  const isFullyPaid = tot.balance <= 0 && tot.total > 0;

  const toggleRow = (id) =>
    setHiddenRows((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── PDF actions ──
  const build = (mode, txnId, useHidden = true) =>
    generateFeeReceiptPdf({
      mode,
      txnId,
      student,
      history,
      school,
      logoUrl,
      invoicePrefix,
      fallbackRows,
      hiddenRows: useHidden ? hiddenRows : null,
    });

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert(e.message || "Could not generate the PDF. Please try again.");
    } finally {
      setBusy("");
    }
  };

  // what = { mode, txnId, useHidden }
  const doPreview = (what, key) =>
    run(key, async () => {
      const r = await build(what.mode, what.txnId, what.useHidden);
      setPreview({ ...r, url: r.doc.output("bloburl") });
    });

  const doDownload = (what, key) =>
    run(key, async () => {
      const r = await build(what.mode, what.txnId, what.useHidden);
      r.doc.save(r.filename);
    });

  const doPrint = (what, key) => {
    // Open the window synchronously so pop-up blockers allow it
    const w = window.open("", "_blank");
    run(key, async () => {
      const r = await build(what.mode, what.txnId, what.useHidden);
      r.doc.autoPrint();
      const url = r.doc.output("bloburl");
      if (w) w.location.href = url;
      else window.open(url, "_blank");
    });
  };

  const current = isReceipt
    ? { mode: "receipt", txnId: selectedTxn.id, useHidden: true }
    : { mode: isFinal ? "final" : "statement", useHidden: true };

  // ── Render ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-[#1C3044] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 flex-shrink-0"
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Receipt size={18} color="#fff" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">
                {schoolName || "Fee Receipts"}
              </div>
              <div className="text-blue-200 text-xs truncate">
                {student.name} · {student.course || "—"} · {docNo}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 flex-shrink-0"
          >
            <X size={17} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-[#f6f9fc] border-b border-[#e0eef6] flex-wrap flex-shrink-0">
          <div className="flex rounded-lg border border-[#c8dff0] overflow-hidden">
            {[
              {
                k: "receipt",
                label: "Payment Receipt",
                icon: Receipt,
                disabled: history.length === 0,
              },
              {
                k: "final",
                label: "Final Invoice",
                icon: BadgeCheck,
                disabled: history.length === 0,
              },
              { k: "statement", label: "Fee Statement", icon: Layers },
            ].map((t) => (
              <button
                key={t.k}
                disabled={t.disabled}
                onClick={() => {
                  setView(t.k);
                  setHiddenRows(new Set());
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold disabled:opacity-40 ${
                  view === t.k
                    ? "bg-[#1C3044] text-white"
                    : "bg-white text-[#1C3044] hover:bg-[#f0f7fc]"
                }`}
              >
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ToolbarBtn
              icon={busy === "pv" ? Loader2 : Eye}
              onClick={() => doPreview(current, "pv")}
              disabled={loading || !!busy}
            >
              Preview
            </ToolbarBtn>
            <ToolbarBtn
              icon={busy === "pr" ? Loader2 : Printer}
              onClick={() => doPrint(current, "pr")}
              disabled={loading || !!busy}
            >
              Print
            </ToolbarBtn>
            <ToolbarBtn
              primary
              icon={busy === "dl" ? Loader2 : Download}
              onClick={() => doDownload(current, "dl")}
              disabled={loading || !!busy}
            >
              {isReceipt
                ? "Download Receipt"
                : isFinal
                ? "Download Final Invoice"
                : "Download Statement"}
            </ToolbarBtn>
            {history.length > 1 && (
              <ToolbarBtn
                icon={busy === "all" ? Loader2 : Files}
                onClick={() =>
                  doPreview({ mode: "all", useHidden: false }, "all")
                }
                disabled={loading || !!busy}
                title="All receipts in one PDF — one page per payment"
              >
                All Receipts
              </ToolbarBtn>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#4A6B80]">
              <Loader2 size={16} className="animate-spin" /> Loading payments…
            </div>
          ) : (
            <>
              {/* Student details */}
              <div className="border border-[#e0eef6] rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5 bg-[#fbfdfe]">
                {[
                  ["Student", student.name],
                  ["Class", student.course || "—"],
                  ["Student ID", `#${student.id}`],
                  ["Phone", student.phone || "—"],
                ].map(([l, v]) => (
                  <div key={l} className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A6B80]">
                      {l}
                    </div>
                    <div className="text-[13px] font-semibold text-[#1C3044] truncate">
                      {v}
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment selector */}
              {isReceipt && (
                <div>
                  <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider mb-2">
                    Select payment ({history.length})
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[...history].reverse().map((t) => {
                      const s = txnSummary(t);
                      const on = t.id === selectedTxn.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedId(t.id);
                            setHiddenRows(new Set());
                          }}
                          className={`flex-shrink-0 text-left px-3 py-2 rounded-xl border transition-colors ${
                            on
                              ? "bg-[#1C3044] border-[#1C3044] text-white"
                              : "bg-white border-[#c8dff0] text-[#1C3044] hover:bg-[#f0f7fc]"
                          }`}
                        >
                          <div
                            className={`text-[10px] font-bold uppercase ${
                              on ? "text-white/70" : "text-[#4A6B80]"
                            }`}
                          >
                            Instalment {t.installmentNo || "—"}
                          </div>
                          <div className="text-[12.5px] font-bold">
                            ₹{fmt(s.paidNow)}
                          </div>
                          <div
                            className={`text-[10.5px] ${
                              on ? "text-white/70" : "text-[#4A6B80]"
                            }`}
                          >
                            {fmtDate(t.date)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Receipt / statement meta */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2.5 rounded-xl bg-[#f0f7fc] border border-[#d6e7f3]">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText
                    size={15}
                    className="text-[#27435B] flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold text-[#1C3044] truncate">
                      {isReceipt
                        ? "Fee Receipt"
                        : isFinal
                        ? isFullyPaid
                          ? "Final Invoice"
                          : "Fee Invoice (provisional)"
                        : "Fee Statement"}{" "}
                      · {docNo}
                    </div>
                    <div className="text-[11px] text-[#4A6B80]">
                      {isReceipt
                        ? `${fmtDate(selectedTxn.date)} · ${
                            selectedTxn.paymentMode ||
                            selectedTxn.items?.[0]?.paymentMode ||
                            "Cash"
                          } · Instalment ${selectedTxn.installmentNo || 1} of ${
                            selectedTxn.totalInstallments || history.length
                          }`
                        : isFinal
                        ? `${paymentPeriod(history)} · ${
                            history.length
                          } payment(s)${
                            isFullyPaid
                              ? ""
                              : " · becomes final once fully paid"
                          }`
                        : `As on ${todayLabel()} · ${
                            history.length
                          } payment(s)`}
                    </div>
                  </div>
                </div>
                <StatusBadge balance={tot.balance} paid={tot.paid} />
              </div>

              {/* Category table */}
              <div className="border border-[#e0eef6] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12.5px] min-w-[560px]">
                    <thead>
                      <tr className="bg-[#1C3044]">
                        {(isReceipt
                          ? [
                              "Fee Category",
                              "Total",
                              "Paid Earlier",
                              "Paid Now",
                              "Balance",
                              "",
                            ]
                          : [
                              "Fee Category",
                              "Total",
                              "Paid",
                              "Balance",
                              ...(isFinal ? ["Paid On"] : []),
                              "",
                            ]
                        ).map((h, i) => (
                          <th
                            key={i}
                            className={`px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-white/90 whitespace-nowrap ${
                              i === 0 || h === "Paid On"
                                ? "text-left"
                                : "text-right"
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {baseRows.map((r, i) => {
                        const hid = hiddenRows.has(r.id);
                        const dim = hid ? "text-[#bbb]" : "";
                        return (
                          <tr
                            key={r.id}
                            className={`border-b border-[#e8f2f8] ${
                              hid
                                ? "opacity-50 bg-[#f5f5f5]"
                                : i % 2
                                ? "bg-white"
                                : "bg-[#f8fafc]"
                            }`}
                          >
                            <td
                              className={`px-3 py-2 font-semibold text-[#1C3044] ${
                                hid ? "line-through text-[#aaa]" : ""
                              }`}
                            >
                              {r.name}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-bold text-[#27435B] ${dim}`}
                            >
                              ₹{fmt(r.total)}
                            </td>
                            {isReceipt ? (
                              <>
                                <td
                                  className={`px-3 py-2 text-right text-[#4A6B80] ${dim}`}
                                >
                                  ₹{fmt(r.prev)}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-bold ${
                                    hid
                                      ? dim
                                      : r.now > 0
                                      ? "text-[#1a6e3e]"
                                      : "text-[#A0B8C8]"
                                  }`}
                                >
                                  ₹{fmt(r.now)}
                                  {r.auto > 0 && (
                                    <span
                                      className="text-[#b45309]"
                                      title={`₹${fmt(
                                        r.auto,
                                      )} adjusted — see note below`}
                                    >
                                      *
                                    </span>
                                  )}
                                </td>
                              </>
                            ) : (
                              <td
                                className={`px-3 py-2 text-right font-semibold text-[#1a6e3e] ${dim}`}
                              >
                                ₹{fmt(r.paid)}
                              </td>
                            )}
                            <td
                              className={`px-3 py-2 text-right font-bold ${
                                hid
                                  ? dim
                                  : r.balance > 0
                                  ? "text-[#a33030]"
                                  : "text-[#1a6e3e]"
                              }`}
                            >
                              {r.balance > 0 ? `₹${fmt(r.balance)}` : "Cleared"}
                            </td>
                            {isFinal && (
                              <td
                                className={`px-3 py-2 text-[11px] text-[#4A6B80] ${dim}`}
                              >
                                {(paidDates[r.name] || []).join(", ") || "—"}
                              </td>
                            )}
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={() => toggleRow(r.id)}
                                title={
                                  hid
                                    ? "Show in print/PDF"
                                    : "Hide from print/PDF"
                                }
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                                  hid
                                    ? "bg-[#edf7f1] border-[#b2dfc6] text-[#1a6e3e]"
                                    : "bg-[#fff5f5] border-[#f5c2c2] text-[#a33030]"
                                }`}
                              >
                                {hid ? <Eye size={11} /> : <EyeOff size={11} />}
                                {hid ? "Show" : "Hide"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#1C3044] text-white font-bold">
                        <td className="px-3 py-2.5">TOTAL</td>
                        <td className="px-3 py-2.5 text-right">
                          ₹{fmt(tot.total)}
                        </td>
                        {isReceipt ? (
                          <>
                            <td className="px-3 py-2.5 text-right">
                              ₹{fmt(tot.prev)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-[#7ddfb0]">
                              ₹{fmt(tot.now)}
                            </td>
                          </>
                        ) : (
                          <td className="px-3 py-2.5 text-right text-[#7ddfb0]">
                            ₹{fmt(tot.paid)}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2.5 text-right ${
                            tot.balance > 0
                              ? "text-[#f9a8a8]"
                              : "text-[#7ddfb0]"
                          }`}
                        >
                          ₹{fmt(tot.balance)}
                        </td>
                        {isFinal && <td />}
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {hiddenRows.size > 0 && (
                  <div className="px-3.5 py-2 bg-[#fffbea] border-t border-[#f5e6a0] flex items-center gap-2">
                    <EyeOff size={12} className="text-[#b47d00]" />
                    <span className="text-[11px] text-[#7a5500]">
                      Hidden rows are left out of totals, print and PDF.
                    </span>
                    <button
                      onClick={() => setHiddenRows(new Set())}
                      className="ml-auto text-[11px] font-semibold text-[#1C3044] underline"
                    >
                      Show all
                    </button>
                  </div>
                )}
              </div>

              {isReceipt && unallocatedNote(selectedTxn) && (
                <div className="text-[11.5px] leading-relaxed text-[#7a4a00] bg-[#fffbea] border border-[#f5e6a0] rounded-lg px-3 py-2">
                  <span className="font-bold">* Note:</span>{" "}
                  {unallocatedNote(selectedTxn)} To record the exact split, use{" "}
                  <span className="font-semibold">Edit Payment Record</span> for
                  this payment.
                </div>
              )}
              {!isReceipt && history.some((t) => t.unallocated?.amount > 0) && (
                <div className="text-[11.5px] leading-relaxed text-[#7a4a00] bg-[#fffbea] border border-[#f5e6a0] rounded-lg px-3 py-2">
                  <span className="font-bold">Note:</span> Some payments were
                  recorded without a fee category; those amounts were adjusted
                  against categories with a pending balance. Open the receipt
                  for details.
                </div>
              )}

              {/* Summary cards */}
              <div
                className={`grid gap-2.5 ${
                  isReceipt ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
                }`}
              >
                {(isReceipt
                  ? [
                      { l: "Total Fees", v: tot.total, c: "text-[#1C3044]" },
                      { l: "Paid Earlier", v: tot.prev, c: "text-[#4A6B80]" },
                      { l: "Paid Now", v: tot.now, c: "text-[#1a6e3e]" },
                      {
                        l: "Balance Due",
                        v: tot.balance,
                        c:
                          tot.balance > 0 ? "text-[#a33030]" : "text-[#1a6e3e]",
                      },
                    ]
                  : [
                      { l: "Total Fees", v: tot.total, c: "text-[#1C3044]" },
                      { l: "Total Paid", v: tot.paid, c: "text-[#1a6e3e]" },
                      {
                        l: "Balance Due",
                        v: tot.balance,
                        c:
                          tot.balance > 0 ? "text-[#a33030]" : "text-[#1a6e3e]",
                      },
                    ]
                ).map((k) => (
                  <div
                    key={k.l}
                    className="border border-[#e0eef6] rounded-xl px-3 py-2.5 text-center bg-white"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A6B80]">
                      {k.l}
                    </div>
                    <div className={`text-[16px] font-bold ${k.c}`}>
                      ₹{fmt(k.v)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11.5px] text-[#4A6B80] bg-[#f8fafc] border border-dashed border-[#d0e2ee] rounded-lg px-3 py-2">
                <span className="font-bold text-[#1C3044]">
                  {isReceipt ? "Received:" : "Paid so far:"}
                </span>{" "}
                {amountInWords(isReceipt ? tot.now : tot.paid)}
              </div>

              {isFinal && (
                <div
                  className={`text-center text-[12px] font-bold rounded-lg px-3 py-2 border ${
                    isFullyPaid
                      ? "bg-[#edf7f1] border-[#1a6e3e] text-[#1a6e3e]"
                      : "bg-[#fdf0f0] border-[#a33030] text-[#a33030]"
                  }`}
                >
                  {isFullyPaid
                    ? "ALL FEES PAID IN FULL — NO DUES PENDING"
                    : `PROVISIONAL — balance due ₹${fmt(
                        tot.balance,
                      )}. Final invoice is issued once fully paid.`}
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex justify-between text-[11px] text-[#4A6B80] mb-1">
                  <span>
                    Collection progress {isReceipt ? "after this payment" : ""}
                  </span>
                  <span className="font-bold text-[#27435B]">
                    {paidPct}% paid
                  </span>
                </div>
                <div className="h-2 bg-[#d0e2ee] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3A5E78] to-[#27435B] rounded-full transition-all duration-500"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>

              {/* Payment history */}
              <div className="border border-[#e0eef6] rounded-xl overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-[#e0eef6] text-[10.5px] font-bold text-[#4A6B80] uppercase tracking-wider">
                  {isFinal
                    ? "Payment-wise details — date, receipt & categories paid"
                    : "Payment History — all instalments"}
                </div>
                {isFinal ? (
                  <FinalPaymentsTable
                    history={history}
                    student={student}
                    invoicePrefix={invoicePrefix}
                  />
                ) : history.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[#4A6B80]">
                    No payments recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] min-w-[620px]">
                      <thead>
                        <tr className="bg-[#f0f7fc] text-[#4A6B80]">
                          {[
                            "#",
                            "Date",
                            "Receipt No",
                            "Mode",
                            "Amount",
                            "Balance After",
                            "Status",
                            "",
                          ].map((h, i) => (
                            <th
                              key={i}
                              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                                i >= 4 && i <= 5 ? "text-right" : "text-left"
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...history].reverse().map((t) => {
                          const s = txnSummary(t);
                          const on = isReceipt && t.id === selectedTxn.id;
                          return (
                            <tr
                              key={t.id}
                              onClick={() => {
                                setView("receipt");
                                setSelectedId(t.id);
                                setHiddenRows(new Set());
                              }}
                              className={`border-t border-[#e8f2f8] cursor-pointer ${
                                on ? "bg-[#fff8dc]" : "hover:bg-[#f8fafc]"
                              }`}
                            >
                              <td className="px-3 py-2 text-[#8fa3b1]">
                                {t.installmentNo}
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#1C3044] whitespace-nowrap">
                                {fmtDate(t.date)}
                              </td>
                              <td className="px-3 py-2 text-[#27435B] whitespace-nowrap">
                                {receiptNumber(t, student, invoicePrefix)}
                              </td>
                              <td className="px-3 py-2 text-[#4A6B80]">
                                {t.paymentMode ||
                                  t.items?.[0]?.paymentMode ||
                                  "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-[#1a6e3e]">
                                ₹{fmt(s.paidNow)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-semibold ${
                                  s.balance > 0
                                    ? "text-[#a33030]"
                                    : "text-[#1a6e3e]"
                                }`}
                              >
                                ₹{fmt(s.balance)}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1a6e3e] bg-[#edf7f1] border border-[#b2dfc6] px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} />{" "}
                                  {on ? "Viewing" : "Paid"}
                                </span>
                              </td>
                              <td
                                className="px-2 py-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1 justify-end">
                                  <button
                                    title="Preview this receipt"
                                    disabled={!!busy}
                                    onClick={() =>
                                      doPreview(
                                        {
                                          mode: "receipt",
                                          txnId: t.id,
                                          useHidden: false,
                                        },
                                        `pv_${t.id}`,
                                      )
                                    }
                                    className="w-7 h-7 rounded-md border border-[#c8dff0] flex items-center justify-center text-[#27435B] hover:bg-[#f0f7fc] disabled:opacity-50"
                                  >
                                    {busy === `pv_${t.id}` ? (
                                      <Loader2
                                        size={12}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Eye size={12} />
                                    )}
                                  </button>
                                  <button
                                    title="Download this receipt"
                                    disabled={!!busy}
                                    onClick={() =>
                                      doDownload(
                                        {
                                          mode: "receipt",
                                          txnId: t.id,
                                          useHidden: false,
                                        },
                                        `dl_${t.id}`,
                                      )
                                    }
                                    className="w-7 h-7 rounded-md border border-[#c8dff0] flex items-center justify-center text-[#27435B] hover:bg-[#f0f7fc] disabled:opacity-50"
                                  >
                                    {busy === `dl_${t.id}` ? (
                                      <Loader2
                                        size={12}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Download size={12} />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {txnSummary(history[0]).balance > 0 && (
                          <tr className="border-t border-[#f5c2c2] bg-[#fdf6f6]">
                            <td />
                            <td
                              className="px-3 py-2 font-bold text-[#a33030]"
                              colSpan={3}
                            >
                              Outstanding balance
                            </td>
                            <td />
                            <td className="px-3 py-2 text-right font-bold text-[#a33030]">
                              ₹{fmt(txnSummary(history[0]).balance)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#a33030] bg-[#fdf0f0] border border-[#f5c2c2] px-2 py-0.5 rounded-full">
                                <Clock size={10} /> Pending
                              </span>
                            </td>
                            <td />
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {preview && (
        <div onClick={(e) => e.stopPropagation()}>
          <PdfPreview preview={preview} onClose={() => setPreview(null)} />
        </div>
      )}
    </div>
  );
}
