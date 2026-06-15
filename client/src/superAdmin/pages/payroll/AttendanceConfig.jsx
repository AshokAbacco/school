// client/src/pages/payroll/AttendanceConfig.jsx
// School Admin configures ONLY grace period settings.
// School timings (start/end time) are read-only, sourced from TimetableConfig.
import React, { useState, useEffect } from "react";
import { Clock, Save, Info, CheckCircle, AlertCircle, Lock, ExternalLink } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const token = () => { try { const a = localStorage.getItem("auth"); return a ? JSON.parse(a).token : null; } catch { return null; } };

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
  />
);

const ReadOnlyField = ({ label, value, note }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
      <Lock size={12} className="text-gray-400" />
      {label}
    </label>
    {note && <p className="text-xs text-gray-400 mb-2">{note}</p>}
    <div className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-600 font-mono">
      {value || "—"}
    </div>
  </div>
);

export default function AttendanceConfig({ schoolId }) {
  const [timing, setTiming]   = useState(null);
  const [grace, setGrace]     = useState({
    lateGraceMinutes:      15,
    earlyExitGraceMinutes: 15,
    halfDayThresholdPct:   0.5,
    absentThresholdPct:    0.25,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [noTimetable, setNoTimetable] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch(`${API}/api/payroll/config/${schoolId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (d.data.timing?.startTime) {
            setTiming(d.data.timing);
          } else {
            setNoTimetable(true);
          }
          setGrace(d.data.grace);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolId]);

  const setG = (key) => (e) => setGrace((g) => ({ ...g, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/payroll/config/${schoolId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(grace),
      });
      const d = await res.json();
      if (d.success) {
        setToast({ type: "success", msg: "Grace period settings saved." });
      } else {
        setToast({ type: "error", msg: d.message });
      }
    } catch {
      setToast({ type: "error", msg: "Failed to save settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const fmtPct = (v) => `${Math.round(Number(v) * 100)}%`;
  const fmtMins = (total, pct) => {
    if (!total) return "—";
    const m = Math.round(total * Number(pct));
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Clock size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Payroll Attendance Settings</h2>
          <p className="text-sm text-gray-500">Configure grace periods for attendance calculation</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
          toast.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── School Timings Panel (read-only from TimetableConfig) ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm">School Timings</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Read from your Timetable Configuration
            </p>
          </div>
          <div
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit TimeTable In Admin Login
          </div>
        </div>

        {noTimetable ? (
          <div className="px-6 py-5 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">No timetable configured</p>
              <p className="text-xs text-amber-600 mt-1">
                Attendance cannot be calculated until a timetable is set up for the active
                academic year. Go to <strong>Timetable → Configure</strong> to set school timings.
              </p>
            </div>
          </div>
        ) : timing ? (
          <div className="px-6 py-5 grid grid-cols-2 gap-4">
            <ReadOnlyField
              label="School Start Time"
              value={timing.startTime}
              note="First period start"
            />
            <ReadOnlyField
              label="School End Time"
              value={timing.endTime}
              note="Last period end"
            />
            <ReadOnlyField
              label="Gross School Hours"
              value={`${Math.floor(timing.totalMinutes / 60)}h ${timing.totalMinutes % 60}m`}
              note={`${timing.totalPeriods} periods · ${timing.academicYear}`}
            />
            <ReadOnlyField
              label="Day Type"
              value="WEEKDAY (Mon–Fri)"
              note="Saturday periods auto-detected"
            />
          </div>
        ) : null}
      </div>

      {/* ── Grace Period Settings (editable) ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">Grace &amp; Threshold Settings</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            These define when a teacher is marked Late, Half Day, or Absent
          </p>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-5">
          <Field
            label="Late Arrival Grace (minutes)"
            hint={`Arrive up to ${grace.lateGraceMinutes} min late = still on-time`}
          >
            <Input
              type="number" min={0} max={60}
              value={grace.lateGraceMinutes}
              onChange={setG("lateGraceMinutes")}
            />
          </Field>

          <Field
            label="Early Exit Grace (minutes)"
            hint={`Leave up to ${grace.earlyExitGraceMinutes} min early = ok`}
          >
            <Input
              type="number" min={0} max={60}
              value={grace.earlyExitGraceMinutes}
              onChange={setG("earlyExitGraceMinutes")}
            />
          </Field>

          <Field
            label="Half Day Threshold"
            hint={`Worked < ${fmtPct(grace.halfDayThresholdPct)} of school hours = HALF_DAY`}
          >
            <select
              value={grace.halfDayThresholdPct}
              onChange={setG("halfDayThresholdPct")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0.4, 0.45, 0.5, 0.55, 0.6].map((v) => (
                <option key={v} value={v}>{fmtPct(v)} of school hours</option>
              ))}
            </select>
          </Field>

          <Field
            label="Absent Threshold"
            hint={`Worked < ${fmtPct(grace.absentThresholdPct)} of school hours = ABSENT`}
          >
            <select
              value={grace.absentThresholdPct}
              onChange={setG("absentThresholdPct")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[0.1, 0.15, 0.2, 0.25, 0.3].map((v) => (
                <option key={v} value={v}>{fmtPct(v)} of school hours</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Live Preview */}
        {timing && (
          <div className="mx-6 mb-5 bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-2">📊 Preview (based on {timing.totalMinutes} min school day)</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              <span className="text-gray-500">Allowed arrival by:</span>
              <span className="font-mono font-medium">{timing.startTime} + {grace.lateGraceMinutes} min</span>
              <span className="text-gray-500">FULL DAY if worked ≥</span>
              <span className="font-mono font-medium text-green-700">
                {fmtPct(grace.halfDayThresholdPct)} → {fmtMins(timing.totalMinutes, grace.halfDayThresholdPct)}
              </span>
              <span className="text-gray-500">HALF DAY if worked ≥</span>
              <span className="font-mono font-medium text-yellow-600">
                {fmtPct(grace.absentThresholdPct)} → {fmtMins(timing.totalMinutes, grace.absentThresholdPct)}
              </span>
              <span className="text-gray-500">ABSENT if worked &lt;</span>
              <span className="font-mono font-medium text-red-600">
                {fmtPct(grace.absentThresholdPct)} → {fmtMins(timing.totalMinutes, grace.absentThresholdPct)}
              </span>
            </div>
          </div>
        )}

        {/* Info note about late */}
        <div className="mx-6 mb-5 flex items-start gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          <span>
            Late arrivals are <strong>tracked separately</strong> and do not automatically deduct salary.
            Super Admin reviews and excuses or converts them via Attendance Corrections.
          </span>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={save}
            disabled={saving || noTimetable}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Grace Settings"}
          </button>
        </div>
      </div>

      {/* Last updated */}
      {grace.updatedAt && (
        <p className="text-xs text-gray-400 text-center">
          Last updated {new Date(grace.updatedAt).toLocaleDateString("en-IN")}
          {grace.updatedBy ? ` by ${grace.updatedBy}` : ""}
        </p>
      )}
    </div>
  );
}