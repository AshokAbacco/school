// PayModal.jsx  — Category-aware Fee Payment Modal
// Supports: Full Fee | School Fee | Tuition Fee
// Modes: Full Payment | EMI | Custom Amount
// Updates: paidAmount + schoolFeePaid / tuitionFeePaid as needed
// Responsive: mobile-first

import { CreditCard, X, CheckCircle, Clock, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

// ─── helper: parse feeBreakdown safely ───────────────────────────────────────
const parseBreakdown = (raw) => {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};

// ─── payment mode options ─────────────────────────────────────────────────────
const MODES = ["UPI", "Net Banking", "Cash", "Card", "Cheque"];

// ─── styles injected once ─────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

.pm-*{box-sizing:border-box}

/* overlay */
.pm-overlay{
  position:fixed;inset:0;
  background:rgba(15,25,38,.72);
  backdrop-filter:blur(8px);
  z-index:1200;
  display:flex;align-items:center;justify-content:center;
  padding:12px;
  animation:pmFade .2s ease;
  font-family:'DM Sans',sans-serif;
}
@keyframes pmFade{from{opacity:0}to{opacity:1}}
@keyframes pmUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}

/* modal box */
.pm-box{
  background:#fff;
  border-radius:20px;
  width:100%;max-width:660px;
  max-height:92vh;
  display:flex;flex-direction:column;
  box-shadow:0 28px 72px rgba(15,25,38,.3);
  animation:pmUp .26s cubic-bezier(.16,1,.3,1);
  overflow:hidden;
}

