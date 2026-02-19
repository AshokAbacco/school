// client/src/admin/pages/classes/TimetableBuilder.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Grid3X3,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  fetchClassSections,
  fetchTimetableConfig,
  fetchTimetableEntries,
  saveTimetableEntries,
  fetchSubjects,
  fetchTeachersForDropdown,
  fetchAcademicYears,
} from "./api/classesApi";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const DAY_LABEL = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
};
const COLORS = [
  "#6A89A7",
  "#88BDF2",
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#384959",
];

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

export default function TimetableBuilder({ onBack }) {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [slots, setSlots] = useState([]); // from timetable config (weekday only)
  const [satSlots, setSatSlots] = useState([]); // saturday slots
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  // timetable[day][slotId] = { teacherId, subjectId, entryId? }
  const [timetable, setTimetable] = useState({});
  const [editCell, setEditCell] = useState(null); // { day, slot }
  const [cellForm, setCellForm] = useState({ teacherId: "", subjectId: "" });
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [saved, setSaved] = useState(false);

  // Colour map for subjects
  const subjectColor = (id) => {
    const idx = subjects.findIndex((s) => s.id === id);
    return COLORS[idx >= 0 ? idx % COLORS.length : 0];
  };

  // Load years + subjects + teachers once
  useEffect(() => {
    (async () => {
      try {
        const [yd, sd, td] = await Promise.all([
          fetchAcademicYears(),
          fetchSubjects(),
          fetchTeachersForDropdown(),
        ]);
        const yr = yd.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        if (active) setYearId(active.id);
        setSubjects(sd.subjects || []);
        setTeachers(td.teachers || td.data || []);
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      }
    })();
  }, []);

  // Load classes when year changes
  useEffect(() => {
    if (!yearId) return;
    fetchClassSections({ academicYearId: yearId })
      .then((d) => {
        const list = d.classSections || [];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
      })
      .catch((err) => setToast({ type: "error", msg: err.message }));
  }, [yearId]);

  // Load timetable config + entries when class or year changes
  useEffect(() => {
    if (!selectedClass || !yearId) return;
    setConfigLoading(true);
    Promise.all([
      fetchTimetableConfig({ academicYearId: yearId }),
      fetchTimetableEntries(selectedClass.id, { academicYearId: yearId }),
    ])
      .then(([cfgData, entryData]) => {
        const allSlots = cfgData.config?.slots || [];
        setSlots(allSlots.filter((s) => s.slotOrder < 1000));
        setSatSlots(allSlots.filter((s) => s.slotOrder >= 1000));

        // Build timetable map from entries
        const map = {};
        DAYS.forEach((d) => (map[d] = {}));
        (entryData.entries || []).forEach((e) => {
          if (!map[e.day]) map[e.day] = {};
          map[e.day][e.periodSlotId] = {
            teacherId: e.teacher?.id || e.teacherId,
            subjectId: e.subject?.id || e.subjectId,
            teacherName: e.teacher
              ? `${e.teacher.firstName} ${e.teacher.lastName}`
              : "",
            subjectName: e.subject?.name || "",
            entryId: e.id,
          };
        });
        setTimetable(map);
      })
      .catch((err) => setToast({ type: "error", msg: err.message }))
      .finally(() => setConfigLoading(false));
  }, [selectedClass, yearId]);

  const getSlotsForDay = (day) =>
    day === "SATURDAY" && satSlots.length > 0 ? satSlots : slots;

  const openCell = (day, slot) => {
    if (slot.slotType !== "PERIOD") return;
    const existing = timetable[day]?.[slot.id] || {};
    setCellForm({
      teacherId: existing.teacherId || "",
      subjectId: existing.subjectId || "",
    });
    setEditCell({ day, slot });
  };

  const saveCell = () => {
    if (!editCell) return;
    const { day, slot } = editCell;
    setTimetable((t) => ({
      ...t,
      [day]: {
        ...(t[day] || {}),
        [slot.id]:
          cellForm.teacherId && cellForm.subjectId
            ? {
                teacherId: cellForm.teacherId,
                subjectId: cellForm.subjectId,
                teacherName: teachers.find((t) => t.id === cellForm.teacherId)
                  ? `${teachers.find((t) => t.id === cellForm.teacherId).firstName} ${teachers.find((t) => t.id === cellForm.teacherId).lastName}`
                  : "",
                subjectName:
                  subjects.find((s) => s.id === cellForm.subjectId)?.name || "",
              }
            : undefined,
      },
    }));
    setEditCell(null);
  };

  const clearCell = (day, slotId) => {
    setTimetable((t) => {
      const next = { ...(t[day] || {}) };
      delete next[slotId];
      return { ...t, [day]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedClass || !yearId) return;
    setSaving(true);
    try {
      const entries = [];
      DAYS.forEach((day) => {
        const daySlots = getSlotsForDay(day);
        daySlots
          .filter((s) => s.slotType === "PERIOD")
          .forEach((slot) => {
            const cell = timetable[day]?.[slot.id];
            if (cell?.teacherId && cell?.subjectId) {
              entries.push({
                day,
                periodSlotId: slot.id,
                teacherId: cell.teacherId,
                subjectId: cell.subjectId,
              });
            }
          });
      });
      await saveTimetableEntries(selectedClass.id, {
        academicYearId: yearId,
        entries,
      });
      setToast({
        type: "success",
        msg: `Timetable saved for ${selectedClass.name}`,
      });
      setSaved(true);
    } catch (err) {
      // Show conflict details if any
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const pct = () => {
    let total = 0,
      filled = 0;
    DAYS.forEach((day) => {
      getSlotsForDay(day)
        .filter((s) => s.slotType === "PERIOD")
        .forEach((s) => {
          total++;
          if (timetable[day]?.[s.id]?.teacherId) filled++;
        });
    });
    return total === 0 ? 0 : Math.round((filled / total) * 100);
  };

  const fmtTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const SLOT_BG = {
    SHORT_BREAK: "rgba(136,189,242,0.1)",
    LUNCH_BREAK: "rgba(245,158,11,0.08)",
    PRAYER: "rgba(139,92,246,0.08)",
    OTHER: "rgba(106,137,167,0.08)",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header controls */}
      <div
        className="rounded-2xl bg-white shadow-sm mb-4"
        style={{
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "16px 20px",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(189,221,252,0.3)" }}
          >
            <Grid3X3 size={16} style={{ color: "#6A89A7" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#384959" }}>
              Timetable Builder
            </h2>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Assign teacher & subject to each period per class
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: "#384959" }}
            >
              Academic Year
            </p>
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "7px 11px",
                border: "1.5px solid rgba(136,189,242,0.4)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
                background: "#fff",
              }}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Class pills */}
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {classes.map((cls, i) => {
              const color = COLORS[i % COLORS.length];
              const active = selectedClass?.id === cls.id;
              const p = (() => {
                // mini completion calc per class using current timetable
                if (active) return pct();
                return 0; // only calc for active class (perf)
              })();
              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `2px solid ${active ? color : "rgba(136,189,242,0.3)"}`,
                    background: active ? color + "15" : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: active ? color : "#384959" }}
                  >
                    {cls.name}
                  </p>
                  {active && (
                    <div className="flex items-center gap-1 mt-1">
                      <div
                        style={{
                          flex: 1,
                          height: 3,
                          background: "rgba(136,189,242,0.2)",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            height: 3,
                            borderRadius: 2,
                            background: color,
                            width: `${p}%`,
                            transition: "width .3s",
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-normal"
                        style={{ color: "#6A89A7" }}
                      >
                        {p}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Timetable grid */}
      {configLoading ? (
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            height: 120,
            background: "rgba(189,221,252,0.08)",
            border: "1px solid rgba(136,189,242,0.22)",
          }}
        >
          <Loader2
            size={22}
            className="animate-spin"
            style={{ color: "#88BDF2" }}
          />
        </div>
      ) : slots.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl"
          style={{
            height: 120,
            background: "rgba(189,221,252,0.08)",
            border: "1px solid rgba(136,189,242,0.22)",
          }}
        >
          <AlertCircle size={22} style={{ color: "#88BDF2" }} />
          <p className="text-sm font-normal mt-2" style={{ color: "#6A89A7" }}>
            No timetable config found. Complete Step 1 (School Timings) first.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl bg-white shadow-sm mb-5 overflow-hidden"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom: "1px solid rgba(136,189,242,0.18)",
              background: "rgba(189,221,252,0.08)",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "#384959" }}>
                Class {selectedClass?.name} — Weekly Timetable
              </p>
              <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                {pct()}% complete
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
              style={{
                padding: "8px 16px",
                background: saving ? "rgba(106,137,167,0.5)" : "#384959",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {saving ? "Saving…" : "Save Timetable"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 700,
              }}
            >
              <thead>
                <tr style={{ background: "rgba(189,221,252,0.1)" }}>
                  <th
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6A89A7",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderRight: "1px solid rgba(136,189,242,0.18)",
                      width: 90,
                    }}
                  >
                    Slot
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#384959",
                        borderRight: "1px solid rgba(136,189,242,0.18)",
                      }}
                    >
                      {DAY_LABEL[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr
                    key={slot.id}
                    style={{ borderBottom: "1px solid rgba(136,189,242,0.12)" }}
                  >
                    {/* Slot label */}
                    <td
                      style={{
                        padding: "8px 12px",
                        borderRight: "1px solid rgba(136,189,242,0.18)",
                        background: "rgba(189,221,252,0.06)",
                        verticalAlign: "middle",
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{
                          color:
                            slot.slotType === "PERIOD" ? "#384959" : "#6A89A7",
                        }}
                      >
                        {slot.slotType !== "PERIOD" &&
                          (slot.slotType === "LUNCH_BREAK"
                            ? "🍱 "
                            : slot.slotType === "SHORT_BREAK"
                              ? "☕ "
                              : "🙏 ")}
                        {slot.label}
                      </p>
                      <p
                        className="text-sm font-normal"
                        style={{ color: "#88BDF2" }}
                      >
                        {fmtTime(slot.startTime)}
                      </p>
                    </td>

                    {DAYS.map((day) => {
                      const daySlotsForDay = getSlotsForDay(day);
                      const thisSlot = daySlotsForDay.find(
                        (s) => s.label === slot.label || s.id === slot.id,
                      );

                      if (!thisSlot && day === "SATURDAY") {
                        return (
                          <td
                            key={day}
                            style={{
                              padding: 6,
                              borderRight: "1px solid rgba(136,189,242,0.18)",
                              background: "rgba(189,221,252,0.04)",
                              textAlign: "center",
                            }}
                          >
                            <span
                              className="text-sm font-normal"
                              style={{ color: "#BDDDFC" }}
                            >
                              —
                            </span>
                          </td>
                        );
                      }

                      if (slot.slotType !== "PERIOD") {
                        return (
                          <td
                            key={day}
                            colSpan={1}
                            style={{
                              padding: "6px 8px",
                              borderRight: "1px solid rgba(136,189,242,0.18)",
                              background:
                                SLOT_BG[slot.slotType] || "transparent",
                              textAlign: "center",
                            }}
                          >
                            <span
                              className="text-sm font-normal"
                              style={{ color: "#88BDF2" }}
                            >
                              {slot.label}
                            </span>
                          </td>
                        );
                      }

                      const cell = timetable[day]?.[slot.id];
                      const color = cell?.subjectId
                        ? subjectColor(cell.subjectId)
                        : null;

                      return (
                        <td
                          key={day}
                          style={{
                            padding: 4,
                            borderRight: "1px solid rgba(136,189,242,0.18)",
                            verticalAlign: "top",
                          }}
                        >
                          {cell ? (
                            <div
                              onClick={() => openCell(day, slot)}
                              style={{
                                padding: "6px 8px",
                                borderRadius: 8,
                                cursor: "pointer",
                                background: color + "18",
                                border: `1.5px solid ${color + "35"}`,
                                position: "relative",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.85")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              <p
                                className="text-sm font-semibold"
                                style={{ color, lineHeight: 1.2 }}
                              >
                                {cell.subjectName}
                              </p>
                              <p
                                className="text-sm font-normal"
                                style={{ color: "#6A89A7" }}
                              >
                                {cell.teacherName}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearCell(day, slot.id);
                                }}
                                style={{
                                  position: "absolute",
                                  top: 2,
                                  right: 2,
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  padding: 2,
                                  opacity: 0,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.opacity = "1")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.opacity = "0")
                                }
                              >
                                <X size={10} color="#ef4444" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => openCell(day, slot)}
                              style={{
                                minHeight: 44,
                                padding: "6px 4px",
                                borderRadius: 8,
                                cursor: "pointer",
                                border: "1.5px dashed rgba(136,189,242,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all .15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#6A89A7";
                                e.currentTarget.style.background =
                                  "rgba(189,221,252,0.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(136,189,242,0.3)";
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <Plus size={14} style={{ color: "#BDDDFC" }} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div
            className="flex flex-wrap gap-3 px-5 py-3"
            style={{ borderTop: "1px solid rgba(136,189,242,0.18)" }}
          >
            {subjects.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: COLORS[i % COLORS.length],
                  }}
                />
                <span
                  className="text-sm font-normal"
                  style={{ color: "#6A89A7" }}
                >
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl text-sm font-medium"
          style={{
            padding: "9px 18px",
            border: "1.5px solid rgba(136,189,242,0.4)",
            color: "#6A89A7",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          ← Back
        </button>
        {saved && (
          <span
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "#15803d" }}
          >
            <CheckCircle2 size={15} /> Timetable saved
          </span>
        )}
      </div>

      {/* Edit cell modal */}
      {editCell && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl"
            style={{
              width: "min(440px,90vw)",
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
              border: "1px solid rgba(136,189,242,0.3)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "#384959" }}
                >
                  Assign Period
                </h3>
                <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                  {selectedClass?.name} · {DAY_LABEL[editCell.day]} ·{" "}
                  {editCell.slot.label}
                  <span className="ml-1">
                    ({fmtTime(editCell.slot.startTime)}–
                    {fmtTime(editCell.slot.endTime)})
                  </span>
                </p>
              </div>
              <button
                onClick={() => setEditCell(null)}
                style={{
                  border: "none",
                  background: "rgba(189,221,252,0.2)",
                  borderRadius: 8,
                  padding: 7,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={15} style={{ color: "#6A89A7" }} />
              </button>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <p
                className="text-sm font-medium mb-2 uppercase"
                style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
              >
                Subject
              </p>
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s, i) => {
                  const color = COLORS[i % COLORS.length];
                  const sel = cellForm.subjectId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        setCellForm((f) => ({ ...f, subjectId: s.id }))
                      }
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: `1.5px solid ${sel ? color : "rgba(136,189,242,0.3)"}`,
                        background: sel ? color + "15" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: sel ? color : "#384959" }}
                      >
                        {s.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teacher */}
            <div className="mb-5">
              <p
                className="text-sm font-medium mb-2 uppercase"
                style={{ color: "#6A89A7", letterSpacing: "0.5px" }}
              >
                Teacher
              </p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {teachers.map((t) => {
                  const sel = cellForm.teacherId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() =>
                        setCellForm((f) => ({ ...f, teacherId: t.id }))
                      }
                      style={{
                        padding: "9px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: `1.5px solid ${sel ? "#6A89A7" : "rgba(136,189,242,0.3)"}`,
                        background: sel ? "rgba(189,221,252,0.2)" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                          style={{
                            background: sel
                              ? "rgba(106,137,167,0.3)"
                              : "rgba(189,221,252,0.2)",
                            color: "#384959",
                          }}
                        >
                          {t.firstName?.[0]}
                          {t.lastName?.[0]}
                        </div>
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{ color: "#384959" }}
                          >
                            {t.firstName} {t.lastName}
                          </p>
                          <p
                            className="text-sm font-normal"
                            style={{ color: "#6A89A7" }}
                          >
                            {t.designation}
                          </p>
                        </div>
                      </div>
                      {sel && <Check size={14} style={{ color: "#6A89A7" }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditCell(null)}
                style={{
                  padding: "8px 16px",
                  border: "1.5px solid rgba(136,189,242,0.4)",
                  borderRadius: 10,
                  color: "#6A89A7",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              {timetable[editCell.day]?.[editCell.slot.id] && (
                <button
                  onClick={() => {
                    clearCell(editCell.day, editCell.slot.id);
                    setEditCell(null);
                  }}
                  style={{
                    padding: "8px 14px",
                    border: "none",
                    borderRadius: 10,
                    color: "#ef4444",
                    background: "rgba(239,68,68,0.08)",
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
              <button
                onClick={saveCell}
                disabled={!cellForm.teacherId || !cellForm.subjectId}
                className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 18px",
                  background:
                    !cellForm.teacherId || !cellForm.subjectId
                      ? "rgba(106,137,167,0.4)"
                      : "#384959",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Check size={14} /> Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          type={toast.type}
          msg={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
