// // ─────────────────────────────────────────────────────────────────────────────
// // FeesInvoice.jsx
// // Drop-in replacement for the InvoiceModal function in Studentfinance.jsx
// // Features:
// //   • Category-wise fee table  (Total | Paid | Pending per row)
// //   • Totals row + Paid / Pending summary cards
// //   • Download PDF (jsPDF — mirrors the table layout)
// //   • Print button — opens print-friendly window
// // ─────────────────────────────────────────────────────────────────────────────

// import React, { useEffect, useState } from "react";
// import { Download, Printer, X, Receipt } from "lucide-react";

// const API_URL = import.meta.env.VITE_API_URL;

// // ─── helpers ──────────────────────────────────────────────────────────────────
// const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

// // ── Load logo → base64 for jsPDF ─────────────────────────────────────────────
// async function loadLogoForPDF(logoUrl) {
//   if (!logoUrl) return null;

//   // Step 1: fetch the image bytes through /api/image-proxy
//   // This avoids CORS issues with R2/S3/Cloudinary URLs
//   try {
//     const API = import.meta.env.VITE_API_URL;
//     const proxyUrl = `${API}/api/image-proxy?url=${encodeURIComponent(logoUrl)}`;

//     const res = await fetch(proxyUrl);
//     if (!res.ok) throw new Error(`proxy ${res.status}`);

//     const blob = await res.blob();
//     if (!blob || blob.size === 0) throw new Error("empty response");

//     // Step 2: blob → base64 data URL via FileReader
//     const dataUrl = await new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => resolve(reader.result);
//       reader.onerror  = reject;
//       reader.readAsDataURL(blob);
//     });

//     // Step 3: strip the "data:image/xxx;base64," prefix
//     // jsPDF addImage needs ONLY the raw base64 string after the comma
//     const rawBase64 = dataUrl.split(",")[1];
//     if (!rawBase64) throw new Error("base64 split failed");

//     // Detect format from MIME type
//     const mime   = blob.type || "image/png";
//     const format = (mime.includes("jpeg") || mime.includes("jpg")) ? "JPEG" : "PNG";

//     console.log("[PDF Logo] ✅ loaded via proxy:", format, rawBase64.length, "chars");
//     return { base64: rawBase64, format };

//   } catch (err) {
//     console.warn("[PDF Logo] proxy failed:", err.message, "| url:", logoUrl);
//     return null;
//   }
// }

// // Build category rows from feeCategories (DB-backed) or fall back to feeBreakdown JSON
// function buildCategoryRows(student) {
//   // ── Prefer DB-backed rows (included via getStudentFinance) ──
//   if (Array.isArray(student.feeCategories) && student.feeCategories.length > 0) {
//     return student.feeCategories.map((sfc) => ({
//       id:      sfc.id,
//       name:    sfc.category?.name || "Fee",
//       total:   Number(sfc.totalAmount  || 0),
//       paid:    Number(sfc.paidAmount   || 0),
//       pending: Math.max(0, Number(sfc.totalAmount || 0) - Number(sfc.paidAmount || 0)),
//     }));
//   }

//   // ── Fallback: parse feeBreakdown JSON ──
//   let bd = {};
//   try { bd = student.feeBreakdown ? JSON.parse(student.feeBreakdown) : {}; } catch {}

//   const KEY_LABEL = {
//     collegeFee:   "School Fee",
//     tuitionFee:   "Tuition Fee",
//     examFee:      "Exam Fee",
//     transportFee: "Transport Fee",
//     booksFee:     "Books Fee",
//     labFee:       "Lab Fee",
//     miscFee:      "Miscellaneous",
//   };

//   const paidFields = {
//     collegeFee:   Number(student.schoolFeePaid  || 0),
//     tuitionFee:   Number(student.tuitionFeePaid || 0),
//     examFee:      Number(student.examFeePaid      || 0),
//     transportFee: Number(student.transportFeePaid || 0),
//     booksFee:     Number(student.booksFeePaid     || 0),
//     labFee:       Number(student.labFeePaid       || 0),
//     miscFee:      Number(student.miscFeePaid      || 0),
//   };

//   const rows = [];
//     for (const [key, label] of Object.entries(KEY_LABEL)) {
//     const entry = bd[key];

//     const total = entry
//         ? Number(
//             typeof entry === "object"
//             ? (entry.total ?? entry.amount ?? 0)
//             : entry
//         )
//         : 0;

