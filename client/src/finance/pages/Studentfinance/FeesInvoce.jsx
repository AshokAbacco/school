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
  Mail,
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

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

// Re-encode any image the browser can display (PNG, JPEG, WEBP, SVG, GIF…)
// to PNG on a white background — jsPDF only understands PNG/JPEG, and logos
// uploaded as WEBP/SVG used to silently disappear from the receipt.
function rasterize(src) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no DOM"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const max = 600; // plenty for a 26 mm logo, keeps the PDF small
        const scale = Math.min(
          1,
          max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
        );
        const w = Math.max(1, Math.round((img.naturalWidth || 300) * scale));
        const h = Math.max(1, Math.round((img.naturalHeight || 300) * scale));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: c.toDataURL("image/png"), format: "PNG", w, h });
      } catch (e) {
        reject(e); // canvas tainted (no CORS) etc.
      }
    };
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}

async function logoFromBlob(blob) {
  if (!blob || blob.size === 0) throw new Error("empty image");
  const dataUrl = await blobToDataUrl(blob);
  try {
    return await rasterize(dataUrl);
  } catch {
    const mime = blob.type || "image/png";
    if (!/png|jpe?g/.test(mime))
      throw new Error(`unsupported logo type ${mime}`);
    return { dataUrl, format: /jpe?g/.test(mime) ? "JPEG" : "PNG" };
  }
}

// Load the school logo for the PDF. Tries, in order:
//   1. our /api/image-proxy (avoids CORS)   2. the URL directly
//   3. an <img crossOrigin> → canvas
// Successful results are cached; failures are NOT, so a temporary network
// hiccup doesn't remove the logo for the rest of the session.
async function loadLogoForPDF(logoUrl) {
  if (!logoUrl) return null;
  if (logoCache.has(logoUrl)) return logoCache.get(logoUrl);

  const attempts = [];
  if (/^data:image\//.test(logoUrl)) {
    attempts.push(() =>
      fetch(logoUrl)
        .then((r) => r.blob())
        .then(logoFromBlob),
    );
  } else {
    attempts.push(async () => {
      const r = await fetch(
        `${API_URL}/api/image-proxy?url=${encodeURIComponent(logoUrl)}`,
      );
      if (!r.ok) throw new Error(`proxy ${r.status}`);
      return logoFromBlob(await r.blob());
    });
    attempts.push(async () => {
      const r = await fetch(logoUrl, { mode: "cors" });
      if (!r.ok) throw new Error(`direct ${r.status}`);
      return logoFromBlob(await r.blob());
    });
    attempts.push(() => rasterize(logoUrl));
  }

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result?.dataUrl) {
        logoCache.set(logoUrl, result);
        return result;
      }
    } catch (err) {
      console.warn("[PDF Logo]", err.message);
    }
  }
  console.warn(
    "[PDF Logo] could not load logo — receipt will be generated without it:",
    logoUrl,
  );
  return null;
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

// Draw the logo inside a box, keeping its aspect ratio. Returns true if drawn.
function drawLogo(doc, logo, x, y, box) {
  if (!logo?.dataUrl) return false;
  try {
    let w = logo.w;
    let h = logo.h;
    if (!w || !h) {
      const p = doc.getImageProperties(logo.dataUrl);
      w = p.width;
      h = p.height;
    }
    const s = Math.min(box / w, box / h);
    const dw = w * s;
    const dh = h * s;
    doc.addImage(
      logo.dataUrl,
      logo.format || "PNG",
      x + (box - dw) / 2,
      y + (box - dh) / 2,
      dw,
      dh,
      undefined,
      "FAST",
    );
    return true;
  } catch (e) {
    console.warn("addImage failed:", e);
    return false;
  }
}

/**
 * Letterhead + document title + key details.
 *   ┌────────────────────────────────────────────────────┐
 *   │ [LOGO]      SCHOOL NAME (full, centred)             │
 *   │             Address                                  │
 *   │             Phone · Email                            │
 *   ├════════════════════════════════════════════════════┤
 *   │                 FEE RECEIPT                          │  ← navy bar
 *   │ Receipt No │ Date │ Instalment │ Status             │  ← detail cells
 *   └────────────────────────────────────────────────────┘
 * meta: [[label, value, colour?], …]  (up to 4)
 */
