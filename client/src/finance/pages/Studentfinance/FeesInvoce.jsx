// ─────────────────────────────────────────────────────────────────────────────
// FeesInvoice.jsx
// Added: Payment Date dropdown in "Fee Breakdown by Category" card header.
//   • Each selected transaction shows ONLY that payment's data.
//   • Paid column = amount paid in that specific transaction only.
//   • Only categories paid in the selected transaction are shown.
//   • Total Paid / Balance Due cards reflect the selected transaction.
//   • Download PDF and Print use the selected transaction.
//   • Hide/Show per-row toggle preserved.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Eye, EyeOff, Printer, Receipt, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Load logo → base64 for jsPDF ─────────────────────────────────────────────
async function loadLogoForPDF(logoUrl) {
  if (!logoUrl) return null;
  try {
    const API = import.meta.env.VITE_API_URL;
    const proxyUrl = `${API}/api/image-proxy?url=${encodeURIComponent(logoUrl)}`;
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
    const rawBase64 = dataUrl.split(",")[1];
    if (!rawBase64) throw new Error("base64 split failed");
    const mime = blob.type || "image/png";
    const format = mime.includes("jpeg") || mime.includes("jpg") ? "JPEG" : "PNG";
    return { base64: rawBase64, format };
  } catch (err) {
    console.warn("[PDF Logo] proxy failed:", err.message);
    return null;
  }
}

// ── Build category rows (for ALL-TIME / fallback view) ───────────────────────
function buildCategoryRows(student) {
  if (Array.isArray(student.feeCategories) && student.feeCategories.length > 0) {
    return student.feeCategories.map((sfc) => ({
      id: sfc.id,
      name: sfc.category?.name || "Fee",
      total: Number(sfc.totalAmount || 0),
      paid: Number(sfc.paidAmount || 0),
      pending: Math.max(0, Number(sfc.totalAmount || 0) - Number(sfc.paidAmount || 0)),
    }));
  }

  let bd = {};
  try { bd = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : {}; } catch {}

  const KEY_LABEL = {
    collegeFee: "School Fee",
    tuitionFee: "Tuition Fee",
    examFee: "Exam Fee",
    transportFee: "Transport Fee",
    booksFee: "Books Fee",
    labFee: "Lab Fee",
    miscFee: "Miscellaneous",
  };

  const paidFields = {
    collegeFee: Number(student.schoolFeePaid || 0),
    tuitionFee: Number(student.tuitionFeePaid || 0),
    examFee: Number(student.examFeePaid || 0),
    transportFee: Number(student.transportFeePaid || 0),
    booksFee: Number(student.booksFeePaid || 0),
    labFee: Number(student.labFeePaid || 0),
    miscFee: Number(student.miscFeePaid || 0),
  };

  const rows = [];
  for (const [key, label] of Object.entries(KEY_LABEL)) {
    const entry = bd[key];
    const total = entry
      ? Number(typeof entry === "object" ? (entry.total ?? entry.amount ?? 0) : entry)
      : 0;
    if (total <= 0) continue;
    const paid = Number(paidFields[key] || 0);
    rows.push({ id: key, name: label, total, paid, pending: Math.max(0, total - paid) });
  }

  if (Array.isArray(bd.customFees)) {
    bd.customFees.forEach((c, i) => {
      const total = Number(c.amount || c.total || 0);
      if (total > 0)
        rows.push({ id: `custom_${i}`, name: c.label || `Custom Fee ${i + 1}`, total, paid: 0, pending: total });
    });
  }

  if (rows.length === 0) {
    const total = Number(student.fees || 0);
    const paid = Number(student.paidAmount || 0);
    rows.push({ id: "total", name: "Total Fees", total, paid, pending: Math.max(0, total - paid) });
  }

  return rows;
}