//     if (total <= 0) continue;

//     const paid = Number(paidFields[key] || 0);
//     const pending = Math.max(0, total - paid);

//     rows.push({
//         id: key,
//         name: label,
//         total,
//         paid,
//         pending,
//     });
//     }

//   // Custom fees
//   if (Array.isArray(bd.customFees)) {
//     bd.customFees.forEach((c, i) => {
//       const total = Number(c.amount || c.total || 0);
//       if (total > 0) rows.push({ id: `custom_${i}`, name: c.label || `Custom Fee ${i + 1}`, total, paid: 0, pending: total });
//     });
//   }

//   // If nothing in breakdown, show one row from overall totals
//   if (rows.length === 0) {
//     const total   = Number(student.fees || 0);
//     const paid    = Number(student.paidAmount || 0);
//     const pending = Math.max(0, total - paid);
//     rows.push({ id: "total", name: "Total Fees", total, paid, pending });
//   }

//   return rows;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// export function InvoiceModal({ student, onClose, schoolName, schoolAddress, schoolLogoUrl }) {
//   const [rows,    setRows]    = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [logoUrl, setLogoUrl] = useState(schoolLogoUrl || null);

//   const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
//   const today     = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });


//   // ── Fetch logo if not passed as prop ──────────────────────────────────────
//   useEffect(() => {
//     if (logoUrl) return;
//     (async () => {
//       try {
//         const auth  = JSON.parse(localStorage.getItem("auth") || "{}");
//         const token = auth?.token;
//         if (!token) return;
//         const res = await fetch(`${import.meta.env.VITE_API_URL}/api/school/logo`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.ok) {
//           const data = await res.json();
//           if (data?.logoUrl) setLogoUrl(data.logoUrl);
//         }
//       } catch {}
//     })();
//   }, []);

//   // ── Fetch fresh category data if not already included ─────────────────────
//   useEffect(() => {
//     const fetch_categories = async () => {
//       setLoading(true);
//       try {
//         // If the student object already has feeCategories (from getStudentFinance include), use it
//         if (Array.isArray(student.feeCategories) && student.feeCategories.length > 0) {
//           setRows(buildCategoryRows(student));
//           return;
//         }
//         // Otherwise fetch separately
//         const auth  = JSON.parse(localStorage.getItem("auth") || "{}");
//         const token = auth?.token;
//         const res   = await fetch(`${API_URL}/api/finance/studentFeeCategories/${student.id}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.ok) {
//           const data = await res.json();
//           const enriched = { ...student, feeCategories: data };
//           setRows(buildCategoryRows(enriched));
//         } else {
//           setRows(buildCategoryRows(student));
//         }
//       } catch {
//         setRows(buildCategoryRows(student));
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetch_categories();
//   }, [student.id]);

//   // ── Totals ────────────────────────────────────────────────────────────────
//   const grandTotal   = rows.reduce((s, r) => s + r.total,   0);
//   const grandPaid    = rows.reduce((s, r) => s + r.paid,    0);
//   const grandPending = rows.reduce((s, r) => s + r.pending, 0);
//   const paidPct      = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0;

//   // ── PDF Download ──────────────────────────────────────────────────────────
//   const handleDownload = async () => {
//     if (!window.jspdf) { alert("PDF library not loaded yet. Please try again."); return; }
//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
//     const W = 210, m = 18;

//     // ── Load logo ──
//     const logoData = logoUrl ? await loadLogoForPDF(logoUrl) : null;
//     console.log("[PDF] logo result:", logoData ? `✅ ${logoData.format}` : "null");

//     // Header
//     const headerH = schoolAddress ? 52 : 46;
//     doc.setFillColor(28, 48, 68); doc.rect(0, 0, W, headerH, "F");

//     const logoSize = 28;
//     const logoX    = m;
//     const logoY    = (headerH - logoSize) / 2;
//     const textX    = logoData ? m + logoSize + 7 : m;

//     if (logoData) {
//       doc.setFillColor(255, 255, 255);
//       doc.roundedRect(logoX, logoY, logoSize, logoSize, 4, 4, "F");
//       try {
//         // logoData.base64 is already raw base64 (no data: prefix) — ready for jsPDF
//         doc.addImage(logoData.base64, logoData.format, logoX + 2, logoY + 2, logoSize - 4, logoSize - 4);
//         console.log("[PDF] ✅ logo embedded as", logoData.format);
//       } catch (e) {
//         console.warn("[PDF] addImage failed:", e.message);
//       }
//     }

