// client/src/admin/pages/classes/SchoolTimingsPage.jsx
// Standalone page — no step wizard dependency.
// Asks: "Do all classes share the same timetable pattern?" before saving.
import { useState, useEffect } from "react";
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

const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fmtTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

function genSlots(cfg) {
  const slots = [];
  let cur = toMin(cfg.startTime);
  const bm = {};
  (cfg.breaks || []).forEach((b) => (bm[b.afterPeriod] = b));
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
        label: bm[i].label,
        start: toTime(cur),
        end: toTime(cur + bm[i].duration),
      });
      cur += bm[i].duration;
    }
  }
  return slots;
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
      }}
    >
      {type === "success" ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}{" "}
      {msg}
    </div>
  );
}

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  min,
  max,
  style = {},
}) => (
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
        ...style,
      }}
    />
  </div>
);

function ConfigPanel({ cfg, onChange, title }) {
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

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.primary }}>
          {title}
        </h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Input
          label="Start Time"
          type="time"
          value={cfg.startTime}
          onChange={(v) => onChange({ ...cfg, startTime: v })}
        />
        <Input
          label="End Time"
          type="time"
          value={cfg.endTime}
          onChange={(v) => onChange({ ...cfg, endTime: v })}
        />
        <Input
          label="Period Duration (min)"
          type="number"
          min={20}
          max={90}
          value={cfg.periodDuration}
          onChange={(v) => onChange({ ...cfg, periodDuration: v })}
        />
        <Input
          label="Total Periods"
          type="number"
          min={1}
          max={12}
          value={cfg.totalPeriods}
          onChange={(v) => onChange({ ...cfg, totalPeriods: v })}
        />
      </div>

      {/* Breaks */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-semibold uppercase"
            style={{ color: C.mid, letterSpacing: "0.5px" }}
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
        {cfg.breaks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
            <div style={{ flex: "0 0 100px" }}>
              <Input
                label="After Period"
                type="number"
                min={1}
                max={cfg.totalPeriods}
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
            <div style={{ flex: "0 0 120px" }}>
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
          style={{ color: C.mid, letterSpacing: "0.5px" }}
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

export default function SchoolTimingsPage() {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [weekdayCfg, setWeekdayCfg] = useState(defaultCfg());
  const [satCfg, setSatCfg] = useState({
    ...defaultCfg(),
    totalPeriods: 5,
    endTime: "13:00",
  });
  const [satSameAsWeekday, setSatSameAsWeekday] = useState(true);
  // NEW: ask if all classes share same timetable
  const [allSamePattern, setAllSamePattern] = useState(null); // null = not answered yet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const yd = await fetchAcademicYears();
        const yr = yd.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        if (active) {
          setYearId(active.id);
          const cfgData = await fetchTimetableConfig({
            academicYearId: active.id,
          });
          if (cfgData.config) {
            const allSlots = cfgData.config.slots || [];
            const weekSlots = allSlots.filter((s) => s.slotOrder < 1000);
            const satSlots = allSlots.filter((s) => s.slotOrder >= 1000);
            // Reconstruct config from first period for simplicity
            setWeekdayCfg((prev) => ({
              ...prev,
              startTime: weekSlots[0]?.startTime || prev.startTime,
              endTime: weekSlots[weekSlots.length - 1]?.endTime || prev.endTime,
              totalPeriods:
                weekSlots.filter((s) => s.slotType === "PERIOD").length ||
                prev.totalPeriods,
            }));
            setSatSameAsWeekday(satSlots.length === 0);
          }
        }
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!yearId)
      return setToast({ type: "error", msg: "Select an academic year" });
    if (allSamePattern === null)
      return setToast({
        type: "error",
        msg: "Please answer: do all classes share the same timetable pattern?",
      });
    setSaving(true);
    try {
      await saveTimetableConfig({
        academicYearId: yearId,
        weekday: weekdayCfg,
        saturday: satSameAsWeekday ? null : satCfg,
        satSameAsWeekday,
      });
      setToast({ type: "success", msg: "School timings saved successfully!" });
      setSaved(true);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

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
            className="flex items-center gap-1.5 rounded-xl text-sm font-medium mb-3"
            style={{
              padding: "6px 12px",
              border: `1.5px solid ${C.border}`,
              color: C.mid,
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
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
            Configure daily periods, breaks and timetable structure
          </p>
        </div>

        {/* Academic year selector */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-4"
          style={{ border: `1px solid ${C.border}` }}
        >
          <label
            className="text-xs font-semibold uppercase"
            style={{
              color: C.mid,
              letterSpacing: "0.5px",
              display: "block",
              marginBottom: 6,
              fontFamily: "Inter, sans-serif",
            }}
          >
            Academic Year
          </label>
          <select
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            className="rounded-xl text-sm font-medium outline-none"
            style={{
              padding: "8px 12px",
              border: `1.5px solid ${C.border}`,
              color: C.primary,
              fontFamily: "Inter, sans-serif",
              background: "#fff",
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
        </div>

        {/* ── KEY QUESTION: All classes same pattern? ── */}
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
                You can still build different timetables per class — this just
                sets the period structure.
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
              <p className="text-xs" style={{ color: "#92400e" }}>
                You can still configure a default structure here. Per-class
                customization is done in the Timetable Builder.
              </p>
            </div>
          )}
        </div>

        {/* Weekday config */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-5"
          style={{ border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: C.mid }} />
            <h2 className="text-sm font-semibold" style={{ color: C.primary }}>
              Monday – Friday Schedule
            </h2>
          </div>
          <ConfigPanel cfg={weekdayCfg} onChange={setWeekdayCfg} />
        </div>

        {/* Saturday toggle + config */}
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
            <p className="text-sm" style={{ color: C.mid }}>
              Saturday uses the same period structure as Monday–Friday.
            </p>
          ) : (
            <ConfigPanel cfg={satCfg} onChange={setSatCfg} />
          )}
        </div>

        {/* Save + Next Step */}
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
                Save timings first, then create class sections.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
              style={{
                padding: "10px 20px",
                background: saving ? "rgba(106,137,167,0.5)" : C.primary,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Saving…" : "Save Timings"}
            </button>
            <button
              onClick={() => navigate("/classes/sections")}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold"
              style={{
                padding: "10px 18px",
                background: saved ? "#10b981" : C.pale,
                border: `1.5px solid ${saved ? "#10b981" : C.border}`,
                color: saved ? "#fff" : C.mid,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.2s",
              }}
            >
              Next: Create Sections
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
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
