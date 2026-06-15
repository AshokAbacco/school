// client/src/pages/payroll/AttendanceCorrections.jsx
// Super Admin reviews and corrects teacher attendance records
import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronDown, CheckCircle, Clock, AlertTriangle,
  XCircle, Eye, ChevronLeft, ChevronRight, History, Edit3,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const token = () => { try { const a = localStorage.getItem("auth"); return a ? JSON.parse(a).token : null; } catch { return null; } };

const STATUS_CONFIG = {
  PRESENT:       { label: "Present",       color: "bg-green-100 text-green-700",   icon: CheckCircle },
  ABSENT:        { label: "Absent",        color: "bg-red-100 text-red-700",       icon: XCircle },
  HALF_DAY:      { label: "Half Day",      color: "bg-yellow-100 text-yellow-700", icon: Clock },
  LATE:          { label: "Late",          color: "bg-orange-100 text-orange-700", icon: Clock },
  MISSING_PUNCH: { label: "Missing Punch", color: "bg-purple-100 text-purple-700", icon: AlertTriangle },
  HOLIDAY:       { label: "Holiday",       color: "bg-blue-100 text-blue-700",     icon: CheckCircle },
  ON_LEAVE:      { label: "On Leave",      color: "bg-teal-100 text-teal-700",     icon: Clock },
};

const StatusBadge = ({ status, isLate, isLateExcused }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ABSENT;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
      {isLate && !isLateExcused && <span className="ml-1 text-[10px] opacity-70">(Late)</span>}
      {isLate && isLateExcused && <span className="ml-1 text-[10px] opacity-70">(Excused)</span>}
    </span>
  );
};