//     doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
//     doc.text(schoolName || "Fee Receipt", textX, logoData ? logoY + 10 : 16);
//     doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
//     doc.text("Fee Invoice & Payment Receipt", textX, logoData ? logoY + 18 : 24);
//     if (schoolAddress) { doc.setFontSize(8); doc.setTextColor(140, 175, 200); doc.text(schoolAddress, textX, logoData ? logoY + 25 : 32); }

//     // Invoice badge
//     doc.setFillColor(255, 255, 255); doc.roundedRect(W - m - 52, 8, 52, 22, 3, 3, "F");
//     doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(28, 48, 68);
//     doc.text("INVOICE", W - m - 26, 16, { align: "center" });
//     doc.setFontSize(10); doc.text(invoiceNo, W - m - 26, 24, { align: "center" });

//     // Status bar
//     doc.setFillColor(39, 67, 91); doc.rect(0, headerH, W, 10, "F");
//     doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 205, 220);
//     doc.text(`Date: ${today}`, m, headerH + 7);
//     doc.text(`Status: ${grandPending === 0 ? "PAID" : "PARTIALLY PAID"}`, W - m, headerH + 7, { align: "right" });

//     // Student details box
//     let y = headerH + 18;
//     const boxH = student.address ? 60 : 48;
//     doc.setFillColor(240, 247, 252); doc.roundedRect(m, y - 6, W - m * 2, boxH, 3, 3, "F");
//     doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
//     doc.text("STUDENT DETAILS", m + 4, y);
//     doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 50, 70);
//     doc.text("Name:",   m + 4,      y + 10); doc.setFont("helvetica", "normal"); doc.text(student.name  || "N/A", m + 22,      y + 10);
//     doc.setFont("helvetica", "bold"); doc.text("Email:",  W/2 + 4,    y + 10); doc.setFont("helvetica", "normal"); doc.text(student.email || "N/A", W/2 + 22,    y + 10);
//     doc.setFont("helvetica", "bold"); doc.text("Course:", m + 4,      y + 20); doc.setFont("helvetica", "normal"); doc.text(student.course || "N/A", m + 22,      y + 20);
//     doc.setFont("helvetica", "bold"); doc.text("Phone:",  W/2 + 4,    y + 20); doc.setFont("helvetica", "normal"); doc.text(student.phone  || "N/A", W/2 + 22,    y + 20);
//     if (student.address) {
//       doc.setFont("helvetica", "bold"); doc.text("Address:", m + 4, y + 30);
//       doc.setFont("helvetica", "normal");
//       doc.text(doc.splitTextToSize(student.address, W - m * 2 - 34), m + 22, y + 30);
//     }
//     y += boxH + 12;

//     // Category table header
//     doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(28, 48, 68);
//     doc.text("FEE BREAKDOWN", m, y); y += 5;

//     const COL = { name: m + 4, total: m + 98, paid: m + 130, pending: m + 160 };
//     const COLW = W - m * 2;
//     doc.setFillColor(28, 48, 68); doc.rect(m, y, COLW, 9, "F");
//     doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
//     doc.text("Fee Category",  COL.name,    y + 6);
//     doc.text("Total",         COL.total,   y + 6);
//     doc.text("Paid",          COL.paid,    y + 6);
//     doc.text("Pending",       COL.pending, y + 6);
//     y += 9;

//     rows.forEach((row, i) => {
//       doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 252 : 255, 255);
//       doc.rect(m, y, COLW, 9, "F");
//       doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
//       doc.text(row.name,                     COL.name,    y + 6);
//       doc.setFont("helvetica", "bold");
//       doc.text(`Rs.${fmt(row.total)}`,       COL.total,   y + 6);
//       doc.setTextColor(26, 110, 62);
//       doc.text(`Rs.${fmt(row.paid)}`,        COL.paid,    y + 6);
//       doc.setTextColor(row.pending > 0 ? 180 : 26, row.pending > 0 ? 48 : 110, row.pending > 0 ? 48 : 62);
//       doc.text(`Rs.${fmt(row.pending)}`,     COL.pending, y + 6);
//       doc.setTextColor(30, 50, 70);
//       y += 9;
//     });

