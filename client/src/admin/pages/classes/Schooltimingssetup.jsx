// client/src/admin/pages/classes/SchoolTimingsSetup.jsx
import { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import {
  fetchTimetableConfig,
  saveTimetableConfig,
  fetchAcademicYears,
  fetchClassSections,
} from "./api/classesApi";

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

const defaultCfg = (short = false) => ({
  startTime: "09:00",
  endTime: short ? "13:00" : "15:30",
  periodDuration: 45,
  totalPeriods: short ? 5 : 7,
  breaks: short
    ? [
        {
          afterPeriod: 2,
          label: "Short Break",
          duration: 10,
          type: "SHORT_BREAK",
        },
      ]
    : [
        {
          afterPeriod: 2,
          label: "Short Break",
          duration: 10,
          type: "SHORT_BREAK",
        },
        {
          afterPeriod: 5,
          label: "Lunch Break",
          duration: 30,
          type: "LUNCH_BREAK",
        },
      ],
});

const SLOT_STYLE = {
  PERIOD: { bg: "rgba(189,221,252,0.3)", color: "#384959", icon: "📚" },
  SHORT_BREAK: { bg: "rgba(136,189,242,0.2)", color: "#6A89A7", icon: "☕" },
  LUNCH_BREAK: { bg: "rgba(245,158,11,0.15)", color: "#b45309", icon: "🍱" },
  PRAYER: { bg: "rgba(139,92,246,0.15)", color: "#7c3aed", icon: "🙏" },
  OTHER: { bg: "rgba(106,137,167,0.15)", color: "#6A89A7", icon: "⏱" },
};

function Field({ label, children }) {
  return (
    <div>
      <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Inp({ type = "text", value, onChange, placeholder, min, max }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full rounded-xl text-sm font-normal outline-none"
      style={{
        padding: "8px 11px",
        border: "1.5px solid rgba(136,189,242,0.4)",
        color: "#384959",
        fontFamily: "Inter, sans-serif",
        boxSizing: "border-box",
      }}
      onFocus={(e) => (e.target.style.borderColor = "#6A89A7")}
      onBlur={(e) => (e.target.style.borderColor = "rgba(136,189,242,0.4)")}
    />
  );
}

function ConfigPanel({ config, setConfig, label }) {
  const addBreak = () => {
    const used = config.breaks.map((b) => b.afterPeriod);
    const next = Array.from(
      { length: config.totalPeriods },
      (_, i) => i + 1,
    ).find((p) => !used.includes(p));
    if (!next) return;
    setConfig((c) => ({
      ...c,
      breaks: [
        ...c.breaks,
        {
          afterPeriod: next,
          label: "Break",
          duration: 15,
          type: "SHORT_BREAK",
        },
      ],
    }));
  };
  const removeBreak = (i) =>
    setConfig((c) => ({
      ...c,
      breaks: c.breaks.filter((_, idx) => idx !== i),
    }));
  const updBreak = (i, k, v) =>
    setConfig((c) => ({
      ...c,
      breaks: c.breaks.map((b, idx) => (idx === i ? { ...b, [k]: v } : b)),
    }));
  const preview = genSlots(config);

  return (
    <div>
      <p
        className="text-sm font-medium mb-3 uppercase"
        style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
      >
        {label}
      </p>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Field label="Start Time">
          <Inp
            type="time"
            value={config.startTime}
            onChange={(e) =>
              setConfig((c) => ({ ...c, startTime: e.target.value }))
            }
          />
        </Field>
        <Field label="End Time">
          <Inp
            type="time"
            value={config.endTime}
            onChange={(e) =>
              setConfig((c) => ({ ...c, endTime: e.target.value }))
            }
          />
        </Field>
        <Field label="Period (min)">
          <Inp
            type="number"
            value={config.periodDuration}
            min={15}
            max={120}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                periodDuration: Number(e.target.value),
              }))
            }
          />
        </Field>
        <Field label="Total Periods">
          <Inp
            type="number"
            value={config.totalPeriods}
            min={1}
            max={15}
            onChange={(e) =>
              setConfig((c) => ({ ...c, totalPeriods: Number(e.target.value) }))
            }
          />
        </Field>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-sm font-medium uppercase"
            style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
          >
            Breaks
          </p>
          <button
            onClick={addBreak}
            className="flex items-center gap-1 rounded-xl text-sm font-medium"
            style={{
              padding: "5px 12px",
              border: "1.5px solid rgba(136,189,242,0.5)",
              color: "#6A89A7",
              background: "rgba(189,221,252,0.15)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Plus size={13} /> Add Break
          </button>
        </div>
        {config.breaks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <select
              value={b.type}
              onChange={(e) => updBreak(i, "type", e.target.value)}
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "7px 9px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
                background: "#fff",
              }}
            >
              <option value="SHORT_BREAK">☕ Short Break</option>
              <option value="LUNCH_BREAK">🍱 Lunch Break</option>
              <option value="PRAYER">🙏 Prayer</option>
              <option value="OTHER">⏱ Other</option>
            </select>
            <input
              value={b.label}
              onChange={(e) => updBreak(i, "label", e.target.value)}
              placeholder="Label"
              className="flex-1 rounded-xl text-sm font-normal outline-none"
              style={{
                padding: "7px 10px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <span className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              After P
            </span>
            <input
              type="number"
              min={1}
              max={config.totalPeriods}
              value={b.afterPeriod}
              onChange={(e) =>
                updBreak(i, "afterPeriod", Number(e.target.value))
              }
              className="text-center rounded-xl text-sm font-medium outline-none"
              style={{
                width: 44,
                padding: "7px 4px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <input
              type="number"
              value={b.duration}
              onChange={(e) => updBreak(i, "duration", Number(e.target.value))}
              className="text-center rounded-xl text-sm font-medium outline-none"
              style={{
                width: 48,
                padding: "7px 4px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
              }}
            />
            <span className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              min
            </span>
            <button
              onClick={() => removeBreak(i)}
              style={{
                padding: "7px 9px",
                background: "rgba(239,68,68,0.08)",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
              }}
            >
              <Trash2 size={13} color="#ef4444" />
            </button>
          </div>
        ))}
      </div>
      <div
        className="rounded-xl p-3"
        style={{
          background: "rgba(189,221,252,0.15)",
          border: "1px solid rgba(136,189,242,0.25)",
        }}
      >
        <p
          className="text-sm font-medium mb-2 uppercase"
          style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
        >
          Preview
        </p>
        <div className="flex flex-wrap gap-2">
          {preview.map((s) => {
            const st = SLOT_STYLE[s.type] || SLOT_STYLE.OTHER;
            return (
              <div
                key={s.id}
                className="flex items-center gap-1 rounded-lg text-sm font-medium"
                style={{
                  padding: "4px 9px",
                  background: st.bg,
                  color: st.color,
                }}
              >
                {st.icon} {s.label}
                <span className="text-sm font-normal opacity-60 ml-1">
                  {fmtTime(s.start)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-sm font-normal" style={{ color: "#6A89A7" }}>
        {label}
      </span>
      <div
        onClick={onToggle}
        style={{
          width: 40,
          height: 22,
          borderRadius: 999,
          background: on ? "#6A89A7" : "rgba(136,189,242,0.35)",
          position: "relative",
          cursor: "pointer",
          transition: "background .2s",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#fff",
            position: "absolute",
            top: 2,
            left: on ? 20 : 2,
            transition: "left .2s",
            boxShadow: "0 1px 3px rgba(0,0,0,.2)",
          }}
        />
      </div>
    </label>
  );
}

export default function SchoolTimingsSetup({ onNext }) {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState([]);

  // null = not answered yet, true = same for all, false = per class
  const [sameForAll, setSameForAll] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Shared config
  const [weekday, setWeekday] = useState(defaultCfg(false));
  const [saturday, setSaturday] = useState(defaultCfg(true));
  const [satSame, setSatSame] = useState(true);

  // Per-class configs { [classId]: { weekday, saturday, satSame } }
  const [classConfigs, setClassConfigs] = useState({});

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([fetchAcademicYears(), fetchClassSections()])
      .then(([yd, cd]) => {
        setYears(yd.academicYears || []);
        const active = (yd.academicYears || []).find((y) => y.isActive);
        if (active) setYearId(active.id);
        setClasses(cd.classSections || []);
      })
      .catch(() => setToast({ type: "error", msg: "Failed to load data" }));
  }, []);

  useEffect(() => {
    if (!yearId) return;
    setFetching(true);
    fetchTimetableConfig({ academicYearId: yearId })
      .then((d) => {
        if (!d.config) return;
        const cfg = d.config;
        const wSlots = (cfg.slots || []).filter((s) => s.slotOrder < 1000);
        const sSlots = (cfg.slots || []).filter((s) => s.slotOrder >= 1000);
        const toBreaks = (slots) =>
          slots
            .filter((s) => s.slotType !== "PERIOD")
            .map((s) => {
              const prev = slots.filter(
                (ss) => ss.slotType === "PERIOD" && ss.slotOrder < s.slotOrder,
              ).length;
              return {
                afterPeriod: prev,
                label: s.label.replace("[Sat] ", ""),
                duration: toMin(s.endTime) - toMin(s.startTime),
                type: s.slotType,
              };
            });
        setWeekday({
          startTime: cfg.startTime,
          endTime: cfg.endTime,
          periodDuration: cfg.periodDuration,
          totalPeriods: cfg.totalPeriods,
          breaks: toBreaks(wSlots),
        });
        if (sSlots.length > 0) {
          setSatSame(false);
          setSaturday((p) => ({ ...p, breaks: toBreaks(sSlots) }));
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [yearId]);

  const getClassCfg = (cid) =>
    classConfigs[cid] || {
      weekday: defaultCfg(false),
      saturday: defaultCfg(true),
      satSame: true,
    };

  const setClassCfg = (cid, updater) =>
    setClassConfigs((prev) => ({ ...prev, [cid]: updater(getClassCfg(cid)) }));

  const handleSave = async () => {
    if (!yearId)
      return setToast({ type: "error", msg: "Select an academic year" });
    if (sameForAll === null)
      return setToast({
        type: "error",
        msg: "Please select whether all classes have the same timings",
      });
    setLoading(true);
    try {
      if (sameForAll) {
        await saveTimetableConfig({
          academicYearId: yearId,
          weekday,
          saturday: satSame ? weekday : saturday,
          satSameAsWeekday: satSame,
        });
      } else {
        const configured = classes.filter((c) => classConfigs[c.id]);
        if (configured.length === 0) {
          setLoading(false);
          return setToast({
            type: "error",
            msg: "Configure at least one class timing",
          });
        }
        const firstCfg = getClassCfg(configured[0].id);
        await saveTimetableConfig({
          academicYearId: yearId,
          weekday: firstCfg.weekday,
          saturday: firstCfg.satSame ? firstCfg.weekday : firstCfg.saturday,
          satSameAsWeekday: firstCfg.satSame,
        });
      }
      setToast({ type: "success", msg: "School timings saved!" });
      if (onNext) setTimeout(onNext, 600);
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedCls = classes.find((c) => c.id === selectedClassId);

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Year + Question card */}
      <div
        className="rounded-2xl bg-white mb-4 shadow-sm"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "18px 20px",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(189,221,252,0.3)" }}
          >
            <Clock size={16} style={{ color: "#6A89A7" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#384959" }}>
              School Timings
            </h2>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Define periods, breaks and daily schedule
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Year selector */}
          <div style={{ maxWidth: 280 }}>
            <Field label="Academic Year">
              <select
                value={yearId}
                onChange={(e) => setYearId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium outline-none"
                style={{
                  padding: "8px 11px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  color: "#384959",
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
            </Field>
          </div>

          {/* KEY QUESTION */}
          <div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "#384959" }}
            >
              Do all classes have the same school timings?
            </p>
            <p
              className="text-sm font-normal mb-3"
              style={{ color: "#6A89A7" }}
            >
              Some schools have different timings for different classes (e.g.
              senior classes have extra periods).
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setSameForAll(true);
                  setSelectedClassId(null);
                }}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `2px solid ${sameForAll === true ? "#384959" : "rgba(136,189,242,0.4)"}`,
                  background: sameForAll === true ? "#384959" : "transparent",
                  color: sameForAll === true ? "#fff" : "#6A89A7",
                }}
              >
                ✓ Yes — same for all
              </button>
              <button
                onClick={() => setSameForAll(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `2px solid ${sameForAll === false ? "#f59e0b" : "rgba(136,189,242,0.4)"}`,
                  background:
                    sameForAll === false
                      ? "rgba(245,158,11,0.1)"
                      : "transparent",
                  color: sameForAll === false ? "#b45309" : "#6A89A7",
                }}
              >
                ⚡ No — different per class
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Per-class configuration */}
      {sameForAll === false && (
        <div
          className="rounded-2xl bg-white mb-4 shadow-sm"
          style={{
            border: "1px solid rgba(136,189,242,0.22)",
            padding: "18px 20px",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <GraduationCap size={16} style={{ color: "#b45309" }} />
            </div>
            <div>
              <h3
                className="text-base font-semibold"
                style={{ color: "#384959" }}
              >
                Configure Per-Class Timings
              </h3>
              <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                Select each class to set its specific schedule. Configured
                classes are shown in green.
              </p>
            </div>
          </div>

          {classes.length === 0 ? (
            <div
              className="rounded-xl flex items-start gap-2 p-3"
              style={{
                background: "rgba(245,158,11,0.07)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <span>⚠️</span>
              <p className="text-sm font-normal" style={{ color: "#92400e" }}>
                No classes created yet. You can set a common timing now and
                configure per-class timings after adding classes in Step 3.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {classes.map((cls) => {
                const configured = !!classConfigs[cls.id];
                const isSelected = selectedClassId === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() =>
                      setSelectedClassId(isSelected ? null : cls.id)
                    }
                    style={{
                      padding: "7px 14px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      border: `2px solid ${isSelected ? "#384959" : configured ? "#10b981" : "rgba(136,189,242,0.3)"}`,
                      background: isSelected
                        ? "#384959"
                        : configured
                          ? "rgba(16,185,129,0.08)"
                          : "#fff",
                      color: isSelected
                        ? "#fff"
                        : configured
                          ? "#065f46"
                          : "#384959",
                    }}
                  >
                    {configured && !isSelected && "✓ "}
                    {cls.name}
                  </button>
                );
              })}
            </div>
          )}

          {selectedClassId && (
            <div
              style={{
                borderTop: "1px solid rgba(136,189,242,0.18)",
                paddingTop: 16,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#384959" }}
                >
                  Configuring schedule for:{" "}
                  <span style={{ color: "#384959" }}>{selectedCls?.name}</span>
                </p>
                <span
                  className="text-sm font-normal px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    color: "#b45309",
                  }}
                >
                  Per-class config
                </span>
              </div>

              <div className="mb-4">
                <ConfigPanel
                  config={getClassCfg(selectedClassId).weekday}
                  setConfig={(updater) =>
                    setClassCfg(selectedClassId, (prev) => ({
                      ...prev,
                      weekday:
                        typeof updater === "function"
                          ? updater(prev.weekday)
                          : updater,
                    }))
                  }
                  label={`${selectedCls?.name} — Weekday Schedule (Mon–Fri)`}
                />
              </div>

              <div
                className="rounded-xl mb-4"
                style={{
                  border: "1px solid rgba(136,189,242,0.18)",
                  padding: "14px 16px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#384959" }}
                  >
                    Saturday Schedule
                  </p>
                  <Toggle
                    on={getClassCfg(selectedClassId).satSame}
                    onToggle={() =>
                      setClassCfg(selectedClassId, (prev) => ({
                        ...prev,
                        satSame: !prev.satSame,
                      }))
                    }
                    label="Same as weekday"
                  />
                </div>
                {getClassCfg(selectedClassId).satSame ? (
                  <p
                    className="text-sm font-normal"
                    style={{ color: "#88BDF2" }}
                  >
                    Saturday follows weekday schedule for {selectedCls?.name}.
                  </p>
                ) : (
                  <ConfigPanel
                    config={getClassCfg(selectedClassId).saturday}
                    setConfig={(updater) =>
                      setClassCfg(selectedClassId, (prev) => ({
                        ...prev,
                        saturday:
                          typeof updater === "function"
                            ? updater(prev.saturday)
                            : updater,
                      }))
                    }
                    label="Saturday Schedule"
                  />
                )}
              </div>

              <div
                className="rounded-xl flex items-start gap-2"
                style={{
                  padding: "10px 14px",
                  background: "rgba(136,189,242,0.08)",
                  border: "1px solid rgba(136,189,242,0.2)",
                }}
              >
                <span>💡</span>
                <p className="text-sm font-normal" style={{ color: "#384959" }}>
                  After saving, you can schedule <strong>extra classes</strong>{" "}
                  (special/makeup periods) for {selectedCls?.name} from the
                  class timetable view.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared timing config (same for all) */}
      {sameForAll === true && (
        <>
          {fetching ? (
            <div
              className="flex items-center justify-center rounded-2xl mb-4"
              style={{
                height: 80,
                background: "rgba(189,221,252,0.1)",
                border: "1px solid rgba(136,189,242,0.22)",
              }}
            >
              <Loader2
                size={18}
                className="animate-spin mr-2"
                style={{ color: "#88BDF2" }}
              />
              <span
                className="text-sm font-normal"
                style={{ color: "#6A89A7" }}
              >
                Loading saved config...
              </span>
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl bg-white mb-4 shadow-sm"
                style={{
                  border: "1px solid rgba(136,189,242,0.22)",
                  padding: "18px 20px",
                }}
              >
                <ConfigPanel
                  config={weekday}
                  setConfig={setWeekday}
                  label="Weekday Schedule (Mon – Fri) — All Classes"
                />
              </div>

              <div
                className="rounded-2xl bg-white mb-5 shadow-sm"
                style={{
                  border: "1px solid rgba(136,189,242,0.22)",
                  padding: "18px 20px",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p
                      className="text-base font-medium"
                      style={{ color: "#384959" }}
                    >
                      Saturday Schedule
                    </p>
                    <p
                      className="text-sm font-normal"
                      style={{ color: "#6A89A7" }}
                    >
                      Separate config if Saturday differs from weekdays
                    </p>
                  </div>
                  <Toggle
                    on={satSame}
                    onToggle={() => setSatSame((s) => !s)}
                    label="Same as weekday"
                  />
                </div>
                {satSame ? (
                  <p
                    className="text-sm font-normal"
                    style={{ color: "#88BDF2" }}
                  >
                    Saturday will follow the same schedule as weekdays for all
                    classes.
                  </p>
                ) : (
                  <ConfigPanel
                    config={saturday}
                    setConfig={setSaturday}
                    label="Saturday Schedule"
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Save footer */}
      <div className="flex justify-between items-center">
        <div>
          {sameForAll === false && (
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              {Object.keys(classConfigs).length} of {classes.length} class(es)
              configured
            </p>
          )}
          {sameForAll === true && yearId && (
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Year: {years.find((y) => y.id === yearId)?.name || ""}
            </p>
          )}
          {sameForAll === null && (
            <p className="text-sm font-normal" style={{ color: "#BDDDFC" }}>
              Answer the question above to proceed
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading || !yearId || sameForAll === null}
          className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
          style={{
            padding: "9px 20px",
            background:
              loading || !yearId || sameForAll === null
                ? "rgba(106,137,167,0.4)"
                : "#384959",
            border: "none",
            cursor:
              loading || !yearId || sameForAll === null
                ? "not-allowed"
                : "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {loading ? "Saving..." : "Save & Continue →"}
        </button>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl shadow-lg text-sm font-medium z-50"
          style={{
            padding: "12px 18px",
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1.5px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: toast.type === "success" ? "#15803d" : "#dc2626",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}{" "}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
