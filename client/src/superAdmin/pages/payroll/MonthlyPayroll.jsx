// client/src/pages/payroll/MonthlyPayroll.jsx
// Monthly payroll generation, viewing, locking, and export
import React, { useState, useEffect, useCallback } from "react";
import {
  IndianRupee, Download, Lock, RefreshCw, Eye, History,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
  Users, Calendar, TrendingUp, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const token = () => {
  try { const a = localStorage.getItem("auth"); return a ? JSON.parse(a).token : null; }
  catch { return null; }
};

const fmt = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(n)
    : "—";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  PRESENT:       "bg-green-100 text-green-700",
  ABSENT:        "bg-red-100 text-red-700",
  HALF_DAY:      "bg-yellow-100 text-yellow-700",
  LATE:          "bg-orange-100 text-orange-700",
  MISSING_PUNCH: "bg-purple-100 text-purple-700",
  HOLIDAY:       "bg-blue-100 text-blue-700",
  PENDING:       "bg-gray-100 text-gray-500",
};

// ── Process Attendance Result Panel ──────────────────────────────────────────
function ProcessResultPanel({ result, onClose }) {
  const [showErrors, setShowErrors] = useState(false);

  if (!result) return null;

  const { processed, teachers, days, errors = [] } = result;
  const successRate = teachers > 0 ? Math.round((processed / (teachers * days)) * 100) : 0;

  return (
    <div className="mt-3 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header row */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-purple-600" />
          <span className="font-semibold text-purple-800 text-sm">Attendance Processing Complete</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 text-center">
        <div className="py-4 px-3">
          <p className="text-2xl font-bold text-gray-800">{teachers}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <Users size={11} /> Teachers
          </p>
        </div>
        <div className="py-4 px-3">
          <p className="text-2xl font-bold text-gray-800">{days}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <Calendar size={11} /> Days checked
          </p>
        </div>
        <div className="py-4 px-3">
          <p className="text-2xl font-bold text-green-600">{processed}</p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle size={11} /> Records saved
          </p>
        </div>
        <div className="py-4 px-3">
          <p className={`text-2xl font-bold ${errors.length > 0 ? "text-red-500" : "text-gray-300"}`}>
            {errors.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <AlertCircle size={11} /> Errors
          </p>
        </div>
      </div>

      {/* Info note */}
      <div className="mx-4 mb-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
        Processed all biometric punches for the selected month. Days with no punches are marked
        <strong className="text-red-600"> ABSENT</strong>. Days with only one punch are marked
        <strong className="text-purple-600"> MISSING PUNCH</strong>. Now click{" "}
        <strong className="text-blue-600">Generate Payroll</strong> to calculate salaries.
      </div>

      {/* Error details (collapsible) */}
      {errors.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowErrors((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-red-600 hover:bg-red-50 transition"
          >
            <span className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              {errors.length} error{errors.length > 1 ? "s" : ""} during processing — click to {showErrors ? "hide" : "view"}
            </span>
            {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showErrors && (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 bg-red-50/40">
              {errors.map((e, i) => (
                <div key={i} className="px-4 py-2 text-xs">
                  <span className="font-mono text-gray-600 font-semibold">{e.teacherId?.slice(0, 8)}…</span>
                  {e.date && <span className="ml-2 text-gray-500">{e.date}</span>}
                  <p className="text-red-600 mt-0.5">{e.error}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Generate Result Panel ─────────────────────────────────────────────────────
function GenerateResultPanel({ result, onClose }) {
  const [showErrors, setShowErrors] = useState(false);
  if (!result) return null;

  const { generated, errors = [] } = result;

  return (
    <div className="mt-3 border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-600" />
          <span className="font-semibold text-blue-800 text-sm">Payroll Generation Complete</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-blue-50 text-center">
        <div className="py-4 px-3">
          <p className="text-2xl font-bold text-blue-600">{generated}</p>
          <p className="text-xs text-gray-500 mt-0.5">Payrolls generated</p>
        </div>
        <div className="py-4 px-3">
          <p className={`text-2xl font-bold ${errors.length > 0 ? "text-red-500" : "text-gray-300"}`}>
            {errors.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Errors</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="border-t border-blue-50">
          <button
            onClick={() => setShowErrors((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-red-600 hover:bg-red-50 transition"
          >
            <span className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={14} />
              {errors.length} teacher{errors.length > 1 ? "s" : ""} failed — {showErrors ? "hide" : "see reasons"}
            </span>
            {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showErrors && (
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 bg-red-50/40">
              {errors.map((e, i) => (
                <div key={i} className="px-4 py-2.5 text-xs">
                  <p className="font-semibold text-gray-700">{e.name}</p>
                  <p className="text-red-600 mt-0.5">{e.error}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {errors.some(e => e.error?.toLowerCase().includes("salary")) && (
        <div className="mx-4 mb-3 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex gap-2">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          Some teachers have no monthly salary configured. Go to each teacher's profile and set their salary to include them in payroll.
        </div>
      )}
    </div>
  );
}

// ── Attendance Breakdown Modal ────────────────────────────────────────────────
function BreakdownModal({ payrollId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payroll/${payrollId}/attendance-breakdown`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setData(d.data))
      .finally(() => setLoading(false));
  }, [payrollId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Attendance Breakdown</h3>
            {data && (
              <p className="text-sm text-gray-500">
                {data.payroll.teacherName} · {MONTHS[data.payroll.month - 1]} {data.payroll.year}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-center text-gray-400 py-8">Failed to load breakdown.</p>
          ) : (
            <div className="space-y-1">
              {data.attendance.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-sm">
                  <span className="w-28 text-gray-500 text-xs shrink-0">
                    {new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold shrink-0 ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                    {a.status.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {a.firstPunch
                      ? new Date(a.firstPunch).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                    {" → "}
                    {a.lastPunch
                      ? new Date(a.lastPunch).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                  {a.workedMinutes != null && (
                    <span className="text-xs text-gray-400 ml-auto shrink-0">
                      {Math.floor(a.workedMinutes / 60)}h {a.workedMinutes % 60}m
                    </span>
                  )}
                  {a.wasManuallyCorrect && (
                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg shrink-0">edited</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Correction History Modal ──────────────────────────────────────────────────
function HistoryModal({ payrollId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payroll/${payrollId}/correction-history`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => d.success && setLogs(d.data))
      .finally(() => setLoading(false));
  }, [payrollId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Correction History</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No corrections recorded.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-700">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.attendance?.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {log.previousStatus && log.newStatus !== log.previousStatus && (
                          <> · {log.previousStatus} → <strong>{log.newStatus}</strong></>
                        )}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{log.reason}"</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <p>{log.performedBy?.name || log.performedByName}</p>
                      <p>{new Date(log.performedAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Payroll Screen ───────────────────────────────────────────────────────
export default function MonthlyPayroll({ schools = [], defaultSchoolId }) {
  const now = new Date();
  const [schoolId, setSchoolId]         = useState(defaultSchoolId || "");
  const [month, setMonth]               = useState(now.getMonth() + 1);
  const [year, setYear]                 = useState(now.getFullYear());
  const [payrolls, setPayrolls]         = useState([]);
  const [totals, setTotals]             = useState(null);
  const [meta, setMeta]                 = useState({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [processing, setProcessing]     = useState(false);
  const [processResult, setProcessResult] = useState(null);  // attendance processing result
  const [genResult, setGenResult]       = useState(null);    // payroll generation result
  const [breakdown, setBreakdown]       = useState(null);
  const [historyId, setHistoryId]       = useState(null);
  const [toast, setToast]               = useState(null);

  // Sync when parent resolves schoolId
  useEffect(() => {
    if (defaultSchoolId && defaultSchoolId !== schoolId) {
      setSchoolId(defaultSchoolId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSchoolId]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Step 1: Process biometric punches → TeacherDailyAttendance ─────────────
  const processAttendance = async () => {
    if (!schoolId) return;
    setProcessing(true);
    setProcessResult(null);
    setGenResult(null);
    try {
      const res = await fetch(`${API}/api/payroll/process-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ schoolId, month, year }),
      });
      const d = await res.json();
      if (d.success) {
        setProcessResult(d.data);
        if (d.data.errors?.length === 0) {
          showToast("success", `Processed ${d.data.processed} attendance records for ${d.data.teachers} teachers.`);
        } else {
          showToast("error", `Processed with ${d.data.errors.length} error(s). See details below.`);
        }
      } else {
        showToast("error", d.message || "Processing failed.");
      }
    } catch {
      showToast("error", "Could not reach server. Check your connection.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Fetch payrolls ──────────────────────────────────────────────────────────
  const fetchPayrolls = useCallback(() => {
    if (!schoolId) return;
    setLoading(true);
    const params = new URLSearchParams({ schoolId, month, year, page, limit: 50 });
    fetch(`${API}/api/payroll?${params}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPayrolls(d.data);
          setMeta(d.meta);
          setTotals(d.totals);
        }
      })
      .finally(() => setLoading(false));
  }, [schoolId, month, year, page]);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  // ── Step 2: Generate payroll ────────────────────────────────────────────────
  const generate = async () => {
    if (!schoolId) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch(`${API}/api/payroll/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ schoolId, month, year }),
      });
      const d = await res.json();
      console.log("[GeneratePayroll] raw response:", JSON.stringify(d, null, 2));
      if (d.success) {
        setGenResult(d.data);
        fetchPayrolls();
        if (d.data.errors?.length === 0) {
          showToast("success", `Payroll generated for ${d.data.generated} teachers.`);
        } else {
          showToast("error", `Generated ${d.data.generated} payrolls. ${d.data.errors.length} failed — see details below.`);
          console.error("[GeneratePayroll] errors:", d.data.errors);
        }
      } else {
        showToast("error", d.message || "Generation failed.");
      }
    } catch {
      showToast("error", "Failed to generate payroll.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Lock ────────────────────────────────────────────────────────────────────
  const lockRecord = async (id) => {
    if (!window.confirm("Lock this payroll? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/api/payroll/${id}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (d.success) { showToast("success", "Payroll locked."); fetchPayrolls(); }
      else showToast("error", d.message);
    } catch {
      showToast("error", "Failed to lock payroll.");
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportData = async () => {
    const params = new URLSearchParams({ schoolId, month, year });
    const res = await fetch(`${API}/api/payroll/export?${params}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const d = await res.json();
    if (!d.success) return;

    const rows = [
      ["#","Employee Code","Name","Designation","Working Days","Present","Late","Half Day","Absent","Holiday","Monthly Salary","Deduction","Net Salary"],
      ...d.data.rows.map((r) => [
        r.sno, r.employeeCode, r.teacherName, r.designation || "",
        r.workingDays, r.present, r.late, r.halfDay, r.absent, r.holiday,
        r.monthlySalary.toFixed(2), r.deduction.toFixed(2), r.netSalary.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${d.data.school}_${MONTHS[month - 1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const YEARS = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div>
      {/* Modals */}
      {breakdown && <BreakdownModal payrollId={breakdown} onClose={() => setBreakdown(null)} />}
      {historyId && <HistoryModal payrollId={historyId} onClose={() => setHistoryId(null)} />}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-sm ${
          toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Filters + Actions */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-5">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
            processing ? "bg-purple-100 text-purple-700" : processResult ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700"
          }`}>
            <span className="w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
            Process Attendance
            {processResult && <CheckCircle size={11} className="text-green-600" />}
          </span>
          <span className="text-gray-300">→</span>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition ${
            generating ? "bg-blue-100 text-blue-700" : genResult ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
          }`}>
            <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">2</span>
            Generate Payroll
            {genResult && <CheckCircle size={11} className="text-green-600" />}
          </span>
          <span className="text-gray-300">→</span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-semibold">
            <span className="w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px]">3</span>
            Export / Lock
          </span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {schools.length > 0 && (
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select School</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <select
            value={month}
            onChange={(e) => { setMonth(Number(e.target.value)); setProcessResult(null); setGenResult(null); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setProcessResult(null); setGenResult(null); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="ml-auto flex gap-2">
            {/* Step 1 */}
            <button
              onClick={processAttendance}
              disabled={processing || !schoolId}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              title="Step 1: Convert biometric punches into attendance records"
            >
              <RefreshCw size={15} className={processing ? "animate-spin" : ""} />
              {processing ? "Processing…" : "Process Attendance"}
            </button>

            {/* Step 2 */}
            <button
              onClick={generate}
              disabled={generating || !schoolId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              title="Step 2: Calculate salaries from attendance records"
            >
              <RefreshCw size={15} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating…" : "Generate Payroll"}
            </button>

            {/* Step 3 */}
            <button
              onClick={exportData}
              disabled={!payrolls.length}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Processing result panel */}
        {processResult && (
          <ProcessResultPanel
            result={processResult}
            onClose={() => setProcessResult(null)}
          />
        )}

        {/* Generation result panel */}
        {genResult && (
          <GenerateResultPanel
            result={genResult}
            onClose={() => setGenResult(null)}
          />
        )}
      </div>

      {/* Totals Summary */}
      {totals && payrolls.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Total Monthly Salary", val: totals.totalMonthlySalary, color: "text-gray-700" },
            { label: "Total Deductions",     val: totals.totalDeduction,     color: "text-red-600"  },
            { label: "Total Net Salary",     val: totals.totalNetSalary,     color: "text-green-700"},
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold ${color} flex items-center gap-1`}>
                <IndianRupee size={16} />
                {fmt(val)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[
                  "Teacher", "Monthly Salary", "Working Days",
                  "Present", "Late", "Half Day", "Absent", "Holiday",
                  "Deduction", "Net Salary", "Status", "Actions"
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <IndianRupee size={22} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500 text-sm">No payroll records</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click <strong>Process Attendance</strong> first, then <strong>Generate Payroll</strong>
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-800">{p.teacherName}</p>
                    <p className="text-xs text-gray-400">{p.employeeCode} · {p.designation}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-gray-700 text-xs">₹{fmt(p.monthlySalary)}</td>
                  <td className="px-3 py-3 text-center text-gray-700">{p.workingDays}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-green-600 font-semibold">{p.presentDays}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-orange-500 font-semibold">{p.lateDays}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-yellow-600 font-semibold">{p.halfDays}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-red-600 font-semibold">{p.absentDays}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-blue-600 font-semibold">{p.holidayDays}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-red-600 text-xs">
                    {p.totalDeduction > 0 ? `-₹${fmt(p.totalDeduction)}` : "—"}
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-green-700 text-xs">
                    ₹{fmt(p.netSalary)}
                  </td>
                  <td className="px-3 py-3">
                    {p.isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                        <Lock size={10} /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-semibold">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setBreakdown(p.id)}
                        title="View Attendance Breakdown"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setHistoryId(p.id)}
                        title="View Correction History"
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      >
                        <History size={14} />
                      </button>
                      {!p.isLocked && (
                        <button
                          onClick={() => lockRecord(p.id)}
                          title="Lock Payroll"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Lock size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages} · {meta.total} records
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