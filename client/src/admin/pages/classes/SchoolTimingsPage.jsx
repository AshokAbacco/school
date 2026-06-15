// client/src/admin/pages/classes/SchoolTimingsPage.jsx

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
  Eye,
  Download,
  Pencil,
} from "lucide-react";
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

// ── Time utilities ─────────────────────────────────────────────────────────────
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

// ── Generate editable slots from config ────────────────────────────────────────
// Each slot: { id, type, label, start, end, periodIndex?, breakIdx? }
function genEditableSlots(cfg) {
  // Manual mode: return stored slots directly
  if (cfg?.manualMode && cfg?.manualSlots?.length > 0) return cfg.manualSlots;

  if (!cfg?.startTime || !cfg?.periodDuration || !cfg?.totalPeriods) return [];
  const slots = [];
  let cur = toMin(cfg.startTime);
  const bm = {};
  (cfg.breaks || []).forEach((b, idx) => {
    if (b.afterPeriod > 0) bm[b.afterPeriod] = { ...b, _idx: idx };
  });
  for (let i = 1; i <= cfg.totalPeriods; i++) {
    const end = cur + cfg.periodDuration;
    slots.push({
      id: `p${i}`,
      type: "PERIOD",
      label: `Period ${i}`,
      start: toTime(cur),
      end: toTime(end),
      periodIndex: i,
    });
    cur = end;
    if (bm[i]) {
      const brk = bm[i];
      const bEnd = cur + (brk.duration || 10);
      slots.push({
        id: `b${i}`,
        type: brk.type || "SHORT_BREAK",
        label: brk.label || "Break",
        start: toTime(cur),
        end: toTime(bEnd),
        breakIdx: brk._idx,
      });
      cur = bEnd;
    }
  }
  return slots;
}

// ── Build manual slots from auto cfg (for switching to manual mode) ────────────
function buildManualSlotsFromCfg(cfg) {
  const slots = genEditableSlots({ ...cfg, manualMode: false });
  return slots.map((s, i) => ({ ...s, id: `ms${i}` }));
}

// ── Convert manualSlots back to cfg-compatible shape (for save) ────────────────
function manualSlotsToCfg(manualSlots) {
  const periods = manualSlots.filter((s) => s.type === "PERIOD");
  if (periods.length === 0) return null;
  const first = periods[0];
  const last = manualSlots[manualSlots.length - 1];
  const dur = toMin(first.end) - toMin(first.start);
  return {
    manualMode: true,
    manualSlots,
    startTime: first.start,
    endTime: last.end,
    periodDuration: dur > 0 ? dur : 40,
    totalPeriods: periods.length,
    breaks: manualSlots
      .filter((s) => s.type !== "PERIOD")
      .map((s, idx) => {
        // Find which period this break comes after
        const slotIdx = manualSlots.indexOf(s);
        const prevPeriods = manualSlots.slice(0, slotIdx).filter((x) => x.type === "PERIOD");
        const dur2 = toMin(s.end) - toMin(s.start);
        return {
          afterPeriod: prevPeriods.length,
          label: s.label,
          duration: dur2 > 0 ? dur2 : 10,
          type: s.type,
        };
      })
      .filter((b) => b.afterPeriod > 0),
  };
}

// ── Convert cfg (manual or auto) → periodDefinitions array for the API ────────
// This is the canonical serializer — the API receives this directly so it never
// has to re-derive timings from periodDuration / totalPeriods.
function cfgToPeriodDefinitions(cfg, dayType) {
  const slots = genEditableSlots(cfg); // returns manualSlots when manualMode=true
  const defs = [];
  let periodCounter = 0;
  let breakCounter = 0;

  slots.forEach((slot, order) => {
    if (slot.type === "PERIOD") {
      periodCounter++;
      defs.push({
        dayType,
        slotType: "PERIOD",
        periodNumber: periodCounter,
        label: slot.label || `Period ${periodCounter}`,
        startTime: slot.start,
        endTime: slot.end,
        order,
      });
    } else {
      // Break: use periodNumber 100 + afterPeriod convention
      breakCounter++;
      defs.push({
        dayType,
        slotType: slot.type || "SHORT_BREAK",
        periodNumber: 100 + periodCounter, // afterPeriod = current period count
        label: slot.label || "Break",
        startTime: slot.start,
        endTime: slot.end,
        order,
      });
    }
  });

  return defs;
}