//     // Totals row
//     doc.setFillColor(28, 48, 68); doc.rect(m, y, COLW, 9, "F");
//     doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
//     doc.text("TOTAL",                    COL.name,    y + 6);
//     doc.text(`Rs.${fmt(grandTotal)}`,    COL.total,   y + 6);
//     doc.text(`Rs.${fmt(grandPaid)}`,     COL.paid,    y + 6);
//     doc.text(`Rs.${fmt(grandPending)}`,  COL.pending, y + 6);
//     y += 14;

//     // Summary box
//     const bx = W - m - 80;
//     doc.setFillColor(240, 247, 252); doc.roundedRect(bx, y, 80, 46, 3, 3, "F");
//     doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 100, 120);
//     doc.text("Total Fees:",    bx + 4, y + 9);
//     doc.setFont("helvetica", "bold"); doc.setTextColor(28, 48, 68);
//     doc.text(`Rs. ${fmt(grandTotal)}`,    bx + 78, y + 9,  { align: "right" });
//     doc.setFont("helvetica", "normal"); doc.setTextColor(80, 100, 120);
//     doc.text("Amount Paid:",   bx + 4, y + 20);
//     doc.setFont("helvetica", "bold"); doc.setTextColor(28, 68, 48);
//     doc.text(`Rs. ${fmt(grandPaid)}`,     bx + 78, y + 20, { align: "right" });
//     doc.setDrawColor(28, 48, 68); doc.setLineWidth(0.4); doc.line(bx + 4, y + 24, bx + 76, y + 24);
//     doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(28, 48, 68);
//     doc.text("Balance Due:",   bx + 4, y + 34);
//     doc.setTextColor(grandPending === 0 ? 28 : 180, grandPending === 0 ? 90 : 30, grandPending === 0 ? 50 : 30);
//     doc.text(`Rs. ${fmt(grandPending)}`,  bx + 78, y + 34, { align: "right" });

//     // Footer
//     doc.setFillColor(28, 48, 68); doc.rect(0, 272, W, 25, "F");
//     doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(180, 205, 220);
//     doc.text(
//       schoolName ? `${schoolName} · System-generated receipt. No signature required.` : "System-generated receipt.",
//       W / 2, 281, { align: "center" }
//     );

//     doc.save(`Receipt_${(student.name || "Student").replace(/\s+/g, "_")}_${invoiceNo}.pdf`);
//   };

//   // ── Print ─────────────────────────────────────────────────────────────────
//   const handlePrint = () => {
//     const rowsHtml = rows.map((r, i) => `
//       <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
//         <td>${r.name}</td>
//         <td>₹${fmt(r.total)}</td>
//         <td style="color:#1a6e3e">₹${fmt(r.paid)}</td>
//         <td style="color:${r.pending > 0 ? "#a33030" : "#1a6e3e"}">₹${fmt(r.pending)}</td>
//       </tr>
//     `).join("");

//     const logoHtml = logoUrl
//       ? `<img src="${logoUrl}" alt="Logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;background:#fff;padding:4px;margin-right:14px;flex-shrink:0;" />`
//       : "";

