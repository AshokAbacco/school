// client/src/admin/pages/classes/ClassTimetableViewPage.jsx
// View-only timetable for a specific class section.
// Updated to support independent Saturday timings and layout.
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Edit,
  RefreshCw,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchClassSectionById,
  fetchTimetableConfig,
  fetchTimetableEntries,
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

const DAY_SHORT = {
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

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function ClassTimetableViewPage() {
  const { id: classSectionId } = useParams();
  const navigate = useNavigate();

  const [section, setSection] = useState(null);
  const [slots, setSlots] = useState([]);
  const [satSlots, setSatSlots] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [subjectColors, setSubjectColors] = useState({});
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (yId) => {
    setLoading(true);
    setError("");
    try {
      const [yd, sectionData] = await Promise.all([
        fetchAcademicYears(),
        fetchClassSectionById(classSectionId),
      ]);
      const yr = yd.academicYears || [];
      setYears(yr);
      setSection(sectionData.classSection);

      const activeYearId =
        yId || yearId || yr.find((y) => y.isActive)?.id || yr[0]?.id || "";
      if (activeYearId && !yearId) setYearId(activeYearId);

      if (!activeYearId) {
        setLoading(false);
        return;
      }

      const [cfgData, entryData] = await Promise.all([
        fetchTimetableConfig({ academicYearId: activeYearId }),
        fetchTimetableEntries(classSectionId, { academicYearId: activeYearId }),
      ]);

      const allSlots = cfgData.config?.periodDefinitions || [];
      setSlots(allSlots.filter((s) => s.dayType === "WEEKDAY"));
      setSatSlots(allSlots.filter((s) => s.dayType === "SATURDAY"));

      const map = {};
      const colorMap = {};
      let colorIdx = 0;

      [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ].forEach((d) => (map[d] = {}));

      (entryData.entries || []).forEach((e) => {
        if (!map[e.day]) map[e.day] = {};
        map[e.day][e.periodDefinitionId] = e;
        const sid = e.subject?.id || e.subjectId;
        if (sid && !colorMap[sid]) {
          colorMap[sid] = COLORS[colorIdx++ % COLORS.length];
        }
      });

      setTimetable(map);
      setSubjectColors(colorMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [classSectionId]);

  const totalFilled = Object.values(timetable).reduce(
    (sum, dayMap) => sum + Object.keys(dayMap).length,
    0,
  );

  const subjectColor = (sid) => subjectColors[sid] || C.light;

  // Build merged slot list: weekday slots + any sat-only breaks inserted at correct position
  const mergedGridSlots = (() => {
    if (satSlots.length === 0) return slots;
    const result = [...slots];
    const mondayBreakNumbers = new Set(
      slots.filter((s) => s.slotType !== "PERIOD").map((s) => s.periodNumber),
    );
    const satOnlyBreaks = satSlots.filter(
      (s) => s.slotType !== "PERIOD" && !mondayBreakNumbers.has(s.periodNumber),
    );
    satOnlyBreaks.forEach((brk) => {
      let insertAfter = -1;
      result.forEach((s, i) => {
        if (s.slotType === "PERIOD" && s.periodNumber <= brk.periodNumber)
          insertAfter = i;
      });
      result.splice(insertAfter + 1, 0, { ...brk, _satOnly: true });
    });
    return result;
  })();

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <button
              onClick={() => navigate("/classes")}
              className="flex items-center gap-1.5 rounded-xl text-sm font-medium px-3 py-1.5 border"
              style={{ borderColor: C.border, color: C.mid }}
            >
              <ArrowLeft size={14} /> Back to Classes
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(yearId)}
                className="p-2 border rounded-xl"
                style={{ borderColor: C.border }}
              >
                <RefreshCw size={13} style={{ color: C.mid }} />
              </button>
              <button
                onClick={() =>
                  navigate("/classes/timetable", {
                    state: { sectionId: classSectionId },
                  })
                }
                className="flex items-center gap-1.5 rounded-xl text-sm font-semibold text-white px-4 py-2"
                style={{ background: C.primary }}
              >
                <Edit size={13} /> Edit Timetable
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: C.primary }}
            />
            <h1
              className="text-xl font-semibold uppercase tracking-tight"
              style={{ color: C.primary }}
            >
              {section ? `${section.name} Timetable` : "Class Timetable"}
            </h1>
          </div>
          {section && (
            <p className="text-sm ml-3 opacity-70" style={{ color: C.mid }}>
              {section.grade} · Section {section.section || "A"}
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <select
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              load(e.target.value);
            }}
            className="rounded-xl text-sm font-medium px-3 py-2 border bg-white outline-none shadow-sm"
            style={{ borderColor: C.border, color: C.primary }}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isActive ? " (Active)" : ""}
              </option>
            ))}
          </select>
          {totalFilled > 0 && (
            <span
              className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
              style={{ background: "rgba(16,185,129,0.1)", color: "#065f46" }}
            >
              {totalFilled} slots filled
            </span>
          )}
        </div>

        {/* Main content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2
              size={30}
              className="animate-spin"
              style={{ color: C.light }}
            />
            <p
              className="text-xs font-medium uppercase"
              style={{ color: C.mid }}
            >
              Loading schedule...
            </p>
          </div>
        ) : error ? (
          <div
            className="bg-white rounded-2xl border p-12 text-center shadow-sm"
            style={{ borderColor: C.border }}
          >
            <AlertCircle
              size={40}
              className="mx-auto mb-4"
              style={{ color: "#ef4444" }}
            />
            <p className="text-sm font-bold mb-4" style={{ color: "#ef4444" }}>
              {error}
            </p>
            <button
              onClick={() => load(yearId)}
              className="px-6 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: C.primary }}
            >
              Retry
            </button>
          </div>
        ) : slots.length === 0 ? (
          <div
            className="bg-white rounded-2xl border p-16 text-center shadow-sm"
            style={{ borderColor: C.border }}
          >
            <Clock
              size={40}
              className="mx-auto mb-4"
              style={{ color: C.light }}
            />
            <p className="text-sm font-bold" style={{ color: C.primary }}>
              No Timetable Configuration
            </p>
            <p className="text-xs mt-1 mb-6" style={{ color: C.mid }}>
              Please configure school timings for this academic year first.
            </p>
            <button
              onClick={() => navigate("/classes/timings")}
              className="px-6 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: C.primary }}
            >
              Go to Timings
            </button>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════
                TRANSPOSED TIMETABLE
                ROWS    = Days (Mon → Fri, then Sat below divider)
                COLUMNS = Periods (Period 1, Period 2 … scrolls →)
                Day column is sticky on left for mobile scroll
            ═══════════════════════════════════════════════════ */}
            <div
              className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="overflow-x-auto">
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: `${100 + mergedGridSlots.length * 130}px`,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(189,221,252,0.08)",
                        borderBottom: `1.5px solid ${C.border}`,
                      }}
                    >
                      {/* Sticky DAY header */}
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.mid,
                          letterSpacing: "0.4px",
                          minWidth: 80,
                          position: "sticky",
                          left: 0,
                          background: "rgba(244,248,252,0.98)",
                          zIndex: 2,
                          borderRight: `1.5px solid ${C.border}`,
                        }}
                      >
                        DAY
                      </th>
                      {/* Period column headers */}
                      {mergedGridSlots.map((slot) => (
                        <th
                          key={slot.id}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            minWidth: slot.slotType === "PERIOD" ? 130 : 90,
                            background:
                              slot.slotType !== "PERIOD"
                                ? "rgba(189,221,252,0.08)"
                                : "rgba(244,248,252,0.98)",
                            borderRight: `1px solid ${C.border}`,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color:
                                slot.slotType === "PERIOD" ? C.primary : C.mid,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {slot.label}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: C.light,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtTime(slot.startTime)}–{fmtTime(slot.endTime)}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* ── Mon – Fri rows ── */}
                    {[
                      "MONDAY",
                      "TUESDAY",
                      "WEDNESDAY",
                      "THURSDAY",
                      "FRIDAY",
                    ].map((day) => (
                      <tr
                        key={day}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                      >
                        {/* Sticky day label */}
                        <td
                          style={{
                            padding: "8px 16px",
                            position: "sticky",
                            left: 0,
                            background: "rgba(244,248,252,0.98)",
                            zIndex: 1,
                            borderRight: `1.5px solid ${C.border}`,
                            minWidth: 80,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.primary,
                            }}
                          >
                            {DAY_SHORT[day]}
                          </p>
                        </td>
                        {/* Period cells */}
                        {mergedGridSlots.map((slot) => {
                          if (slot._satOnly) {
                            return (
                              <td
                                key={slot.id}
                                style={{
                                  padding: "5px 6px",
                                  background: "rgba(189,221,252,0.03)",
                                  borderRight: `1px solid ${C.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 52,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span
                                    style={{ fontSize: 10, color: C.border }}
                                  >
                                    —
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          if (slot.slotType !== "PERIOD") {
                            return (
                              <td
                                key={slot.id}
                                style={{
                                  padding: "6px 10px",
                                  background: "rgba(189,221,252,0.05)",
                                  borderRight: `1px solid ${C.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 48,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{ fontSize: 11, color: C.light }}
                                  >
                                    {slot.label}
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          const entry = timetable[day]?.[slot.id];
                          const color = entry
                            ? subjectColor(entry.subject?.id || entry.subjectId)
                            : null;
                          return (
                            <td
                              key={slot.id}
                              style={{
                                padding: "5px 6px",
                                borderRight: `1px solid ${C.border}`,
                              }}
                            >
                              {entry ? (
                                <div
                                  style={{
                                    minHeight: 52,
                                    padding: "6px 8px",
                                    borderRadius: 8,
                                    background: color + "14",
                                    border: `1.5px solid ${color}44`,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      marginBottom: 2,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: 2,
                                        background: color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <p
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: C.primary,
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {entry.subject?.name || "—"}
                                    </p>
                                  </div>
                                  <p style={{ fontSize: 10, color: C.mid }}>
                                    {entry.teacher
                                      ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                                      : "—"}
                                  </p>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    minHeight: 52,
                                    padding: "6px 8px",
                                    borderRadius: 8,
                                    background: "rgba(189,221,252,0.06)",
                                    border: `1.5px dashed ${C.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: C.light,
                                      opacity: 0.5,
                                    }}
                                  >
                                    —
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* ── Dashed divider between Mon–Fri and Saturday ── */}
                    {satSlots.length > 0 && (
                      <tr>
                        <td
                          colSpan={mergedGridSlots.length + 1}
                          style={{
                            padding: 0,
                            height: 4,
                            background: "rgba(136,189,242,0.12)",
                            borderTop: `2px dashed ${C.border}`,
                            borderBottom: `2px dashed ${C.border}`,
                          }}
                        />
                      </tr>
                    )}

                    {/* ── Saturday row ── */}
                    {satSlots.length > 0 &&
                      (() => {
                        const satPeriods = satSlots.filter(
                          (s) => s.slotType === "PERIOD",
                        ).length;
                        const wdPeriods = slots.filter(
                          (s) => s.slotType === "PERIOD",
                        ).length;
                        const isCustomSat =
                          satPeriods !== wdPeriods ||
                          satSlots[0]?.startTime !== slots[0]?.startTime;
                        return (
                          <tr
                            key="SATURDAY"
                            style={{ background: "rgba(136,189,242,0.03)" }}
                          >
                            <td
                              style={{
                                padding: "8px 16px",
                                position: "sticky",
                                left: 0,
                                background: "rgba(236,244,252,0.98)",
                                zIndex: 1,
                                borderRight: `1.5px solid ${C.border}`,
                                minWidth: 80,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: C.primary,
                                }}
                              >
                                Sat
                              </p>
                              {isCustomSat && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: "1px 4px",
                                    borderRadius: 3,
                                    background: "rgba(245,158,11,0.15)",
                                    color: "#b45309",
                                  }}
                                >
                                  CUSTOM
                                </span>
                              )}
                            </td>
                            {mergedGridSlots.map((slot) => {
                              const satSlot = slot._satOnly
                                ? slot
                                : satSlots.find(
                                    (s) =>
                                      s.periodNumber === slot.periodNumber &&
                                      s.slotType === slot.slotType,
                                  );

                              if (!satSlot) {
                                return (
                                  <td
                                    key={slot.id}
                                    style={{
                                      padding: "5px 6px",
                                      background: "rgba(189,221,252,0.03)",
                                      borderRight: `1px solid ${C.border}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        minHeight: 52,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: "rgba(136,189,242,0.4)",
                                        }}
                                      >
                                        —
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              if (satSlot.slotType !== "PERIOD") {
                                return (
                                  <td
                                    key={slot.id}
                                    style={{
                                      padding: "6px 10px",
                                      background: "rgba(136,189,242,0.06)",
                                      borderRight: `1px solid ${C.border}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        minHeight: 48,
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{ fontSize: 11, color: C.light }}
                                      >
                                        {satSlot.label.replace(
                                          /^(Sat\s)+/i,
                                          "",
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                );
                              }

                              const entry = timetable["SATURDAY"]?.[satSlot.id];
                              const color = entry
                                ? subjectColor(
                                    entry.subject?.id || entry.subjectId,
                                  )
                                : null;
                              return (
                                <td
                                  key={slot.id}
                                  style={{
                                    padding: "5px 6px",
                                    borderRight: `1px solid ${C.border}`,
                                  }}
                                >
                                  {entry ? (
                                    <div
                                      style={{
                                        minHeight: 52,
                                        padding: "6px 8px",
                                        borderRadius: 8,
                                        background: color + "14",
                                        border: `1.5px solid ${color}44`,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 4,
                                          marginBottom: 2,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: 2,
                                            background: color,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <p
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: C.primary,
                                            lineHeight: 1.2,
                                          }}
                                        >
                                          {entry.subject?.name || "—"}
                                        </p>
                                      </div>
                                      <p style={{ fontSize: 10, color: C.mid }}>
                                        {entry.teacher
                                          ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                                          : "—"}
                                      </p>
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        minHeight: 52,
                                        padding: "6px 8px",
                                        borderRadius: 8,
                                        background: "rgba(136,189,242,0.06)",
                                        border: `1.5px dashed rgba(136,189,242,0.3)`,
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: C.light,
                                          opacity: 0.5,
                                        }}
                                      >
                                        —
                                      </span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject legend */}
            {Object.keys(subjectColors).length > 0 && (
              <div
                className="bg-white rounded-2xl p-5 border shadow-sm"
                style={{ borderColor: C.border }}
              >
                <p
                  className="text-[10px] font-bold uppercase mb-4 tracking-widest"
                  style={{ color: C.mid }}
                >
                  Subject Legend
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(subjectColors).map(([id, color]) => {
                    const name = Object.values(timetable)
                      .flatMap((d) => Object.values(d))
                      .find((e) => (e.subject?.id || e.subjectId) === id)
                      ?.subject?.name;
                    if (!name) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold"
                        style={{
                          background: color + "08",
                          borderColor: color + "20",
                          color: C.primary,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: color,
                          }}
                        />
                        {name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