function drawHeader(doc, ctx, { title, meta = [] }) {
  const TOP = 9;
  const LOGO = 26;
  const logoOk = !!ctx.logo?.dataUrl;
  // reserve the logo's width on BOTH sides so the name is truly centred
  const side = logoOk ? LOGO + 5 : 0;
  const textW = CW - side * 2;
  const cx = PAGE_W / 2;

  // school name: largest size 20→13pt that fits one line, else 2 lines
  const name = (ctx.school.name || "School").trim().toUpperCase();
  doc.setFont("helvetica", "bold");
  let size = 20;
  doc.setFontSize(size);
  while (size > 13 && doc.getTextWidth(name) > textW) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  let nameLines = [name];
  if (doc.getTextWidth(name) > textW) {
    size = 14;
    doc.setFontSize(size);
    nameLines = doc.splitTextToSize(name, textW);
    if (nameLines.length > 2) {
      size = 12;
      doc.setFontSize(size);
      nameLines = doc.splitTextToSize(name, textW).slice(0, 3);
    }
  }
  const nameLH = size * 0.4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  const sub = [];
  if (ctx.school.address)
    sub.push(...doc.splitTextToSize(ctx.school.address, textW).slice(0, 2));
  const contact = [
    ctx.school.phone && `Phone: ${ctx.school.phone}`,
    ctx.school.email && `Email: ${ctx.school.email}`,
  ]
    .filter(Boolean)
    .join("   |   ");
  if (contact) sub.push(...doc.splitTextToSize(contact, textW).slice(0, 1));
  const subLH = 4.3;

  const textH =
    nameLines.length * nameLH + (sub.length ? 2.5 + sub.length * subLH : 0);
  const bodyH = Math.max(logoOk ? LOGO : 0, textH);

  // logo (vertically centred against the text block)
  if (logoOk) drawLogo(doc, ctx.logo, M, TOP + (bodyH - LOGO) / 2, LOGO);

  // text block
  let ty = TOP + (bodyH - textH) / 2 + nameLH * 0.78;
  setFont(doc, size, "bold", COL.navy);
  nameLines.forEach((ln) => {
    doc.text(ln, cx, ty, { align: "center" });
    ty += nameLH;
  });
  if (sub.length) {
    ty += 2.5 - nameLH * 0.22;
    setFont(doc, 8.8, "normal", COL.muted);
    sub.forEach((ln) => {
      doc.text(ln, cx, ty, { align: "center" });
      ty += subLH;
    });
  }

  // double rule
  let y = TOP + bodyH + 4;
  doc.setDrawColor(...COL.navy);
  doc.setLineWidth(0.9);
  doc.line(M, y, PAGE_W - M, y);
  doc.setLineWidth(0.25);
  doc.line(M, y + 1.4, PAGE_W - M, y + 1.4);
  y += 4.5;

  // title bar
  doc.setFillColor(...COL.navy);
  doc.rect(M, y, CW, 9, "F");
  setFont(doc, 12, "bold", COL.white);
  doc.text(title.split("").join(" "), cx, y + 6.2, { align: "center" });
  y += 9;

  // detail cells
  const cells = meta.slice(0, 4);
  if (cells.length) {
    const H = 13;
    const cw = CW / cells.length;
    doc.setFillColor(...COL.light);
    doc.setDrawColor(...COL.line);
    doc.setLineWidth(0.3);
    doc.rect(M, y, CW, H, "FD");
    cells.forEach(([label, value, colour], i) => {
      const x = M + i * cw;
      if (i > 0) doc.line(x, y + 2, x, y + H - 2);
      setFont(doc, 7, "bold", COL.muted);
      doc.text(String(label).toUpperCase(), x + cw / 2, y + 4.8, {
        align: "center",
      });
      setFont(doc, 9.5, "bold", colour || COL.navy);
      doc.text(fit(doc, String(value ?? "—"), cw - 4), x + cw / 2, y + 10, {
        align: "center",
      });
    });
    y += H;
  }
  return y;
}

