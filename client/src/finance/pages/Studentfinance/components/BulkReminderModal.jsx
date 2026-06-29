// BulkReminderModal.jsx  — fully responsive (Tailwind CSS)
// ─────────────────────────────────────────────────────────────────────────────
// Drop this file alongside Studentfinance.jsx and import it:
//   import BulkReminderModal from "./BulkReminderModal";
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import { FaWhatsapp, FaPhone } from "react-icons/fa";
import {
  X, CalendarDays, Clock, Send, Zap,
  CheckCircle, AlertCircle, Loader, RefreshCw,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// ── Build dropdown options from actual student data ───────────────────────────
function buildCategoryOptions(students) {
  const options = [{ value: "ALL", label: "All Remaining" }];

  const STANDARD_MAP = {
    collegeFee:   { value: "SCHOOL",    label: "School Fee" },
    tuitionFee:   { value: "TUITION",   label: "Tuition Fee" },
    examFee:      { value: "EXAM",      label: "Exam Fee" },
    transportFee: { value: "TRANSPORT", label: "Transport Fee" },
    booksFee:     { value: "BOOKS",     label: "Books Fee" },
    labFee:       { value: "LAB",       label: "Lab Fee" },
    miscFee:      { value: "MISC",      label: "Miscellaneous" },
  };

  const foundStandard = new Set();
  const foundCustom   = new Map();

  for (const s of students) {
    let bd = {};
    try { bd = JSON.parse(s.feeBreakdown || "{}"); } catch {}

    for (const [key] of Object.entries(STANDARD_MAP)) {
      const e = bd[key];
      const amt = e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
      if (amt > 0) foundStandard.add(key);
    }

    if (Array.isArray(bd.customFees)) {
      bd.customFees.forEach(c => {
        const amt   = Number(c.amount || c.total || 0);
        const label = c.label || c.name || "";
        if (amt > 0 && label) foundCustom.set(label, true);
      });
    }
  }

  for (const [key, opt] of Object.entries(STANDARD_MAP)) {
    if (foundStandard.has(key)) options.push(opt);
  }

  for (const [label] of foundCustom) {
    options.push({ value: `CUSTOM__${label}`, label: `${label} (Custom)` });
  }

  return options;
}

// ── Pending calculator ────────────────────────────────────────────────────────
function getPendingAmount(student, feeCategory) {
  let bd = {};
  try { bd = JSON.parse(student.feeBreakdown || "{}"); } catch {}

  const getTotal = (key) => {
    const e = bd[key];
    return e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
  };

  if (feeCategory === "ALL")       return Math.max(0, Number(student.fees || 0) - Number(student.paidAmount    || 0));
  if (feeCategory === "SCHOOL")    return Math.max(0, getTotal("collegeFee")     - Number(student.schoolFeePaid    || 0));
  if (feeCategory === "TUITION")   return Math.max(0, getTotal("tuitionFee")     - Number(student.tuitionFeePaid   || 0));
  if (feeCategory === "EXAM")      return Math.max(0, getTotal("examFee")        - Number(student.examFeePaid      || 0));
  if (feeCategory === "TRANSPORT") return Math.max(0, getTotal("transportFee")   - Number(student.transportFeePaid || 0));
  if (feeCategory === "BOOKS")     return Math.max(0, getTotal("booksFee")       - Number(student.booksFeePaid     || 0));
  if (feeCategory === "LAB")       return Math.max(0, getTotal("labFee")         - Number(student.labFeePaid       || 0));
  if (feeCategory === "MISC")      return Math.max(0, getTotal("miscFee")        - Number(student.miscFeePaid      || 0));

  if (feeCategory.startsWith("CUSTOM__")) {
    const label   = feeCategory.replace("CUSTOM__", "");
    const customs = Array.isArray(bd.customFees) ? bd.customFees : [];
    const match   = customs.find(c => (c.label || c.name || "") === label);
    return Math.max(0, Number(match?.amount || match?.total || 0));
  }

  return 0;
}

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_CLS = {
  PENDING:    "text-amber-800 bg-amber-50 border border-amber-200",
  SENT:       "text-green-800 bg-green-50  border border-green-200",
  FAILED:     "text-red-700   bg-red-50    border border-red-200",
  CANCELLED:  "text-slate-600 bg-slate-100 border border-slate-200",
  PROCESSING: "text-blue-700  bg-blue-50   border border-blue-200",
};

const CAT_LABEL = {
  ALL: "All Remaining", SCHOOL: "School Fee", TUITION: "Tuition Fee",
  EXAM: "Exam Fee", TRANSPORT: "Transport Fee", BOOKS: "Books Fee",
  LAB: "Lab Fee", MISC: "Misc Fee",
};

// ── Scheduled Jobs List ───────────────────────────────────────────────────────
function ScheduledJobsList({ jobs, onCancel, loading }) {
  if (loading) return (
    <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
      <Loader size={16} className="animate-spin" />
      Loading jobs...
    </div>
  );

  if (!jobs.length) return (
    <div className="text-center py-8 text-slate-400 text-sm">
      No scheduled reminders yet.
    </div>
  );

  return (
    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
      {jobs.map(job => {
        const catLabel = job.feeCategory.startsWith("CUSTOM__")
          ? job.feeCategory.replace("CUSTOM__", "") + " (Custom)"
          : (CAT_LABEL[job.feeCategory] || job.feeCategory);

        const statusCls = STATUS_CLS[job.status] || STATUS_CLS.PENDING;

        return (
          <div key={job.id} className="flex items-start justify-between gap-3 px-4 py-3 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#1C3044] truncate">{catLabel}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>
                  {job.status}
                </span>
                {job.channel === "whatsapp"
                  ? <FaWhatsapp size={13} color="#25D366" />
                  : <FaPhone    size={12} color="#2563eb" />}
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed">
                📅 {new Date(job.scheduledAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                {job.status === "SENT"   && ` • ✅ ${job.sentCount} sent, ${job.skippedCount} skipped`}
                {job.status === "FAILED" && job.errorMessage && ` • ⚠ ${job.errorMessage}`}
              </div>
            </div>
            {job.status === "PENDING" && (
              <button
                onClick={() => onCancel(job.id)}
                className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-red-100 transition-colors whitespace-nowrap mt-0.5"
              >
                Cancel
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN MODAL ────────────────────────────────────────────────────────────────
export default function BulkReminderModal({ students, onClose }) {
  const [feeCategory, setFeeCategory] = useState("ALL");
  const [channel,     setChannel]     = useState("whatsapp");
  const [sendMode,    setSendMode]    = useState("now");
  const [schedDate,   setSchedDate]  = useState("");
  const [schedTime,   setSchedTime]  = useState("09:00");
  const [loading,     setLoading]    = useState(false);
  const [result,      setResult]     = useState(null);
  const [jobs,        setJobs]       = useState([]);
  const [jobsLoading, setJobsLoading]= useState(false);
  const [activeTab,   setActiveTab]  = useState("send");

  const token = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return ""; }
  }, []);

  const categoryOptions = useMemo(() => buildCategoryOptions(students), [students]);

  const previewCount   = useMemo(() => students.filter(s => getPendingAmount(s, feeCategory) > 0).length, [students, feeCategory]);
  const previewPending = useMemo(() => students.reduce((sum, s) => sum + getPendingAmount(s, feeCategory), 0), [students, feeCategory]);

  useEffect(() => {
    if (activeTab === "jobs") fetchJobs();
  }, [activeTab]);

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/finance/scheduledReminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {}
    setJobsLoading(false);
  };

  const handleSend = async () => {
    if (previewCount === 0) return;
    setLoading(true);
    setResult(null);

    try {
      if (sendMode === "now") {
        const res  = await fetch(`${API_URL}/api/finance/sendBulkReminderNow`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ feeCategory, channel }),
        });
        const data = await res.json();
        if (data.success) setResult({ type: "sent", sent: data.sent, skipped: data.skipped, failed: data.failed });
        else              setResult({ type: "error", message: data.message });
      } else {
        if (!schedDate || !schedTime) { alert("Please select date and time."); setLoading(false); return; }
        const scheduledAt = new Date(`${schedDate}T${schedTime}:00`).toISOString();
        const res  = await fetch(`${API_URL}/api/finance/scheduleBulkReminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ feeCategory, channel, scheduledAt }),
        });
        const data = await res.json();
        if (data.success) setResult({ type: "scheduled", targetCount: data.targetCount });
        else              setResult({ type: "error", message: data.message });
      }
    } catch (err) {
      setResult({ type: "error", message: err.message });
    }

    setLoading(false);
  };

  const handleCancel = async (jobId) => {
    if (!window.confirm("Cancel this scheduled reminder?")) return;
    try {
      await fetch(`${API_URL}/api/finance/scheduledReminder/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchJobs();
    } catch {}
  };

  const nowLocal = new Date();
  const minDate  = nowLocal.toLocaleDateString("en-CA");
  const minTime  = schedDate === minDate
    ? `${String(nowLocal.getHours()).padStart(2,"0")}:${String(nowLocal.getMinutes()).padStart(2,"0")}`
    : "00:00";

  // ── shared input class ───────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-[#1C3044] bg-white outline-none focus:border-[#27435B] focus:ring-2 focus:ring-[#1C3044]/10 transition cursor-pointer";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
      
    >
      {/*
        Mobile  → slides up from bottom, full-width, rounded top corners
        Tablet+ → centered dialog, max-w-md, fully rounded
      */}
      <div
        className="
          bg-white w-full
          rounded-t-2xl sm:rounded-2xl
          max-h-[92dvh] sm:max-h-[90vh]
          sm:max-w-md
          flex flex-col
          shadow-2xl
          animate-slideUp
          overflow-hidden
        "
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 bg-gradient-to-br from-[#1C3044] to-[#27435B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Send size={17} color="#fff" />
            </div>
            <div>
              <p className="text-white font-bold text-[15px] leading-tight">Bulk Fee Reminder</p>
              <p className="text-white/60 text-[12px]">WhatsApp &amp; Voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-100 shrink-0">
          {["send", "jobs"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[13px] font-bold transition-colors
                ${activeTab === tab
                  ? "text-[#1C3044] border-b-2 border-[#1C3044]"
                  : "text-slate-400 border-b-2 border-transparent hover:text-slate-600"
                }`}
            >
              {tab === "send" ? "Send Reminder" : "Scheduled Jobs"}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ SEND TAB ══ */}
          {activeTab === "send" && (
            <div className="px-4 sm:px-5 py-4 space-y-4">

              {/* Result banner */}
              {result && (
                <div className={`flex items-start gap-3 p-3 rounded-xl border text-[13px] font-semibold
                  ${result.type === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-800"
                  }`}
                >
                  {result.type === "error"
                    ? <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    : <CheckCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>
                    {result.type === "sent"      && `✅ Sent to ${result.sent} student(s). ${result.skipped} skipped, ${result.failed} failed.`}
                    {result.type === "scheduled" && `✅ Scheduled! Will send to ~${result.targetCount} student(s).`}
                    {result.type === "error"     && `❌ ${result.message}`}
                  </span>
                </div>
              )}

              {/* Fee Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Fee Category
                </label>
                <select
                  value={feeCategory}
                  onChange={e => { setFeeCategory(e.target.value); setResult(null); }}
                  className={inputCls}
                >
                  {categoryOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={e => setChannel(e.target.value)}
                  className={inputCls}
                >
                  <option value="whatsapp">📲 WhatsApp</option>
                  {/* <option value="voice">📞 Voice Call</option> */}
                </select>
              </div>

              {/* Send Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Send Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: "now",      icon: <Zap size={14} />,          label: "Send Now"  },
                    { mode: "schedule", icon: <CalendarDays size={14} />, label: "Schedule"  },
                  ].map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setSendMode(mode)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all
                        ${sendMode === mode
                          ? "bg-gradient-to-br from-[#1C3044] to-[#27435B] text-white border-transparent shadow"
                          : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Time (schedule mode only) */}
              {sendMode === "schedule" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={schedDate}
                      min={minDate}
                      onChange={e => setSchedDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Time
                    </label>
                    <input
                      type="time"
                      value={schedTime}
                      min={schedDate === minDate ? minTime : undefined}
                      onChange={e => setSchedTime(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Preview card */}
              <div className={`rounded-xl border p-3 sm:p-4 flex items-center justify-between gap-3
                ${previewCount > 0
                  ? "bg-gradient-to-br from-[#edf4f9] to-[#e0eef6] border-[#c5dced]"
                  : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Preview</p>
                  <p className="text-2xl font-extrabold text-[#1C3044] leading-tight mt-0.5">
                    {previewCount}
                    <span className="text-[13px] font-semibold text-slate-500 ml-1.5">students</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Pending</p>
                  <p className="text-xl font-extrabold text-[#1C3044] leading-tight mt-0.5">
                    ₹{previewPending.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Message preview */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-[12px] text-[#2E4F6B] leading-relaxed">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Message Preview</p>
                Dear Parent,<br />
                This is a reminder that the fee payment of <strong>₹[amount]</strong> for your child <strong>[name]</strong> is still pending.<br />
                Please make the payment at the earliest to avoid any inconvenience.<br />
                School: <strong>[school name]</strong><br />
                Thank you
              </div>

            </div>
          )}

          {/* ══ JOBS TAB ══ */}
          {activeTab === "jobs" && (
            <div className="py-2">
              <div className="flex justify-end px-4 pt-2 pb-1">
                <button
                  onClick={fetchJobs}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-[#27435B] bg-[#edf4f9] border border-[#c5dced] rounded-lg px-3 py-1.5 hover:bg-[#deeaf3] transition"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              <ScheduledJobsList jobs={jobs} onCancel={handleCancel} loading={jobsLoading} />
            </div>
          )}

        </div>

        {/* ── Sticky Footer Buttons ── */}
        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 bg-white shrink-0">
          {activeTab === "send" ? (
            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={loading || previewCount === 0}
                className={`flex-[2] py-3 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition
                  ${previewCount === 0
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-br from-[#1C3044] to-[#27435B] hover:opacity-90 cursor-pointer"
                  } ${loading ? "opacity-75" : ""}`}
              >
                {loading
                  ? <><Loader size={14} className="animate-spin" />{sendMode === "now" ? "Sending..." : "Scheduling..."}</>
                  : sendMode === "now"
                    ? <><Send size={14} />Send Now to {previewCount} Students</>
                    : <><CalendarDays size={14} />Schedule Reminder</>
                }
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              Close
            </button>
          )}
        </div>

      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-slideUp { animation: slideUp .25s ease; }
      `}</style>
    </div>
  );
}