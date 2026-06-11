// src/superAdmin/pages/FinanceReports/StudentFeeDetail.jsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, IndianRupee, CheckCircle, AlertCircle, Clock,
  User, Mail, Phone, BookOpen, Calendar, CreditCard,
  TrendingUp, FileSpreadsheet, Layers, Edit2, Save, X,
  ChevronRight, BarChart3, Home, Hash
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const getToken = () => {
  try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return null; }
};

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_00_00_000) return "₹" + (v / 1_00_00_000).toFixed(2) + "Cr";
  if (v >= 1_00_000)    return "₹" + (v / 1_00_000).toFixed(2) + "L";
  if (v >= 1_000)       return "₹" + (v / 1_000).toFixed(1) + "K";
  return fmt(v);
};

const FEE_CATEGORIES = [
  { key: "schoolFeePaid",    label: "School Fee",    icon: "🏫", color: "#3b82f6",  bg: "#eff6ff"  },
  { key: "tuitionFeePaid",   label: "Tuition Fee",   icon: "📚", color: "#8b5cf6",  bg: "#f5f3ff"  },
  { key: "examFeePaid",      label: "Exam Fee",      icon: "📝", color: "#f59e0b",  bg: "#fffbeb"  },
  { key: "transportFeePaid", label: "Transport Fee", icon: "🚌", color: "#10b981",  bg: "#ecfdf5"  },
  { key: "booksFeePaid",     label: "Books Fee",     icon: "📖", color: "#06b6d4",  bg: "#ecfeff"  },
  { key: "labFeePaid",       label: "Lab Fee",       icon: "🔬", color: "#f97316",  bg: "#fff7ed"  },
  { key: "miscFeePaid",      label: "Misc Fee",      icon: "💼", color: "#ec4899",  bg: "#fdf2f8"  },
];

// Parse fee breakdown JSON if stored as string
function parseFeeBreakdown(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

// Compute derived fee totals from the StudentList record
function computeFeeSummary(student) {
    
  const totalFees   = Number(student.fees || 0);
  const totalPaid   = Number(student.paidAmount || 0);
  const totalDue    = Math.max(0, totalFees - totalPaid);
  const pctCollected = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

  const catPaid = FEE_CATEGORIES.reduce((acc, c) => {
    acc[c.key] = Number(student[c.key] || 0);
    return acc;
  }, {});

  const feeBreakdown = parseFeeBreakdown(student.feeBreakdown);

  return { totalFees, totalPaid, totalDue, pctCollected, catPaid, feeBreakdown };
}

// Status pill
function StatusPill({ status }) {
  const map = {
    PAID:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
    PARTIAL: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400",    border: "border-blue-200"    },
    UNPAID:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     border: "border-red-200"     },
    PENDING: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   border: "border-amber-200"   },
  };
  const c = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

// Arc progress ring
function ProgressRing({ pct, size = 80, stroke = 8, color = "#10b981" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-base font-black text-slate-800 leading-none">{pct}%</div>
        <div className="text-[9px] text-slate-400 mt-0.5">paid</div>
      </div>
    </div>
  );
}

