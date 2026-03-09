// client/src/admin/pages/classes/SchoolTimingsPage.jsx
// KEY FIXES:
// 1. Editing existing year NEVER creates a new config — always upserts by (schoolId + academicYearId)
// 2. Period-to-timing relationship: PeriodDefinition owns the time; TimetableEntry just points to it
//    → Changing times updates PeriodDefinition rows in-place; no entries are touched
// 3. rebuildCfg break parsing fixed — safe for any periodNumber range
// 4. Switching academic years correctly reloads config without stale state
// 5. Warning modal before saving if periods are being removed (which could block due to entries)

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  X,
  ShieldAlert,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchTimetableConfig,
  saveTimetableConfig,
  fetchAcademicYears,
} from "./api/classesApi";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
};

// ── Time utilities ────────────────────────────────────────────────────────────
const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// ── Generate preview slots from a config object ───────────────────────────────
function genSlots(cfg) {
  if (!cfg?.startTime || !cfg?.periodDuration || !cfg?.totalPeriods) return [];
  const slots = [];
  let cur = toMin(cfg.startTime);
  const bm = {};
  (cfg.breaks || []).forEach((b) => {
    if (b.afterPeriod > 0) bm[b.afterPeriod] = b;
  });
  for (let i = 1; i <= cfg.totalPeriods; i++) {
    slots.push({
      id: `p${i}`,
      type: "PERIOD",
      label: `Period ${i}`,
      start: toTime(cur),
      end: toTime(cur + cfg.periodDuration),
    });
    cur += cfg.periodDuration;
    if (bm[i]) {
      slots.push({
        id: `b${i}`,
        type: bm[i].type || "SHORT_BREAK",
        label: bm[i].label || "Break",
        start: toTime(cur),
        end: toTime(cur + (bm[i].duration || 10)),
      });
      cur += bm[i].duration || 10;
    }
  }
  return slots;
}