//     const html = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8"/>
//   <title>Fee Receipt — ${student.name}</title>
//   <style>
//     * { box-sizing: border-box; margin: 0; padding: 0; }
//     body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1C3044; font-size: 13px; padding: 24px; }
//     .header { background: #1C3044; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; }
//     .header-left { display: flex; align-items: center; }
//     .header-left h1 { font-size: 20px; margin-bottom: 4px; }
//     .header-left p  { font-size: 11px; color: rgba(255,255,255,.65); }
//     .header-right { text-align: right; }
//     .inv-badge { background: #fff; color: #1C3044; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; }
//     .status-bar { background: #27435B; color: rgba(255,255,255,.8); padding: 6px 24px; font-size: 11px; display: flex; justify-content: space-between; }
//     .section { padding: 16px 0; border-bottom: 1px solid #e0eef6; }
//     .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #4A6B80; margin-bottom: 8px; }
//     .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
//     .detail-label { font-size: 11px; color: #4A6B80; }
//     .detail-value { font-size: 13px; font-weight: 600; }
//     table { width: 100%; border-collapse: collapse; margin-top: 6px; }
//     th { background: #1C3044; color: #fff; padding: 8px 10px; font-size: 11px; text-align: left; }
//     td { padding: 8px 10px; border-bottom: 1px solid #e0eef6; }
//     .totals-row td { background: #1C3044; color: #fff; font-weight: 700; border: none; }
//     .summary { background: #f0f7fc; border: 1px solid #d0e2ee; border-radius: 8px; padding: 14px 16px; margin-top: 16px; max-width: 260px; margin-left: auto; }
//     .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
//     .summary-row.total { border-top: 1.5px solid #1C3044; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 14px; }
//     .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #8fa3b1; }
//     .progress-bar { height: 8px; background: #d0e2ee; border-radius: 4px; overflow: hidden; margin-top: 8px; }
//     .progress-fill { height: 100%; background: #27435B; border-radius: 4px; width: ${paidPct}%; }
//     @media print {
//       body { padding: 0; }
//       button { display: none !important; }
//     }
//   </style>
// </head>
// <body>
//   <div class="header">
//     <div class="header-left">
//       ${logoHtml}
//       <div>
//         <h1>${schoolName || "School"}</h1>
//         <p>Fee Invoice &amp; Payment Receipt</p>
//         ${schoolAddress ? `<p style="margin-top:3px">${schoolAddress}</p>` : ""}
//       </div>
//     </div>
//     <div class="header-right">
//       <div class="inv-badge">INVOICE</div>
//       <div style="font-size:12px;margin-top:6px;color:rgba(255,255,255,.8)">${invoiceNo}</div>
//     </div>
//   </div>
//   <div class="status-bar">
//     <span>Date: ${today}</span>
//     <span>Status: ${grandPending === 0 ? "PAID" : "PARTIALLY PAID"}</span>
//   </div>

//   <div class="section">
//     <div class="section-title">Student Details</div>
//     <div class="detail-grid">
//       <div><div class="detail-label">Name</div><div class="detail-value">${student.name || "—"}</div></div>
//       <div><div class="detail-label">Email</div><div class="detail-value">${student.email || "—"}</div></div>
//       <div><div class="detail-label">Course / Class</div><div class="detail-value">${student.course || "—"}</div></div>
//       <div><div class="detail-label">Phone</div><div class="detail-value">${student.phone || "—"}</div></div>
//       ${student.address ? `<div style="grid-column:1/-1"><div class="detail-label">Address</div><div class="detail-value">${student.address}</div></div>` : ""}
//     </div>
//   </div>

//   <div class="section">
//     <div class="section-title">Fee Breakdown</div>
//     <table>
//       <thead><tr>
//         <th>Fee Category</th>
//         <th>Total (₹)</th>
//         <th>Paid (₹)</th>
//         <th>Pending (₹)</th>
//       </tr></thead>
//       <tbody>${rowsHtml}</tbody>
//       <tfoot>
//         <tr class="totals-row">
//           <td><strong>TOTAL</strong></td>
//           <td>₹${fmt(grandTotal)}</td>
//           <td>₹${fmt(grandPaid)}</td>
//           <td>₹${fmt(grandPending)}</td>
//         </tr>
//       </tfoot>
//     </table>
//     <div class="progress-bar"><div class="progress-fill"></div></div>
//     <div style="display:flex;justify-content:space-between;font-size:11px;color:#4A6B80;margin-top:4px">
//       <span>${paidPct}% paid</span>
//       <span>${grandPending === 0 ? "✓ Fully Paid" : `₹${fmt(grandPending)} remaining`}</span>
//     </div>
//   </div>

//   <div class="summary">
//     <div class="summary-row"><span>Total Fees</span><span>₹${fmt(grandTotal)}</span></div>
//     <div class="summary-row" style="color:#1a6e3e"><span>Amount Paid</span><span>₹${fmt(grandPaid)}</span></div>
//     <div class="summary-row total" style="color:${grandPending > 0 ? "#a33030" : "#1a6e3e"}">
//       <span>Balance Due</span><span>₹${fmt(grandPending)}</span>
//     </div>
//   </div>

//   <div class="footer">${schoolName || "School"} · System-generated receipt. No signature required.</div>

//   <script>window.onload = () => window.print();</script>
// </body>
// </html>`;

//     const w = window.open("", "_blank", "width=800,height=700");
//     w.document.write(html);
//     w.document.close();
//   };

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="inv-overlay" onClick={onClose}>
//       <div className="inv-box" 
//         style={{
//           maxWidth: 620,
//           width: "95%",
//           maxHeight: "90vh",
//           display: "flex",
//           flexDirection: "column",
//         }}
//        onClick={(e) => e.stopPropagation()}>