const statusColour = (balance, paid) =>
  balance <= 0 ? COL.green : paid > 0 ? [180, 100, 10] : COL.red;

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
// opts.rh   → base row height (default 7.2 mm)
// cell.lines → array of strings drawn on several lines (row grows to fit)
const LINE_H = 3.6;
function rowHeight(r, RH) {
  const n = Math.max(
    1,
    ...r.cells.map((c) => (Array.isArray(c.lines) ? c.lines.length : 1)),
  );
  return n > 1 ? Math.max(RH, n * LINE_H + 2.8) : RH;
}
function drawTable(doc, y, cols, rows, footer, opts = {}) {
  const RH = opts.rh || 7.2;
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
    const h = rowHeight(r, RH);
    if (y + h > BOTTOM) {
      doc.addPage();
      y = 16;
      header();
    }
    const fill = r.fill || (i % 2 === 0 ? COL.stripe : COL.white);
    doc.setFillColor(...fill);
    doc.rect(M, y, CW, h, "F");
    const textY = y + RH / 2 + 1.3; // first baseline, centred for 1-line rows
    r.cells.forEach((cell, ci) => {
      const c = cols[ci];
      if (Array.isArray(cell.lines)) {
        setFont(
          doc,
          cell.size || 7.8,
          cell.bold ? "bold" : "normal",
          cell.color || COL.text,
        );
        const n = cell.lines.length;
        const top = n > 1 ? y + 4.2 : textY - 0.3;
        cell.lines.forEach((ln, li) =>
          doc.text(String(ln), c.x, top + li * LINE_H, {
            align: c.align || "left",
          }),
        );
        return;
      }
      setFont(doc, 8.5, cell.bold ? "bold" : "normal", cell.color || COL.text);
      doc.text(
        cell.maxW ? fit(doc, cell.text, cell.maxW) : String(cell.text ?? ""),
        c.x,
        textY,
        { align: c.align || "left" },
      );
    });
    y += h;
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

function drawSignatures(doc, y, { compact = false } = {}) {
  // may use the space down to the footer band (signatures are short)
  y += compact ? 2 : 4;
  if (y + (compact ? 13 : 18) > PAGE_H - 14) {
    doc.addPage();
    y = 16;
  }
  if (!compact) {
    setFont(doc, 7.5, "normal", COL.muted);
    doc.text(
      "Note: Fees once paid are not refundable. Please keep this receipt for future reference.",
      M,
      y,
    );
  }
  y += compact ? 9 : 11;
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
      fit(
        doc,
        `${
          schoolName || "School"
        } · Computer-generated document — no signature required if issued online.`,
        CW - 24,
      ),
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
    meta: [
      ["Receipt No", receiptNumber(txn, ctx.student, ctx.prefix)],
      ["Receipt Date", fmtDate(txn.date)],
      ["Instalment", `${txn.installmentNo || 1} of ${totalInst}`],
      [
        "Status",
        statusText(t.balance, t.paid),
        statusColour(t.balance, t.paid),
      ],
    ],
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
    meta: [
      ["Statement No", statementNumber(ctx.student, ctx.prefix)],
      ["Statement Date", todayLabel()],
      ["Payments", `${ctx.history.length} recorded`],
      [
        "Status",
        statusText(t.balance, t.paid),
        statusColour(t.balance, t.paid),
      ],
    ],
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
    meta: [
      ["Invoice No", finalInvoiceNumber(ctx.student, ctx.prefix)],
      ["Invoice Date", todayLabel()],
      ["Payments", `${ctx.history.length} received`],
      [
        "Status",
        statusText(t.balance, t.paid),
        statusColour(t.balance, t.paid),
      ],
    ],
  });
  y = drawStudentBox(doc, y + 6, ctx.student, [
    "Payment Period",
    paymentPeriod(ctx.history),
  ]);

  const PAID_FOR_W = 50;
  setFont(doc, 7.4, "normal");
  const payRows = groups.map((g, gi) => ({
    cells: [
      { text: g.txn.installmentNo || gi + 1 },
      { text: fmtDate(g.txn.date), bold: true },
      { text: receiptNumber(g.txn, ctx.student, ctx.prefix), maxW: 34 },
      {
        text: g.txn.paymentMode || g.txn.items?.[0]?.paymentMode || "—",
        maxW: 18,
      },
      {
        lines: doc.splitTextToSize(
          g.lines.map((ln) => `${ln.name} ${fmt(ln.amount)}`).join(", "),
          PAID_FOR_W,
        ),
        color: COL.text,
        size: 7.4,
      },
      { text: rs(g.s.paidNow), color: COL.green, bold: true },
      { text: rs(g.s.balance), color: g.s.balance > 0 ? COL.red : COL.green },
    ],
  }));

  // ── Keep the invoice on ONE page ──────────────────────────────────────────
  // Try layouts from roomiest to most compact and use the first that fits:
  //   0: normal rows + totals box   1: tighter rows + totals box
  //   2: tight rows + one-line totals strip
  // (Only students with very many payments, roughly 10+, still need page 2;
  //  tables then continue on the next page with their headers repeated.)
  const LIMIT = 252; // last y where the totals may end so banner + signatures still fit
  const layouts = [
    { rh: 7.2, compactTotals: false },
    { rh: 6, compactTotals: false },
    { rh: 5.4, compactTotals: true },
    { rh: 4.9, compactTotals: true },
  ];
  const tableH = (rowsH) => 3 + 8 + rowsH + 8 + 5; // title + header + rows + footer + gap
  const fits = (L) =>
    y +
      tableH(rows.length * L.rh) +
      tableH(payRows.reduce((a, r) => a + rowHeight(r, L.rh), 0)) +
      (L.compactTotals ? 18 : 32) <=
    (L.compactTotals ? LIMIT + 9 : LIMIT); // compact: slimmer banner + signatures
  const layout = layouts.find(fits) || layouts[layouts.length - 1];
  const rh = layout.rh;

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

    { rh },
  );

  // 2. One row per payment; the fees it covered are listed inside the row
  y = ensureSpace(doc, y, 30);
  y = sectionTitle(doc, y, "PAYMENT-WISE DETAILS");
  const payCols = [
    { label: "#", x: M + 3 },
    { label: "Paid On", x: M + 9 },
    { label: "Receipt No", x: M + 31 },
    { label: "Mode", x: M + 67 },
    { label: "Paid For", x: M + 87 },
    { label: "Amount", x: M + 155, align: "right" },
    { label: "Balance After", x: M + CW - 3, align: "right" },
  ];

  const totalPaid = groups.reduce((a, g) => a + g.s.paidNow, 0);
  y = drawTable(
    doc,
    y,
    payCols,
    payRows,
    [
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
    ],
    { rh },
  );

  // 3. Totals + words (compact one-line strip when space is tight)
  if (layout.compactTotals) {
    y = ensureSpace(doc, y, 16);
    doc.setFillColor(...COL.light);
    doc.setDrawColor(...COL.line);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 13, 2, 2, "FD");
    const parts = [
      ["Total Fees", t.total, COL.navy],
      ["Total Paid", t.paid, COL.green],
      ["Balance Due", t.balance, t.balance > 0 ? COL.red : COL.green],
    ];
    const pw = CW / 3;
    parts.forEach(([l, v, c], i) => {
      const x = M + i * pw + pw / 2;
      setFont(doc, 8, "normal", COL.muted);
      const lw = doc.getTextWidth(`${l}: `);
      setFont(doc, 10, "bold", c);
      const vw = doc.getTextWidth(rs(v));
      const sx = x - (lw + vw) / 2;
      setFont(doc, 8, "normal", COL.muted);
      doc.text(`${l}: `, sx, y + 5.5);
      setFont(doc, 10, "bold", c);
      doc.text(rs(v), sx + lw, y + 5.5);
    });
    setFont(doc, 8, "italic", COL.muted);
    doc.text(`Total received: ${amountInWords(t.paid)}`, PAGE_W / 2, y + 10.5, {
      align: "center",
    });
    y += 18;
  } else {
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
  }

  // 4. Status banner
  const BH = layout.compactTotals ? 7.5 : 9;
  y = ensureSpace(doc, y - 2, BH + 3);
  doc.setFillColor(...(isFull ? [237, 247, 241] : [253, 240, 240]));
  doc.setDrawColor(...(isFull ? COL.green : COL.red));
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, CW, BH, 2, 2, "FD");
  setFont(
    doc,
    layout.compactTotals ? 9 : 10,
    "bold",
    isFull ? COL.green : COL.red,
  );
  doc.text(
    isFull
      ? "ALL FEES PAID IN FULL — NO DUES PENDING"
      : `PROVISIONAL — BALANCE DUE ${rs(
          t.balance,
        )}. Final invoice is issued once fully paid.`,
    PAGE_W / 2,
    y + BH / 2 + 1.5,
    { align: "center" },
  );
  drawSignatures(doc, y + BH + (layout.compactTotals ? -1 : 1.5), {
    compact: layout.compactTotals,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SCHOOL-SPECIFIC FORMATS
// A school listed here gets an extra "Fee Letter" option (parent fee-due
// letter, printed black & white on school letterhead). Other schools are
// unaffected. Add more schools by adding entries to this list.
// ═════════════════════════════════════════════════════════════════════════════
export const SCHOOL_FORMATS = [
  {
    id: "fazeelah",
    match: ({ name, prefix }) =>
      /fazeelah/i.test(name || "") || /^FAZEEL/i.test(prefix || ""),
    // Printed under the school name, underlined — e.g.
    // "(Affiliated to CBSE, New Delhi – Affiliation No. 123456)".
    // Leave "" to hide the line.
    affiliation: "",
    logoBothSides: true,
  },
];

export function getSchoolFormat(school, prefix) {
  return (
    SCHOOL_FORMATS.find((f) => f.match({ name: school?.name, prefix })) || null
  );
}

export function academicYearLabel(d = new Date()) {
  // Indian academic year starts in June
  const y = d.getFullYear();
  const start = d.getMonth() >= 5 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const DEFAULT_LETTER_INTRO =
  "I hope this message finds you well. We would like to bring to your attention an important matter related to school fees for the academic year {AY}. As you are aware, your support in ensuring the timely payment of fee due related to your child is crucial to the smooth operation of our school. We greatly appreciate your continued commitment to your child's education.";

// Letter page (plain black & white, like the printed school letter)
function drawFeeLetterPage(doc, ctx, L) {
  const BLACK = [0, 0, 0];
  const GREY = [70, 70, 70];
  const LM = 16; // letter margin
  const LW = PAGE_W - LM * 2;
  const fmtMoney = (n) => (n === "" || n == null ? "" : fmt(n));
  const fmtD = (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).split("-");
    return d && m && y ? `${d}-${m}-${y}` : iso;
  };

  // ── Letterhead ────────────────────────────────────────────────────────────
  const LOGO = 27;
  const top = 10;
  const hasLogo = !!ctx.logo?.dataUrl;
  if (hasLogo) {
    drawLogo(doc, ctx.logo, LM, top, LOGO);
    if (ctx.format?.logoBothSides)
      drawLogo(doc, ctx.logo, PAGE_W - LM - LOGO, top, LOGO);
  }
  const reserve = hasLogo ? LOGO + 4 : 0;
  const textW = LW - reserve * 2;
  const cx = PAGE_W / 2;

  const name = (ctx.school.name || "School").toUpperCase();
  doc.setFont("helvetica", "bold");
  let size = 22;
  doc.setFontSize(size);
  while (size > 13 && doc.getTextWidth(name) > textW) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  const nameLines =
    doc.getTextWidth(name) > textW
      ? doc.splitTextToSize(name, textW).slice(0, 2)
      : [name];
  let y = top + 8;
  setFont(doc, size, "bold", BLACK);
  nameLines.forEach((ln) => {
    doc.text(ln, cx, y, { align: "center" });
    y += size * 0.42;
  });
  y += 0.5;

  setFont(doc, 9.5, "normal", GREY);
  if (ctx.format?.affiliation) {
    const a = ctx.format.affiliation;
    doc.text(a, cx, y, { align: "center" });
    const w = doc.getTextWidth(a);
    doc.setDrawColor(...GREY);
    doc.setLineWidth(0.2);
    doc.line(cx - w / 2, y + 0.8, cx + w / 2, y + 0.8);
    y += 4.8;
  }
  if (ctx.school.address) {
    doc
      .splitTextToSize(ctx.school.address, textW)
      .slice(0, 2)
      .forEach((ln) => {
        doc.text(ln, cx, y, { align: "center" });
        y += 4.6;
      });
  }
  const contact = [
    ctx.school.email && `E-mail Id: ${ctx.school.email}`,
    ctx.school.phone && `Ph.No: ${ctx.school.phone}`,
  ]
    .filter(Boolean)
    .join("   ");
  if (contact) {
    doc.text(fit(doc, contact, textW), cx, y, { align: "center" });
    y += 4.6;
  }
  y = Math.max(y, top + (hasLogo ? LOGO : 0)) + 2;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.9);
  doc.line(LM - 4, y, PAGE_W - LM + 4, y);
  y += 9;

  // ── Salutation + S.No ─────────────────────────────────────────────────────
  setFont(doc, 11.5, "normal", BLACK);
  doc.text("Dear Parent,", LM + 4, y);
  if (L.serialNo) {
    setFont(doc, 11.5, "bold", BLACK);
    const val = ` ${L.serialNo}`;
    const vw = doc.getTextWidth(val);
    doc.text(val, PAGE_W - LM - 4, y, { align: "right" });
    const lbl = "S.No:";
    const lw = doc.getTextWidth(lbl);
    const lx = PAGE_W - LM - 4 - vw - lw;
    doc.text(lbl, lx, y);
    doc.setLineWidth(0.25);
    doc.line(lx, y + 0.9, lx + lw, y + 0.9);
  }
  y += 8;

  // ── Intro paragraph (justified) ───────────────────────────────────────────
  const intro = (L.intro || DEFAULT_LETTER_INTRO).replace(
    /\{AY\}/g,
    L.academicYear || academicYearLabel(),
  );
  setFont(doc, 10, "normal", BLACK);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  const introLines = doc.splitTextToSize(intro, LW - 4);
  doc.text(introLines, LM + 2, y, {
    maxWidth: LW - 4,
    align: "justify",
    lineHeightFactor: 1.25,
  });
  y += introLines.length * 11 * 0.3528 * 1.25 + 2;

  // ── Grid table helper (black borders) ─────────────────────────────────────
  const grid = (x, w, labelW, rows, rh = 7) => {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    rows.forEach(([label, value, bold]) => {
      doc.rect(x, y, labelW, rh);
      doc.rect(x + labelW, y, w - labelW, rh);
      setFont(doc, 10, bold ? "bold" : "normal", BLACK);
      doc.text(fit(doc, label, labelW - 4), x + 2.5, y + rh / 2 + 1.4);
      setFont(doc, 10, bold ? "bold" : "normal", BLACK);
      doc.text(
        fit(doc, String(value ?? ""), w - labelW - 5),
        x + labelW + 3,
        y + rh / 2 + 1.4,
      );
      y += rh;
    });
  };

  // ── Student particulars ───────────────────────────────────────────────────
  setFont(doc, 10, "bold", BLACK);
  doc.text("Student Particulars: -", LM + 2, y + 1);
  y += 3;
  const P = L.particulars || {};
  grid(LM + 2, 158, 52, [
    ["Admission Number:", P.admissionNumber || ""],
    ["Student Name:", (ctx.student.name || "").toUpperCase()],
    ["Class:", (P.className || ctx.student.course || "").toUpperCase()],
    ["Father Name:", (P.fatherName || "").toUpperCase()],
    ["Phone Number:", P.phones || ctx.student.phone || ""],
  ]);
  y += 7;

  // ── Fee particulars ───────────────────────────────────────────────────────
  setFont(doc, 10, "bold", BLACK);
  doc.text(`${L.termLabel || "Fee"} Particulars: -`, LM, y + 1);
  y += 3;
  const past = Number(L.pastDues || 0);
  const fee = Number(L.feeAmount || 0);
  const paid = Number(L.paidAmount || 0);
  const due = Math.max(0, past + fee - paid);
  grid(LM, 120, 54, [
    ["Past Year Due's:", past ? fmtMoney(past) : ""],
    [`${L.installmentLabel || "Installment Fee"}:`, fmtMoney(fee)],
    ["Paid:", fmtMoney(paid)],
    ["Installment Due:", fmtMoney(due), true],
  ]);
  y += 7;

  // ── Note + bullets ────────────────────────────────────────────────────────
  if (L.note) {
    setFont(doc, 10, "normal", BLACK);
    const lbl = "Note:";
    doc.text(lbl, LM - 2, y);
    const lw = doc.getTextWidth(lbl);
    doc.setLineWidth(0.25);
    doc.line(LM - 2, y + 0.9, LM - 2 + lw, y + 0.9);
    const lines = doc.splitTextToSize(L.note, LW - lw - 2);
    doc.text(lines, LM - 2 + lw + 1.5, y);
    y += lines.length * 4.6 + 3.5;
  }
  const bullets = String(L.bullets || "")
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);
  bullets.forEach((b) => {
    const bold = b.startsWith("*");
    const text = bold ? b.replace(/^\*+\s*/, "") : b;
    setFont(doc, 10.5, bold ? "bold" : "normal", BLACK);
    doc.circle(LM + 9, y - 1.2, 0.7, "F");
    const lines = doc.splitTextToSize(text, LW - 18);
    doc.text(lines, LM + 14, y);
    y += lines.length * 4.8 + 0.6;
  });

  // ── Tear-off slip (optional) ──────────────────────────────────────────────
  const S = L.slip || {};
  if (S.enabled) {
    y += 6;
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([2, 1.2], 0);
    doc.line(LM - 2, y, PAGE_W - LM + 2, y);
    doc.setLineDashPattern([], 0);
    y += 10;
    const title = (S.title || "STUDENT MOVEMENT INTIMATION SLIP").toUpperCase();
    setFont(doc, 10.5, "bold", BLACK);
    doc.text(title, cx, y, { align: "center" });
    const tw = doc.getTextWidth(title);
    doc.setLineWidth(0.25);
    doc.line(cx - tw / 2, y + 0.9, cx + tw / 2, y + 0.9);
    y += 9;
    if (S.subtitle) {
      setFont(doc, 11, "bold", BLACK);
      doc.text(S.subtitle, LM - 2, y);
      y += 5;
    }
    y += 2;
    const rows = [
      ["Student Name:", (ctx.student.name || "").toUpperCase()],
      ["Class", (P.className || ctx.student.course || "").toUpperCase()],
      ["Father Name:", (P.fatherName || "").toUpperCase()],
      ["Phone No:", P.phones || ctx.student.phone || ""],
    ];
    if (S.leaveDate) rows.push(["Date of Leaving:", fmtD(S.leaveDate)]);
    if (S.returnDate) rows.push(["Date of Return:", fmtD(S.returnDate)]);
    grid(LM - 2, LW + 4, 50, rows, 7.6);
    y += 12;
    setFont(doc, 10.5, "normal", BLACK);
    [
      ["Signature of Parent/ Guardian", LM - 2, "left"],
      ["Signature of Student", cx, "center"],
      ["Signature of Desk Incharge", PAGE_W - LM + 2, "right"],
    ].forEach(([t, x, align]) => {
      doc.text(t, x, y, { align });
      const w = doc.getTextWidth(t);
      const x0 = align === "left" ? x : align === "center" ? x - w / 2 : x - w;
      doc.setLineWidth(0.25);
      doc.line(x0, y + 0.9, x0 + w, y + 0.9);
    });
  } else {
    // signatures when there is no slip
    y = Math.max(y + 22, 245);
    setFont(doc, 10.5, "normal", BLACK);
    doc.text("Signature of Accountant", LM, y);
    doc.text("Signature of Principal", PAGE_W - LM, y, { align: "right" });
  }
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
  } else if (o.mode === "letter") {
    drawFeeLetterPage(doc, { ...ctx, format: o.format }, o.letter || {});
    filename = `Fee_Letter_${safeName}.pdf`;
    title = "Fee letter";
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

  if (o.mode !== "letter") drawFooters(doc, ctx.school.name);
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

// ── Live on-screen preview of a generated PDF ───────────────────────────────
// Renders the PDF pages as images with pdf.js, so the letter is visible right
// inside the window on every device (phones can't show PDFs in an <iframe>).
let pdfJsPromise = null;
function ensurePdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfJsPromise) {
    const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
    pdfJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${base}/pdf.min.js`;
      s.async = true;
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}/pdf.worker.min.js`;
        resolve(window.pdfjsLib);
      };
      s.onerror = () => {
        pdfJsPromise = null;
        reject(new Error("Could not load the PDF viewer"));
      };
      document.head.appendChild(s);
    });
  }
  return pdfJsPromise;
}