// ── Rebuild a cfg object from saved PeriodDefinition rows ────────────────────
// PERIOD slots: periodNumber = 1,2,3...  slotType="PERIOD"
// BREAK slots:  periodNumber = 101,102.. (100 + afterPeriod), slotType != "PERIOD"
function rebuildCfgFromDefs(defs, fallback) {
  if (!defs || defs.length === 0) return fallback;

  const periods = defs
    .filter((d) => d.slotType === "PERIOD")
    .sort((a, b) => (a.order ?? a.periodNumber) - (b.order ?? b.periodNumber));

  if (periods.length === 0) return fallback;

  const first = periods[0];
  const [fsh, fsm] = first.startTime.split(":").map(Number);
  const [feh, fem] = first.endTime.split(":").map(Number);
  const periodDuration = feh * 60 + fem - (fsh * 60 + fsm);

  // Breaks: periodNumber >= 101 = break, afterPeriod = periodNumber - 100
  const breaks = defs
    .filter((d) => d.slotType !== "PERIOD" && d.periodNumber >= 101)
    .map((d) => {
      const afterPeriod = d.periodNumber - 100;
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      const duration = eh * 60 + em - (sh * 60 + sm);
      return {
        afterPeriod,
        label: d.label || "Break",
        duration: duration > 0 ? duration : 10,
        type: d.slotType || "SHORT_BREAK",
      };
    })
    .filter((b) => b.afterPeriod > 0 && b.afterPeriod <= periods.length);

  const sortedAll = [...defs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const lastDef = sortedAll[sortedAll.length - 1];

  return {
    startTime: first.startTime,
    endTime:
      lastDef?.endTime ||
      toTime(toMin(first.startTime) + periods.length * periodDuration),
    periodDuration:
      periodDuration > 0 ? periodDuration : fallback.periodDuration,
    totalPeriods: periods.length,
    breaks,
  };
}

// ── Diff helper ───────────────────────────────────────────────────────────────
function buildDiff(savedDefs, newCfg, dayType) {
  const label = dayType === "WEEKDAY" ? "Weekday (Mon–Fri)" : "Saturday";
  if (!savedDefs || savedDefs.length === 0)
    return [{ type: "new", msg: `${label}: Creating new schedule` }];

  const oldPeriods = savedDefs.filter(
    (d) => d.dayType === dayType && d.slotType === "PERIOD",
  );
  if (oldPeriods.length === 0)
    return [{ type: "new", msg: `${label}: Creating new schedule` }];

  const changes = [];
  const oldCount = oldPeriods.length;
  const newCount = newCfg.totalPeriods;

  if (newCount > oldCount)
    changes.push({
      type: "add",
      msg: `${label}: Adding ${newCount - oldCount} period(s) — ${oldCount} → ${newCount} total`,
    });
  else if (newCount < oldCount)
    changes.push({
      type: "remove",
      severity: "high",
      msg: `${label}: Removing ${oldCount - newCount} period(s) — ${oldCount} → ${newCount} total. If these periods have timetable entries the save will be blocked.`,
    });

  if (oldPeriods[0].startTime !== newCfg.startTime)
    changes.push({
      type: "time",
      msg: `${label}: Start time changes ${fmtTime(oldPeriods[0].startTime)} → ${fmtTime(newCfg.startTime)}. All period display times will shift; existing assignments are preserved.`,
    });

  const [fsh, fsm] = oldPeriods[0].startTime.split(":").map(Number);
  const [feh, fem] = oldPeriods[0].endTime.split(":").map(Number);
  const oldDur = feh * 60 + fem - (fsh * 60 + fsm);
  if (oldDur !== newCfg.periodDuration)
    changes.push({
      type: "time",
      msg: `${label}: Period duration ${oldDur} min → ${newCfg.periodDuration} min. Display times shift; assignments preserved.`,
    });

  return changes;
}

const defaultCfg = () => ({
  startTime: "09:00",
  endTime: "15:30",
  periodDuration: 45,
  totalPeriods: 7,
  breaks: [
    { afterPeriod: 2, label: "Short Break", duration: 10, type: "SHORT_BREAK" },
    { afterPeriod: 4, label: "Lunch Break", duration: 30, type: "LUNCH_BREAK" },
  ],
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ type, msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
      style={{
        padding: "12px 18px",
        background: type === "success" ? "#f0fdf4" : "#fef2f2",
        border: `1.5px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
        color: type === "success" ? "#15803d" : "#dc2626",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      {msg}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
const Input = ({ label, type = "text", value, onChange, min, max }) => (
  <div>
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: C.mid,
        marginBottom: 4,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
      min={min}
      max={max}
      style={{
        width: "100%",
        padding: "8px 11px",
        border: `1.5px solid ${C.border}`,
        borderRadius: 10,
        fontSize: 13,
        color: C.primary,
        fontFamily: "Inter, sans-serif",
        outline: "none",
        boxSizing: "border-box",
        background: "#fff",
      }}
    />
  </div>
);

// ── Config Panel ──────────────────────────────────────────────────────────────
function ConfigPanel({ cfg, onChange }) {
  const updateBreak = (i, field, val) => {
    const breaks = cfg.breaks.map((b, idx) =>
      idx === i
        ? {
            ...b,
            [field]:
              field === "afterPeriod" || field === "duration"
                ? Number(val)
                : val,
          }
        : b,
    );
    onChange({ ...cfg, breaks });
  };
  const addBreak = () =>
    onChange({
      ...cfg,
      breaks: [
        ...cfg.breaks,
        { afterPeriod: 1, label: "Break", duration: 15, type: "SHORT_BREAK" },
      ],
    });
  const removeBreak = (i) =>
    onChange({ ...cfg, breaks: cfg.breaks.filter((_, idx) => idx !== i) });

  const preview = genSlots(cfg);
  // End time is always auto-calculated from start + periods + breaks
  // Never let the user type it manually — that was causing stale end times
  const calcEndTime =
    preview.length > 0 ? preview[preview.length - 1].end : cfg.endTime;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Input
          label="Start Time"
          type="time"
          value={cfg.startTime}
          onChange={(v) => onChange({ ...cfg, startTime: v })}
        />
        {/* End Time: read-only, auto-computed from periods + breaks */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: C.mid,
              marginBottom: 4,
              fontFamily: "Inter, sans-serif",
            }}
          >
            End Time{" "}
            <span style={{ fontSize: 10, fontWeight: 400, color: C.light }}>
              (auto)
            </span>
          </label>
          <div
            style={{
              width: "100%",
              padding: "8px 11px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              fontSize: 13,
              color: C.mid,
              fontFamily: "Inter, sans-serif",
              background: "rgba(189,221,252,0.1)",
              boxSizing: "border-box",
            }}
          >
            {fmtTime(calcEndTime)}
          </div>
        </div>
        <Input
          label="Period Duration (min)"
          type="number"
          min={15}
          max={120}
          value={cfg.periodDuration}
          onChange={(v) => onChange({ ...cfg, periodDuration: v })}
        />
        <Input
          label="Total Periods"
          type="number"
          min={1}
          max={14}
          value={cfg.totalPeriods}
          onChange={(v) => onChange({ ...cfg, totalPeriods: v })}
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-semibold uppercase"
            style={{
              color: C.mid,
              letterSpacing: "0.5px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Breaks
          </p>
          <button
            onClick={addBreak}
            style={{
              border: "none",
              background: C.pale,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: C.primary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Plus size={12} /> Add Break
          </button>
        </div>
        {cfg.breaks.length === 0 && (
          <p
            className="text-xs"
            style={{ color: C.light, fontFamily: "Inter, sans-serif" }}
          >
            No breaks configured.
          </p>
        )}
        {cfg.breaks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
            <div style={{ flex: "0 0 100px" }}>
              <Input
                label="After Period"
                type="number"
                min={1}
                max={cfg.totalPeriods - 1}
                value={b.afterPeriod}
                onChange={(v) => updateBreak(i, "afterPeriod", v)}
              />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <Input
                label="Label"
                value={b.label}
                onChange={(v) => updateBreak(i, "label", v)}
              />
            </div>
            <div style={{ flex: "0 0 100px" }}>
              <Input
                label="Duration (min)"
                type="number"
                min={5}
                max={90}
                value={b.duration}
                onChange={(v) => updateBreak(i, "duration", v)}
              />
            </div>
            <div style={{ flex: "0 0 130px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.mid,
                  marginBottom: 4,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Type
              </label>
              <select
                value={b.type}
                onChange={(e) => updateBreak(i, "type", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 11px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: C.primary,
                  fontFamily: "Inter, sans-serif",
                  outline: "none",
                  background: "#fff",
                }}
              >
                <option value="SHORT_BREAK">Short Break</option>
                <option value="LUNCH_BREAK">Lunch Break</option>
                <option value="PRAYER">Prayer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <button
              onClick={() => removeBreak(i)}
              style={{
                marginTop: 18,
                border: "none",
                background: "rgba(239,68,68,0.08)",
                borderRadius: 8,
                padding: "6px 7px",
                cursor: "pointer",
                display: "flex",
              }}
            >
              <Trash2 size={13} style={{ color: "#ef4444" }} />
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div>
        <p
          className="text-xs font-semibold uppercase mb-2"
          style={{
            color: C.mid,
            letterSpacing: "0.5px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Preview
        </p>
        <div className="flex flex-wrap gap-1.5">
          {preview.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "Inter, sans-serif",
                background:
                  s.type === "PERIOD"
                    ? C.pale
                    : s.type === "LUNCH_BREAK"
                      ? "rgba(251,191,36,0.15)"
                      : "rgba(167,243,208,0.25)",
                color:
                  s.type === "PERIOD"
                    ? C.primary
                    : s.type === "LUNCH_BREAK"
                      ? "#92400e"
                      : "#065f46",
                border: `1px solid ${s.type === "PERIOD" ? C.border : "transparent"}`,
              }}
            >
              {s.label}{" "}
              <span style={{ opacity: 0.65 }}>{fmtTime(s.start)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Change Warning Modal ──────────────────────────────────────────────────────
function ChangeWarningModal({
  changes,
  serverError,
  onConfirm,
  onCancel,
  saving,
}) {
  const hasHigh = changes.some((c) => c.severity === "high");
  const isBlocked = !!serverError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{ maxWidth: 520, border: "1px solid rgba(136,189,242,0.25)" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background:
              isBlocked || hasHigh
                ? "rgba(239,68,68,0.05)"
                : "rgba(245,158,11,0.05)",
            borderBottom: `1px solid ${isBlocked || hasHigh ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  isBlocked || hasHigh
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(245,158,11,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isBlocked || hasHigh ? (
                <ShieldAlert size={17} style={{ color: "#ef4444" }} />
              ) : (
                <AlertTriangle size={17} style={{ color: "#f59e0b" }} />
              )}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: C.primary }}>
                {isBlocked
                  ? "Save Blocked — Timetable Entries Exist"
                  : "Review Changes"}
              </p>
              <p className="text-xs" style={{ color: C.mid }}>
                {isBlocked
                  ? "Clear affected class timetables first"
                  : "These changes affect your period structure"}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: C.mid,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="px-6 py-5 space-y-3"
          style={{ maxHeight: 360, overflowY: "auto" }}
        >
          {isBlocked && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "#dc2626" }}
              >
                ⛔ Cannot remove — periods have timetable entries
              </p>
              <p className="text-xs mb-2" style={{ color: "#7f1d1d" }}>
                {serverError.message}
              </p>
              {serverError.periodsWithEntries?.length > 0 && (
                <div className="space-y-1">
                  {serverError.periodsWithEntries.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        color: "#991b1b",
                      }}
                    >
                      <AlertCircle size={12} />
                      {p.label} ({p.dayType}) — has entries
                    </div>
                  ))}
                </div>
              )}
              <div
                className="mt-3 rounded-lg p-3 text-xs"
                style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c" }}
              >
                <strong>Fix:</strong> Go to Timetable Builder → clear entries
                for these periods → come back and save.
              </div>
            </div>
          )}

          {!isBlocked && changes.length > 0 && (
            <div className="space-y-2">
              {changes.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background:
                      c.severity === "high"
                        ? "rgba(239,68,68,0.05)"
                        : c.type === "add"
                          ? "rgba(34,197,94,0.05)"
                          : "rgba(245,158,11,0.05)",
                    border: `1px solid ${c.severity === "high" ? "rgba(239,68,68,0.18)" : c.type === "add" ? "rgba(34,197,94,0.18)" : "rgba(245,158,11,0.18)"}`,
                  }}
                >
                  <span
                    style={{ fontSize: 16, lineHeight: 1.2, flexShrink: 0 }}
                  >
                    {c.type === "add"
                      ? "➕"
                      : c.severity === "high"
                        ? "🗑️"
                        : "🕐"}
                  </span>
                  <p
                    className="text-xs"
                    style={{
                      color:
                        c.severity === "high"
                          ? "#991b1b"
                          : c.type === "add"
                            ? "#166534"
                            : "#78350f",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    {c.msg}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!isBlocked &&
            changes.every((c) => c.type === "time") &&
            changes.length > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-2"
                style={{ background: C.pale, border: `1px solid ${C.border}` }}
              >
                <Info
                  size={14}
                  style={{ color: C.mid, flexShrink: 0, marginTop: 1 }}
                />
                <p
                  className="text-xs"
                  style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
                >
                  <strong>Safe change:</strong> Only timings are shifting. All
                  timetable assignments (subject + teacher per period) are fully
                  preserved.
                </p>
              </div>
            )}

          {!isBlocked && changes.length === 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-2"
              style={{
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.15)",
              }}
            >
              <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
              <p
                className="text-xs"
                style={{ color: "#166534", fontFamily: "Inter, sans-serif" }}
              >
                No structural changes. Only timing values will update.
              </p>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: `1.5px solid ${C.border}`,
              color: C.mid,
              background: "#fff",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isBlocked ? "Close" : "Go Back & Edit"}
          </button>
          {!isBlocked && (
            <button
              onClick={onConfirm}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 10,
                background: hasHigh ? "#ef4444" : C.primary,
                border: "none",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : hasHigh ? (
                <ShieldAlert size={14} />
              ) : (
                <Save size={14} />
              )}
              {saving
                ? "Saving…"
                : hasHigh
                  ? "Yes, Apply Changes"
                  : "Confirm & Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function SchoolTimingsPage() {
  const navigate = useNavigate();

  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [weekdayCfg, setWeekdayCfg] = useState(defaultCfg());
  const [satCfg, setSatCfg] = useState({
    ...defaultCfg(),
    totalPeriods: 5,
    endTime: "13:00",
    breaks: [
      {
        afterPeriod: 3,
        label: "Short Break",
        duration: 15,
        type: "SHORT_BREAK",
      },
    ],
  });
  const [satSameAsWeekday, setSatSameAsWeekday] = useState(true);
  const [allSamePattern, setAllSamePattern] = useState(null);

  const [loading, setLoading] = useState(true);
  const [cfgLoading, setCfgLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);

  const [savedDefs, setSavedDefs] = useState(null);
  const [isExistingConfig, setIsExistingConfig] = useState(false);

  const [showWarning, setShowWarning] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [serverError, setServerError] = useState(null);

  // ── Load config for a year ────────────────────────────────────────────────
  const loadConfig = useCallback(async (aid) => {
    if (!aid) return;
    setCfgLoading(true);
    setSaved(false);
    try {
      const cfgData = await fetchTimetableConfig({ academicYearId: aid });
      if (cfgData.config?.periodDefinitions?.length > 0) {
        const allDefs = cfgData.config.periodDefinitions;
        setSavedDefs(allDefs);
        setIsExistingConfig(true);

        const weekDefs = allDefs.filter((d) => d.dayType === "WEEKDAY");
        const satDefs = allDefs.filter((d) => d.dayType === "SATURDAY");

        setWeekdayCfg((prev) => rebuildCfgFromDefs(weekDefs, prev));
        const hasSat = satDefs.length > 0;
        setSatSameAsWeekday(!hasSat);
        if (hasSat) setSatCfg((prev) => rebuildCfgFromDefs(satDefs, prev));
      } else {
        setSavedDefs([]);
        setIsExistingConfig(false);
        setWeekdayCfg(defaultCfg());
        setSatCfg({
          ...defaultCfg(),
          totalPeriods: 5,
          endTime: "13:00",
          breaks: [
            {
              afterPeriod: 3,
              label: "Short Break",
              duration: 15,
              type: "SHORT_BREAK",
            },
          ],
        });
        setSatSameAsWeekday(true);
      }
    } catch {
      setSavedDefs([]);
      setIsExistingConfig(false);
    } finally {
      setCfgLoading(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const yd = await fetchAcademicYears();
        const yr = yd.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        if (active) {
          setYearId(active.id);
          await loadConfig(active.id);
        }
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleYearChange = async (newYearId) => {
    setYearId(newYearId);
    setSavedDefs(null);
    if (newYearId) await loadConfig(newYearId);
  };

  // ── Save: diff first, then confirm ───────────────────────────────────────
  const handleSaveClick = () => {
    if (!yearId)
      return setToast({ type: "error", msg: "Select an academic year" });
    if (allSamePattern === null)
      return setToast({
        type: "error",
        msg: "Please answer the schedule question above before saving",
      });

    if (!isExistingConfig || !savedDefs?.length) {
      doSave();
      return;
    }

    const wChanges = buildDiff(savedDefs, weekdayCfg, "WEEKDAY");
    const sChanges = satSameAsWeekday
      ? []
      : buildDiff(savedDefs, satCfg, "SATURDAY");
    const all = [...wChanges, ...sChanges].filter((c) => c.type !== "new");

    setPendingChanges(all);
    setServerError(null);
    setShowWarning(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await saveTimetableConfig({
        academicYearId: yearId,
        weekday: weekdayCfg,
        saturday: satSameAsWeekday ? null : satCfg,
        satSameAsWeekday,
      });
      setShowWarning(false);
      setServerError(null);
      setToast({ type: "success", msg: "School timings saved successfully!" });
      setSaved(true);
      await loadConfig(yearId); // refresh so next edit diffs correctly
    } catch (err) {
      if (
        err.message?.toLowerCase().includes("entries") ||
        err.periodsWithEntries
      ) {
        setServerError({
          message: err.message,
          periodsWithEntries: err.periodsWithEntries || [],
        });
        setShowWarning(true);
      } else {
        setShowWarning(false);
        setToast({ type: "error", msg: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const savedWeekdayPeriods =
    savedDefs?.filter((d) => d.dayType === "WEEKDAY" && d.slotType === "PERIOD")
      .length ?? 0;
  const savedSatPeriods =
    savedDefs?.filter(
      (d) => d.dayType === "SATURDAY" && d.slotType === "PERIOD",
    ).length ?? 0;

  if (loading)
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2
            size={22}
            className="animate-spin"
            style={{ color: C.light }}
          />
        </div>
      </PageLayout>
    );

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/classes")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: C.primary }}
            />
            <h1 className="text-xl font-semibold" style={{ color: C.primary }}>
              School Timings Setup
            </h1>
          </div>
          <p className="text-sm ml-3" style={{ color: C.mid }}>
            Configure daily periods, breaks, and timetable structure
          </p>
        </div>

        {/* Academic Year Selector */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-4"
          style={{ border: `1px solid ${C.border}` }}
        >
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: C.mid,
              marginBottom: 6,
              letterSpacing: "0.5px",
              fontFamily: "Inter, sans-serif",
            }}
          >
            ACADEMIC YEAR
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={yearId}
              onChange={(e) => handleYearChange(e.target.value)}
              style={{
                padding: "8px 12px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                color: C.primary,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                background: "#fff",
                outline: "none",
              }}
            >
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>

            {yearId && savedDefs !== null && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={
                  isExistingConfig
                    ? {
                        background: "rgba(56,73,89,0.08)",
                        color: C.primary,
                        fontFamily: "Inter, sans-serif",
                      }
                    : {
                        background: "rgba(34,197,94,0.1)",
                        color: "#166534",
                        fontFamily: "Inter, sans-serif",
                      }
                }
              >
                {isExistingConfig
                  ? `✏️ Editing — ${savedWeekdayPeriods} weekday period${savedWeekdayPeriods !== 1 ? "s" : ""}${savedSatPeriods > 0 ? `, ${savedSatPeriods} Saturday periods` : ""} saved`
                  : "✨ New — no config saved for this year yet"}
              </span>
            )}
            {cfgLoading && (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: C.light }}
              />
            )}
          </div>
        </div>

        {/* Key Question */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-5"
          style={{
            border: `1.5px solid ${allSamePattern === null ? "#f59e0b" : C.border}`,
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(245,158,11,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Info size={16} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.primary }}>
                Do all classes follow the same daily schedule?
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.mid }}>
                e.g. All classes start at 9:00 AM with 7 periods of 45 min each.
                You can still build different subject/teacher assignments per
                class — this just sets the period structure.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { val: true, label: "Yes — same schedule for all" },
              { val: false, label: "No — different per class" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                onClick={() => setAllSamePattern(val)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  border: `1.5px solid ${allSamePattern === val ? C.primary : C.border}`,
                  background: allSamePattern === val ? C.primary : "#fff",
                  color: allSamePattern === val ? "#fff" : C.mid,
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {allSamePattern === false && (
            <div
              className="mt-3 rounded-xl p-3 flex items-start gap-2"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Info
                size={14}
                style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }}
              />
              <p
                className="text-xs"
                style={{ color: "#92400e", fontFamily: "Inter, sans-serif" }}
              >
                You can configure a default structure here. Per-class
                customization is done in the Timetable Builder.
              </p>
            </div>
          )}
        </div>

        {cfgLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={20}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : (
          <>
            {/* Weekday config */}
            <div
              className="bg-white rounded-2xl shadow-sm mb-4 p-5"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} style={{ color: C.mid }} />
                <h2
                  className="text-sm font-semibold"
                  style={{ color: C.primary }}
                >
                  Monday – Friday Schedule
                </h2>
              </div>
              <ConfigPanel cfg={weekdayCfg} onChange={setWeekdayCfg} />
            </div>

            {/* Saturday */}
            <div
              className="bg-white rounded-2xl shadow-sm mb-6 p-5"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} style={{ color: C.mid }} />
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: C.primary }}
                  >
                    Saturday Schedule
                  </h2>
                </div>
                <button
                  onClick={() => setSatSameAsWeekday((v) => !v)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    border: `1.5px solid ${C.border}`,
                    background: satSameAsWeekday ? C.pale : "#fff",
                    color: C.primary,
                  }}
                >
                  {satSameAsWeekday ? "Same as weekday" : "Custom Saturday"}
                </button>
              </div>
              {satSameAsWeekday ? (
                <p
                  className="text-sm"
                  style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                >
                  Saturday uses the same period structure as Monday–Friday.
                </p>
              ) : (
                <ConfigPanel cfg={satCfg} onChange={setSatCfg} />
              )}
            </div>
          </>
        )}

        {/* Save footer */}
        <div
          className="flex items-center justify-between flex-wrap gap-3 rounded-2xl"
          style={{
            padding: "16px 20px",
            background: saved ? "rgba(16,185,129,0.06)" : C.card,
            border: `1.5px solid ${saved ? "rgba(16,185,129,0.25)" : C.border}`,
          }}
        >
          <div className="flex items-center gap-2">
            {saved ? (
              <>
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#10b981", fontFamily: "Inter, sans-serif" }}
                >
                  Timings saved! Next: create your class sections.
                </span>
              </>
            ) : (
              <span
                className="text-sm"
                style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
              >
                {isExistingConfig
                  ? "You're editing an existing config — changes will be applied safely."
                  : "Save timings first, then create class sections."}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveClick}
              disabled={saving || cfgLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background:
                  saving || cfgLoading ? "rgba(106,137,167,0.5)" : C.primary,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                cursor: saving || cfgLoading ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving
                ? "Saving…"
                : isExistingConfig
                  ? "Update Timings"
                  : "Save Timings"}
            </button>
            <button
              onClick={() => navigate("/classes/sections")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: saved ? "#10b981" : C.pale,
                border: `1.5px solid ${saved ? "#10b981" : C.border}`,
                borderRadius: 10,
                color: saved ? "#fff" : C.mid,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Next: Create Sections <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {showWarning && (
        <ChangeWarningModal
          changes={pendingChanges}
          serverError={serverError}
          onConfirm={doSave}
          onCancel={() => {
            setShowWarning(false);
            setServerError(null);
          }}
          saving={saving}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </PageLayout>
  );
}