//         {/* Header */}
//         <div className="inv-head">
//           <div className="inv-head-left">
//             {logoUrl ? (
//               <img src={logoUrl} alt="Logo"
//                 style={{ width: 42, height: 42, borderRadius: 10, objectFit: "contain",
//                   background: "rgba(255,255,255,.18)", border: "1.5px solid rgba(255,255,255,.3)",
//                   padding: 3, marginRight: 4, flexShrink: 0 }}
//                 onError={(e) => { e.target.style.display = "none"; }}
//               />
//             ) : (
//               <div className="inv-head-ico"><Receipt size={18} color="#fff" /></div>
//             )}
//             <div>
//               <div className="inv-head-title">{schoolName || "Student Invoice"}</div>
//               <div className="inv-head-sub">{invoiceNo} · {today}</div>
//             </div>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//             <button
//               className="inv-dl-btn"
//               onClick={handlePrint}
//               title="Print receipt"
//               style={{ background: "rgba(255,255,255,.14)", borderColor: "rgba(255,255,255,.28)" }}
//             >
//               <Printer size={14} /> Print
//             </button>
//             <button className="inv-dl-btn" onClick={handleDownload} title="Download PDF">
//               <Download size={14} /> Download PDF
//             </button>
//             <button className="inv-close" onClick={onClose}><X size={17} /></button>
//           </div>
//         </div>

//         {/* Body */}
//         <div className="inv-body"
//           style={{
//             overflowY: "auto",
//             flex: 1,
//             minHeight: 0,
//             paddingRight: "4px",
//           }}>

//           {/* School banner with logo */}
//           {schoolName && (
//             <div style={{ background: "linear-gradient(135deg,#f0f7fc,#e4f0f8)", border: "1px solid #c8dff0", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
//               {logoUrl && (
//                 <img src={logoUrl} alt="School Logo"
//                   style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain",
//                     background: "#fff", border: "1px solid #d0e8f0", padding: 3, flexShrink: 0 }}
//                   onError={(e) => { e.target.style.display = "none"; }}
//                 />
//               )}
//               <div>
//                 <span style={{ fontSize: 11, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px", display: "block" }}>Issued By</span>
//                 <span style={{ fontSize: 14, fontWeight: 700, color: "#1C3044", display: "block" }}>{schoolName}</span>
//                 {schoolAddress && <span style={{ fontSize: 12, color: "#4A6B80" }}>{schoolAddress}</span>}
//               </div>
//             </div>
//           )}

//           {/* Student details */}
//           <div className="inv-section">
//             <div className="inv-sec-label">Student Details</div>
//             <div className="inv-detail-grid">
//               <div><span className="inv-dl">Name</span><span className="inv-dv">{student.name}</span></div>
//               <div><span className="inv-dl">Email</span><span className="inv-dv">{student.email}</span></div>
//               <div><span className="inv-dl">Course / Class</span><span className="inv-dv">{student.course || "—"}</span></div>
//               <div><span className="inv-dl">Student ID</span><span className="inv-dv">#{student.id}</span></div>
//               {student.phone && <div><span className="inv-dl">Phone</span><span className="inv-dv">{student.phone}</span></div>}
//             </div>
//             {student.address && (
//               <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e0eef6" }}>
//                 <span className="inv-dl">Address</span>
//                 <span className="inv-dv" style={{ display: "block", marginTop: 2, lineHeight: 1.5 }}>{student.address}</span>
//               </div>
//             )}
//           </div>

//           {/* ── Category-wise fee table ── */}
//           <div className="inv-section" style={{ padding: 0, overflow: "hidden" }}>
//             <div style={{ padding: "12px 16px 10px" }}>
//               <div className="inv-sec-label" style={{ marginBottom: 0 }}>Fee Breakdown by Category</div>
//             </div>