// ── Build rows for a SPECIFIC transaction ────────────────────────────────────
// Shows ALL categories from allCategoryRows.
// paid    = amount paid in THIS transaction (0 if not paid this time)
// pending = totalAmount − cumulativePaid after this transaction
function buildTxnRows(txn, allCategoryRows) {
  if (!txn || !Array.isArray(txn.items)) return [];

  // Index txn items by categoryName for quick lookup
  const itemByName = {};
  for (const item of txn.items) {
    const key = (item.categoryName || "").toLowerCase();
    itemByName[key] = item;
  }

  // If allCategoryRows is available, show ALL categories with 0 for unpaid ones
  if (allCategoryRows && allCategoryRows.length > 0) {
    return allCategoryRows.map((cat) => {
      const key  = (cat.name || "").toLowerCase();
      const item = itemByName[key];

      const total        = cat.total || 0;
      const paid         = item ? Number(item.amount || 0) : 0;
      const cumulativePaid = item
        ? Number(item.cumulativePaid ?? paid)
        : null; // unknown for categories not in this txn

      // pending = remaining after this transaction
      // if not paid in this txn, use item.pending if available, else derive from cumulativePaid
      let pending;
      if (item) {
        pending = item.pending !== undefined
          ? Number(item.pending)
          : Math.max(0, total - Number(item.cumulativePaid ?? paid));
      } else {
        // category was not touched in this txn — pending is unknown from txn data alone
        // fall back to cat.pending (cumulative) as best estimate
        pending = cat.pending ?? Math.max(0, total - (cat.paid || 0));
      }

      return {
        id:      String(cat.id || cat.name),
        name:    cat.name || "Fee",
        total,
        paid,
        pending,
      };
    });
  }

  // Fallback: only items in this txn (show paid ones only)
  return txn.items.map((item) => {
    const total   = Number(item.totalAmount || 0);
    const paid    = Number(item.amount || 0);
    const pending = item.pending !== undefined
      ? Number(item.pending)
      : Math.max(0, total - Number(item.cumulativePaid ?? paid));
    return {
      id:      String(item.studentFeeCategoryId || item.categoryName || Math.random()),
      name:    item.categoryName || "Fee",
      total,
      paid,
      pending,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export function InvoiceModal({ student, onClose, schoolName, schoolAddress, schoolLogoUrl }) {
  // All category rows (for total amounts reference)
  const [allCategoryRows, setAllCategoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(schoolLogoUrl || null);

  // Payment history from new API
  const [paymentHistory, setPaymentHistory] = useState([]); // [{id, label, date, receiptNo, items:[]}]
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedTxnId, setSelectedTxnId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Hidden rows (apply to whatever rows are being displayed)
  const [hiddenRows, setHiddenRows] = useState(new Set());

  const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Toggle row visibility ───────────────────────────────────────────────────
  const toggleRowVisibility = (rowId) => {
    setHiddenRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // ── Fetch logo if not passed ─────────────────────────────────────────────
  useEffect(() => {
    if (logoUrl) return;
    (async () => {
      try {
        const auth = JSON.parse(localStorage.getItem("auth") || "{}");
        const token = auth?.token;
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/school/logo`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch {}
    })();
  }, []);

  // ── Fetch all category rows (for total amounts) ──────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        if (Array.isArray(student.feeCategories) && student.feeCategories.length > 0) {
          setAllCategoryRows(buildCategoryRows(student));
          return;
        }
        const auth = JSON.parse(localStorage.getItem("auth") || "{}");
        const token = auth?.token;
        const res = await fetch(`${API_URL}/api/finance/studentFeeCategories/${student.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllCategoryRows(buildCategoryRows({ ...student, feeCategories: data }));
        } else {
          setAllCategoryRows(buildCategoryRows(student));
        }
      } catch {
        setAllCategoryRows(buildCategoryRows(student));
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [student.id]);

  // ── Fetch payment history ────────────────────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const auth = JSON.parse(localStorage.getItem("auth") || "{}");
        const token = auth?.token;
        const url = `${API_URL}/api/finance/paymentHistory/${student.id}`;
        console.log("[FeesInvoice] Fetching payment history:", url);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          console.log("[FeesInvoice] Payment History API returned:", JSON.stringify(data));
          setPaymentHistory(data);
          if (data.length > 0) {
            setSelectedTxnId(data[0].id);
            console.log("[FeesInvoice] ✅ Dropdown:", data.length, "entries. Auto-selected:", data[0].label);
          } else {
            console.warn("[FeesInvoice] ⚠️  Empty — dropdown will NOT appear. Student paidAmount may be 0.");
          }
        } else {
          const errText = await res.text();
          console.error("[FeesInvoice] ❌ API error", res.status, errText);
        }
      } catch (e) {
        console.error("[FeesInvoice] ❌ paymentHistory fetch threw:", e.message);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [student.id]);

  // ── Determine which rows to display ─────────────────────────────────────
  const selectedTxn = paymentHistory.find((t) => t.id === selectedTxnId) || null;

  // rows for the selected transaction, or fallback to all-time rows
  const baseRows =
    selectedTxn && Array.isArray(selectedTxn.items) && selectedTxn.items.length > 0
      ? buildTxnRows(selectedTxn, allCategoryRows)
      : allCategoryRows;

  // Apply hidden filter
  const visibleRows = baseRows.filter((r) => !hiddenRows.has(r.id));

  // ── Totals ───────────────────────────────────────────────────────────────
  const grandTotal   = visibleRows.reduce((s, r) => s + r.total,   0);
  const grandPaid    = visibleRows.reduce((s, r) => s + r.paid,    0);
  const grandPending = visibleRows.reduce((s, r) => s + r.pending, 0);
  const paidPct = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0;

  // ── Receipt date label ────────────────────────────────────────────────────
  const receiptDateLabel = selectedTxn ? selectedTxn.label : today;

  // ── PDF Download ─────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!window.jspdf) { alert("PDF library not loaded yet. Please try again."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, m = 18;

    const logoData = logoUrl ? await loadLogoForPDF(logoUrl) : null;

    const headerH = schoolAddress ? 52 : 46;
    doc.setFillColor(28, 48, 68); doc.rect(0, 0, W, headerH, "F");

    const logoSize = 28, logoX = m, logoY = (headerH - logoSize) / 2;
    const textX = logoData ? m + logoSize + 7 : m;

    if (logoData) {
      try {
        doc.addImage(
          `data:image/${logoData.format.toLowerCase()};base64,${logoData.base64}`,
          logoData.format,
          logoX + 2, logoY + 2,
          logoSize - 4, logoSize - 4
        );
      } catch (err) {
        console.error("addImage failed:", err);
      }
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
    doc.text(schoolName || "Fee Receipt", textX, logoData ? logoY + 10 : 16);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
    doc.text("Fee Invoice & Payment Receipt", textX, logoData ? logoY + 18 : 24);
    if (schoolAddress) { doc.setFontSize(8); doc.setTextColor(140, 175, 200); doc.text(schoolAddress, textX, logoData ? logoY + 25 : 32); }

    doc.setFillColor(255, 255, 255); doc.roundedRect(W - m - 52, 8, 52, 22, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(28, 48, 68);
    doc.text("INVOICE", W - m - 26, 16, { align: "center" });
    doc.setFontSize(10); doc.text(invoiceNo, W - m - 26, 24, { align: "center" });

    doc.setFillColor(39, 67, 91); doc.rect(0, headerH, W, 10, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
    doc.text(`Date: ${receiptDateLabel}`, m, headerH + 7);
    doc.text(`Status: ${grandPending === 0 ? "PAID" : "PARTIALLY PAID"}`, W - m, headerH + 7, { align: "right" });

    let y = headerH + 18;
    const boxH = student.address ? 60 : 48;
    doc.setFillColor(240, 247, 252); doc.roundedRect(m, y - 6, W - m * 2, boxH, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
    doc.text("STUDENT DETAILS", m + 4, y);
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 50, 70);
    doc.text("Name:", m + 4, y + 10); doc.setFont("helvetica", "normal"); doc.text(student.name || "N/A", m + 22, y + 10);
    doc.setFont("helvetica", "bold"); doc.text("Email:", W / 2 + 4, y + 10); doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", W / 2 + 22, y + 10);
    doc.setFont("helvetica", "bold"); doc.text("Course:", m + 4, y + 20); doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", m + 22, y + 20);
    doc.setFont("helvetica", "bold"); doc.text("Phone:", W / 2 + 4, y + 20); doc.setFont("helvetica", "normal"); doc.text(student.phone || "N/A", W / 2 + 22, y + 20);
    if (student.address) {
      doc.setFont("helvetica", "bold"); doc.text("Address:", m + 4, y + 30);
      doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(student.address, W - m * 2 - 34), m + 22, y + 30);
    }
    y += boxH + 12;

    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
    doc.text("FEE BREAKDOWN", m, y); y += 5;

    const COL = { name: m + 4, total: m + 98, paid: m + 130, pending: m + 160 };
    const COLW = W - m * 2;
    doc.setFillColor(28, 48, 68); doc.rect(m, y, COLW, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text("Fee Category", COL.name, y + 6);
    doc.text("Total",   COL.total,   y + 6);
    doc.text("Paid",    COL.paid,    y + 6);
    doc.text("Pending", COL.pending, y + 6);
    y += 9;

    visibleRows.forEach((row, i) => {
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 252 : 255, 255);
      doc.rect(m, y, COLW, 9, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
      doc.text(row.name, COL.name, y + 6);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs.${fmt(row.total)}`,   COL.total,   y + 6);
      doc.setTextColor(26, 110, 62);
      doc.text(`Rs.${fmt(row.paid)}`,    COL.paid,    y + 6);
      doc.setTextColor(row.pending > 0 ? 180 : 26, row.pending > 0 ? 48 : 110, row.pending > 0 ? 48 : 62);
      doc.text(`Rs.${fmt(row.pending)}`, COL.pending, y + 6);
      doc.setTextColor(30, 50, 70);
      y += 9;
    });

    doc.setFillColor(28, 48, 68); doc.rect(m, y, COLW, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text("TOTAL", COL.name, y + 6);
    doc.text(`Rs.${fmt(grandTotal)}`,   COL.total,   y + 6);
    doc.text(`Rs.${fmt(grandPaid)}`,    COL.paid,    y + 6);
    doc.text(`Rs.${fmt(grandPending)}`, COL.pending, y + 6);
    y += 14;

    const bx = W - m - 80;
    doc.setFillColor(240, 247, 252); doc.roundedRect(bx, y, 80, 46, 3, 3, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 100, 120);
    doc.text("Total Fees:", bx + 4, y + 9);
    doc.setFont("helvetica", "bold"); doc.setTextColor(28, 48, 68);
    doc.text(`Rs. ${fmt(grandTotal)}`, bx + 78, y + 9, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(80, 100, 120);
    doc.text("Amount Paid:", bx + 4, y + 20);
    doc.setFont("helvetica", "bold"); doc.setTextColor(28, 68, 48);
    doc.text(`Rs. ${fmt(grandPaid)}`, bx + 78, y + 20, { align: "right" });
    doc.setDrawColor(28, 48, 68); doc.setLineWidth(0.4); doc.line(bx + 4, y + 24, bx + 76, y + 24);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(28, 48, 68);
    doc.text("Balance Due:", bx + 4, y + 34);
    doc.setTextColor(grandPending === 0 ? 28 : 180, grandPending === 0 ? 90 : 30, grandPending === 0 ? 50 : 30);
    doc.text(`Rs. ${fmt(grandPending)}`, bx + 78, y + 34, { align: "right" });

    doc.setFillColor(28, 48, 68); doc.rect(0, 272, W, 25, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(180, 205, 220);
    doc.text(
      schoolName ? `${schoolName} · System-generated receipt. No signature required.` : "System-generated receipt.",
      W / 2, 281, { align: "center" }
    );

    doc.save(`Receipt_${(student.name || "Student").replace(/\s+/g, "_")}_${invoiceNo}.pdf`);
  };

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const rowsHtml = visibleRows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
        <td>${r.name}</td>
        <td>₹${fmt(r.total)}</td>
        <td style="color:#1a6e3e">₹${fmt(r.paid)}</td>
        <td style="color:${r.pending > 0 ? "#a33030" : "#1a6e3e"}">₹${fmt(r.pending)}</td>
      </tr>
    `).join("");

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;padding:4px;margin-right:14px;flex-shrink:0;" />`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Fee Receipt — ${student.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1C3044; font-size: 13px; padding: 24px; }
    .header { background: #1C3044; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .header-left { display: flex; align-items: center; }
    .header-left h1 { font-size: 20px; margin-bottom: 4px; }
    .header-left p  { font-size: 11px; color: rgba(255,255,255,.65); }
    .header-right { text-align: right; }
    .inv-badge { background: #fff; color: #1C3044; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .status-bar { background: #27435B; color: rgba(255,255,255,.8); padding: 6px 24px; font-size: 11px; display: flex; justify-content: space-between; }
    .section { padding: 16px 0; border-bottom: 1px solid #e0eef6; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #4A6B80; margin-bottom: 8px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
    .detail-label { font-size: 11px; color: #4A6B80; }
    .detail-value { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #1C3044; color: #fff; padding: 8px 10px; font-size: 11px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e0eef6; }
    .totals-row td { background: #1C3044; color: #fff; font-weight: 700; border: none; }
    .summary { background: #f0f7fc; border: 1px solid #d0e2ee; border-radius: 8px; padding: 14px 16px; margin-top: 16px; max-width: 260px; margin-left: auto; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
    .summary-row.total { border-top: 1.5px solid #1C3044; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #8fa3b1; }
    .progress-bar { height: 8px; background: #d0e2ee; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: #27435B; border-radius: 4px; width: ${paidPct}%; }
    @media print { body { padding: 0; } button { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoHtml}
      <div>
        <h1>${schoolName || "School"}</h1>
        <p>Fee Invoice &amp; Payment Receipt</p>
        ${schoolAddress ? `<p style="margin-top:3px">${schoolAddress}</p>` : ""}
      </div>
    </div>
    <div class="header-right">
      <div class="inv-badge">INVOICE</div>
      <div style="font-size:12px;margin-top:6px;color:rgba(255,255,255,.8)">${invoiceNo}</div>
    </div>
  </div>
  <div class="status-bar">
    <span>Date: ${receiptDateLabel}</span>
    <span>Status: ${grandPending === 0 ? "PAID" : "PARTIALLY PAID"}</span>
  </div>
  <div class="section">
    <div class="section-title">Student Details</div>
    <div class="detail-grid">
      <div><div class="detail-label">Name</div><div class="detail-value">${student.name || "—"}</div></div>
      <div><div class="detail-label">Email</div><div class="detail-value">${student.email || "—"}</div></div>
      <div><div class="detail-label">Course / Class</div><div class="detail-value">${student.course || "—"}</div></div>
      <div><div class="detail-label">Phone</div><div class="detail-value">${student.phone || "—"}</div></div>
      ${student.address ? `<div style="grid-column:1/-1"><div class="detail-label">Address</div><div class="detail-value">${student.address}</div></div>` : ""}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Fee Breakdown</div>
    <table>
      <thead><tr><th>Fee Category</th><th>Total (₹)</th><th>Paid (₹)</th><th>Pending (₹)</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="totals-row">
          <td><strong>TOTAL</strong></td>
          <td>₹${fmt(grandTotal)}</td>
          <td>₹${fmt(grandPaid)}</td>
          <td>₹${fmt(grandPending)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="progress-bar"><div class="progress-fill"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#4A6B80;margin-top:4px">
      <span>${paidPct}% paid</span>
      <span>${grandPending === 0 ? "✓ Fully Paid" : `₹${fmt(grandPending)} remaining`}</span>
    </div>
  </div>
  <div class="summary">
    <div class="summary-row"><span>Total Fees</span><span>₹${fmt(grandTotal)}</span></div>
    <div class="summary-row" style="color:#1a6e3e"><span>Amount Paid</span><span>₹${fmt(grandPaid)}</span></div>
    <div class="summary-row total" style="color:${grandPending > 0 ? "#a33030" : "#1a6e3e"}">
      <span>Balance Due</span><span>₹${fmt(grandPending)}</span>
    </div>
  </div>
  <div class="footer">${schoolName || "School"} · System-generated receipt. No signature required.</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=800,height=700");
    w.document.write(html);
    w.document.close();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#1C3044] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white/20 border border-white/30 p-0.5 flex-shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Receipt size={18} color="#fff" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">{schoolName || "Student Invoice"}</div>
              <div className="text-blue-200 text-xs truncate">{invoiceNo} · {receiptDateLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              title="Print receipt"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg border border-white/30 bg-white/15 hover:bg-white/25 transition-colors"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownload}
              title="Download PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg border border-white/30 bg-white/15 hover:bg-white/25 transition-colors"
            >
              <Download size={13} /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">

          {/* School banner */}
          {schoolName && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-[#f0f7fc] to-[#e4f0f8] border border-[#c8dff0] rounded-xl px-4 py-3">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="School Logo"
                  className="w-12 h-12 rounded-lg object-contain bg-white border border-[#d0e8f0] p-1 flex-shrink-0"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <div>
                <span className="block text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider">Issued By</span>
                <span className="block text-sm font-bold text-[#1C3044]">{schoolName}</span>
                {schoolAddress && <span className="block text-xs text-[#4A6B80]">{schoolAddress}</span>}
              </div>
            </div>
          )}

          {/* Student details */}
          <div className="border border-[#e0eef6] rounded-xl p-4">
            <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider mb-3">Student Details</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <div className="text-[11px] text-[#4A6B80]">Name</div>
                <div className="text-sm font-semibold text-[#1C3044]">{student.name}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#4A6B80]">Email</div>
                <div className="text-sm font-semibold text-[#1C3044] break-all">{student.email}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#4A6B80]">Course / Class</div>
                <div className="text-sm font-semibold text-[#1C3044]">{student.course || "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-[#4A6B80]">Student ID</div>
                <div className="text-sm font-semibold text-[#1C3044]">#{student.id}</div>
              </div>
              {student.phone && (
                <div>
                  <div className="text-[11px] text-[#4A6B80]">Phone</div>
                  <div className="text-sm font-semibold text-[#1C3044]">{student.phone}</div>
                </div>
              )}
            </div>
            {student.address && (
              <div className="mt-3 pt-3 border-t border-[#e0eef6]">
                <div className="text-[11px] text-[#4A6B80]">Address</div>
                <div className="text-sm font-semibold text-[#1C3044] mt-0.5 leading-relaxed">{student.address}</div>
              </div>
            )}
          </div>

          {/* ── Fee Breakdown table ── */}
          <div className="border border-[#e0eef6] rounded-xl overflow-hidden">

            {/* Section header — with Payment Date dropdown on the right */}
            <div className="px-4 py-3 border-b border-[#e0eef6] flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider">
                  Fee Breakdown by Category
                </div>
                {hiddenRows.size > 0 && (
                  <span className="text-[10px] text-[#4A6B80] bg-[#f0f7fc] border border-[#c8dff0] rounded-full px-2 py-0.5">
                    {hiddenRows.size} row{hiddenRows.size > 1 ? "s" : ""} hidden from print/PDF
                  </span>
                )}
              </div>

              {/* Payment Date Dropdown */}
              {!historyLoading && paymentHistory.length > 0 && (
                <div className="relative flex-shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#1C3044] bg-[#f0f7fc] border border-[#c8dff0] rounded-lg hover:bg-[#e4eef8] transition-colors whitespace-nowrap"
                  >
                    <span className="text-[10px] font-normal text-[#4A6B80] mr-0.5">Payment Date</span>
                    {selectedTxn ? selectedTxn.label : "Select"}
                    <ChevronDown size={12} className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#c8dff0] rounded-xl shadow-lg overflow-hidden min-w-[200px]">
                      {paymentHistory.map((txn) => (
                        <button
                          key={txn.id}
                          onClick={() => {
                            setSelectedTxnId(txn.id);
                            setHiddenRows(new Set());
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[11px] font-semibold transition-colors flex items-center gap-2 ${
                            selectedTxnId === txn.id
                              ? "bg-[#1C3044] text-white"
                              : "text-[#1C3044] hover:bg-[#f0f7fc]"
                          }`}
                        >
                          {txn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {historyLoading && (
                <span className="text-[10px] text-[#4A6B80] animate-pulse">Loading payments…</span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-[#4A6B80]">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1C3044] to-[#27435B]">
                      {["Fee Category", "Total", "Paid", "Pending", ""].map((h, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white/90 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baseRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#4A6B80]">
                          No payment data for this transaction.
                        </td>
                      </tr>
                    ) : (
                      baseRows.map((row, i) => {
                        const isHidden = hiddenRows.has(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={`border-b border-[#e8f2f8] transition-opacity duration-200 ${
                              isHidden
                                ? "opacity-40 bg-[#f5f5f5]"
                                : i % 2 === 0 ? "bg-[#f8fafc]" : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-2.5 font-semibold text-[#1C3044] whitespace-nowrap">
                              {isHidden
                                ? <span className="line-through text-[#aaa]">{row.name}</span>
                                : row.name
                              }
                            </td>
                            <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${isHidden ? "text-[#bbb]" : "text-[#27435B]"}`}>
                              ₹{fmt(row.total)}
                            </td>
                            <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${isHidden ? "text-[#bbb]" : "text-[#1a6e3e]"}`}>
                              ₹{fmt(row.paid)}
                            </td>
                            <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${
                              isHidden ? "text-[#bbb]" : row.pending > 0 ? "text-[#a33030]" : "text-[#1a6e3e]"
                            }`}>
                              ₹{fmt(row.pending)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => toggleRowVisibility(row.id)}
                                title={isHidden ? "Show in print/PDF" : "Hide from print/PDF"}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                                  isHidden
                                    ? "bg-[#edf7f1] border-[#b2dfc6] text-[#1a6e3e] hover:bg-[#d4f0e0]"
                                    : "bg-[#fff5f5] border-[#f5c2c2] text-[#a33030] hover:bg-[#fde8e8]"
                                }`}
                              >
                                {isHidden
                                  ? <><Eye size={11} /> Show</>
                                  : <><EyeOff size={11} /> Hide</>
                                }
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-[#1C3044] to-[#27435B]">
                      <td className="px-4 py-2.5 font-bold text-white text-[13px]">TOTAL</td>
                      <td className="px-4 py-2.5 font-bold text-white whitespace-nowrap">₹{fmt(grandTotal)}</td>
                      <td className="px-4 py-2.5 font-bold text-[#7ddfb0] whitespace-nowrap">₹{fmt(grandPaid)}</td>
                      <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${grandPending > 0 ? "text-[#f9a8a8]" : "text-[#7ddfb0]"}`}>
                        ₹{fmt(grandPending)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Info hint when rows are hidden */}
            {hiddenRows.size > 0 && (
              <div className="px-4 py-2 bg-[#fffbea] border-t border-[#f5e6a0] flex items-center gap-2">
                <EyeOff size={12} className="text-[#b47d00] flex-shrink-0" />
                <span className="text-[11px] text-[#7a5500]">
                  Hidden rows are excluded from totals, print, and PDF download.
                </span>
                <button
                  onClick={() => setHiddenRows(new Set())}
                  className="ml-auto text-[11px] font-semibold text-[#1C3044] underline hover:no-underline"
                >
                  Show all
                </button>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#edf7f1] border border-[#b2dfc6] rounded-xl p-4 text-center">
              <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider mb-1">Total Paid</div>
              <div className="text-lg font-bold text-[#1a6e3e]">₹{fmt(grandPaid)}</div>
            </div>
            <div
              className={`border rounded-xl p-4 text-center ${
                grandPending > 0
                  ? "bg-[#fff5f5] border-[#f5c2c2]"
                  : "bg-[#edf7f1] border-[#b2dfc6]"
              }`}
            >
              <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider mb-1">Balance Due</div>
              <div className={`text-lg font-bold ${grandPending > 0 ? "text-[#a33030]" : "text-[#1a6e3e]"}`}>
                ₹{fmt(grandPending)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-[#4A6B80] mb-1.5">
              <span>Collection Progress</span>
              <span className="font-bold text-[#27435B]">{paidPct}% paid</span>
            </div>
            <div className="h-2 bg-[#d0e2ee] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3A5E78] to-[#27435B] rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#6A8FA4] mt-1">
              <span>₹0</span>
              <span>{grandPending === 0 ? "✓ Fully Paid" : `₹${fmt(grandPending)} remaining`}</span>
              <span>₹{fmt(grandTotal)}</span>
            </div>
          </div>

        </div>{/* end scrollable body */}
      </div>{/* end modal box */}
    </div>
  );
}