// Editable field row
function EditableField({ label, value, fieldKey, editMode, editData, onChange }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {editMode ? (
        <input
          value={editData[fieldKey] ?? value ?? ""}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1C3044] bg-white"
        />
      ) : (
        <span className="text-sm font-medium text-slate-700">{value || <span className="text-slate-300">—</span>}</span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentFeeDetail({ student: initialStudent, onBack }) {
  const [student, setStudent]   = useState(initialStudent);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Payment modal state
  const [payModal, setPayModal]   = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode]     = useState("CASH");
  const [payCategory, setPayCategory] = useState("SCHOOL");
  const [payLoading, setPayLoading]   = useState(false);
  const [payError, setPayError]       = useState("");

  const { totalFees, totalPaid, totalDue, pctCollected, catPaid, feeBreakdown } = computeFeeSummary(student);
  // ── DEBUG: remove after fixing ──
console.log("=== FEE DEBUG ===");
console.log("totalPaid (paidAmount field):", totalPaid);
console.log("Raw student object:", student);
console.log("catPaid breakdown:", catPaid);
console.log("Sum of categories:", 
  Object.values(catPaid).reduce((a, v) => a + v, 0)
);
console.log("Missing amount:", totalPaid - Object.values(catPaid).reduce((a, v) => a + v, 0));
FEE_CATEGORIES.forEach(c => {
  console.log(`  ${c.label} (${c.key}):`, student[c.key], "→ parsed:", Number(student[c.key] || 0));
});
// ── END DEBUG ──

  const overallStatus = totalFees > 0 && totalDue === 0 ? "PAID"
    : totalPaid > 0 ? "PARTIAL"
    : "UNPAID";

  // ── Edit handlers ───────────────────────────────────────────────────────────
  const startEdit = () => {
    setEditData({
      name:        student.name        || "",
      email:       student.email       || "",
      phone:       student.phone       || "",
      course:      student.course      || "",
      address:     student.address     || "",
      fees:        student.fees        || 0,
      paidAmount:  student.paidAmount  || 0,
      paymentMode: student.paymentMode || "",
      paymentDate: student.paymentDate ? new Date(student.paymentDate).toISOString().slice(0, 10) : "",
    });
    setEditMode(true);
    setSaveError("");
    setSaveSuccess(false);
  };

  const cancelEdit = () => { setEditMode(false); setEditData({}); setSaveError(""); };

  const handleChange = (key, val) => setEditData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true); setSaveError(""); setSaveSuccess(false);
    try {
      const payload = {
        ...editData,
        fees:       Number(editData.fees       || 0),
        paidAmount: Number(editData.paidAmount || 0),
      };
      const res = await fetch(
        `${API_URL}/api/superadmin-finance/student-finance/${student.id}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Save failed");
      setStudent(prev => ({ ...prev, ...payload }));
      setSaveSuccess(true);
      setEditMode(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Payment recording ───────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) { setPayError("Enter a valid amount"); return; }
    setPayLoading(true); setPayError("");
    try {
      const res = await fetch(
        `${API_URL}/api/superadmin-finance/student-finance/${student.id}/payment`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body:    JSON.stringify({ amount: Number(payAmount), paymentMode: payMode, category: payCategory }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Payment failed");
      // Optimistically update local state
      const catKey = FEE_CATEGORIES.find(c => c.label.toUpperCase().startsWith(payCategory))?.key;
      setStudent(prev => ({
        ...prev,
        paidAmount:  Number(prev.paidAmount  || 0) + Number(payAmount),
        paymentMode: payMode,
        paymentDate: new Date().toISOString(),
        ...(catKey ? { [catKey]: Number(prev[catKey] || 0) + Number(payAmount) } : {}),
      }));
      setPayModal(false);
      setPayAmount(""); setPayMode("CASH"); setPayCategory("SCHOOL");
    } catch (e) {
      setPayError(e.message || "Failed to record payment");
    } finally {
      setPayLoading(false);
    }
  };

  // ── Export single student ───────────────────────────────────────────────────
  const handleExport = () => {
    const loadAndRun = (ExcelJS) => _exportStudent(ExcelJS, student);
    if (window.ExcelJS) { loadAndRun(window.ExcelJS); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload = () => loadAndRun(window.ExcelJS);
    document.head.appendChild(s);
  };

  async function _exportStudent(ExcelJS, s) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Student Fee");
    const NAVY = "1C3044";
    const thin = { top:{style:"thin",color:{argb:"D0E1ED"}}, left:{style:"thin",color:{argb:"D0E1ED"}}, bottom:{style:"thin",color:{argb:"D0E1ED"}}, right:{style:"thin",color:{argb:"D0E1ED"}} };

    ws.columns = [{ width: 28 }, { width: 32 }];
    const addRow = (label, value, bold = false) => {
      const r = ws.addRow([label, value]);
      r.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: "64748B" } };
      r.getCell(2).font = { name: "Calibri", size: 10, bold };
      r.getCell(1).border = thin; r.getCell(2).border = thin;
      r.height = 20;
    };

    ws.mergeCells("A1:B1");
    const t = ws.getRow(1); t.height = 36;
    t.getCell(1).value = "STUDENT FEE REPORT";
    t.getCell(1).font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFF" } };
    t.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    t.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

    ws.addRow([]);
    ws.mergeCells(`A2:B2`);
    ws.getRow(2).getCell(1).value = "STUDENT INFORMATION";
    ws.getRow(2).getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    ws.getRow(2).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "27435B" } };
    ws.getRow(2).height = 22;

    addRow("Name",         s.name || "—");
    addRow("Email",        s.email || "—");
    addRow("Phone",        s.phone || "—");
    addRow("Course",       s.course || "—");
    addRow("Gender",       s.gender || "—");
    addRow("Address",      s.address || "—");
    addRow("School",       s.school?.name || "—");

    ws.addRow([]);
    const fh = ws.addRow(["FEE SUMMARY", ""]);
    fh.getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    fh.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "27435B" } };
    fh.height = 22;
    ws.mergeCells(`A${fh.number}:B${fh.number}`);

    addRow("Total Fees",       Number(s.fees || 0),        true);
    addRow("Amount Paid",      Number(s.paidAmount || 0),  true);
    addRow("Amount Due",       Math.max(0, Number(s.fees || 0) - Number(s.paidAmount || 0)), true);
    addRow("Payment Mode",     s.paymentMode || "—");
    addRow("Last Payment Date",s.paymentDate ? new Date(s.paymentDate).toLocaleDateString("en-IN") : "—");

    ws.addRow([]);
    const bh = ws.addRow(["FEE BREAKDOWN BY CATEGORY", ""]);
    bh.getCell(1).font = { bold: true, color: { argb: "FFFFFF" } };
    bh.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "27435B" } };
    bh.height = 22;
    ws.mergeCells(`A${bh.number}:B${bh.number}`);

    FEE_CATEGORIES.forEach(c => addRow(c.label + " (Paid)", Number(s[c.key] || 0)));

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Fee_${(s.name || "student").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans w-full overflow-x-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-[#1C3044] to-[#2d4a64] px-4 sm:px-6 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={16} color="#fff" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white truncate">{student.name}</h1>
                <StatusPill status={overallStatus} />
              </div>
              <p className="text-xs text-white/50 mt-0.5 truncate">{student.email} · {student.course || "No course"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveSuccess && (
              <span className="text-xs text-emerald-300 font-semibold hidden sm:block">✓ Saved</span>
            )}
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors">
              <FileSpreadsheet size={13} /> Export
            </button>
            {!editMode ? (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#1C3044] rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                <Edit2 size={13} /> Edit
              </button>
            ) : (
              <>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors">
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60">
                  <Save size={13} /> {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 space-y-5">

        {saveError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} /> {saveError}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Fees",  value: fmtShort(totalFees),  icon: IndianRupee,   color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100"    },
            { label: "Paid",        value: fmtShort(totalPaid),  icon: CheckCircle,   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Due",         value: fmtShort(totalDue),   icon: AlertCircle,   color: "text-red-700",     bg: "bg-red-50",     border: "border-red-100"     },
            { label: "Collected",   value: `${pctCollected}%`,   icon: TrendingUp,    color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-100"  },
          ].map(c => (
            <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl p-4 flex flex-col gap-2`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
                <c.icon size={16} className={c.color} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className={`text-xl font-black ${c.color} leading-none mt-0.5`}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress + Category Breakdown ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Overall Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={12} /> Fee Collection Progress
            </p>
            <div className="flex items-center gap-6">
              <ProgressRing pct={pctCollected} size={90} stroke={9}
                color={pctCollected === 100 ? "#10b981" : pctCollected > 50 ? "#3b82f6" : "#f59e0b"} />
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Paid</span>
                    <span className="font-bold text-emerald-600">{fmt(totalPaid)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${pctCollected}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Due</span>
                    <span className="font-bold text-red-500">{fmt(totalDue)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-700"
                      style={{ width: `${totalFees > 0 ? 100 - pctCollected : 0}%` }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-400">Total Fees</span>
                  <span className="font-bold text-slate-700">{fmt(totalFees)}</span>
                </div>
              </div>
            </div>

            {/* Record Payment CTA */}
            {totalDue > 0 && (
              <button
                onClick={() => { setPayModal(true); setPayError(""); }}
                className="mt-4 w-full py-2.5 bg-[#1C3044] text-white rounded-xl text-xs font-bold hover:bg-[#27435B] transition-colors flex items-center justify-center gap-2">
                <CreditCard size={13} /> Record Payment
              </button>
            )}
          </div>

          {/* Category-wise Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers size={12} /> Fee Category Breakdown
            </p>
            <div className="space-y-2.5">
              {FEE_CATEGORIES.map(cat => {
                const paid = catPaid[cat.key] || 0;
                // Try to get total from feeBreakdown JSON if available
                const breakdownTotal = feeBreakdown?.[cat.label] || feeBreakdown?.[cat.key] || null;
                const catTotal = breakdownTotal || (paid > 0 ? paid : 0);
                const pct = catTotal > 0 ? Math.min(100, Math.round((paid / catTotal) * 100)) : 0;
                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-xs font-semibold text-slate-600 truncate">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold" style={{ color: cat.color }}>
                          {paid > 0 ? fmt(paid) : <span className="text-slate-300">₹0</span>}
                        </span>
                        {pct === 100 && paid > 0 && (
                          <span className="text-[10px] text-emerald-500 font-bold">✓</span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: cat.bg }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: paid > 0 ? "100%" : "0%", background: cat.color, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}

              {/* Total row */}
              <div className="pt-2 border-t-2 border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Total Paid (categories)</span>
                <span className="text-sm font-black text-slate-800">
                  {fmt(FEE_CATEGORIES.reduce((a, c) => a + (catPaid[c.key] || 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Student Info ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <User size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Student Information</span>
            {editMode && <span className="text-[10px] text-amber-500 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-auto">Editing</span>}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <EditableField label="Full Name"    value={student.name}    fieldKey="name"    editMode={editMode} editData={editData} onChange={handleChange} />
            <EditableField label="Email"        value={student.email}   fieldKey="email"   editMode={editMode} editData={editData} onChange={handleChange} />
            <EditableField label="Phone"        value={student.phone}   fieldKey="phone"   editMode={editMode} editData={editData} onChange={handleChange} />
            <EditableField label="Course/Class" value={student.course}  fieldKey="course"  editMode={editMode} editData={editData} onChange={handleChange} />
            <EditableField label="Address"      value={student.address} fieldKey="address" editMode={editMode} editData={editData} onChange={handleChange} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
              <span className="text-sm font-medium text-slate-700">{student.gender || <span className="text-slate-300">—</span>}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School</span>
              <span className="text-sm font-medium text-slate-700">{student.school?.name || <span className="text-slate-300">—</span>}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID</span>
              <span className="text-sm font-medium text-slate-500 font-mono">{student.studentId || student.id || <span className="text-slate-300">—</span>}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Added On</span>
              <span className="text-sm font-medium text-slate-700">
                {student.createdAt ? new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Payment Details ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CreditCard size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Payment Details</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fees</span>
              {editMode ? (
                <input type="number" value={editData.fees ?? totalFees}
                  onChange={e => handleChange("fees", e.target.value)}
                  className="text-sm font-bold text-blue-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1C3044]" />
              ) : (
                <span className="text-sm font-bold text-blue-700">{fmt(totalFees)}</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Paid</span>
              {editMode ? (
                <input type="number" value={editData.paidAmount ?? totalPaid}
                  onChange={e => handleChange("paidAmount", e.target.value)}
                  className="text-sm font-bold text-emerald-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1C3044]" />
              ) : (
                <span className="text-sm font-bold text-emerald-700">{fmt(totalPaid)}</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
              <span className={`text-sm font-bold ${totalDue > 0 ? "text-red-600" : "text-emerald-500"}`}>
                {totalDue > 0 ? fmt(totalDue) : "Fully Paid ✓"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <StatusPill status={overallStatus} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</span>
              {editMode ? (
                <select value={editData.paymentMode ?? student.paymentMode ?? ""}
                  onChange={e => handleChange("paymentMode", e.target.value)}
                  className="text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1C3044] bg-white">
                  <option value="">—</option>
                  {["CASH","ONLINE","CHEQUE","DD","UPI","NEFT","RTGS"].map(m => <option key={m}>{m}</option>)}
                </select>
              ) : (
                <span className="text-sm font-medium text-slate-700">{student.paymentMode || <span className="text-slate-300">—</span>}</span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Payment Date</span>
              {editMode ? (
                <input type="date" value={editData.paymentDate ?? (student.paymentDate ? new Date(student.paymentDate).toISOString().slice(0,10) : "")}
                  onChange={e => handleChange("paymentDate", e.target.value)}
                  className="text-sm text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#1C3044]" />
              ) : (
                <span className="text-sm font-medium text-slate-700">
                  {student.paymentDate ? new Date(student.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-slate-300">—</span>}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Rate</span>
              <span className="text-sm font-bold text-purple-700">{pctCollected}%</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee Date</span>
              <span className="text-sm font-medium text-slate-700">
                {student.feeDate ? new Date(student.feeDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-slate-300">—</span>}
              </span>
            </div>
          </div>
        </div>

        {/* ── Category-wise Detail Table ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Layers size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Category-wise Fee Details</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[500px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wide">Paid</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {FEE_CATEGORIES.map(cat => {
                  const paid = catPaid[cat.key] || 0;
                  return (
                    <tr key={cat.key} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: cat.bg }}>
                            {cat.icon}
                          </div>
                          <span className="font-semibold text-slate-700">{cat.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: paid > 0 ? cat.color : "#cbd5e1" }}>
                        {paid > 0 ? fmt(paid) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {paid > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Not paid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#EEF4F8] border-t-2 border-slate-200">
                  <td className="px-4 py-3 text-xs font-bold text-slate-600">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                    {fmt(FEE_CATEGORIES.reduce((a, c) => a + (catPaid[c.key] || 0), 0))}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>{/* end body */}

      {/* ── Payment Modal ── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setPayModal(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#1C3044] to-[#2d4a64] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Record Payment</h2>
                <p className="text-xs text-white/60 mt-0.5">{student.name} · Due: {fmt(totalDue)}</p>
              </div>
              <button onClick={() => setPayModal(false)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20">
                <X size={14} color="#fff" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {payError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={12} /> {payError}
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Amount (₹)</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  placeholder={`Max: ${totalDue}`} max={totalDue}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C3044]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Payment Mode</label>
                <select value={payMode} onChange={e => setPayMode(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C3044] bg-white">
                  {["CASH","ONLINE","CHEQUE","DD","UPI","NEFT","RTGS"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Category</label>
                <select value={payCategory} onChange={e => setPayCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#1C3044] bg-white">
                  <option value="FULL">Full Payment</option>
                  {FEE_CATEGORIES.map(c => <option key={c.key} value={c.label.toUpperCase().split(" ")[0]}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPayModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handlePayment} disabled={payLoading}
                  className="flex-1 py-2.5 bg-[#1C3044] text-white rounded-xl text-sm font-bold hover:bg-[#27435B] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  <CreditCard size={14} /> {payLoading ? "Saving…" : "Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}