// ── Apply an edit to a slot back into cfg ──────────────────────────────────────
function applySlotEdit(cfg, slotId, field, newVal) {
  const slots = genEditableSlots(cfg);
  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return cfg;

  if (slot.type === "PERIOD") {
    if (field === "start" && slot.periodIndex === 1) {
      // Shift entire schedule start time
      return { ...cfg, startTime: newVal };
    }
    if (field === "end") {
      // Recalculate period duration from this period's start → new end
      const startMin = toMin(slot.start);
      const endMin = toMin(newVal);
      const newDur = endMin - startMin;
      if (newDur > 0) return { ...cfg, periodDuration: newDur };
    }
  }

  if (slot.type !== "PERIOD" && slot.breakIdx !== undefined) {
    if (field === "end") {
      const startMin = toMin(slot.start);
      const endMin = toMin(newVal);
      const dur = endMin - startMin;
      if (dur > 0) {
        const breaks = cfg.breaks.map((b, i) =>
          i === slot.breakIdx ? { ...b, duration: dur } : b
        );
        return { ...cfg, breaks };
      }
    }
  }
  return cfg;
}

// ── Rebuild cfg from saved PeriodDefinition rows ────────────────────────────────
function rebuildCfgFromDefs(defs, fallback) {
  if (!defs || defs.length === 0) return fallback;
  const allSorted = [...defs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const periods = defs
    .filter((d) => d.slotType === "PERIOD")
    .sort((a, b) => (a.order ?? a.periodNumber) - (b.order ?? b.periodNumber));
  if (periods.length === 0) return fallback;
  const first = periods[0];
  const [fsh, fsm] = first.startTime.split(":").map(Number);
  const [feh, fem] = first.endTime.split(":").map(Number);
  const periodDuration = feh * 60 + fem - (fsh * 60 + fsm);
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
  const lastDef = allSorted[allSorted.length - 1];

  // Reconstruct manualSlots from all defs (preserves per-row independent timings)
  const manualSlots = allSorted.map((d, i) => ({
    id: `ms${i}`,
    type: d.slotType === "PERIOD" ? "PERIOD" : (d.slotType || "SHORT_BREAK"),
    label: d.label || (d.slotType === "PERIOD" ? `Period ${d.periodNumber}` : "Break"),
    start: d.startTime,
    end: d.endTime,
  }));
  // Detect if saved timings are non-uniform (i.e. were saved in manual mode)
  const periodDurations = periods.map((p) => {
    const [sh, sm] = p.startTime.split(":").map(Number);
    const [eh, em] = p.endTime.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  });
  const allSameDuration = periodDurations.every((d) => d === periodDurations[0]);

  return {
    startTime: first.startTime,
    endTime:
      lastDef?.endTime ||
      toTime(toMin(first.startTime) + periods.length * periodDuration),
    periodDuration: periodDuration > 0 ? periodDuration : fallback.periodDuration,
    totalPeriods: periods.length,
    breaks,
    // Restore manual mode if timings were non-uniform or if more than basic structure
    manualMode: !allSameDuration,
    manualSlots,
  };
}

// ── Diff helper ────────────────────────────────────────────────────────────────
function buildDiff(savedDefs, newCfg, dayType) {
  const label = "Mon–Sat Schedule";
  if (!savedDefs || savedDefs.length === 0)
    return [{ type: "new", msg: `${label}: Creating new schedule` }];
  const oldPeriods = savedDefs.filter(
    (d) => d.dayType === dayType && d.slotType === "PERIOD"
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

// ── Toast ──────────────────────────────────────────────────────────────────────
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────
const Input = ({ label, type = "text", value, onChange, min, max }) => (
  <div>
    <label
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        color: C.mid,
        marginBottom: 4,
        fontFamily: "'Inter', sans-serif",
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
        fontFamily: "'Inter', sans-serif",
        outline: "none",
        boxSizing: "border-box",
        background: "#fff",
      }}
    />
  </div>
);

// ── Editable Preview Table ─────────────────────────────────────────────────────
function EditablePreviewTable({ cfg, onChange }) {
  const isManual = !!cfg.manualMode;
  const slots = genEditableSlots(cfg);

  // ── Auto-mode helpers (unchanged behaviour) ──────────────────────────────────
  const handleTimeEdit = (slotId, field, val) => {
    const newCfg = applySlotEdit(cfg, slotId, field, val);
    onChange(newCfg);
  };

  // ── Manual-mode helpers ──────────────────────────────────────────────────────
  const updateManualSlot = (idx, field, val) => {
    const updated = cfg.manualSlots.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  const updateManualLabel = (idx, val) => {
    const updated = cfg.manualSlots.map((s, i) => (i === idx ? { ...s, label: val } : s));
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  const updateManualType = (idx, val) => {
    const updated = cfg.manualSlots.map((s, i) => (i === idx ? { ...s, type: val } : s));
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  const addPeriodRow = () => {
    const last = cfg.manualSlots[cfg.manualSlots.length - 1];
    const newStart = last?.end || "16:00";
    const newEnd = toTime(toMin(newStart) + 40);
    const periods = cfg.manualSlots.filter((s) => s.type === "PERIOD");
    const newSlot = {
      id: `ms${Date.now()}`,
      type: "PERIOD",
      label: `Period ${periods.length + 1}`,
      start: newStart,
      end: newEnd,
    };
    const updated = [...cfg.manualSlots, newSlot];
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  const addBreakRow = () => {
    const last = cfg.manualSlots[cfg.manualSlots.length - 1];
    const newStart = last?.end || "12:00";
    const newEnd = toTime(toMin(newStart) + 15);
    const newSlot = {
      id: `ms${Date.now()}`,
      type: "SHORT_BREAK",
      label: "Break",
      start: newStart,
      end: newEnd,
    };
    const updated = [...cfg.manualSlots, newSlot];
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  const removeRow = (idx) => {
    const updated = cfg.manualSlots.filter((_, i) => i !== idx);
    const rebuilt = manualSlotsToCfg(updated);
    onChange({ ...cfg, ...rebuilt, manualSlots: updated });
  };

  // ── Shared style helpers ─────────────────────────────────────────────────────
  const timeInputStyle = {
    border: `1.5px solid ${C.border}`,
    borderRadius: 8,
    padding: "5px 8px",
    fontSize: 12,
    color: C.primary,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    background: "#fff",
    width: 108,
  };

  const getRowBg = (type) => {
    if (type === "LUNCH_BREAK") return "rgba(251,191,36,0.07)";
    if (type !== "PERIOD") return "rgba(167,243,208,0.12)";
    return "#fff";
  };

  const getLabelColor = (type) => {
    if (type === "LUNCH_BREAK") return "#92400e";
    if (type !== "PERIOD") return "#065f46";
    return C.primary;
  };

  const getBadge = (type) => {
    if (type === "PERIOD") return null;
    const isLunch = type === "LUNCH_BREAK";
    return (
      <span
        style={{
          fontSize: 10,
          padding: "1px 7px",
          borderRadius: 20,
          background: isLunch ? "rgba(251,191,36,0.2)" : "rgba(167,243,208,0.4)",
          color: isLunch ? "#92400e" : "#065f46",
          fontWeight: 600,
          marginLeft: 6,
        }}
      >
        {isLunch ? "Lunch" : "Break"}
      </span>
    );
  };

  // ── Manual mode render ───────────────────────────────────────────────────────
  if (isManual) {
    return (
      <div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["PERIOD / BREAK", "TYPE", "START TIME", "END TIME", "DURATION", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.mid,
                      letterSpacing: "0.5px",
                      fontFamily: "'Inter', sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(cfg.manualSlots || []).map((slot, idx) => {
                const dur = toMin(slot.end) - toMin(slot.start);
                const isPeriod = slot.type === "PERIOD";
                return (
                  <tr
                    key={slot.id}
                    style={{
                      background: getRowBg(slot.type),
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {/* Label */}
                    <td style={{ padding: "7px 10px", minWidth: 120 }}>
                      <input
                        type="text"
                        value={slot.label}
                        onChange={(e) => updateManualLabel(idx, e.target.value)}
                        style={{
                          ...timeInputStyle,
                          width: "100%",
                          fontWeight: isPeriod ? 600 : 500,
                          color: getLabelColor(slot.type),
                        }}
                      />
                    </td>
                    {/* Type */}
                    <td style={{ padding: "7px 10px", minWidth: 130 }}>
                      <select
                        value={slot.type}
                        onChange={(e) => updateManualType(idx, e.target.value)}
                        style={{
                          ...timeInputStyle,
                          width: "100%",
                          fontSize: 11,
                        }}
                      >
                        <option value="PERIOD">Period</option>
                        <option value="SHORT_BREAK">Short Break</option>
                        <option value="LUNCH_BREAK">Lunch Break</option>
                        <option value="PRAYER">Prayer</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </td>
                    {/* Start */}
                    <td style={{ padding: "7px 10px" }}>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateManualSlot(idx, "start", e.target.value)}
                        style={timeInputStyle}
                      />
                    </td>
                    {/* End */}
                    <td style={{ padding: "7px 10px" }}>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateManualSlot(idx, "end", e.target.value)}
                        style={timeInputStyle}
                      />
                    </td>
                    {/* Duration */}
                    <td style={{ padding: "7px 10px", fontSize: 12, color: dur > 0 ? C.mid : "#ef4444", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
                      {dur > 0 ? `${dur} min` : "⚠ invalid"}
                    </td>
                    {/* Remove */}
                    <td style={{ padding: "7px 6px" }}>
                      <button
                        onClick={() => removeRow(idx)}
                        title="Remove row"
                        style={{
                          border: "none",
                          background: "rgba(239,68,68,0.08)",
                          borderRadius: 7,
                          padding: "5px 6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={12} style={{ color: "#ef4444" }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add row buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={addPeriodRow}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 13px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: C.primary,
              background: "#fff",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={12} /> Add Period
          </button>
          <button
            onClick={addBreakRow}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 13px",
              border: `1.5px solid rgba(167,243,208,0.6)`,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#065f46",
              background: "rgba(167,243,208,0.1)",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={12} /> Add Break
          </button>
        </div>
        <p style={{ fontSize: 11, color: C.light, marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
          <Pencil size={10} style={{ display: "inline", marginRight: 4 }} />
          Each period and break has its own independent start and end time. Drag rows by reordering manually.
        </p>
      </div>
    );
  }

  // ── Auto mode render (original) ──────────────────────────────────────────────
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            {["ACTIVITY", "START TIME", "END TIME", "DURATION"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.mid,
                  letterSpacing: "0.5px",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => {
            const dur = toMin(slot.end) - toMin(slot.start);
            const canEditStart = slot.type === "PERIOD" && slot.periodIndex === 1;
            const canEditEnd = slot.type === "PERIOD" || slot.breakIdx !== undefined;
            return (
              <tr
                key={slot.id}
                style={{
                  background: getRowBg(slot.type),
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <td
                  style={{
                    padding: "10px 12px",
                    fontWeight: slot.type === "PERIOD" ? 600 : 500,
                    color: getLabelColor(slot.type),
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {slot.label}
                  {getBadge(slot.type)}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {canEditStart ? (
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) => handleTimeEdit(slot.id, "start", e.target.value)}
                      style={timeInputStyle}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: C.mid, fontFamily: "'Inter', sans-serif" }}>
                      {fmtTime(slot.start)}
                    </span>
                  )}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  {canEditEnd ? (
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) => handleTimeEdit(slot.id, "end", e.target.value)}
                      style={timeInputStyle}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: C.mid, fontFamily: "'Inter', sans-serif" }}>
                      {fmtTime(slot.end)}
                    </span>
                  )}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 12, color: C.mid, fontFamily: "'Inter', sans-serif" }}>
                  {dur > 0 ? `${dur} min` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: C.light, marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
        <Pencil size={10} style={{ display: "inline", marginRight: 4 }} />
        Edit <strong>Start Time</strong> or <strong>End Time</strong> of any period or break to adjust its duration. Use <strong>Manual Entry</strong> mode for fully independent per-period timings.
      </p>
    </div>
  );
}

// ── Config Panel ───────────────────────────────────────────────────────────────
function ConfigPanel({ cfg, onChange }) {
  const updateBreak = (i, field, val) => {
    const breaks = cfg.breaks.map((b, idx) =>
      idx === i
        ? { ...b, [field]: field === "afterPeriod" || field === "duration" ? Number(val) : val }
        : b
    );
    onChange({ ...cfg, breaks });
  };
  const addBreak = () =>
    onChange({
      ...cfg,
      breaks: [...cfg.breaks, { afterPeriod: 1, label: "Break", duration: 15, type: "SHORT_BREAK" }],
    });
  const removeBreak = (i) =>
    onChange({ ...cfg, breaks: cfg.breaks.filter((_, idx) => idx !== i) });

  const slots = genEditableSlots(cfg);
  const calcEndTime = cfg.endTime || (slots.length > 0 ? slots[slots.length - 1].end : "");

  return (
    <div>
      {/* Start Time + End Time — both manual inputs. Period Duration & Total Periods removed. */}
      <div className="grid grid-cols-2 gap-3 mb-4" style={{ maxWidth: 360 }}>
        <Input
          label="Start Time"
          type="time"
          value={cfg.startTime}
          onChange={(v) => {
            // Also update first manualSlot start if in manual mode
            if (cfg.manualMode && cfg.manualSlots?.length > 0) {
              const updated = cfg.manualSlots.map((s, i) => (i === 0 ? { ...s, start: v } : s));
              const rebuilt = manualSlotsToCfg(updated);
              onChange({ ...cfg, ...rebuilt, startTime: v, manualSlots: updated });
            } else {
              onChange({ ...cfg, startTime: v });
            }
          }}
        />
        <Input
          label="End Time"
          type="time"
          value={cfg.endTime || calcEndTime}
          onChange={(v) => {
            // Also update last manualSlot end if in manual mode
            if (cfg.manualMode && cfg.manualSlots?.length > 0) {
              const updated = cfg.manualSlots.map((s, i) =>
                i === cfg.manualSlots.length - 1 ? { ...s, end: v } : s
              );
              const rebuilt = manualSlotsToCfg(updated);
              onChange({ ...cfg, ...rebuilt, endTime: v, manualSlots: updated });
            } else {
              onChange({ ...cfg, endTime: v });
            }
          }}
        />
      </div>

      {/* Breaks — hidden in manual mode (managed as rows in the table) */}
      <div className="mb-4" style={{ display: cfg.manualMode ? "none" : undefined }}>
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-semibold uppercase"
            style={{ color: C.mid, letterSpacing: "0.5px", fontFamily: "'Inter', sans-serif" }}
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
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={12} /> Add Break
          </button>
        </div>
        {cfg.breaks.length === 0 && (
          <p className="text-xs" style={{ color: C.light, fontFamily: "Inter, sans-serif" }}>
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
              <Input label="Label" value={b.label} onChange={(v) => updateBreak(i, "label", v)} />
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
                  fontFamily: "'Inter', sans-serif",
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
                  fontFamily: "'Inter', sans-serif",
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

      {/* Period Schedule — with Manual Mode toggle */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p
            className="text-xs font-semibold uppercase"
            style={{ color: C.mid, letterSpacing: "0.5px", fontFamily: "'Inter', sans-serif" }}
          >
            Period Schedule
            {!cfg.manualMode && (
              <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, color: C.light, fontSize: 11 }}>
                — click end time to adjust
              </span>
            )}
          </p>
          {/* Manual mode toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {cfg.manualMode && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(56,73,89,0.1)",
                  color: C.primary,
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                ✏️ Manual Mode
              </span>
            )}
            <button
              onClick={() => {
                if (!cfg.manualMode) {
                  // Switch to manual: snapshot current auto-slots
                  const manualSlots = buildManualSlotsFromCfg(cfg);
                  const rebuilt = manualSlotsToCfg(manualSlots);
                  onChange({ ...cfg, ...rebuilt, manualMode: true, manualSlots });
                } else {
                  // Switch back to auto: clear manualSlots
                  const { manualSlots: _ms, manualMode: _mm, ...rest } = cfg;
                  onChange({ ...rest, manualMode: false });
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                border: `1.5px solid ${cfg.manualMode ? "#ef4444" : C.border}`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                color: cfg.manualMode ? "#ef4444" : C.primary,
                background: cfg.manualMode ? "rgba(239,68,68,0.05)" : C.pale,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {cfg.manualMode ? (
                <><X size={11} /> Switch to Auto</>
              ) : (
                <><Pencil size={11} /> Manual Entry</>
              )}
            </button>
          </div>
        </div>
        {cfg.manualMode && (
          <div
            className="mb-3 rounded-xl px-4 py-3 flex items-start gap-2"
            style={{ background: "rgba(56,73,89,0.04)", border: `1px solid ${C.border}` }}
          >
            <Info size={13} style={{ color: C.mid, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: C.mid, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
              <strong>Manual mode:</strong> Each period and break below has its own independent start &amp; end time. Use the table to set any timing you need — add rows with the buttons at the bottom.
            </p>
          </div>
        )}
        <EditablePreviewTable cfg={cfg} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Change Warning Modal ───────────────────────────────────────────────────────
function ChangeWarningModal({ changes, serverError, onConfirm, onCancel, saving }) {
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
            background: isBlocked || hasHigh ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)",
            borderBottom: `1px solid ${isBlocked || hasHigh ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isBlocked || hasHigh ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
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
                {isBlocked ? "Save Blocked — Timetable Entries Exist" : "Review Changes"}
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
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6, borderRadius: 8, color: C.mid }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3" style={{ maxHeight: 360, overflowY: "auto" }}>
          {isBlocked && (
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "#dc2626" }}>
                ⛔ Cannot remove — periods have timetable entries
              </p>
              <p className="text-xs mb-2" style={{ color: "#7f1d1d" }}>{serverError.message}</p>
              {serverError.periodsWithEntries?.length > 0 && (
                <div className="space-y-1">
                  {serverError.periodsWithEntries.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5"
                      style={{ background: "rgba(239,68,68,0.08)", color: "#991b1b" }}
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
                <strong>Fix:</strong> Go to Timetable Builder → clear entries for these periods → come back and save.
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
                    border: `1px solid ${
                      c.severity === "high"
                        ? "rgba(239,68,68,0.18)"
                        : c.type === "add"
                          ? "rgba(34,197,94,0.18)"
                          : "rgba(245,158,11,0.18)"
                    }`,
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1.2, flexShrink: 0 }}>
                    {c.type === "add" ? "➕" : c.severity === "high" ? "🗑️" : "🕐"}
                  </span>
                  <p
                    className="text-xs"
                    style={{
                      color:
                        c.severity === "high" ? "#991b1b" : c.type === "add" ? "#166534" : "#78350f",
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    {c.msg}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!isBlocked && changes.every((c) => c.type === "time") && changes.length > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{ background: C.pale, border: `1px solid ${C.border}` }}
            >
              <Info size={14} style={{ color: C.mid, flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}>
                <strong>Safe change:</strong> Only timings are shifting. All timetable assignments (subject + teacher per period) are fully preserved.
              </p>
            </div>
          )}
          {!isBlocked && changes.length === 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
            >
              <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
              <p className="text-xs" style={{ color: "#166534", fontFamily: "Inter, sans-serif" }}>
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
              fontFamily: "'Inter', sans-serif",
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
                fontFamily: "'Inter', sans-serif",
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
              {saving ? "Saving…" : hasHigh ? "Yes, Apply Changes" : "Confirm & Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Change 5: Full Timetable View Modal with color + Download Excel ─────────────
function FullTimetableModal({ weekdayCfg, schoolName, onClose }) {
  const slots = genEditableSlots(weekdayCfg);
  const downloadExcel = () => {
    const school = schoolName || "School";

    const last = slots[slots.length - 1];
    const dispersalStart = last?.end || "";
    const dispersalEnd = dispersalStart ? toTime(toMin(dispersalStart) + 15) : "";

    const dataRows = [
      ...slots.map((s) => [s.label, fmtTime(s.start), fmtTime(s.end)]),
      ["Dispersal / Closing", fmtTime(dispersalStart), fmtTime(dispersalEnd)],
    ];

    const BOM = "\uFEFF";
    const lines = [
      `${school} - Timetable Schedule,,`,
      `,,`,
      `Monday - Saturday Schedule,,`,
      `Activity,Start Time,End Time`,
      ...dataRows.map((r) => r.join(",")),
    ];

    const csv = lines.join("\n");
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${school.replace(/\s+/g, "_")}_Timetable_Schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ScheduleTable = ({ slots, title }) => {
    const last = slots[slots.length - 1];
    const dispersalStart = last?.end || "";
    const dispersalEnd = dispersalStart ? toTime(toMin(dispersalStart) + 15) : "";

    return (
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            padding: "10px 16px",
            background: C.primary,
            borderRadius: "12px 12px 0 0",
          }}
        >
          <p
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              margin: 0,
              letterSpacing: "0.2px",
            }}
          >
            {title}
          </p>
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: `1px solid ${C.border}`,
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ background: C.pale }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.mid,
                  letterSpacing: "0.5px",
                  fontFamily: "'Inter', sans-serif",
                  width: "55%",
                }}
              >
                ACTIVITY
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.mid,
                  letterSpacing: "0.5px",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                TIME
              </th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => {
              const isLunch = s.type === "LUNCH_BREAK";
              const isBreak = s.type !== "PERIOD";
              return (
                <tr
                  key={s.id}
                  style={{
                    background: isLunch
                      ? "rgba(251,191,36,0.09)"
                      : isBreak
                        ? "rgba(167,243,208,0.12)"
                        : "#fff",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <td
                    style={{
                      padding: "11px 16px",
                      fontWeight: isBreak ? 500 : 600,
                      color: isLunch ? "#92400e" : isBreak ? "#065f46" : C.primary,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                    }}
                  >
                    {s.label}
                    {isBreak && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          padding: "1px 7px",
                          borderRadius: 20,
                          background: isLunch ? "rgba(251,191,36,0.2)" : "rgba(167,243,208,0.35)",
                          color: isLunch ? "#92400e" : "#065f46",
                          fontWeight: 600,
                        }}
                      >
                        {isLunch ? "Lunch" : "Break"}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      color: C.mid,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                    }}
                  >
                    {fmtTime(s.start)} – {fmtTime(s.end)}
                  </td>
                </tr>
              );
            })}
            {/* Dispersal row */}
            <tr style={{ background: "rgba(56,73,89,0.04)", borderBottom: `1px solid ${C.border}` }}>
              <td
                style={{
                  padding: "11px 16px",
                  fontWeight: 400,
                  color: C.mid,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontStyle: "italic",
                }}
              >
                Dispersal / Closing
              </td>
              <td
                style={{
                  padding: "11px 16px",
                  color: C.mid,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                }}
              >
                {fmtTime(dispersalStart)} – {fmtTime(dispersalEnd)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 580, maxHeight: "90vh", border: `1px solid ${C.border}` }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.pale,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={18} style={{ color: C.primary }} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: C.primary }}>
                {schoolName ? `${schoolName} — ` : ""}Full Timetable
              </p>
              <p className="text-xs" style={{ color: C.mid }}>
                Monday – Saturday schedule overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadExcel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 9,
                border: `1.5px solid ${C.border}`,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "0 1px 3px rgba(56,73,89,0.08)",
              }}
            >
              <Download size={13} /> Download Excel
            </button>
            <button
              onClick={onClose}
              style={{
                border: "none",
                background: "rgba(239,68,68,0.08)",
                cursor: "pointer",
                padding: "7px",
                borderRadius: 8,
                color: "#ef4444",
                display: "flex",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* Modal body */}
        <div className="overflow-y-auto p-6">
          <ScheduleTable slots={slots} title="Monday – Saturday Schedule" />
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
  const [allSamePattern, setAllSamePattern] = useState(null);
  // Change 5: Full view modal state
  const [showFullView, setShowFullView] = useState(false);
  const [schoolName, setSchoolName] = useState("");

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
        setWeekdayCfg((prev) => rebuildCfgFromDefs(weekDefs, prev));
      } else {
        setSavedDefs([]);
        setIsExistingConfig(false);
        setWeekdayCfg(defaultCfg());
      }
    } catch {
      setSavedDefs([]);
      setIsExistingConfig(false);
    } finally {
      setCfgLoading(false);
    }
  }, []);

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

  const handleSaveClick = () => {
    if (!yearId) return setToast({ type: "error", msg: "Select an academic year" });
    if (!isExistingConfig || !savedDefs?.length) {
      doSave();
      return;
    }
    const wChanges = buildDiff(savedDefs, weekdayCfg, "WEEKDAY");
    const all = [...wChanges].filter((c) => c.type !== "new");
    setPendingChanges(all);
    setServerError(null);
    setShowWarning(true);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      // Build periodDefinitions explicitly from the current slots (manual or auto).
      // Saturday always mirrors the weekday schedule (Mon–Sat unified).
      const weekdayDefs = cfgToPeriodDefinitions(weekdayCfg, "WEEKDAY");
      const satDefs = cfgToPeriodDefinitions(weekdayCfg, "SATURDAY");

      await saveTimetableConfig({
        academicYearId: yearId,
        weekday: weekdayCfg,
        saturday: weekdayCfg,
        satSameAsWeekday: true,
        // Explicit period definitions — API must use these directly
        periodDefinitions: [...weekdayDefs, ...satDefs],
      });
      setShowWarning(false);
      setServerError(null);
      setToast({ type: "success", msg: "School timings saved successfully!" });
      setSaved(true);
      await loadConfig(yearId);
    } catch (err) {
      if (err.message?.toLowerCase().includes("entries") || err.periodsWithEntries) {
        setServerError({ message: err.message, periodsWithEntries: err.periodsWithEntries || [] });
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
    savedDefs?.filter((d) => d.dayType === "WEEKDAY" && d.slotType === "PERIOD").length ?? 0;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: C.light }} />
      </div>
    );

  return (
    <>
      <div className="p-4 md:p-6" style={{ background: C.bg, minHeight: "100%" }}>
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/admin/classes")}
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
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-6 rounded-full" style={{ background: C.primary }} />
                <h1 className="text-xl font-semibold" style={{ color: C.primary }}>
                  School Timings Setup
                </h1>
              </div>
              <p className="text-sm ml-3" style={{ color: C.mid }}>
                Configure daily periods, breaks, and timetable structure
              </p>
            </div>
            {/* Change 5: View Full Timetable button in header */}
            <button
              onClick={() => setShowFullView(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                background: "#fff",
                color: C.primary,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 1px 4px rgba(56,73,89,0.08)",
              }}
            >
              <Eye size={14} /> View Full Timetable
            </button>
          </div>
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
              fontFamily: "'Inter', sans-serif",
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
                fontFamily: "'Inter', sans-serif",
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
                    ? { background: "rgba(56,73,89,0.08)", color: C.primary, fontFamily: "'Inter', sans-serif" }
                    : { background: "rgba(34,197,94,0.1)", color: "#166534", fontFamily: "'Inter', sans-serif" }
                }
              >
                {isExistingConfig
                  ? `✏️ Editing — ${savedWeekdayPeriods} period${savedWeekdayPeriods !== 1 ? "s" : ""} saved (Mon–Sat)`
                  : "✨ New — no config saved for this year yet"}
              </span>
            )}
            {cfgLoading && <Loader2 size={14} className="animate-spin" style={{ color: C.light }} />}
          </div>
        </div>

        {/* Key Question */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-5"
          style={{ border: `1.5px solid ${allSamePattern === null ? "#f59e0b" : C.border}` }}
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
                e.g. All classes start at 9:00 AM with 7 periods of 45 min each. You can still build
                different subject/teacher assignments per class — this just sets the period structure.
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
                  fontFamily: "'Inter', sans-serif",
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
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <Info size={14} style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: "#92400e", fontFamily: "Inter, sans-serif" }}>
                You can configure a default structure here. Per-class customization is done in the
                Timetable Builder.
              </p>
            </div>
          )}
        </div>

        {cfgLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin" style={{ color: C.light }} />
          </div>
        ) : (
          <>
            {/* Single unified Monday–Saturday panel */}
            <div
              className="bg-white rounded-2xl shadow-sm mb-6 p-5"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} style={{ color: C.mid }} />
                <h2 className="text-sm font-semibold" style={{ color: C.primary }}>
                  Monday – Saturday Schedule
                </h2>
              </div>

              <ConfigPanel
                cfg={weekdayCfg}
                onChange={setWeekdayCfg}
              />
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
              <span className="text-sm" style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}>
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
                background: saving || cfgLoading ? "rgba(106,137,167,0.5)" : C.primary,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                cursor: saving || cfgLoading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving…" : isExistingConfig ? "Update Timings" : "Save Timings"}
            </button>
            <button
              onClick={() => navigate("/admin/classes/sections")}
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
                fontFamily: "'Inter', sans-serif",
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

      {/* Change 5: Full timetable view modal */}
      {showFullView && (
        <FullTimetableModal
          weekdayCfg={weekdayCfg}
          schoolName={schoolName}
          onClose={() => setShowFullView(false)}
        />
      )}

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}
    </>
  );
}