const fmtTime = (dt) => {
  if (!dt) return "—";
  const d = new Date(dt);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  console.log(`[fmtTime] raw=${dt} utc=${d.toISOString()} ist=${ist.toISOString()}`);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const fmtDate = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMins = (m) => {
  if (m == null) return "—";
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
};

// ── Correction Modal ──────────────────────────────────────────────────────────
function CorrectionModal({ record, onClose, onSuccess }) {
  const [action, setAction] = useState("APPROVE_PRESENT");
  const [reason, setReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newFirstPunch, setNewFirstPunch] = useState("");
  const [newLastPunch, setNewLastPunch] = useState("");
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [leaveReason, setLeaveReason] = useState("");
  const [isLeaveDeducted, setIsLeaveDeducted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!record) return null;

  const ACTIONS = [
    { value: "APPROVE_PRESENT",        label: "✅ Approve as Present" },
    { value: "MARK_LATE",              label: "🕐 Mark as Late" },
    { value: "MARK_HALF_DAY",          label: "⏰ Mark as Half Day" },
    { value: "MARK_ABSENT",            label: "❌ Mark as Absent" },
    { value: "MARK_ON_LEAVE",          label: "🏖️ Mark as On Leave" },
    { value: "EXCUSE_LATE",            label: "🟢 Excuse Late Arrival" },
    { value: "UPDATE_IN_TIME",         label: "✏️ Update In Time" },
    { value: "UPDATE_OUT_TIME",        label: "✏️ Update Out Time" },
    { value: "UPDATE_STATUS",          label: "🔄 Update Status" },
    { value: "MISSING_PUNCH_REVIEWED", label: "👁 Mark Missing Punch Reviewed" },
  ];

  const apply = async () => {
    setSaving(true); setError(null);
    try {
      const body = { action, reason };
      if (action === "UPDATE_STATUS")          body.newStatus = newStatus;
      if (action === "UPDATE_IN_TIME")         body.newFirstPunch = newFirstPunch;
      if (action === "UPDATE_OUT_TIME")        body.newLastPunch = newLastPunch;
      if (action === "MISSING_PUNCH_REVIEWED" && newStatus) body.newStatus = newStatus;
      if (action === "MARK_ON_LEAVE") {
        body.leaveType       = leaveType;
        body.leaveReason     = leaveReason || reason;
        body.isLeaveDeducted = isLeaveDeducted;
      }

      const res = await fetch(`${API}/api/payroll/corrections/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Apply Correction</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {record.teacherName} · {fmtDate(record.date)}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Current state */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Current Status</span>
              <StatusBadge status={record.status} isLate={record.isLate} isLateExcused={record.isLateExcused} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">First Punch</span>
              <span className="font-mono text-gray-700">{fmtTime(record.firstPunch)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Punch</span>
              <span className="font-mono text-gray-700">{fmtTime(record.lastPunch)}</span>
            </div>
          </div>

          {/* Action selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* ON_LEAVE fields */}
          {action === "MARK_ON_LEAVE" && (
            <div className="space-y-3 bg-teal-50 border border-teal-100 rounded-xl p-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Reason</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Medical appointment, Family emergency..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
              {/* Salary deduction toggle — key admin power */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Salary Deduction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsLeaveDeducted(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      !isLeaveDeducted
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ✅ Paid Leave — No Deduction
                  </button>
                  <button
                    onClick={() => setIsLeaveDeducted(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      isLeaveDeducted
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ❌ Unpaid Leave — Deduct
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {isLeaveDeducted
                    ? "Salary will be deducted for this leave day."
                    : "No salary deduction — this is a paid leave day."}
                </p>
              </div>
            </div>
          )}

          {/* UPDATE_STATUS fields */}
          {action === "UPDATE_STATUS" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          )}

          {action === "UPDATE_IN_TIME" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New In Time</label>
              <input
                type="datetime-local"
                value={newFirstPunch}
                onChange={(e) => setNewFirstPunch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {action === "UPDATE_OUT_TIME" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Out Time</label>
              <input
                type="datetime-local"
                value={newLastPunch}
                onChange={(e) => setNewLastPunch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {action === "MISSING_PUNCH_REVIEWED" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Resolve as (optional)</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Keep as Missing Punch</option>
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
              </select>
            </div>
          )}

          {/* Reason (always shown except ON_LEAVE which has its own reason field) */}
          {action !== "MARK_ON_LEAVE" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason <span className="font-normal text-gray-400">(for audit log)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Optional reason for this correction..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={saving}
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-50"
          >
            {saving ? "Applying..." : "Apply Correction"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit History Modal ───────────────────────────────────────────────────────
function AuditModal({ attendanceId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payroll/corrections/${attendanceId}/history`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setLogs(d.data))
      .finally(() => setLoading(false));
  }, [attendanceId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <History size={18} className="text-gray-500" />
            Audit History
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No corrections recorded.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-700">{log.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.performedAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {log.previousStatus && log.newStatus && log.previousStatus !== log.newStatus && (
                    <p className="text-xs text-gray-500">
                      {log.previousStatus} → <strong className="text-gray-700">{log.newStatus}</strong>
                    </p>
                  )}
                  {log.reason && <p className="text-xs text-gray-500 mt-1 italic">"{log.reason}"</p>}
                  <p className="text-xs text-gray-400 mt-1">By: {log.performedBy?.name || "System"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayIST = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceCorrections({ defaultSchoolId, schools = [] }) {
  const now = new Date();

  // View mode: "day" (default, fast) | "month" (full month, opt-in)
  const [viewMode, setViewMode]       = useState("day");

  const [schoolId, setSchoolId]       = useState(defaultSchoolId || "");
  const [date, setDate]               = useState(todayIST());        // single date for day view
  const [month, setMonth]             = useState(now.getMonth() + 1);
  const [year, setYear]               = useState(now.getFullYear());
  const [status, setStatus]           = useState("ALL");
  const [records, setRecords]         = useState([]);
  const [meta, setMeta]               = useState({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [auditId, setAuditId]         = useState(null);
  const [markingHoliday, setMarkingHoliday] = useState(false);

  // Sync when parent resolves schoolId after async fetch
  useEffect(() => {
    if (defaultSchoolId && defaultSchoolId !== schoolId) {
      setSchoolId(defaultSchoolId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSchoolId]);

  const switchViewMode = (mode) => { setViewMode(mode); setPage(1); };

  const fetch_ = useCallback(() => {
    if (!schoolId) return;
    setLoading(true);

    const params = new URLSearchParams({ schoolId, status, page, limit: 25 });
    if (viewMode === "day") {
      params.set("date", date);
    } else {
      params.set("month", month);
      params.set("year", year);
    }

    const url = `${API}/api/payroll/corrections?${params}`;
    console.log("[AttendanceCorrections] Fetching:", url);
    fetch(url, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setRecords(d.data); setMeta(d.meta); }
        else console.error("[AttendanceCorrections] API error:", d.message);
      })
      .catch((err) => console.error("[AttendanceCorrections] Fetch failed:", err))
      .finally(() => setLoading(false));
  }, [schoolId, viewMode, date, month, year, status, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Prev / Next day navigation
  const prevDay = () => {
    const d = new Date(date + "T12:00:00+05:30");
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
    setPage(1);
  };
  const nextDay = () => {
    const d = new Date(date + "T12:00:00+05:30");
    d.setDate(d.getDate() + 1);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayIST()) { setDate(next); setPage(1); }
  };

  // Mark entire day as school holiday for all teachers
  const markSchoolHoliday = async () => {
    if (!window.confirm(`Mark ${date} as a School Holiday for ALL teachers? Everyone's status will change to HOLIDAY with no salary deduction.`)) return;
    setMarkingHoliday(true);
    try {
      const res = await fetch(`${API}/api/payroll/corrections/mark-school-holiday`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ schoolId, dateStr: date, reason: "School holiday marked by admin" }),
      });
      const d = await res.json();
      if (d.success) { alert(d.message); fetch_(); }
      else alert(`Error: ${d.message}`);
    } catch (e) {
      alert("Failed: " + e.message);
    } finally {
      setMarkingHoliday(false);
    }
  };

  // Reprocess single record from biometric raw data
  const reprocess = async (r) => {
    const dateStr = new Date(r.date).toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API}/api/payroll/corrections/reprocess-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ schoolId, teacherId: r.teacherId, dateStr }),
      });
      const d = await res.json();
      if (d.success) {
        alert(`Reprocessed! New status: ${d.data?.status} | worked: ${d.data?.workedMinutes}min`);
        fetch_();
      } else {
        alert(`Error: ${d.message}`);
      }
    } catch (e) {
      alert("Reprocess failed: " + e.message);
    }
  };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const YEARS  = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div>
      {/* Modals */}
      {selected && (
        <CorrectionModal
          record={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); fetch_(); }}
        />
      )}
      {auditId && (
        <AuditModal attendanceId={auditId} onClose={() => setAuditId(null)} />
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">

        {/* School selector */}
        {schools.length > 0 && (
          <select
            value={schoolId}
            onChange={(e) => { setSchoolId(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select School</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => switchViewMode("day")}
            className={`px-3 py-2 font-medium transition ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            📅 Day
          </button>
          <button
            onClick={() => switchViewMode("month")}
            className={`px-3 py-2 font-medium transition border-l border-gray-200 ${viewMode === "month" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
          >
            🗓 Month
          </button>
        </div>

        {/* Date picker with prev/next arrows (day view) */}
        {viewMode === "day" && (
          <div className="flex items-center gap-1">
            <button onClick={prevDay} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-500" title="Previous day">
              <ChevronLeft size={15} />
            </button>
            <input
              type="date"
              value={date}
              max={todayIST()}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={nextDay} disabled={date >= todayIST()} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-500 disabled:opacity-30" title="Next day">
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* Month + Year selectors (month view) */}
        {viewMode === "month" && (
          <>
            <select
              value={month}
              onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              ⚠️ Month view loads all data — may be slow
            </span>
          </>
        )}

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Mark School Holiday — only in day view */}
        {viewMode === "day" && schoolId && (
          <button
            onClick={markSchoolHoliday}
            disabled={markingHoliday}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-medium transition disabled:opacity-50"
          >
            🎉 {markingHoliday ? "Marking..." : "Mark School Holiday"}
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500 self-center">
          {meta.total} records
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Teacher", "Date", "First Punch", "Last Punch", "Worked", "Status", "Issue / Notes", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                    No attendance records found.
                  </td>
                </tr>
              ) : records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{r.teacherName}</p>
                    <p className="text-xs text-gray-400">{r.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{fmtTime(r.firstPunch)}</td>
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{fmtTime(r.lastPunch)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmtMins(r.workedMinutes)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} isLate={r.isLate} isLateExcused={r.isLateExcused} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.status === "MISSING_PUNCH" && !r.isMissingPunchReviewed && (
                      <span className="text-purple-600 font-medium">Needs review</span>
                    )}
                    {r.status === "ON_LEAVE" && (
                      <span className={`font-medium ${r.isLeaveDeducted ? "text-red-500" : "text-teal-600"}`}>
                        {r.leaveType || "Leave"} · {r.isLeaveDeducted ? "Unpaid" : "Paid"}
                        {r.leaveReason && <span className="block text-gray-400 font-normal truncate max-w-[120px]">{r.leaveReason}</span>}
                      </span>
                    )}
                    {r.isLate && !r.isLateExcused && r.status !== "ON_LEAVE" && (
                      <span className="text-orange-600 font-medium">Late {r.lateMinutes}m</span>
                    )}
                    {r.correctedAt && r.status !== "ON_LEAVE" && (
                      <span className="text-gray-400">Corrected by {r.correctedBy || "—"}</span>
                    )}
                    {!r.correctedAt && r.status === "PRESENT" && !r.isLate && "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => reprocess(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition"
                        title="Delete old record and recalculate from biometric punches"
                      >
                        ↺ Reprocess
                      </button>
                      <button
                        onClick={() => setSelected(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition"
                      >
                        <Edit3 size={12} />
                        Correct
                      </button>
                      <button
                        onClick={() => setAuditId(r.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-medium transition"
                      >
                        <History size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}