// PayModal.jsx — Category-aware Fee Payment Modal (FULLY RESPONSIVE)
import { CreditCard, X, CheckCircle, Clock, ChevronDown, Calendar } from "lucide-react";
import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const parseBreakdown = (raw) => {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};

// Today's date in yyyy-mm-dd, for the native <input type="date"> default value.
const todayISO = () => new Date().toISOString().split("T")[0];

const MODES = ["UPI", "Net Banking", "Cash", "Card", "Cheque"];

const FEE_DEFS = [
  { key: "collegeFee",   label: "School Fee",    flatKey: "collegeFee",   paidField: "schoolFeePaid"   },
  { key: "tuitionFee",   label: "Tuition Fee",   flatKey: "tuitionFee",   paidField: "tuitionFeePaid"  },
  { key: "examFee",      label: "Exam Fee",      flatKey: "examFee",      paidField: "examFeePaid"     },
  { key: "transportFee", label: "Transport Fee", flatKey: "transportFee", paidField: "transportFeePaid"},
  { key: "booksFee",     label: "Books Fee",     flatKey: "booksFee",     paidField: "booksFeePaid"    },
  { key: "labFee",       label: "Lab Fee",       flatKey: "labFee",       paidField: "labFeePaid"      },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.pm-overlay{position:fixed;inset:0;background:rgba(15,25,38,.72);backdrop-filter:blur(6px);z-index:1200;display:flex;align-items:flex-end;justify-content:center;padding:0;animation:pmFade .2s ease;font-family:'DM Sans',sans-serif;}
@media(min-width:600px){.pm-overlay{align-items:center;padding:24px;}}
@keyframes pmFade{from{opacity:0}to{opacity:1}}
@keyframes pmUp{from{transform:translateY(30px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes pmSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}

/* ── MOBILE: bottom sheet, fixed 88% height so body can scroll ── */
.pm-box{
  background:#fff;
  border-radius:20px 20px 0 0;
  width:100%;
  height:88svh;
  max-height:88svh;
  display:flex;
  flex-direction:column;
  box-shadow:0 -8px 40px rgba(15,25,38,.22);
  animation:pmSheet .32s cubic-bezier(.16,1,.3,1);
  overflow:hidden;
}

/* ── TABLET / DESKTOP: centered modal, fixed height so body still scrolls ── */
@media(min-width:600px){
  .pm-box{
    border-radius:20px;
    width:100%;
    max-width:660px;
    height:min(90vh, 820px);   /* fixed height → body gets real space to flex into */
    max-height:90vh;
    box-shadow:0 28px 72px rgba(15,25,38,.3);
    animation:pmUp .26s cubic-bezier(.16,1,.3,1);
  }
}

/* Drag handle for mobile sheet */
.pm-drag-handle{display:flex;justify-content:center;padding:10px 0 4px;flex-shrink:0;}
.pm-drag-pip{width:36px;height:4px;background:#d0e2ee;border-radius:4px;}
@media(min-width:600px){.pm-drag-handle{display:none;}}

.pm-head{background:linear-gradient(135deg,#1C3044,#27435B);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
@media(min-width:600px){.pm-head{padding:18px 22px;}}
.pm-head-left{display:flex;align-items:center;gap:10px;}
@media(min-width:600px){.pm-head-left{gap:12px;}}
.pm-head-ico{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
@media(min-width:600px){.pm-head-ico{width:42px;height:42px;border-radius:12px;}}
.pm-head-title{font-size:14px;font-weight:700;color:#fff;margin:0 0 1px;}
@media(min-width:600px){.pm-head-title{font-size:15px;margin:0 0 2px;}}
.pm-head-sub{font-size:11px;color:rgba(255,255,255,.55);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;}
@media(min-width:400px){.pm-head-sub{max-width:260px;}}
@media(min-width:600px){.pm-head-sub{font-size:11.5px;max-width:none;}}
.pm-close{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.75);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.pm-close:hover{background:rgba(255,255,255,.24);color:#fff;}

.pm-body{overflow-y:auto;overflow-x:hidden;padding:14px 14px 32px;flex:1 1 0;min-height:0;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scroll-behavior:smooth;}
@media(min-width:600px){.pm-body{padding:20px 22px 24px;gap:16px;}}
.pm-body::-webkit-scrollbar{width:4px;}
.pm-body::-webkit-scrollbar-thumb{background:#d0e2ee;border-radius:4px;}

/* Category selector */
.pm-cat-label{font-size:11px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;display:block;}
.pm-cat-wrap{position:relative;}
.pm-cat-select{width:100%;border:1.5px solid #A0C0D4;border-radius:10px;padding:10px 36px 10px 12px;font-size:13px;font-weight:600;color:#1C3044;background:#fff;outline:none;font-family:'DM Sans',sans-serif;appearance:none;cursor:pointer;transition:border-color .2s;}
@media(min-width:600px){.pm-cat-select{padding:10px 36px 10px 14px;font-size:13.5px;}}
.pm-cat-select:focus{border-color:#27435B;box-shadow:0 0 0 3px rgba(39,67,91,.12);}
.pm-cat-chevron{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:#4A6B80;}

/* Payment date row */
.pm-date-row{display:flex;align-items:center;gap:10px;background:#fef6e7;border:1px solid #fde68a;border-radius:11px;padding:10px 12px;}
@media(min-width:600px){.pm-date-row{border-radius:12px;padding:12px 14px;}}
.pm-date-icon{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#d97706,#b45309);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.pm-date-label{font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.6px;}
.pm-date-hint{font-size:10px;color:#a1670e;margin-top:1px;}
.pm-date-inp{border:1.5px solid #fde68a;background:#fff;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:600;color:#1C3044;font-family:'DM Sans',sans-serif;outline:none;margin-left:auto;cursor:pointer;}
.pm-date-inp:focus{border-color:#d97706;box-shadow:0 0 0 3px rgba(217,119,6,.15);}

/* Summary cards */
.pm-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
@media(min-width:500px){.pm-cards{grid-template-columns:repeat(3,1fr);gap:10px;}}
.pm-card{background:#f0f7fc;border-radius:10px;padding:10px 12px;border:1px solid #d0e2ee;text-align:center;}
@media(min-width:600px){.pm-card{border-radius:11px;padding:12px 14px;}}
.pm-card-third{grid-column:1/-1;}
@media(min-width:500px){.pm-card-third{grid-column:auto;}}
.pm-card-lbl{font-size:9.5px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px;}
@media(min-width:600px){.pm-card-lbl{font-size:10px;}}
.pm-card-val{font-size:15px;font-weight:700;color:#1C3044;}
@media(min-width:600px){.pm-card-val{font-size:16px;}}
.pm-card-val.green{color:#1a6e3e;}
.pm-card-val.red{color:#a33030;}

/* Progress */
.pm-prog-row{display:flex;justify-content:space-between;font-size:11px;color:#4A6B80;margin-bottom:5px;}
.pm-prog-row span:last-child{font-weight:700;color:#27435B;}
.pm-prog-track{height:8px;background:#D0E2EE;border-radius:8px;overflow:hidden;}
@media(min-width:600px){.pm-prog-track{height:9px;}}
.pm-prog-fill{height:100%;background:linear-gradient(90deg,#3A5E78,#27435B);border-radius:8px;transition:width .5s ease;}
.pm-prog-hints{display:flex;justify-content:space-between;font-size:10px;color:#6A8FA4;margin-top:4px;}
@media(min-width:600px){.pm-prog-hints{font-size:10.5px;}}

/* Payment method buttons */
.pm-methods{background:#f0f7fc;border-radius:12px;padding:14px;border:1px solid #d0e2ee;}
@media(min-width:600px){.pm-methods{border-radius:14px;padding:20px;}}
.pm-methods-title{font-size:12.5px;font-weight:700;color:#1C3044;margin-bottom:12px;text-align:center;line-height:1.4;}
@media(min-width:600px){.pm-methods-title{font-size:13px;margin-bottom:14px;}}
.pm-method-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(min-width:600px){.pm-method-grid{gap:12px;}}
.pm-method-btn{background:#fff;border:2px solid #A0C0D4;border-radius:11px;padding:14px 10px;cursor:pointer;text-align:center;font-family:'DM Sans',sans-serif;transition:all .15s;}
@media(min-width:600px){.pm-method-btn{border-radius:12px;padding:18px 14px;}}
.pm-method-btn:hover{border-color:#27435B;box-shadow:0 4px 16px rgba(39,67,91,.15);}
.pm-method-btn:active{transform:scale(.97);}
.pm-method-icon{font-size:22px;margin-bottom:6px;}
@media(min-width:600px){.pm-method-icon{font-size:26px;margin-bottom:8px;}}
.pm-method-title{font-size:12.5px;font-weight:700;color:#1C3044;}
@media(min-width:600px){.pm-method-title{font-size:13px;}}
.pm-method-sub{font-size:10.5px;color:#4A6B80;margin-top:3px;}
@media(min-width:600px){.pm-method-sub{font-size:11px;margin-top:4px;}}

/* Full/Custom pay panel */
.pm-panel{background:#f8fafc;border-radius:11px;border:1px solid #d0e2ee;}
@media(min-width:600px){.pm-panel{border-radius:12px;}}
.pm-panel-back{padding:10px 14px 0;background:#f8fafc;}
.pm-panel-back button{background:none;border:none;color:#4A6B80;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:0;}
.pm-panel-inner{padding:12px 14px 20px;}
@media(min-width:600px){.pm-panel-inner{padding:14px 16px 22px;}}
.pm-panel-sec-lbl{font-size:11px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;}
@media(min-width:600px){.pm-panel-sec-lbl{margin-bottom:14px;}}
.pm-fullpay-row{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;}
@media(min-width:560px){.pm-fullpay-row{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;}}
.pm-amount-big{font-size:20px;font-weight:700;color:#1C3044;}
@media(min-width:400px){.pm-amount-big{font-size:22px;}}
@media(min-width:600px){.pm-amount-big{font-size:26px;}}
.pm-amount-sub{font-size:11px;color:#4A6B80;margin-bottom:2px;}
.pm-mode-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
@media(min-width:600px){.pm-mode-row{gap:10px;}}
.pm-mode-lbl{font-size:12px;color:#4A6B80;font-weight:600;white-space:nowrap;}
.pm-select{font-size:13px;border:1.5px solid #A0C0D4;border-radius:8px;padding:8px 12px;color:#1C3044;font-family:'DM Sans',sans-serif;outline:none;background:#fff;cursor:pointer;min-width:130px;}
.pm-custom-lbl{font-size:12px;color:#4A6B80;font-weight:600;margin-bottom:5px;display:block;}
.pm-custom-inp{width:100%;margin-top:5px;border:1.5px solid #A0C0D4;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s;box-sizing:border-box;}
.pm-custom-inp:focus{border-color:#27435B;box-shadow:0 0 0 3px rgba(39,67,91,.1);}
.pm-confirm-btn{width:100%;background:linear-gradient(135deg,#27435B,#1C3044);border:none;color:#fff;border-radius:10px;padding:14px 12px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .15s;margin-top:16px;display:block;}
@media(min-width:600px){.pm-confirm-btn{padding:13px;font-size:14px;margin-top:16px;}}
.pm-confirm-btn:hover:not(:disabled){opacity:.88;}
.pm-confirm-btn:active:not(:disabled){opacity:.75;}
.pm-confirm-btn:disabled{opacity:.6;cursor:not-allowed;}

/* Success & paid states */
.pm-success{background:#edf7f1;border:1px solid #b2dfc6;border-radius:11px;padding:14px 16px;display:flex;align-items:center;gap:10px;}
@media(min-width:600px){.pm-success{border-radius:12px;padding:16px 18px;gap:12px;}}
.pm-success-text{font-weight:700;color:#1a6e3e;font-size:13.5px;}
@media(min-width:600px){.pm-success-text{font-size:14px;}}
.pm-success-sub{font-size:11.5px;color:#4A6B80;margin-top:2px;}
.pm-paid-banner{background:#edf7f1;border:1px solid #b2dfc6;border-radius:11px;padding:16px;text-align:center;}
@media(min-width:600px){.pm-paid-banner{border-radius:12px;padding:18px;}}
.pm-paid-title{font-weight:700;color:#1a6e3e;font-size:13.5px;margin-top:6px;}
@media(min-width:600px){.pm-paid-title{font-size:14px;}}
.pm-err{color:#a33030;font-size:12px;margin-top:10px;}

/* EMI section */
.pm-emi-controls{display:flex;flex-direction:column;gap:10px;background:#f0f7fc;border-radius:10px;padding:10px 12px;border:1px solid #d0e2ee;}
@media(min-width:480px){.pm-emi-controls{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:10px 14px;}}
.pm-emi-count-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
@media(min-width:480px){.pm-emi-count-row{gap:8px;}}
.pm-emi-lbl{font-size:12px;font-weight:700;color:#27435B;white-space:nowrap;}
.pm-emi-chip{width:34px;height:34px;border-radius:8px;border:none;background:rgba(39,67,91,.12);color:#27435B;font-weight:700;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;}
.pm-emi-chip.active{background:linear-gradient(135deg,#27435B,#1C3044);color:#fff;}

/* EMI table - scrollable on mobile */
.pm-emi-table-wrap{border-radius:11px;overflow:hidden;border:1px solid #d0e2ee;overflow-x:auto;-webkit-overflow-scrolling:touch;}
@media(min-width:600px){.pm-emi-table-wrap{border-radius:12px;}}
.pm-emi-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:380px;}
@media(min-width:600px){.pm-emi-tbl{font-size:13px;min-width:420px;}}
.pm-emi-tbl th{padding:9px 10px;color:rgba(255,255,255,.85);font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;text-align:left;white-space:nowrap;background:linear-gradient(135deg,#1C3044,#27435B);}
@media(min-width:600px){.pm-emi-tbl th{padding:10px 12px;font-size:11px;}}
.pm-emi-tbl td{padding:9px 10px;border-bottom:1px solid #e8f2f8;color:#1C3044;vertical-align:middle;}
@media(min-width:600px){.pm-emi-tbl td{padding:10px 12px;}}
.pm-emi-tbl tr:last-child td{border-bottom:none;}
.pm-emi-tbl tfoot td{background:#e8f2f8;border-top:2px solid #C0D8E8;font-weight:700;}

/* Badges */
.pm-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;}
@media(min-width:600px){.pm-badge{padding:3px 10px;font-size:11.5px;}}
.pm-badge-paid{color:#1a6e3e;background:#edf7f1;border:1px solid #b2dfc6;}
.pm-badge-pend{color:#a33030;background:#fdf0f0;border:1px solid #f5c2c2;}
.pm-badge-mode{color:#27435B;background:rgba(39,67,91,.12);}
.pm-emi-pay-btn{background:linear-gradient(135deg,#27435B,#1C3044);border:none;color:#fff;border-radius:7px;padding:5px 12px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;}
@media(min-width:600px){.pm-emi-pay-btn{padding:6px 14px;font-size:12px;}}
.pm-emi-confirm-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;}
.pm-emi-ok-btn{background:#1a6e3e;border:none;color:#fff;border-radius:6px;padding:5px 10px;font-size:13px;font-weight:700;cursor:pointer;}
.pm-emi-x-btn{background:rgba(39,67,91,.13);border:none;color:#27435B;border-radius:6px;padding:5px 8px;font-size:13px;font-weight:700;cursor:pointer;}

/* Footer */
.pm-footer{display:flex;justify-content:flex-end;padding:10px 14px 14px;border-top:1px solid #e8f2f8;background:#fff;flex-shrink:0;}
.pm-close-btn{background:none;border:1.5px solid #A0C0D4;border-radius:10px;color:#27435B;font-weight:700;font-size:13.5px;cursor:pointer;padding:9px 24px;font-family:'DM Sans',sans-serif;}
@media(min-width:600px){.pm-close-btn{font-size:14px;padding:9px 28px;}}
.pm-close-btn:hover{background:#f0f7fc;}
`;

export function PayModal({ student, onClose, onPaymentDone }) {

  const totalFees = Number(student.fees || 0);
  const bd = parseBreakdown(student.feeBreakdown);

  // Key by lowercase name for case-insensitive matching
  const dbCategoryMap = {};
  if (Array.isArray(student.feeCategories)) {
    student.feeCategories.forEach((sfc) => {
      if (sfc.category?.name) dbCategoryMap[sfc.category.name.toLowerCase()] = sfc;
    });
  }
  console.log("[PayModal] feeCategories from student:", student.feeCategories?.length ?? 0, "| dbCategoryMap:", Object.keys(dbCategoryMap));

  const feeCategories = [];
  feeCategories.push({ id: "FULL", label: "Full Fee", total: totalFees, paidField: "paidAmount", dbSfcId: null });

  for (const def of FEE_DEFS) {
    const bdEntry = bd[def.key];
    const amount  = bdEntry
      ? Number(typeof bdEntry === "object" ? (bdEntry.total ?? bdEntry.amount ?? 0) : bdEntry)
      : Number(student[def.flatKey] || 0);

    if (amount > 0) {
      const labelLower = def.label.toLowerCase();
      const dbSfc =
        dbCategoryMap[labelLower] ||
        Object.values(dbCategoryMap).find((sfc) => {
          const nm = sfc.category?.name?.toLowerCase() || "";
          return nm === labelLower || nm.includes(labelLower.replace(" fee", "").trim());
        });

      feeCategories.push({
        id:           def.key,
        label:        def.label,
        total:        amount,
        paidField:    def.paidField,
        dbSfcId:      dbSfc?.id || null,
        dbCategoryId: dbSfc?.categoryId || null,  // ✅ was sfc.categoryId (bug), now dbSfc?.categoryId
      });
    }
  }

  const customFeesList = Array.isArray(bd.customFees) ? bd.customFees : [];
  customFeesList.forEach((cf, i) => {
    const amount = Number(cf.total ?? cf.amount ?? 0);
    if (amount > 0) {
      feeCategories.push({
        id: `custom_${i}`, label: cf.label || `Custom Fee ${i + 1}`,
        total: amount, paidField: null, isCustom: true, customIdx: i, dbCategoryId: null,
      });
    }
  });

  const initPaidMap = () => {
    const m = { paidAmount: Number(student.paidAmount || 0) };
    for (const def of FEE_DEFS) {
      m[def.paidField] = Number(student[def.paidField] || 0);
    }
    return m;
  };
  const [paidMap, setPaidMap] = useState(initPaidMap);

  const [categoryId,  setCategoryId]  = useState("FULL");
  const activeCat    = feeCategories.find(c => c.id === categoryId) || feeCategories[0];
  const catTotal     = activeCat.total;
  const catPaid      = activeCat.paidField ? (paidMap[activeCat.paidField] ?? 0) : 0;
  const catRemaining = Math.max(0, catTotal - catPaid);
  const progressPct  = catTotal > 0 ? Math.min(100, Math.round((catPaid / catTotal) * 100)) : 0;

  const [useEmi,    setUseEmi]    = useState(null);
  const [fullMode,  setFullMode]  = useState("UPI");
  const [fullDone,  setFullDone]  = useState(false);
  const [customAmt, setCustomAmt] = useState("");
  // Custom payment date — defaults to today, editable, applies to whichever
  // payment path (full/custom/EMI instalment) is confirmed.
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [emiCount,  setEmiCount]  = useState(3);
  const [emiList,   setEmiList]   = useState([]);
  const [confirmId, setConfirmId] = useState(null);
  const [modeInput, setModeInput] = useState("UPI");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => { setUseEmi(null); setFullDone(false); setCustomAmt(""); setConfirmId(null); setError(""); }, [categoryId]);

  useEffect(() => {
    if (!useEmi) return;
    const base      = Math.floor(catRemaining / emiCount);
    const remainder = catRemaining - base * emiCount;
    let alreadyLeft = catPaid;
    const list = Array.from({ length: emiCount }, (_, i) => {
      const amount = i === emiCount - 1 ? base + remainder : base;
      let status = "pending", date = null, mode = null;
      if (alreadyLeft >= amount) { status = "paid"; alreadyLeft -= amount; date = "Paid Earlier"; mode = "Saved"; }
      return { id: i + 1, label: `Instalment ${i + 1}`, amount, date, mode, status };
    });
    setEmiList(list); setConfirmId(null);
  }, [emiCount, useEmi, categoryId]);

  const emiPaid    = emiList.filter(e => e.status === "paid"   ).reduce((a, e) => a + e.amount, 0);
  const emiPending = emiList.filter(e => e.status === "pending").reduce((a, e) => a + e.amount, 0);

  const getToken = () => { try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return null; } };

  const apiRecordCategoryPayment = async (categoryId, amount, mode) => {
    const res = await fetch(`${API_URL}/api/finance/recordCategoryPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ studentListId: student.id, categoryId, amount, paymentMode: mode, paymentDate: new Date(paymentDate + "T00:00:00+05:30").toISOString() }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const buildPayload = (addedAmt) => {
    const newTotalPaid = Math.min(totalFees, paidMap.paidAmount + addedAmt);
    const isFullyPaid  = newTotalPaid >= totalFees;
    const patch = { paymentMode: fullMode, paymentDate: new Date(paymentDate + "T00:00:00+05:30").toISOString(), paidAmount: newTotalPaid, paymentStatus: isFullyPaid ? "PAID" : "PARTIAL" };

    if (activeCat.id === "FULL") {
      let remaining = newTotalPaid;
      for (const def of FEE_DEFS) {
        const bdEntry = bd[def.key];
        const feeAmt  = bdEntry
          ? Number(typeof bdEntry === "object" ? (bdEntry.total ?? bdEntry.amount ?? 0) : bdEntry)
          : Number(student[def.flatKey] || 0);
        if (feeAmt > 0) {
          const paid = Math.min(feeAmt, remaining);
          patch[def.paidField] = paid;
          remaining = Math.max(0, remaining - paid);
        }
      }
    } else if (activeCat.paidField && activeCat.paidField !== "paidAmount") {
      const newCatPaid = Math.min(catTotal, catPaid + addedAmt);
      patch[activeCat.paidField] = newCatPaid;
    }
    return patch;
  };

  const apiUpdate = async (payload) => {
    const res = await fetch(`${API_URL}/api/finance/updateStudentFinance/${student.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...student, ...payload }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const applyPatch = (addedAmt) => {
    const payload = buildPayload(addedAmt);
    setPaidMap(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(payload)) { if (k in next) next[k] = v; else next[k] = v; }
      next.paidAmount = payload.paidAmount;
      return next;
    });
    onPaymentDone(student.id, payload.paidAmount, payload.paymentStatus);
  };

  // ── SESSION LOG — accumulates ALL categories paid in one PayModal open ────
  // Problem: user pays School Fee, then Exam Fee in same modal open.
  // Without this, each payment = separate receipt in dropdown.
  // Solution: use a session log ID. All payments in one modal session
  // share the same logId → backend UPDATES that row instead of creating new.
  const [sessionLogId, setSessionLogId] = useState(null);

  // Map of category field → amount paid IN THIS SESSION (accumulates)
  const [sessionBreakdown, setSessionBreakdown] = useState({
    amount:           0,
    schoolFeePaid:    0,
    tuitionFeePaid:   0,
    examFeePaid:      0,
    transportFeePaid: 0,
    booksFeePaid:     0,
    labFeePaid:       0,
    miscFeePaid:      0,
  });

  // ── Map activeCat.id → breakdown field ───────────────────────────────────
  const CAT_TO_FIELD = {
    collegeFee:   "schoolFeePaid",
    tuitionFee:   "tuitionFeePaid",
    examFee:      "examFeePaid",
    transportFee: "transportFeePaid",
    booksFee:     "booksFeePaid",
    labFee:       "labFeePaid",
    miscFee:      "miscFeePaid",
  };

  // ── Distribute a payment across categories (waterfall) ────────────────────
  // Used when the payment wasn't made against one specific category (e.g. the
  // "Full Fee" quick-pay option, or a custom amount typed against Full Fee).
  // Fills each category's remaining capacity in order, using paidMap as the
  // "already paid before this transaction" baseline — matches the same
  // waterfall buildPayload() already uses for the legacy paidAmount patch,
  // so the two stay consistent.
  const allocateAcrossCategories = (amountPaid) => {
    const increments = {};
    let remaining = amountPaid;
    for (const def of FEE_DEFS) {
      if (remaining <= 0) break;
      const bdEntry = bd[def.key];
      const feeAmt  = bdEntry
        ? Number(typeof bdEntry === "object" ? (bdEntry.total ?? bdEntry.amount ?? 0) : bdEntry)
        : Number(student[def.flatKey] || 0);
      if (feeAmt <= 0) continue;

      const alreadyPaid = Number(paidMap[def.paidField] || 0);
      const capacity     = Math.max(0, feeAmt - alreadyPaid);
      if (capacity <= 0) continue;

      const chunk = Math.min(capacity, remaining);
      increments[def.paidField] = (increments[def.paidField] || 0) + chunk;
      remaining -= chunk;
    }
    return increments;
  };

  // ── Called after every successful payment in this session ────────────────
  // Creates the log row on first call, updates it on subsequent calls.
  const updateSessionLog = async (amountPaid, mode) => {
    try {
      // Category-specific payment (e.g. "School Fee") → credit that one field.
      // Full Fee / non-category payment → distribute across categories instead
      // of silently dropping the attribution (previous bug: field was
      // undefined for "FULL", so no category column was ever credited).
      const field = CAT_TO_FIELD[activeCat.id];
      const increments = field
        ? { [field]: amountPaid }
        : allocateAcrossCategories(amountPaid);

      // Merge into session accumulator
      const updated = { ...sessionBreakdown, amount: sessionBreakdown.amount + amountPaid };
      for (const [f, amt] of Object.entries(increments)) {
        updated[f] = (updated[f] || 0) + amt;
      }
      setSessionBreakdown(updated);

      const body = {
        studentListId: student.id,
        amount:        updated.amount,
        paymentMode:   mode,
        paymentDate:   new Date(paymentDate + "T00:00:00+05:30").toISOString(),
        ...updated,
        // Pass sessionLogId so backend can UPDATE instead of INSERT
        sessionLogId:  sessionLogId || null,
      };

      console.log("[PayModal] updateSessionLog →", body);

      const res = await fetch(`${API_URL}/api/finance/recordSimplePayment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      console.log("[PayModal] session log result:", data);

      // Save the log ID for subsequent payments in this session
      if (data.logId && !sessionLogId) {
        setSessionLogId(data.logId);
      }
    } catch (e) {
      console.warn("[PayModal] session log update failed (non-fatal):", e.message);
    }
  };

  const doPayment = async (amount, mode) => {
    console.log("[PayModal] doPayment →", { cat: activeCat.label, dbCategoryId: activeCat.dbCategoryId, amount, mode });

    if (activeCat.dbCategoryId && activeCat.id !== "FULL") {
      console.log("[PayModal] → recordCategoryPayment (category system)");
      const result = await apiRecordCategoryPayment(activeCat.dbCategoryId, amount, mode);
      const newTotalPaid = result.newTotalPaid;
      setPaidMap(prev => {
        const next = { ...prev };
        if (activeCat.paidField) next[activeCat.paidField] = Math.min(catTotal, catPaid + amount);
        next.paidAmount = newTotalPaid;
        return next;
      });
      onPaymentDone(student.id, newTotalPaid, newTotalPaid >= totalFees ? "PAID" : "PARTIAL");
    } else {
      console.log("[PayModal] → updateStudentFinance (legacy)");
      const payload = { ...buildPayload(amount), paymentMode: mode };
      await apiUpdate(payload);
      applyPatch(amount);
    }

    // Always update session log AFTER payment succeeds
    await updateSessionLog(amount, mode);
  };

  const handleFullPay = async () => {
    setLoading(true); setError("");
    try { await doPayment(catRemaining, fullMode); setFullDone(true); }
    catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  const handleCustomPay = async () => {
    const amount = Number(customAmt);
    if (!amount || amount <= 0)  { setError("Enter a valid amount."); return; }
    if (amount > catRemaining)   { setError(`Amount cannot exceed remaining ₹${catRemaining.toLocaleString("en-IN")}.`); return; }
    setLoading(true); setError("");
    try { await doPayment(amount, fullMode); setCustomAmt(""); setFullDone(true); }
    catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  const handleConfirmEmi = async (emi) => {
    setLoading(true); setError("");
    const paidLabel = new Date(paymentDate + "T00:00:00+05:30").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    try {
      await doPayment(emi.amount, modeInput);
      const updatedList = emiList.map(e => e.id === emi.id ? { ...e, status: "paid", date: paidLabel, mode: modeInput } : e);
      setEmiList(updatedList); setConfirmId(null);
    } catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="pm-overlay">
      <style>{STYLES}</style>
      <div className="pm-box" onClick={e => e.stopPropagation()}>

        {/* Mobile drag handle */}
        <div className="pm-drag-handle"><div className="pm-drag-pip" /></div>

        {/* Header */}
        <div className="pm-head">
          <div className="pm-head-left">
            <div className="pm-head-ico"><CreditCard size={18} color="#fff" /></div>
            <div>
              <div className="pm-head-title">Fee Payment</div>
              <div className="pm-head-sub">{student.name} · {student.course}</div>
            </div>
          </div>
          <button className="pm-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="pm-body">

          {/* Category selector */}
          <div>
            <span className="pm-cat-label">Fee Category</span>
            <div className="pm-cat-wrap">
              <select className="pm-cat-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {feeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}  (₹{cat.total.toLocaleString("en-IN")})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pm-cat-chevron" />
            </div>
          </div>

          {/* Payment date — defaults to today, editable */}
          <div className="pm-date-row">
            <div className="pm-date-icon"><Calendar size={16} color="#fff" /></div>
            <div>
              <div className="pm-date-label">Payment Date</div>
              <div className="pm-date-hint">Select the date this payment was received</div>
            </div>
            <input
              type="date"
              className="pm-date-inp"
              value={paymentDate}
              max={todayISO()}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Summary cards */}
          <div className="pm-cards">
            <div className="pm-card">
              <div className="pm-card-lbl">{activeCat.label}</div>
              <div className="pm-card-val">₹{catTotal.toLocaleString("en-IN")}</div>
            </div>
            <div className="pm-card">
              <div className="pm-card-lbl">Amount Paid</div>
              <div className="pm-card-val green">₹{(useEmi ? catPaid + emiPaid : (fullDone ? catTotal : catPaid)).toLocaleString("en-IN")}</div>
            </div>
            <div className="pm-card pm-card-third">
              <div className="pm-card-lbl">Pending</div>
              <div className={`pm-card-val ${(useEmi ? emiPending : (fullDone ? 0 : catRemaining)) > 0 ? "red" : "green"}`}>
                ₹{(useEmi ? emiPending : (fullDone ? 0 : catRemaining)).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="pm-prog-row">
              <span>Payment progress — {activeCat.label}</span>
              <span>{progressPct}% paid</span>
            </div>
            <div className="pm-prog-track">
              <div className="pm-prog-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="pm-prog-hints">
              <span>₹0</span>
              <span>{catRemaining === 0 ? "✓ Fully Paid" : `₹${catRemaining.toLocaleString("en-IN")} remaining`}</span>
              <span>₹{catTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Already fully paid */}
          {catRemaining === 0 && !fullDone && (
            <div className="pm-paid-banner">
              <CheckCircle size={26} color="#1a6e3e" />
              <div className="pm-paid-title">{activeCat.label} fully paid!</div>
            </div>
          )}

          {/* Method chooser */}
          {useEmi === null && !fullDone && catRemaining > 0 && (
            <div className="pm-methods">
              <div className="pm-methods-title">
                How would you like to pay <strong style={{ color: "#27435B" }}>₹{catRemaining.toLocaleString("en-IN")}</strong> for <strong style={{ color: "#27435B" }}>{activeCat.label}</strong>?
              </div>
              <div className="pm-method-grid">
                {[
                  { icon: "💳", title: "Pay Full Amount", sub: `₹${catRemaining.toLocaleString("en-IN")} at once`, fn: () => setUseEmi(false) },
                  { icon: "📅", title: "Pay in Instalments", sub: "Split into EMIs", fn: () => setUseEmi(true) },
                ].map((opt, i) => (
                  <button key={i} className="pm-method-btn" onClick={opt.fn}>
                    <div className="pm-method-icon">{opt.icon}</div>
                    <div className="pm-method-title">{opt.title}</div>
                    <div className="pm-method-sub">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full / Custom Pay Panel */}
          {useEmi === false && !fullDone && (
            <div className="pm-panel">
              <div className="pm-panel-back"><button onClick={() => setUseEmi(null)}>← Back</button></div>
              <div className="pm-panel-inner">
                <div className="pm-panel-sec-lbl">Full Payment · {activeCat.label}</div>
                <div className="pm-fullpay-row">
                  <div>
                    <div className="pm-amount-sub">Amount to pay</div>
                    <div className="pm-amount-big">₹{catRemaining.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="pm-mode-row">
                    <span className="pm-mode-lbl">Mode</span>
                    <select className="pm-select" value={fullMode} onChange={e => setFullMode(e.target.value)}>
                      {MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <span className="pm-custom-lbl">Or enter a custom amount</span>
                  <input
                    className="pm-custom-inp" type="number" inputMode="numeric"
                    placeholder={`Max ₹${catRemaining.toLocaleString("en-IN")}`}
                    value={customAmt} onChange={e => setCustomAmt(e.target.value)}
                  />
                </div>
                <button className="pm-confirm-btn" disabled={loading} onClick={() => customAmt ? handleCustomPay() : handleFullPay()}>
                  {loading ? "Processing…" : customAmt
                    ? `Confirm ₹${Number(customAmt).toLocaleString("en-IN")} · ${activeCat.label}`
                    : `Confirm Full Payment — ₹${catRemaining.toLocaleString("en-IN")}`}
                </button>
                {error && <div className="pm-err">{error}</div>}
              </div>
            </div>
          )}

          {/* Full pay success */}
          {useEmi === false && fullDone && (
            <div className="pm-success">
              <CheckCircle size={26} color="#1a6e3e" />
              <div>
                <div className="pm-success-text">Payment Confirmed!</div>
                <div className="pm-success-sub">
                  {customAmt ? `₹${Number(customAmt).toLocaleString("en-IN")} paid` : `₹${catRemaining.toLocaleString("en-IN")} paid`} via {fullMode} · {activeCat.label} · {new Date(paymentDate + "T00:00:00+05:30").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                </div>
              </div>
            </div>
          )}

          {/* EMI panel */}
          {useEmi === true && (
            <>
              <div className="pm-emi-controls">
                <button onClick={() => setUseEmi(null)} style={{ background: "none", border: "none", color: "#4A6B80", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: 0 }}>← Back</button>
                <div className="pm-emi-count-row">
                  <span className="pm-emi-lbl">Instalments:</span>
                  {[2, 3, 4, 6].map(n => (
                    <button key={n} className={`pm-emi-chip${emiCount === n ? " active" : ""}`} onClick={() => setEmiCount(n)}>{n}</button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "#4A6B80", background: "#f0f7fc", borderRadius: 8, padding: "8px 12px", border: "1px solid #d0e2ee" }}>
                <strong style={{ color: "#27435B" }}>EMI for: {activeCat.label}</strong> — ₹{catRemaining.toLocaleString("en-IN")} split into {emiCount} instalments.
              </div>

              <div className="pm-emi-table-wrap">
                <table className="pm-emi-tbl">
                  <thead>
                    <tr>{["Instalment", "Amount", "Date", "Mode", "Status", "Action"].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {emiList.map((emi, i) => (
                      <tr key={emi.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ fontWeight: 600 }}>{emi.label}</td>
                        <td style={{ fontWeight: 700, color: "#27435B" }}>₹{emi.amount.toLocaleString("en-IN")}</td>
                        <td style={{ color: "#4A6B80", fontSize: 11 }}>{emi.date || "—"}</td>
                        <td>{emi.mode ? <span className="pm-badge pm-badge-mode" style={{ fontSize: 10.5 }}>{emi.mode}</span> : <span style={{ color: "#A0B8C8", fontSize: 11 }}>—</span>}</td>
                        <td>
                          {emi.status === "paid"
                            ? <span className="pm-badge pm-badge-paid"><CheckCircle size={10} /> Paid</span>
                            : <span className="pm-badge pm-badge-pend"><Clock size={10} /> Pending</span>}
                        </td>
                        <td>
                          {emi.status === "paid" && <span style={{ color: "#A0B8C8", fontSize: 11 }}>—</span>}
                          {emi.status === "pending" && confirmId !== emi.id && (
                            <button className="pm-emi-pay-btn" onClick={() => setConfirmId(emi.id)}>Pay</button>
                          )}
                          {emi.status === "pending" && confirmId === emi.id && (
                            <div className="pm-emi-confirm-row">
                              <select className="pm-select" style={{ fontSize: 11.5, padding: "4px 7px" }} value={modeInput} onChange={e => setModeInput(e.target.value)}>
                                {MODES.map(m => <option key={m}>{m}</option>)}
                              </select>
                              <button className="pm-emi-ok-btn" disabled={loading} onClick={() => handleConfirmEmi(emi)}>✓</button>
                              <button className="pm-emi-x-btn" onClick={() => setConfirmId(null)}>✕</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td>₹{catRemaining.toLocaleString("en-IN")}</td>
                      <td colSpan={2} style={{ color: "#1a6e3e", fontSize: 11.5 }}>Paid: ₹{emiPaid.toLocaleString("en-IN")}</td>
                      <td colSpan={2} style={{ color: emiPending > 0 ? "#a33030" : "#1a6e3e", fontSize: 11.5 }}>
                        {emiPending > 0 ? `Pending: ₹${emiPending.toLocaleString("en-IN")}` : "✓ Fully Paid"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {error && <div className="pm-err">{error}</div>}
            </>
          )}


        </div>{/* end pm-body */}

        {/* Footer — pinned outside scroll area */}
        <div className="pm-footer">
          <button className="pm-close-btn" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}