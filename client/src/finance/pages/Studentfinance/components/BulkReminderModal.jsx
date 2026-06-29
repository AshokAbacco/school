// BulkReminderModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this file alongside Studentfinance.jsx and import it:
//   import BulkReminderModal from "./BulkReminderModal";
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from "react";
import { FaWhatsapp, FaPhone } from "react-icons/fa";
import { X, CalendarDays, Clock, Send, Zap, CheckCircle, AlertCircle, Loader } from "lucide-react";

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
  const foundCustom   = new Map(); // label → true

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

// ── Pending calculator (mirrors backend) ─────────────────────────────────────
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

// ── Scheduled jobs list sub-component ────────────────────────────────────────
function ScheduledJobsList({ jobs, onCancel, loading }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: "#4A6B80", fontSize: 13 }}>
      <Loader size={16} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 6 }} />
      Loading jobs...
    </div>
  );

  if (!jobs.length) return (
    <div style={{ textAlign: "center", padding: "16px 0", color: "#4A6B80", fontSize: 13 }}>
      No scheduled reminders yet.
    </div>
  );

  const STATUS_STYLE = {
    PENDING:    { color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" },
    SENT:       { color: "#1a6e3e", background: "#edf7f1", border: "1px solid #b2dfc6" },
    FAILED:     { color: "#a33030", background: "#fdf0f0", border: "1px solid #f5c2c2" },
    CANCELLED:  { color: "#4A6B80", background: "#f0f4f8", border: "1px solid #cbd5e1" },
    PROCESSING: { color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe" },
  };

  const CAT_LABEL = {
    ALL: "All Remaining", SCHOOL: "School Fee", TUITION: "Tuition Fee",
    EXAM: "Exam Fee", TRANSPORT: "Transport Fee", BOOKS: "Books Fee",
    LAB: "Lab Fee", MISC: "Misc Fee",
  };

  return (
    <div style={{ maxHeight: 240, overflowY: "auto" }}>
      {jobs.map(job => {
        const catLabel = job.feeCategory.startsWith("CUSTOM__")
          ? job.feeCategory.replace("CUSTOM__", "") + " (Custom)"
          : (CAT_LABEL[job.feeCategory] || job.feeCategory);

        const st = STATUS_STYLE[job.status] || STATUS_STYLE.PENDING;

        return (
          <div key={job.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", borderBottom: "1px solid #e0eef6",
            gap: 10, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1C3044", fontFamily: "'DM Sans',sans-serif" }}>
                  {catLabel}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, ...st }}>
                  {job.status}
                </span>
                {job.channel === "whatsapp"
                  ? <FaWhatsapp size={13} color="#25D366" />
                  : <FaPhone    size={12} color="#2563eb" />}
              </div>
              <div style={{ fontSize: 11, color: "#4A6B80", fontFamily: "'DM Sans',sans-serif" }}>
                📅 {new Date(job.scheduledAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
                {job.status === "SENT" && ` • ✅ ${job.sentCount} sent, ${job.skippedCount} skipped`}
                {job.status === "FAILED" && job.errorMessage && ` • ⚠ ${job.errorMessage}`}
              </div>
            </div>
            {job.status === "PENDING" && (
              <button
                onClick={() => onCancel(job.id)}
                style={{
                  fontSize: 11, fontWeight: 600, color: "#a33030",
                  background: "#fdf0f0", border: "1px solid #f5c2c2",
                  borderRadius: 7, padding: "4px 10px", cursor: "pointer",
                  fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
                }}
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
  const [sendMode,    setSendMode]     = useState("now"); // "now" | "schedule"
  const [schedDate,   setSchedDate]   = useState("");
  const [schedTime,   setSchedTime]   = useState("09:00");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null); // { sent, skipped, failed } | { scheduled: true }
  const [jobs,        setJobs]        = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [activeTab,   setActiveTab]   = useState("send"); // "send" | "jobs"

  const token = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("auth"))?.token; } catch { return ""; }
  }, []);

  const categoryOptions = useMemo(() => buildCategoryOptions(students), [students]);

  // Live preview
  const previewCount   = useMemo(() => students.filter(s => getPendingAmount(s, feeCategory) > 0).length, [students, feeCategory]);
  const previewPending = useMemo(() => students.reduce((sum, s) => sum + getPendingAmount(s, feeCategory), 0), [students, feeCategory]);

  // Load jobs when jobs tab is opened
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

  const catLabel = categoryOptions.find(o => o.value === feeCategory)?.label || "All Remaining";

  // ── min date/time for schedule picker ───────────────────────────────────────
  const nowLocal  = new Date();
  const minDate   = nowLocal.toLocaleDateString("en-CA");
  const minTime   = schedDate === minDate
    ? `${String(nowLocal.getHours()).padStart(2,"0")}:${String(nowLocal.getMinutes()).padStart(2,"0")}`
    : "00:00";

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16,
    },
    modal: {
      background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460,
      overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.28)",
      animation: "invUp .25s ease", fontFamily: "'DM Sans',sans-serif",
    },
    header: {
      background: "linear-gradient(135deg,#1C3044,#27435B)",
      padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    label: { fontSize: 12, fontWeight: 700, color: "#4A6B80", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: ".6px" },
    select: {
      width: "100%", padding: "9px 12px", borderRadius: 10,
      border: "1.5px solid #d0e2ee", fontSize: 13, fontWeight: 600,
      color: "#1C3044", background: "#fff", outline: "none", cursor: "pointer",
      fontFamily: "'DM Sans',sans-serif",
    },
    modeBtn: (active) => ({
      flex: 1, padding: "9px 0", borderRadius: 10, border: active ? "none" : "1.5px solid #d0e2ee",
      fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
      background: active ? "linear-gradient(135deg,#1C3044,#27435B)" : "#fff",
      color: active ? "#fff" : "#4A6B80", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 6, transition: "all .15s",
    }),
    tab: (active) => ({
      flex: 1, padding: "9px 0", borderBottom: active ? "2.5px solid #1C3044" : "2.5px solid transparent",
      fontWeight: 700, fontSize: 13, cursor: "pointer", background: "none", border: "none",
      borderBottom: active ? "2.5px solid #1C3044" : "2.5px solid transparent",
      color: active ? "#1C3044" : "#4A6B80", fontFamily: "'DM Sans',sans-serif",
    }),
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={18} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Bulk Fee Reminder</div>
              <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12 }}>WhatsApp &amp; Voice</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e0eef6" }}>
          <button style={S.tab(activeTab === "send")} onClick={() => setActiveTab("send")}>Send Reminder</button>
          <button style={S.tab(activeTab === "jobs")} onClick={() => setActiveTab("jobs")}>Scheduled Jobs</button>
        </div>

        {/* ── SEND TAB ── */}
        {activeTab === "send" && (
          <div style={{ padding: "20px 22px" }}>

            {/* Result banner */}
            {result && (
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 16,
                display: "flex", alignItems: "flex-start", gap: 10,
                background: result.type === "error" ? "#fdf0f0" : "#edf7f1",
                border: `1px solid ${result.type === "error" ? "#f5c2c2" : "#b2dfc6"}`,
              }}>
                {result.type === "error"
                  ? <AlertCircle size={16} color="#a33030" style={{ marginTop: 1, flexShrink: 0 }} />
                  : <CheckCircle size={16} color="#1a6e3e" style={{ marginTop: 1, flexShrink: 0 }} />}
                <div style={{ fontSize: 13, color: result.type === "error" ? "#a33030" : "#1a6e3e", fontWeight: 600 }}>
                  {result.type === "sent"      && `✅ Sent to ${result.sent} student(s). ${result.skipped} skipped, ${result.failed} failed.`}
                  {result.type === "scheduled" && `✅ Scheduled! Will send to ~${result.targetCount} student(s).`}
                  {result.type === "error"     && `❌ ${result.message}`}
                </div>
              </div>
            )}

            {/* Fee Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Fee Category</label>
              <select value={feeCategory} onChange={e => { setFeeCategory(e.target.value); setResult(null); }} style={S.select}>
                {categoryOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Channel */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)} style={S.select}>
                <option value="whatsapp">📲 WhatsApp</option>
                <option value="voice">📞 Voice Call</option>
              </select>
            </div>

            {/* Send Mode */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Send Mode</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={S.modeBtn(sendMode === "now")}      onClick={() => setSendMode("now")}>
                  <Zap size={14} /> Send Now
                </button>
                <button style={S.modeBtn(sendMode === "schedule")} onClick={() => setSendMode("schedule")}>
                  <CalendarDays size={14} /> Schedule
                </button>
              </div>
            </div>

            {/* Date + Time (only when scheduled) */}
            {sendMode === "schedule" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Date</label>
                  <input
                    type="date" value={schedDate} min={minDate}
                    onChange={e => setSchedDate(e.target.value)}
                    style={{ ...S.select, padding: "8px 12px" }}
                  />
                </div>
                <div>
                  <label style={S.label}>Time</label>
                  <input
                    type="time" value={schedTime} min={schedDate === minDate ? minTime : undefined}
                    onChange={e => setSchedTime(e.target.value)}
                    style={{ ...S.select, padding: "8px 12px" }}
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            <div style={{
              background: previewCount > 0 ? "linear-gradient(135deg,#edf4f9,#e0eef6)" : "#f8fafb",
              border: `1px solid ${previewCount > 0 ? "#c5dced" : "#e0e0e0"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 18,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".5px" }}>Preview</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1C3044", lineHeight: 1.2, marginTop: 2 }}>
                  {previewCount}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#4A6B80", marginLeft: 6 }}>students</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4A6B80", textTransform: "uppercase", letterSpacing: ".5px" }}>Total Pending</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1C3044", lineHeight: 1.2, marginTop: 2 }}>
                  ₹{previewPending.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Template preview */}
            <div style={{ background: "#f0f9f4", border: "1px solid #b2dfc6", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 12, color: "#2E4F6B", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: "#4A6B80", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Message Preview</div>
              Dear Parent,<br />
              This is a reminder that the fee payment of <strong>₹[amount]</strong> for your child <strong>[name]</strong> is still pending.<br />
              Please make the payment at the earliest to avoid any inconvenience.<br />
              School: <strong>[school name]</strong><br />
              Thank you
            </div>

            {/* Footer buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1.5px solid #d0d5dd", background: "#fff", fontSize: 13, fontWeight: 700, color: "#4A6B80", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={loading || previewCount === 0}
                style={{
                  flex: 2, padding: "11px", borderRadius: 11, border: "none",
                  background: previewCount === 0 ? "#c5d5e0" : "linear-gradient(135deg,#1C3044,#27435B)",
                  fontSize: 13, fontWeight: 700, color: "#fff", cursor: previewCount === 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.8 : 1,
                }}
              >
                {loading
                  ? <><Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> {sendMode === "now" ? "Sending..." : "Scheduling..."}</>
                  : sendMode === "now"
                    ? <><Send size={14} /> Send Now to {previewCount} Students</>
                    : <><CalendarDays size={14} /> Schedule Reminder</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {activeTab === "jobs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 16px 0" }}>
              <button
                onClick={fetchJobs}
                style={{ fontSize: 12, fontWeight: 600, color: "#27435B", background: "#edf4f9", border: "1px solid #c5dced", borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}
              >
                Refresh
              </button>
            </div>
            <ScheduledJobsList jobs={jobs} onCancel={handleCancel} loading={jobsLoading} />
            <div style={{ padding: "14px 22px" }}>
              <button
                onClick={onClose}
                style={{ width: "100%", padding: "11px", borderRadius: 11, border: "1.5px solid #d0d5dd", background: "#fff", fontSize: 13, fontWeight: 700, color: "#4A6B80", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
      <style>{`
        @keyframes invUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}