/* header */
.pm-head{
  background:linear-gradient(135deg,#1C3044,#27435B);
  padding:18px 22px;
  display:flex;align-items:center;justify-content:space-between;
  flex-shrink:0;
}
.pm-head-left{display:flex;align-items:center;gap:12px}
.pm-head-ico{
  width:42px;height:42px;border-radius:12px;
  background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.22);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.pm-head-title{font-size:15px;font-weight:700;color:#fff;margin:0 0 2px}
.pm-head-sub{font-size:11.5px;color:rgba(255,255,255,.55);margin:0}
.pm-close{
  width:32px;height:32px;border-radius:8px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.75);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;flex-shrink:0;
}
.pm-close:hover{background:rgba(255,255,255,.24);color:#fff}

/* scrollable body */
.pm-body{
  overflow-y:auto;
  padding:20px 22px 24px;
  flex:1;
  display:flex;flex-direction:column;
  gap:16px;
}
.pm-body::-webkit-scrollbar{width:4px}
.pm-body::-webkit-scrollbar-thumb{background:#d0e2ee;border-radius:4px}

/* ─ category selector ─ */
.pm-cat-label{font-size:11px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px;display:block}
.pm-cat-wrap{position:relative}
.pm-cat-select{
  width:100%;border:1.5px solid #A0C0D4;border-radius:10px;
  padding:10px 36px 10px 14px;font-size:13.5px;font-weight:600;
  color:#1C3044;background:#fff;outline:none;
  font-family:'DM Sans',sans-serif;appearance:none;cursor:pointer;
  transition:border-color .2s;
}
.pm-cat-select:focus{border-color:#27435B;box-shadow:0 0 0 3px rgba(39,67,91,.12)}
.pm-cat-chevron{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:#4A6B80}

/* ─ summary cards ─ */
.pm-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.pm-card{
  background:#f0f7fc;border-radius:11px;
  padding:12px 14px;border:1px solid #d0e2ee;
  text-align:center;
}
.pm-card-lbl{font-size:10px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
.pm-card-val{font-size:16px;font-weight:700;color:#1C3044}
.pm-card-val.green{color:#1a6e3e}
.pm-card-val.red{color:#a33030}

/* ─ progress ─ */
.pm-prog-row{display:flex;justify-content:space-between;font-size:11px;color:#4A6B80;margin-bottom:5px}
.pm-prog-row span:last-child{font-weight:700;color:#27435B}
.pm-prog-track{height:9px;background:#D0E2EE;border-radius:8px;overflow:hidden}
.pm-prog-fill{height:100%;background:linear-gradient(90deg,#3A5E78,#27435B);border-radius:8px;transition:width .5s ease}
.pm-prog-hints{display:flex;justify-content:space-between;font-size:10.5px;color:#6A8FA4;margin-top:4px}

/* ─ method chooser ─ */
.pm-methods{background:#f0f7fc;border-radius:14px;padding:20px;border:1px solid #d0e2ee}
.pm-methods-title{font-size:13px;font-weight:700;color:#1C3044;margin-bottom:14px;text-align:center}
.pm-method-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pm-method-btn{
  background:#fff;border:2px solid #A0C0D4;border-radius:12px;
  padding:18px 14px;cursor:pointer;text-align:center;
  font-family:'DM Sans',sans-serif;transition:all .15s;
}
.pm-method-btn:hover{border-color:#27435B;box-shadow:0 4px 16px rgba(39,67,91,.15)}
.pm-method-icon{font-size:26px;margin-bottom:8px}
.pm-method-title{font-size:13px;font-weight:700;color:#1C3044}
.pm-method-sub{font-size:11px;color:#4A6B80;margin-top:4px}

/* ─ section panels ─ */
.pm-panel{background:#f8fafc;border-radius:12px;border:1px solid #d0e2ee;overflow:hidden}
.pm-panel-back{padding:11px 16px 0;background:#f8fafc}
.pm-panel-back button{background:none;border:none;color:#4A6B80;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;padding:0}
.pm-panel-inner{padding:14px 16px 18px}
.pm-panel-sec-lbl{font-size:11px;font-weight:700;color:#4A6B80;text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px}

/* ─ full pay ─ */
.pm-fullpay-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.pm-amount-big{font-size:26px;font-weight:700;color:#1C3044}
.pm-amount-sub{font-size:11px;color:#4A6B80;margin-bottom:2px}
.pm-mode-row{display:flex;align-items:center;gap:10px}
.pm-mode-lbl{font-size:12px;color:#4A6B80;font-weight:600;white-space:nowrap}
.pm-select{
  font-size:13px;border:1.5px solid #A0C0D4;border-radius:8px;
  padding:7px 10px;color:#1C3044;font-family:'DM Sans',sans-serif;
  outline:none;background:#fff;cursor:pointer;
}
.pm-custom-lbl{font-size:12px;color:#4A6B80;font-weight:600;margin-bottom:6px;display:block}
.pm-custom-inp{
  width:100%;margin-top:6px;border:1.5px solid #A0C0D4;border-radius:8px;
  padding:9px 12px;font-size:13px;outline:none;
  font-family:'DM Sans',sans-serif;
  transition:border-color .2s;box-sizing:border-box;
}
.pm-custom-inp:focus{border-color:#27435B;box-shadow:0 0 0 3px rgba(39,67,91,.1)}
.pm-confirm-btn{
  width:100%;background:linear-gradient(135deg,#27435B,#1C3044);
  border:none;color:#fff;border-radius:10px;
  padding:13px;font-size:14px;font-weight:700;
  cursor:pointer;font-family:'DM Sans',sans-serif;
  transition:opacity .15s;margin-top:16px;
}
.pm-confirm-btn:hover:not(:disabled){opacity:.88}
.pm-confirm-btn:disabled{opacity:.6;cursor:not-allowed}

/* ─ success banner ─ */
.pm-success{
  background:#edf7f1;border:1px solid #b2dfc6;border-radius:12px;
  padding:16px 18px;display:flex;align-items:center;gap:12px;
}
.pm-success-text{font-weight:700;color:#1a6e3e;font-size:14px}
.pm-success-sub{font-size:12px;color:#4A6B80;margin-top:2px}

/* ─ already paid ─ */
.pm-paid-banner{
  background:#edf7f1;border:1px solid #b2dfc6;border-radius:12px;
  padding:18px;text-align:center;
}
.pm-paid-title{font-weight:700;color:#1a6e3e;font-size:14px;margin-top:6px}

/* ─ error ─ */
.pm-err{color:#a33030;font-size:12px;margin-top:10px}

/* ─ EMI ─ */
.pm-emi-controls{
  display:flex;align-items:center;justify-content:space-between;
  background:#f0f7fc;border-radius:10px;padding:10px 14px;
  border:1px solid #d0e2ee;flex-wrap:wrap;gap:8px;
}
.pm-emi-count-row{display:flex;align-items:center;gap:8px}
.pm-emi-lbl{font-size:12px;font-weight:700;color:#27435B;white-space:nowrap}
.pm-emi-chip{
  width:34px;height:34px;border-radius:8px;border:none;
  background:rgba(39,67,91,.12);color:#27435B;
  font-weight:700;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;
  transition:all .15s;
}
.pm-emi-chip.active{background:linear-gradient(135deg,#27435B,#1C3044);color:#fff}
.pm-emi-table-wrap{border-radius:12px;overflow:hidden;border:1px solid #d0e2ee}
.pm-emi-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pm-emi-tbl th{
  padding:10px 12px;color:rgba(255,255,255,.85);
  font-weight:700;font-size:11px;text-transform:uppercase;
  letter-spacing:.6px;text-align:left;white-space:nowrap;
  background:linear-gradient(135deg,#1C3044,#27435B);
}
.pm-emi-tbl td{padding:10px 12px;border-bottom:1px solid #e8f2f8;color:#1C3044;vertical-align:middle}
.pm-emi-tbl tr:last-child td{border-bottom:none}
.pm-emi-tbl tfoot td{background:#e8f2f8;border-top:2px solid #C0D8E8;font-weight:700}
.pm-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600}
.pm-badge-paid{color:#1a6e3e;background:#edf7f1;border:1px solid #b2dfc6}
.pm-badge-pend{color:#a33030;background:#fdf0f0;border:1px solid #f5c2c2}
.pm-badge-mode{color:#27435B;background:rgba(39,67,91,.12)}
.pm-emi-pay-btn{
  background:linear-gradient(135deg,#27435B,#1C3044);border:none;
  color:#fff;border-radius:7px;padding:6px 14px;
  font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;
}
.pm-emi-confirm-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pm-emi-ok-btn{background:#1a6e3e;border:none;color:#fff;border-radius:6px;padding:5px 11px;font-size:13px;font-weight:700;cursor:pointer}
.pm-emi-x-btn{background:rgba(39,67,91,.13);border:none;color:#27435B;border-radius:6px;padding:5px 9px;font-size:13px;font-weight:700;cursor:pointer}

/* footer close */
.pm-footer{display:flex;justify-content:flex-end;padding-top:4px}
.pm-close-btn{
  background:none;border:1.5px solid #A0C0D4;border-radius:10px;
  color:#27435B;font-weight:700;font-size:14px;
  cursor:pointer;padding:9px 28px;font-family:'DM Sans',sans-serif;
}
.pm-close-btn:hover{background:#f0f7fc}

/* ─── responsive ─── */
@media(max-width:520px){
  .pm-box{border-radius:16px;max-height:96vh}
  .pm-head{padding:14px 16px;border-radius:16px 16px 0 0}
  .pm-body{padding:14px 14px 20px;gap:12px}
  .pm-cards{grid-template-columns:1fr 1fr}
  .pm-card:last-child{grid-column:1/-1}
  .pm-method-grid{grid-template-columns:1fr 1fr}
  .pm-method-btn{padding:14px 10px}
  .pm-amount-big{font-size:22px}
  .pm-fullpay-row{flex-direction:column;align-items:flex-start}
  .pm-emi-tbl{font-size:11.5px}
  .pm-emi-tbl th,.pm-emi-tbl td{padding:8px 8px}
  .pm-emi-tbl th:nth-child(3),.pm-emi-tbl td:nth-child(3){display:none}
}
@media(max-width:380px){
  .pm-cards{grid-template-columns:1fr}
  .pm-card:last-child{grid-column:auto}
  .pm-method-grid{grid-template-columns:1fr}
}
`;

// ─────────────────────────────────────────────────────────────────────────────
export function PayModal({ student, onClose, onPaymentDone }) {

  // ── Derive per-category totals from student record ──────────────────────────
  const bd = parseBreakdown(student.feeBreakdown);

  const totalFees   = Number(student.fees || 0);
  const schoolFee   = Number(bd.collegeFee  || 0);
  const tuitionFee  = Number(bd.tuitionFee  || 0);

  // ── Live paid amounts (updated optimistically on each payment) ───────────────
  const [livePaid,        setLivePaid]        = useState(Number(student.paidAmount    || 0));
  const [liveSchoolPaid,  setLiveSchoolPaid]  = useState(Number(student.schoolFeePaid || 0));
  const [liveTuitionPaid, setLiveTuitionPaid] = useState(Number(student.tuitionFeePaid|| 0));

  // ── Selected fee category ────────────────────────────────────────────────────
  const [category, setCategory] = useState("FULL"); // FULL | SCHOOL | TUITION

  // ── Per-category computed values ─────────────────────────────────────────────
  const catTotal     = category === "SCHOOL"  ? schoolFee
                     : category === "TUITION" ? tuitionFee
                     : totalFees;
  const catPaid      = category === "SCHOOL"  ? liveSchoolPaid
                     : category === "TUITION" ? liveTuitionPaid
                     : livePaid;
  const catRemaining = Math.max(0, catTotal - catPaid);
  const progressPct  = catTotal > 0 ? Math.min(100, Math.round((catPaid / catTotal) * 100)) : 0;

  // ── Payment method state ─────────────────────────────────────────────────────
  const [useEmi,      setUseEmi]      = useState(null);    // null=choose | false=full | true=emi
  const [fullMode,    setFullMode]    = useState("UPI");
  const [fullDone,    setFullDone]    = useState(false);
  const [customAmt,   setCustomAmt]   = useState("");

  const [emiCount,    setEmiCount]    = useState(3);
  const [emiList,     setEmiList]     = useState([]);
  const [confirmId,   setConfirmId]   = useState(null);
  const [modeInput,   setModeInput]   = useState("UPI");

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // ── Reset payment state when category changes ─────────────────────────────────
  useEffect(() => {
    setUseEmi(null);
    setFullDone(false);
    setCustomAmt("");
    setConfirmId(null);
    setError("");
  }, [category]);

  // ── Build EMI list whenever emiCount / category changes ──────────────────────
  useEffect(() => {
    if (!useEmi) return;

    const base      = Math.floor(catRemaining / emiCount);
    const remainder = catRemaining - base * emiCount;

    // How much of category is already paid before we open EMI?
    let alreadyLeft = catPaid;

    const list = Array.from({ length: emiCount }, (_, i) => {
      const amount = i === emiCount - 1 ? base + remainder : base;
      let status = "pending", date = null, mode = null;

      if (alreadyLeft >= amount) {
        status = "paid"; alreadyLeft -= amount;
        date = "Paid Earlier"; mode = "Saved";
      }

      return { id: i + 1, label: `Instalment ${i + 1}`, amount, date, mode, status };
    });

    setEmiList(list);
    setConfirmId(null);
  }, [emiCount, useEmi, category]);

  // ── EMI totals ────────────────────────────────────────────────────────────────
  const emiPaid    = emiList.filter(e => e.status === "paid"   ).reduce((a, e) => a + e.amount, 0);
  const emiPending = emiList.filter(e => e.status === "pending").reduce((a, e) => a + e.amount, 0);

  // ── Display paid / pending (tracks optimistic updates) ───────────────────────
  const displayPaid    = useEmi ? catPaid + emiPaid          : (fullDone ? catTotal  : catPaid);
  const displayPending = useEmi ? emiPending                 : (fullDone ? 0          : catRemaining);

  // ─── Auth helper ──────────────────────────────────────────────────────────────
  const getToken = () => {
    try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return null; }
  };

  // ─── Build the right payload fields for each category ────────────────────────
  const buildPayload = (newCatPaid, newTotalPaid, isFullyCategoryPaid) => {
    const base = { ...student, paymentMode: fullMode, paymentDate: new Date().toISOString() };

    if (category === "SCHOOL") {
      return {
        ...base,
        schoolFeePaid: newCatPaid,
        paidAmount:    newTotalPaid,
        paymentStatus: newTotalPaid >= totalFees ? "PAID" : "PARTIAL",
      };
    }
    if (category === "TUITION") {
      return {
        ...base,
        tuitionFeePaid: newCatPaid,
        paidAmount:     newTotalPaid,
        paymentStatus:  newTotalPaid >= totalFees ? "PAID" : "PARTIAL",
      };
    }
    // FULL — when paying full fees, distribute to school+tuition proportionally
    // so that filtering by School Fee / Tuition Fee also shows them as paid.
    const isFullyPaid = newTotalPaid >= totalFees;
    const extraFields = {};
    if (isFullyPaid) {
      // Mark both sub-categories fully paid
      if (schoolFee > 0)  extraFields.schoolFeePaid  = schoolFee;
      if (tuitionFee > 0) extraFields.tuitionFeePaid = tuitionFee;
    } else {
      // Partial full payment: distribute proportionally across sub-fees
      // Priority: fill schoolFee first, then tuitionFee
      if (schoolFee > 0 || tuitionFee > 0) {
        const newSchoolPaid  = Math.min(schoolFee,  newTotalPaid);
        const newTuitionPaid = Math.min(tuitionFee, Math.max(0, newTotalPaid - newSchoolPaid));
        extraFields.schoolFeePaid  = newSchoolPaid;
        extraFields.tuitionFeePaid = newTuitionPaid;
      }
    }
    return {
      ...base,
      ...extraFields,
      paidAmount:    newTotalPaid,
      paymentStatus: isFullyPaid ? "PAID" : "PARTIAL",
    };
  };

  // ─── PUT helper ───────────────────────────────────────────────────────────────
  const apiUpdate = async (payload) => {
    const res = await fetch(`${API_URL}/api/finance/updateStudentFinance/${student.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // ─── FULL PAY ─────────────────────────────────────────────────────────────────
  const handleFullPay = async () => {
    setLoading(true); setError("");
    try {
      const addedAmt     = catRemaining;                         // paying off all remaining of this category
      const newCatPaid   = catPaid   + addedAmt;
      const newTotalPaid = livePaid  + addedAmt;

      await apiUpdate(buildPayload(newCatPaid, newTotalPaid, true));

      // optimistic updates
      if (category === "SCHOOL")       setLiveSchoolPaid(newCatPaid);
      else if (category === "TUITION") setLiveTuitionPaid(newCatPaid);
      else {
        // FULL: also update sub-category paid amounts
        if (newTotalPaid >= totalFees) {
          if (schoolFee > 0)  setLiveSchoolPaid(schoolFee);
          if (tuitionFee > 0) setLiveTuitionPaid(tuitionFee);
        } else {
          const newSchoolPaid  = Math.min(schoolFee,  newTotalPaid);
          const newTuitionPaid = Math.min(tuitionFee, Math.max(0, newTotalPaid - newSchoolPaid));
          setLiveSchoolPaid(newSchoolPaid);
          setLiveTuitionPaid(newTuitionPaid);
        }
      }
      setLivePaid(newTotalPaid);

      setFullDone(true);
      onPaymentDone(student.id, newTotalPaid, newTotalPaid >= totalFees ? "PAID" : "PARTIAL");
    } catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  // ─── CUSTOM PAY ──────────────────────────────────────────────────────────────
  const handleCustomPay = async () => {
    const amount = Number(customAmt);
    if (!amount || amount <= 0)         { setError("Enter a valid amount."); return; }
    if (amount > catRemaining)          { setError(`Amount cannot exceed remaining ₹${catRemaining.toLocaleString("en-IN")}.`); return; }

    setLoading(true); setError("");
    try {
      const newCatPaid   = catPaid  + amount;
      const newTotalPaid = livePaid + amount;

      await apiUpdate(buildPayload(newCatPaid, newTotalPaid, newCatPaid >= catTotal));

      if (category === "SCHOOL")       setLiveSchoolPaid(newCatPaid);
      else if (category === "TUITION") setLiveTuitionPaid(newCatPaid);
      else {
        // FULL: distribute to sub-categories
        if (newTotalPaid >= totalFees) {
          if (schoolFee > 0)  setLiveSchoolPaid(schoolFee);
          if (tuitionFee > 0) setLiveTuitionPaid(tuitionFee);
        } else {
          const newSchoolPaid  = Math.min(schoolFee,  newTotalPaid);
          const newTuitionPaid = Math.min(tuitionFee, Math.max(0, newTotalPaid - newSchoolPaid));
          setLiveSchoolPaid(newSchoolPaid);
          setLiveTuitionPaid(newTuitionPaid);
        }
      }
      setLivePaid(newTotalPaid);

      setCustomAmt(""); setFullDone(true);
      onPaymentDone(student.id, newTotalPaid, newTotalPaid >= totalFees ? "PAID" : "PARTIAL");
    } catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  // ─── EMI INSTALMENT PAY ───────────────────────────────────────────────────────
  const handleConfirmEmi = async (emi) => {
    setLoading(true); setError("");
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const updatedList = emiList.map(e =>
      e.id === emi.id ? { ...e, status: "paid", date: today, mode: modeInput } : e
    );
    const addedAmt     = emi.amount;
    const newCatPaid   = catPaid  + addedAmt;
    const newTotalPaid = livePaid + addedAmt;
    const allDone      = updatedList.every(e => e.status === "paid");

    try {
      const payload = {
        ...buildPayload(newCatPaid, newTotalPaid, allDone),
        paymentMode: modeInput,
      };
      await apiUpdate(payload);

      if (category === "SCHOOL")       setLiveSchoolPaid(newCatPaid);
      else if (category === "TUITION") setLiveTuitionPaid(newCatPaid);
      else {
        // FULL: distribute to sub-categories
        if (newTotalPaid >= totalFees) {
          if (schoolFee > 0)  setLiveSchoolPaid(schoolFee);
          if (tuitionFee > 0) setLiveTuitionPaid(tuitionFee);
        } else {
          const newSchoolPaid  = Math.min(schoolFee,  newTotalPaid);
          const newTuitionPaid = Math.min(tuitionFee, Math.max(0, newTotalPaid - newSchoolPaid));
          setLiveSchoolPaid(newSchoolPaid);
          setLiveTuitionPaid(newTuitionPaid);
        }
      }
      setLivePaid(newTotalPaid);

      setEmiList(updatedList);
      setConfirmId(null);
      onPaymentDone(student.id, newTotalPaid, newTotalPaid >= totalFees ? "PAID" : "PARTIAL");
    } catch (e) { setError(e.message || "Payment failed. Try again."); }
    finally { setLoading(false); }
  };

  // ─── Category label helpers ───────────────────────────────────────────────────
  const catLabel = category === "SCHOOL" ? "School Fee" : category === "TUITION" ? "Tuition Fee" : "Full Fee";
  const remainLabel = `₹${catRemaining.toLocaleString("en-IN")} ${catLabel} remaining`;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="pm-overlay" onClick={onClose}>
      <style>{STYLES}</style>
      <div className="pm-box" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="pm-head">
          <div className="pm-head-left">
            <div className="pm-head-ico"><CreditCard size={19} color="#fff" /></div>
            <div>
              <div className="pm-head-title">Fee Payment</div>
              <div className="pm-head-sub">{student.name} · {student.course}</div>
            </div>
          </div>
          <button className="pm-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* ── Body ── */}
        <div className="pm-body">

          {/* ── Category selector ── */}
          <div>
            <span className="pm-cat-label">Fee Category</span>
            <div className="pm-cat-wrap">
              <select
                className="pm-cat-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="FULL">Full Fee  (₹{totalFees.toLocaleString("en-IN")})</option>
                {schoolFee  > 0 && <option value="SCHOOL">School Fee  (₹{schoolFee.toLocaleString("en-IN")})</option>}
                {tuitionFee > 0 && <option value="TUITION">Tuition Fee  (₹{tuitionFee.toLocaleString("en-IN")})</option>}
              </select>
              <ChevronDown size={14} className="pm-cat-chevron" />
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="pm-cards">
            <div className="pm-card">
              <div className="pm-card-lbl">{catLabel}</div>
              <div className="pm-card-val">₹{catTotal.toLocaleString("en-IN")}</div>
            </div>
            <div className="pm-card">
              <div className="pm-card-lbl">Amount Paid</div>
              <div className="pm-card-val green">₹{(useEmi ? catPaid + emiPaid : (fullDone ? catTotal : catPaid)).toLocaleString("en-IN")}</div>
            </div>
            <div className="pm-card">
              <div className="pm-card-lbl">Pending</div>
              <div className={`pm-card-val ${(useEmi ? emiPending : (fullDone ? 0 : catRemaining)) > 0 ? "red" : "green"}`}>
                ₹{(useEmi ? emiPending : (fullDone ? 0 : catRemaining)).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div>
            <div className="pm-prog-row">
              <span>Payment progress — {catLabel}</span>
              <span>{progressPct}% paid</span>
            </div>
            <div className="pm-prog-track">
              <div className="pm-prog-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="pm-prog-hints">
              <span>₹0</span>
              <span>{catRemaining === 0 ? "✓ Fully Paid" : remainLabel}</span>
              <span>₹{catTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* ── Already paid ── */}
          {catRemaining === 0 && !fullDone && (
            <div className="pm-paid-banner">
              <CheckCircle size={26} color="#1a6e3e" />
              <div className="pm-paid-title">{catLabel} fully paid!</div>
            </div>
          )}

          {/* ── Method chooser ── */}
          {useEmi === null && !fullDone && catRemaining > 0 && (
            <div className="pm-methods">
              <div className="pm-methods-title">
                How would you like to pay <strong style={{ color: "#27435B" }}>₹{catRemaining.toLocaleString("en-IN")}</strong> for <strong style={{ color: "#27435B" }}>{catLabel}</strong>?
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

          {/* ── Full / Custom Pay Panel ── */}
          {useEmi === false && !fullDone && (
            <div className="pm-panel">
              <div className="pm-panel-back">
                <button onClick={() => setUseEmi(null)}>← Back</button>
              </div>
              <div className="pm-panel-inner">
                <div className="pm-panel-sec-lbl">Full Payment · {catLabel}</div>

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

                {/* Custom amount */}
                <div style={{ marginBottom: 4 }}>
                  <span className="pm-custom-lbl">Or enter a custom amount</span>
                  <input
                    className="pm-custom-inp"
                    type="number"
                    placeholder={`Max ₹${catRemaining.toLocaleString("en-IN")}`}
                    value={customAmt}
                    onChange={e => setCustomAmt(e.target.value)}
                  />
                </div>

                <button
                  className="pm-confirm-btn"
                  disabled={loading}
                  onClick={() => customAmt ? handleCustomPay() : handleFullPay()}
                >
                  {loading ? "Processing…" : customAmt
                    ? `Confirm ₹${Number(customAmt).toLocaleString("en-IN")} · ${catLabel}`
                    : `Confirm Full Payment — ₹${catRemaining.toLocaleString("en-IN")}`}
                </button>

                {error && <div className="pm-err">{error}</div>}
              </div>
            </div>
          )}

          {/* ── Full pay success ── */}
          {useEmi === false && fullDone && (
            <div className="pm-success">
              <CheckCircle size={28} color="#1a6e3e" />
              <div>
                <div className="pm-success-text">Payment Confirmed!</div>
                <div className="pm-success-sub">
                  {customAmt
                    ? `₹${Number(customAmt).toLocaleString("en-IN")} paid`
                    : `₹${catRemaining.toLocaleString("en-IN")} paid`} via {fullMode} · {catLabel}
                </div>
              </div>
            </div>
          )}

          {/* ── EMI panel ── */}
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

              {/* Category note */}
              <div style={{ fontSize: 11.5, color: "#4A6B80", background: "#f0f7fc", borderRadius: 8, padding: "8px 12px", border: "1px solid #d0e2ee" }}>
                <strong style={{ color: "#27435B" }}>EMI for: {catLabel}</strong> — ₹{catRemaining.toLocaleString("en-IN")} split into {emiCount} instalments.
                Payments will update <em>{category === "SCHOOL" ? "schoolFeePaid" : category === "TUITION" ? "tuitionFeePaid" : "paidAmount"}</em>.
              </div>

              <div className="pm-emi-table-wrap" style={{ overflowX: "auto" }}>
                <table className="pm-emi-tbl" style={{ minWidth: 420 }}>
                  <thead>
                    <tr>
                      {["Instalment", "Amount", "Date", "Mode", "Status", "Action"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {emiList.map((emi, i) => (
                      <tr key={emi.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ fontWeight: 600 }}>{emi.label}</td>
                        <td style={{ fontWeight: 700, color: "#27435B" }}>₹{emi.amount.toLocaleString("en-IN")}</td>
                        <td style={{ color: "#4A6B80", fontSize: 12 }}>{emi.date || "—"}</td>
                        <td>
                          {emi.mode
                            ? <span className="pm-badge pm-badge-mode" style={{ fontSize: 11 }}>{emi.mode}</span>
                            : <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          {emi.status === "paid"
                            ? <span className="pm-badge pm-badge-paid"><CheckCircle size={11} /> Paid</span>
                            : <span className="pm-badge pm-badge-pend"><Clock size={11} /> Pending</span>}
                        </td>
                        <td>
                          {emi.status === "paid" && <span style={{ color: "#A0B8C8", fontSize: 12 }}>—</span>}
                          {emi.status === "pending" && confirmId !== emi.id && (
                            <button className="pm-emi-pay-btn" onClick={() => setConfirmId(emi.id)}>Pay</button>
                          )}
                          {emi.status === "pending" && confirmId === emi.id && (
                            <div className="pm-emi-confirm-row">
                              <select className="pm-select" style={{ fontSize: 12, padding: "5px 8px" }} value={modeInput} onChange={e => setModeInput(e.target.value)}>
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
                      <td colSpan={2} style={{ color: "#1a6e3e", fontSize: 12 }}>Paid: ₹{emiPaid.toLocaleString("en-IN")}</td>
                      <td colSpan={2} style={{ color: emiPending > 0 ? "#a33030" : "#1a6e3e", fontSize: 12 }}>
                        {emiPending > 0 ? `Pending: ₹${emiPending.toLocaleString("en-IN")}` : "✓ Fully Paid"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {error && <div className="pm-err">{error}</div>}
            </>
          )}

          {/* ── Footer close ── */}
          <div className="pm-footer">
            <button className="pm-close-btn" onClick={onClose}>Close</button>
          </div>

        </div>{/* end body */}
      </div>
    </div>
  );
}