//             {loading ? (
//               <div style={{ textAlign: "center", padding: "20px 16px", color: "#4A6B80", fontSize: 13 }}>Loading…</div>
//             ) : (
//               <div   style={{
//                 overflowX: "auto",
//                 overflowY: "auto",
//                 maxHeight: "250px",
//               }}>
//                 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
//                   <thead>
//                     <tr style={{ background: "linear-gradient(135deg,#1C3044,#27435B)" }}>
//                       {["Fee Category", "Total", "Paid", "Pending"].map((h) => (
//                         <th key={h} style={{ padding: "9px 14px", color: "rgba(255,255,255,.9)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {rows.map((row, i) => (
//                       <tr key={row.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e8f2f8" }}>
//                         <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1C3044" }}>{row.name}</td>
//                         <td style={{ padding: "10px 14px", fontWeight: 700, color: "#27435B" }}>₹{fmt(row.total)}</td>
//                         <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1a6e3e" }}>₹{fmt(row.paid)}</td>
//                         <td style={{ padding: "10px 14px", fontWeight: 700, color: row.pending > 0 ? "#a33030" : "#1a6e3e" }}>₹{fmt(row.pending)}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                   <tfoot>
//                     <tr style={{ background: "linear-gradient(135deg,#1C3044,#27435B)" }}>
//                       <td style={{ padding: "10px 14px", fontWeight: 700, color: "#fff", fontSize: 13 }}>TOTAL</td>
//                       <td style={{ padding: "10px 14px", fontWeight: 700, color: "#fff" }}>₹{fmt(grandTotal)}</td>
//                       <td style={{ padding: "10px 14px", fontWeight: 700, color: "#7ddfb0" }}>₹{fmt(grandPaid)}</td>
//                       <td style={{ padding: "10px 14px", fontWeight: 700, color: grandPending > 0 ? "#f9a8a8" : "#7ddfb0" }}>₹{fmt(grandPending)}</td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             )}
//           </div>

//           {/* ── Summary cards ── */}
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//             <div style={{ background: "#edf7f1", border: "1px solid #b2dfc6", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
//               <div style={{ fontSize: 10, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 4 }}>Total Paid</div>
//               <div style={{ fontSize: 18, fontWeight: 700, color: "#1a6e3e" }}>₹{fmt(grandPaid)}</div>
//             </div>
//             <div style={{ background: grandPending > 0 ? "#fff5f5" : "#edf7f1", border: `1px solid ${grandPending > 0 ? "#f5c2c2" : "#b2dfc6"}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
//               <div style={{ fontSize: 10, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 4 }}>Balance Due</div>
//               <div style={{ fontSize: 18, fontWeight: 700, color: grandPending > 0 ? "#a33030" : "#1a6e3e" }}>₹{fmt(grandPending)}</div>
//             </div>
//           </div>

//           {/* Progress */}
//           <div>
//             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4A6B80", marginBottom: 5 }}>
//               <span>Collection Progress</span>
//               <span style={{ fontWeight: 700, color: "#27435B" }}>{paidPct}% paid</span>
//             </div>
//             <div style={{ height: 9, background: "#d0e2ee", borderRadius: 8, overflow: "hidden" }}>
//               <div style={{ height: "100%", width: `${paidPct}%`, background: "linear-gradient(90deg,#3A5E78,#27435B)", borderRadius: 8, transition: "width .5s ease" }} />
//             </div>
//             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6A8FA4", marginTop: 4 }}>
//               <span>₹0</span>
//               <span>{grandPending === 0 ? "✓ Fully Paid" : `₹${fmt(grandPending)} remaining`}</span>
//               <span>₹{fmt(grandTotal)}</span>
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }


// ─────────────────────────────────────────────────────────────────────────────
// FeesInvoice.jsx  — full Tailwind rewrite
// Fixes:
//   • All custom CSS classes (inv-overlay, inv-box, inv-head, etc.) removed
//   • Fee Breakdown table shows ALL rows on every device (no clipping)
//   • Small devices get horizontal scroll on the table only
//   • Vertical scroll is on the whole modal body, not the table alone
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Download, Printer, X, Receipt } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

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