function LivePdfPreview({ makePdf, deps, onOpen }) {
  const wrapRef = useRef(null);
  const [pages, setPages] = useState([]); // [{src, w, h}]
  const [status, setStatus] = useState("loading"); // loading | ready | updating | error
  const [fallbackUrl, setFallbackUrl] = useState(null);
  const jobRef = useRef(0);

  useEffect(() => {
    const job = ++jobRef.current;
    setStatus((st) => (st === "ready" ? "updating" : st));
    const t = setTimeout(async () => {
      try {
        const { doc } = await makePdf();
        if (job !== jobRef.current) return;
        let lib = null;
        try {
          lib = await ensurePdfJs();
        } catch {
          lib = null;
        }
        if (!lib) {
          // pdf.js unavailable → show the PDF in a frame instead
          const url = doc.output("bloburl");
          setFallbackUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return url;
          });
          setStatus("ready");
          return;
        }
        const pdf = await lib.getDocument({ data: doc.output("arraybuffer") })
          .promise;
        const width = Math.max(320, wrapRef.current?.clientWidth || 600);
        const out = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale =
            (width / base.width) * Math.min(2, window.devicePixelRatio || 1);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport: vp,
          }).promise;
          out.push({
            src: canvas.toDataURL("image/png"),
            w: vp.width,
            h: vp.height,
          });
        }
        if (job !== jobRef.current) return;
        setPages(out);
        setStatus("ready");
      } catch (e) {
        console.error("[LivePdfPreview]", e);
        if (job === jobRef.current) setStatus("error");
      }
    }, 450); // wait until typing pauses
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(
    () => () => fallbackUrl && URL.revokeObjectURL(fallbackUrl),
    [fallbackUrl],
  );

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1C3044]">
          Letter preview
        </div>
        <div className="flex items-center gap-2">
          {status === "updating" && (
            <span className="flex items-center gap-1 text-[10.5px] text-[#4A6B80]">
              <Loader2 size={11} className="animate-spin" /> updating…
            </span>
          )}
          {onOpen && (
            <button
              onClick={onOpen}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#27435B] hover:underline"
            >
              <Eye size={12} /> Full screen
            </button>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-[#d0e2ee] bg-[#e9eef2] p-2 sm:p-3 space-y-3">
        {status === "loading" && (
          <div className="aspect-[210/297] bg-white rounded-md flex items-center justify-center text-[12px] text-[#4A6B80] gap-2">
            <Loader2 size={14} className="animate-spin" /> Preparing letter…
          </div>
        )}
        {status === "error" && (
          <div className="aspect-[210/297] bg-white rounded-md flex items-center justify-center text-[12px] text-[#a33030] px-6 text-center">
            Couldn't draw the preview here. Use Preview or Download above.
          </div>
        )}
        {fallbackUrl ? (
          <iframe
            title="Letter preview"
            src={`${fallbackUrl}#toolbar=0&view=FitH`}
            className="w-full aspect-[210/297] bg-white rounded-md"
          />
        ) : (
          pages.map((pg, i) => (
            <img
              key={i}
              src={pg.src}
              alt={`Letter page ${i + 1}`}
              className={`w-full bg-white rounded-md shadow-sm transition-opacity ${
                status === "updating" ? "opacity-60" : ""
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Fee Letter form (school-specific format) ────────────────────────────────
const LETTER_SETTINGS_KEYS = [
  "termLabel",
  "installmentLabel",
  "intro",
  "note",
  "bullets",
  "slip",
];
const letterStoreKey = (prefix) => `feeLetterSettings:${cleanPrefix(prefix)}`;

function loadLetterSettings(prefix) {
  try {
    return (
      JSON.parse(localStorage.getItem(letterStoreKey(prefix)) || "{}") || {}
    );
  } catch {
    return {};
  }
}
function saveLetterSettings(prefix, letter) {
  try {
    const keep = {};
    LETTER_SETTINGS_KEYS.forEach((k) => (keep[k] = letter[k]));
    localStorage.setItem(letterStoreKey(prefix), JSON.stringify(keep));
  } catch {}
}

function LField({ label, children, wide }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4A6B80] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
const inputCls =
  "w-full border border-[#c8dff0] rounded-lg px-2.5 py-1.5 text-[12.5px] text-[#1C3044] outline-none focus:border-[#27435B] bg-white";

function FeeLetterForm({
  letter,
  setLetter,
  particularsLoading,
  particularsInfo: info,
}) {
  const set = (k, v) => setLetter((L) => ({ ...L, [k]: v }));
  const setP = (k, v) =>
    setLetter((L) => ({ ...L, particulars: { ...L.particulars, [k]: v } }));
  const setS = (k, v) =>
    setLetter((L) => ({ ...L, slip: { ...L.slip, [k]: v } }));
  const due = Math.max(
    0,
    Number(letter.pastDues || 0) +
      Number(letter.feeAmount || 0) -
      Number(letter.paidAmount || 0),
  );

  return (
    <div className="space-y-4">
      <div className="text-[11.5px] text-[#4A6B80] bg-[#f0f7fc] border border-[#d6e7f3] rounded-lg px-3 py-2">
        Parent fee letter in your school's printed format. Check the details —
        the letter on screen updates as you type. Use <b>Preview</b>,{" "}
        <b>Print</b> or <b>Download</b>. Term, notes and slip settings are
        remembered for the next letter.
      </div>

      <div className="border border-[#e0eef6] rounded-xl p-3.5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1C3044] mb-2.5">
          Student particulars{" "}
          {particularsLoading && (
            <span className="font-normal text-[#4A6B80]">· loading…</span>
          )}
        </div>
        {info?.error && (
          <div className="mb-2.5 text-[11.5px] text-[#a33030] bg-[#fdf0f0] border border-[#f5c2c2] rounded-lg px-3 py-1.5">
            Couldn't load student details ({info.error}). Make sure the updated
            server file is deployed — or type the details below.
          </div>
        )}
        {info && !info.error && !info.found && (
          <div className="mb-2.5 text-[11.5px] text-[#92400e] bg-[#fef6e7] border border-[#fde68a] rounded-lg px-3 py-1.5">
            This fee record isn't linked to a student profile (no match by link,
            email or name). Type the details below.
          </div>
        )}
        {info?.found && (
          <div className="mb-2.5 text-[11.5px] text-[#1a6e3e] bg-[#edf7f1] border border-[#b2dfc6] rounded-lg px-3 py-1.5">
            Filled from the student's profile
            {info.matchedBy && info.matchedBy !== "link"
              ? ` (matched by ${info.matchedBy})`
              : ""}
            .
            {!info.fatherName &&
              !info.guardianName &&
              " Father's name is empty in the profile."}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LField label="S.No">
            <input
              className={inputCls}
              value={letter.serialNo}
              onChange={(e) => set("serialNo", e.target.value)}
            />
          </LField>
          <LField label="Admission Number">
            <input
              className={inputCls}
              value={letter.particulars.admissionNumber}
              onChange={(e) => setP("admissionNumber", e.target.value)}
            />
            {info?.found &&
              info.admissionNumber &&
              info.studentCode &&
              info.admissionNumber !== info.studentCode && (
                <span className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    ["Admission No", info.admissionNumber],
                    ["Student ID", info.studentCode],
                  ].map(([l, v]) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setP("admissionNumber", v)}
                      className={`text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        letter.particulars.admissionNumber === v
                          ? "bg-[#1C3044] text-white border-[#1C3044]"
                          : "bg-white text-[#27435B] border-[#c8dff0]"
                      }`}
                    >
                      {l}: {v}
                    </button>
                  ))}
                </span>
              )}
          </LField>
          <LField label="Class">
            <input
              className={inputCls}
              value={letter.particulars.className}
              onChange={(e) => setP("className", e.target.value)}
            />
          </LField>
          <LField label="Father Name">
            <input
              className={inputCls}
              value={letter.particulars.fatherName}
              onChange={(e) => setP("fatherName", e.target.value)}
            />
          </LField>
          <LField label="Phone Number(s)" wide>
            <input
              className={inputCls}
              value={letter.particulars.phones}
              onChange={(e) => setP("phones", e.target.value)}
            />
          </LField>
        </div>
      </div>

      <div className="border border-[#e0eef6] rounded-xl p-3.5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1C3044] mb-2.5">
          Fee particulars
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LField label="Academic year">
            <input
              className={inputCls}
              value={letter.academicYear}
              onChange={(e) => set("academicYear", e.target.value)}
            />
          </LField>
          <LField label="Term title">
            <input
              className={inputCls}
              placeholder="I TERM"
              value={letter.termLabel}
              onChange={(e) => set("termLabel", e.target.value)}
            />
          </LField>
          <LField label="Instalment label">
            <input
              className={inputCls}
              placeholder="1st & 2nd Installment Fee"
              value={letter.installmentLabel}
              onChange={(e) => set("installmentLabel", e.target.value)}
            />
          </LField>
          <LField label="Past year dues (₹)">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={letter.pastDues}
              onChange={(e) => set("pastDues", e.target.value)}
            />
          </LField>
          <LField label="Instalment fee (₹)">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={letter.feeAmount}
              onChange={(e) => set("feeAmount", e.target.value)}
            />
          </LField>
          <LField label="Paid (₹)">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={letter.paidAmount}
              onChange={(e) => set("paidAmount", e.target.value)}
            />
          </LField>
        </div>
        <div className="mt-3 flex items-center justify-between bg-[#fdf6f6] border border-[#f5c2c2] rounded-lg px-3 py-2">
          <span className="text-[11.5px] font-bold text-[#a33030] uppercase tracking-wide">
            Instalment due
          </span>
          <span className="text-[15px] font-bold text-[#a33030]">
            ₹{fmt(due)}
          </span>
        </div>
      </div>

      <div className="border border-[#e0eef6] rounded-xl p-3.5 space-y-3">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1C3044]">
          Message & notes
        </div>
        <LField label="Letter text ({AY} = academic year)">
          <textarea
            rows={4}
            className={inputCls}
            value={letter.intro}
            onChange={(e) => set("intro", e.target.value)}
          />
        </LField>
        <LField label="Note">
          <input
            className={inputCls}
            value={letter.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </LField>
        <LField label="Bullet points — one per line, start with * for bold">
          <textarea
            rows={4}
            className={inputCls}
            placeholder={
              "*Dusshra Holidays from 10-10-2026 to 21-10-2026\n*School Reopens Date: 22-10-2026\nAttendance is Mandatory"
            }
            value={letter.bullets}
            onChange={(e) => set("bullets", e.target.value)}
          />
        </LField>
      </div>

      <div className="border border-[#e0eef6] rounded-xl p-3.5 space-y-3">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1C3044] cursor-pointer">
          <input
            type="checkbox"
            checked={!!letter.slip.enabled}
            onChange={(e) => setS("enabled", e.target.checked)}
          />
          Add tear-off slip (e.g. Student Movement Intimation Slip)
        </label>
        {letter.slip.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LField label="Slip title">
              <input
                className={inputCls}
                value={letter.slip.title}
                onChange={(e) => setS("title", e.target.value)}
              />
            </LField>
            <LField label="Slip heading">
              <input
                className={inputCls}
                placeholder="Dusshra Holidays from 10-10-2026 to 21-10-2026"
                value={letter.slip.subtitle}
                onChange={(e) => setS("subtitle", e.target.value)}
              />
            </LField>
            <LField label="Date of leaving">
              <input
                type="date"
                className={inputCls}
                value={letter.slip.leaveDate}
                onChange={(e) => setS("leaveDate", e.target.value)}
              />
            </LField>
            <LField label="Date of return">
              <input
                type="date"
                className={inputCls}
                value={letter.slip.returnDate}
                onChange={(e) => setS("returnDate", e.target.value)}
              />
            </LField>
          </div>
        )}
      </div>
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
  schoolEmail,
  schoolLogoUrl,
  invoicePrefix,
}) {
  const [logoUrl, setLogoUrl] = useState(schoolLogoUrl || null);
  const [schoolExtra, setSchoolExtra] = useState({}); // filled from /mySchool if props are missing
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

  // School-specific Fee Letter (only for schools listed in SCHOOL_FORMATS)
  const [letter, setLetter] = useState(() => ({
    serialNo: String(student.id || ""),
    academicYear: academicYearLabel(),
    termLabel: "I TERM",
    installmentLabel: "1st & 2nd Installment Fee",
    pastDues: "",
    feeAmount: "",
    paidAmount: "",
    intro: DEFAULT_LETTER_INTRO,
    note: "Please ensure that all payments are made by the specified due dates. Thanks for your cooperation.",
    bullets: "",
    particulars: {
      admissionNumber: "",
      className: student.course || "",
      fatherName: "",
      phones: student.phone || "",
    },
    ...loadLetterSettings(invoicePrefix),
    slip: {
      enabled: false,
      title: "Student Movement Intimation Slip",
      subtitle: "",
      leaveDate: "",
      returnDate: "",
      ...(loadLetterSettings(invoicePrefix).slip || {}),
    },
  }));
  const [particularsLoading, setParticularsLoading] = useState(false);
  const [particularsInfo, setParticularsInfo] = useState(null); // { found, matchedBy, admissionNumber, studentCode } | { error }

  const school = {
    name: schoolName || schoolExtra.name,
    address: schoolAddress || schoolExtra.address,
    phone: schoolPhone || schoolExtra.phone,
    email: schoolEmail || schoolExtra.email,
  };

  const schoolFormat = getSchoolFormat(school, invoicePrefix);

  // ── Logo + school details ──
  // Uses the props when given; otherwise asks /api/school/logo and then
  // /api/finance/mySchool, so the receipt always gets the logo if one exists.
  useEffect(() => {
    if (schoolLogoUrl) setLogoUrl(schoolLogoUrl);
  }, [schoolLogoUrl]);

  useEffect(() => {
    let alive = true;
    const headers = { Authorization: `Bearer ${getToken()}` };
    (async () => {
      let found = schoolLogoUrl || null;
      if (!found) {
        try {
          const res = await fetch(`${API_URL}/api/school/logo`, { headers });
          if (res.ok) found = (await res.json())?.logoUrl || null;
        } catch {}
      }
      try {
        if (!found || !schoolPhone || !schoolEmail || !schoolAddress) {
          const res = await fetch(`${API_URL}/api/finance/mySchool`, {
            headers,
          });
          if (res.ok) {
            const d = await res.json();
            found = found || d?.logoUrl || null;
            if (alive)
              setSchoolExtra({
                name: d?.name,
                address: [d?.address, d?.city].filter(Boolean).join(", "),
                phone: d?.phone,
                email: d?.email,
              });
          }
        }
      } catch {}
      if (alive && found) setLogoUrl(found);
      // warm the PDF logo cache so the first Preview/Download already has it
      if (found) loadLogoForPDF(found);
    })();
    return () => {
      alive = false;
    };
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
  const isLetter = view === "letter" && !!schoolFormat;

  // Fill fee totals once payments are loaded (user can still edit them)
  useEffect(() => {
    if (loading) return;
    const t = sumRows(statementRowsFrom(history, fallbackRows));
    setLetter((L) => ({
      ...L,
      feeAmount: L.feeAmount === "" ? t.total : L.feeAmount,
      paidAmount: L.paidAmount === "" ? t.paid : L.paidAmount,
    }));
  }, [loading]);

  // Load admission no. / father name / phones the first time the tab opens
  const particularsLoaded = useRef(false);
  useEffect(() => {
    if (!isLetter || particularsLoaded.current) return;
    particularsLoaded.current = true;
    setParticularsLoading(true);
    fetch(`${API_URL}/api/finance/studentParticulars/${student.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setParticularsInfo(d);
        if (!d?.found) return;
        setLetter((L) => ({
          ...L,
          particulars: {
            admissionNumber:
              L.particulars.admissionNumber ||
              d.admissionNumber ||
              d.studentCode ||
              "",
            className: d.className || L.particulars.className,
            fatherName:
              L.particulars.fatherName || d.fatherName || d.guardianName || "",
            phones: (d.phones || []).join(" ") || L.particulars.phones,
          },
        }));
      })
      .catch((e) => {
        console.error("[FeeLetter] studentParticulars failed:", e.message);
        setParticularsInfo({ error: e.message });
      })
      .finally(() => setParticularsLoading(false));
  }, [isLetter]);

  // Remember term / notes / slip settings for the next letter
  useEffect(() => {
    if (schoolFormat) saveLetterSettings(invoicePrefix, letter);
  }, [
    letter.termLabel,
    letter.installmentLabel,
    letter.intro,
    letter.note,
    letter.bullets,
    letter.slip,
  ]);
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
  const docNo = isLetter
    ? `Fee Letter · S.No ${letter.serialNo || "—"}`
    : isReceipt
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
      format: schoolFormat,
      letter: {
        ...letter,
        particulars: {
          ...letter.particulars,
        },
      },
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

  const current = isLetter
    ? { mode: "letter" }
    : isReceipt
    ? { mode: "receipt", txnId: selectedTxn.id, useHidden: true }
    : { mode: isFinal ? "final" : "statement", useHidden: true };

  // ── Render ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${
          isLetter ? "max-w-6xl" : "max-w-3xl"
        } max-h-[94vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden transition-[max-width] duration-300`}
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
                {school.name || "Fee Receipts"}
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
              ...(schoolFormat
                ? [{ k: "letter", label: "Fee Letter", icon: Mail }]
                : []),
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
              {isLetter
                ? "Download Letter"
                : isReceipt
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
          ) : isLetter ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 items-start">
              {/* Letter on screen (first on phones) */}
              <div className="lg:sticky lg:top-0 lg:order-2">
                <LivePdfPreview
                  makePdf={() => build("letter")}
                  deps={[
                    letter,
                    logoUrl,
                    school.name,
                    school.address,
                    school.phone,
                    school.email,
                  ]}
                  onOpen={() => doPreview(current, "pv")}
                />
              </div>
              <div className="lg:order-1">
                <FeeLetterForm
                  letter={letter}
                  setLetter={setLetter}
                  particularsLoading={particularsLoading}
                  particularsInfo={particularsInfo}
                />
              </div>
            </div>
          ) : (
            <>
              {/* School letterhead — same as the PDF */}
              <div className="border border-[#e0eef6] rounded-xl px-4 py-3 bg-white">
                <div className="flex items-center gap-3">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="School logo"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain flex-shrink-0"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                  <div className="flex-1 min-w-0 text-center">
                    <div className="text-[15px] sm:text-[18px] font-extrabold tracking-wide text-[#1C3044] uppercase leading-tight">
                      {school.name || "School"}
                    </div>
                    {school.address && (
                      <div className="text-[11.5px] text-[#4A6B80] mt-0.5">
                        {school.address}
                      </div>
                    )}
                    {(school.phone || school.email) && (
                      <div className="text-[11.5px] text-[#4A6B80]">
                        {[
                          school.phone && `Phone: ${school.phone}`,
                          school.email && `Email: ${school.email}`,
                        ]
                          .filter(Boolean)
                          .join("  |  ")}
                      </div>
                    )}
                  </div>
                  {logoUrl && (
                    <div className="w-14 sm:w-16 flex-shrink-0 hidden sm:block" />
                  )}
                </div>
                <div className="mt-2.5 border-t-[3px] border-double border-[#1C3044]" />
                <div className="mt-2 bg-[#1C3044] text-white text-center text-[12px] font-bold tracking-[0.3em] py-1.5 rounded">
                  {isReceipt
                    ? "FEE RECEIPT"
                    : isFinal
                    ? isFullyPaid
                      ? "FINAL INVOICE"
                      : "FEE INVOICE"
                    : "FEE STATEMENT"}
                </div>
              </div>

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