// ── Build category rows ───────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export function InvoiceModal({ student, onClose, schoolName, schoolAddress, schoolLogoUrl }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(schoolLogoUrl || null);

  const invoiceNo = `INV-${String(student.id || "").slice(-4).padStart(4, "0")}-${new Date().getFullYear()}`;
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // ── Fetch logo if not passed ───────────────────────────────────────────────
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

  // ── Fetch fresh category data ──────────────────────────────────────────────
  useEffect(() => {
    const fetch_categories = async () => {
      setLoading(true);
      try {
        if (Array.isArray(student.feeCategories) && student.feeCategories.length > 0) {
          setRows(buildCategoryRows(student));
          return;
        }
        const auth = JSON.parse(localStorage.getItem("auth") || "{}");
        const token = auth?.token;
        const res = await fetch(`${API_URL}/api/finance/studentFeeCategories/${student.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRows(buildCategoryRows({ ...student, feeCategories: data }));
        } else {
          setRows(buildCategoryRows(student));
        }
      } catch {
        setRows(buildCategoryRows(student));
      } finally {
        setLoading(false);
      }
    };
    fetch_categories();
  }, [student.id]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandPaid = rows.reduce((s, r) => s + r.paid, 0);
  const grandPending = rows.reduce((s, r) => s + r.pending, 0);
  const paidPct = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0;

  // ── PDF Download ───────────────────────────────────────────────────────────
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
      console.log("Adding logo to PDF");

      doc.addImage(
        `data:image/${logoData.format.toLowerCase()};base64,${logoData.base64}`,
        logoData.format,
        logoX + 2,
        logoY + 2,
        logoSize - 4,
        logoSize - 4
      );

      console.log("Logo added successfully");
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
    doc.text(`Date: ${today}`, m, headerH + 7);
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
    doc.text("Total", COL.total, y + 6);
    doc.text("Paid", COL.paid, y + 6);
    doc.text("Pending", COL.pending, y + 6);
    y += 9;

    rows.forEach((row, i) => {
      doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 252 : 255, 255);
      doc.rect(m, y, COLW, 9, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 50, 70);
      doc.text(row.name, COL.name, y + 6);
      doc.setFont("helvetica", "bold");
      doc.text(`Rs.${fmt(row.total)}`, COL.total, y + 6);
      doc.setTextColor(26, 110, 62);
      doc.text(`Rs.${fmt(row.paid)}`, COL.paid, y + 6);
      doc.setTextColor(row.pending > 0 ? 180 : 26, row.pending > 0 ? 48 : 110, row.pending > 0 ? 48 : 62);
      doc.text(`Rs.${fmt(row.pending)}`, COL.pending, y + 6);
      doc.setTextColor(30, 50, 70);
      y += 9;
    });

    doc.setFillColor(28, 48, 68); doc.rect(m, y, COLW, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text("TOTAL", COL.name, y + 6);
    doc.text(`Rs.${fmt(grandTotal)}`, COL.total, y + 6);
    doc.text(`Rs.${fmt(grandPaid)}`, COL.paid, y + 6);
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

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const rowsHtml = rows.map((r, i) => `
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
    <span>Date: ${today}</span>
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
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal box */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#1C3044] flex-shrink-0">
          {/* Left: logo + title */}
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
              <div className="text-blue-200 text-xs truncate">{invoiceNo} · {today}</div>
            </div>
          </div>

          {/* Right: actions */}
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

          {/* ── Fee Breakdown table ──
               • No maxHeight on the table — it grows to show ALL rows
               • overflow-x-auto handles narrow screens (horizontal scroll)
               • The outer modal body handles vertical scroll               */}
          <div className="border border-[#e0eef6] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0eef6]">
              <div className="text-[10px] font-bold text-[#4A6B80] uppercase tracking-wider">
                Fee Breakdown by Category
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-[#4A6B80]">Loading…</div>
            ) : (
              /* overflow-x-auto → horizontal scroll on small screens only */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#1C3044] to-[#27435B]">
                      {["Fee Category", "Total", "Paid", "Pending"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white/90 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-[#e8f2f8] ${i % 2 === 0 ? "bg-[#f8fafc]" : "bg-white"}`}
                      >
                        <td className="px-4 py-2.5 font-semibold text-[#1C3044] whitespace-nowrap">{row.name}</td>
                        <td className="px-4 py-2.5 font-bold text-[#27435B] whitespace-nowrap">₹{fmt(row.total)}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#1a6e3e] whitespace-nowrap">₹{fmt(row.paid)}</td>
                        <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${row.pending > 0 ? "text-[#a33030]" : "text-[#1a6e3e]"}`}>
                          ₹{fmt(row.pending)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-[#1C3044] to-[#27435B]">
                      <td className="px-4 py-2.5 font-bold text-white text-[13px]">TOTAL</td>
                      <td className="px-4 py-2.5 font-bold text-white whitespace-nowrap">₹{fmt(grandTotal)}</td>
                      <td className="px-4 py-2.5 font-bold text-[#7ddfb0] whitespace-nowrap">₹{fmt(grandPaid)}</td>
                      <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${grandPending > 0 ? "text-[#f9a8a8]" : "text-[#7ddfb0]"}`}>
                        ₹{fmt(grandPending)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
    </div>/* end overlay */
  );
}