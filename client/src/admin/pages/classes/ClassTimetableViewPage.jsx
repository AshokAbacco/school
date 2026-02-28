// client/src/admin/pages/classes/ClassTimetableViewPage.jsx
// View-only timetable for a specific class section.
// Fixes the old inconsistent display bug by always fetching fresh data on mount.
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
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

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
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
  const [timetable, setTimetable] = useState({}); // day → { slotId → entry }
  const [subjectColors, setSubjectColors] = useState({});
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Fetch everything fresh every time ─────────────────────────────────────
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

      // Slots
      const allSlots = cfgData.config?.slots || [];
      setSlots(allSlots.filter((s) => s.slotOrder < 1000));
      setSatSlots(allSlots.filter((s) => s.slotOrder >= 1000));

      // Build timetable map
      const map = {};
      const colorMap = {};
      let colorIdx = 0;
      DAYS.forEach((d) => (map[d] = {}));
      (entryData.entries || []).forEach((e) => {
        if (!map[e.day]) map[e.day] = {};
        map[e.day][e.periodSlotId] = e;
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

  const handleYearChange = (yId) => {
    setYearId(yId);
    load(yId);
  };
  const getSlotsForDay = (day) =>
    day === "SATURDAY" && satSlots.length > 0 ? satSlots : slots;
  const activeDays =
    satSlots.length > 0 ? DAYS : DAYS.filter((d) => d !== "SATURDAY");

  // Count filled periods
  const totalFilled = Object.values(timetable).reduce(
    (sum, dayMap) => sum + Object.keys(dayMap).length,
    0,
  );

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <button
              onClick={() => navigate("/classes")}
              className="flex items-center gap-1.5 rounded-xl text-sm font-medium"
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => load(yearId)}
                style={{
                  padding: "6px 10px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 9,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={13} style={{ color: C.mid }} />
              </button>
              <button
                onClick={() =>
                  navigate("/classes/timetable", {
                    state: { sectionId: classSectionId },
                  })
                }
                className="flex items-center gap-1.5 rounded-xl text-sm font-semibold text-white"
                style={{
                  padding: "7px 16px",
                  background: C.primary,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
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
            <h1 className="text-xl font-semibold" style={{ color: C.primary }}>
              {section ? `${section.name} Timetable` : "Class Timetable"}
            </h1>
          </div>
          {section && (
            <p className="text-sm ml-3" style={{ color: C.mid }}>
              Grade {section.grade} · Section {section.section}
            </p>
          )}
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select
            value={yearId}
            onChange={(e) => handleYearChange(e.target.value)}
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
                {y.isActive ? " ✓" : ""}
              </option>
            ))}
          </select>
          {totalFilled > 0 && (
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(16,185,129,0.1)", color: "#065f46" }}
            >
              {totalFilled} periods scheduled
            </span>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle size={24} style={{ color: "#ef4444" }} />
            <p className="text-sm" style={{ color: "#ef4444" }}>
              {error}
            </p>
            <button
              onClick={() => load(yearId)}
              style={{
                padding: "8px 16px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                color: C.primary,
                background: C.pale,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Retry
            </button>
          </div>
        ) : slots.length === 0 ? (
          <div
            className="bg-white rounded-2xl shadow-sm p-10 text-center"
            style={{ border: `1px solid ${C.border}` }}
          >
            <Clock
              size={32}
              style={{ color: C.light, margin: "0 auto 12px" }}
            />
            <p className="text-sm font-semibold" style={{ color: C.primary }}>
              No timetable configuration found
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.mid }}>
              Set up school timings to configure period structure first.
            </p>
            <button
              onClick={() => navigate("/classes/timings")}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                background: C.primary,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Set Up Timings
            </button>
          </div>
        ) : totalFilled === 0 ? (
          <div
            className="bg-white rounded-2xl shadow-sm p-10 text-center"
            style={{ border: `1px solid ${C.border}` }}
          >
            <Calendar
              size={32}
              style={{ color: C.light, margin: "0 auto 12px" }}
            />
            <p className="text-sm font-semibold" style={{ color: C.primary }}>
              No timetable entries yet
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.mid }}>
              This class has no timetable for the selected academic year.
            </p>
            <button
              onClick={() =>
                navigate("/classes/timetable", {
                  state: { sectionId: classSectionId },
                })
              }
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                background: C.primary,
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              Build Timetable
            </button>
          </div>
        ) : (
          <>
            {/* Timetable grid */}
            <div
              className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="overflow-x-auto">
                <table
                  className="w-full"
                  style={{ borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(189,221,252,0.1)",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.mid,
                          fontFamily: "Inter, sans-serif",
                          minWidth: 110,
                        }}
                      >
                        Period
                      </th>
                      {activeDays.map((day) => (
                        <th
                          key={day}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.mid,
                            fontFamily: "Inter, sans-serif",
                            minWidth: 130,
                          }}
                        >
                          {DAY_SHORT[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getSlotsForDay("MONDAY").map((slot) => (
                      <tr
                        key={slot.id}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                      >
                        <td style={{ padding: "8px 16px" }}>
                          <p
                            className="text-xs font-semibold"
                            style={{
                              color:
                                slot.slotType === "PERIOD" ? C.primary : C.mid,
                            }}
                          >
                            {slot.label}
                          </p>
                          <p className="text-xs" style={{ color: C.light }}>
                            {fmtTime(slot.startTime)}–{fmtTime(slot.endTime)}
                          </p>
                        </td>
                        {activeDays.map((day) => {
                          if (slot.slotType !== "PERIOD") {
                            return (
                              <td
                                key={day}
                                style={{
                                  padding: "8px 16px",
                                  background: "rgba(189,221,252,0.04)",
                                }}
                              >
                                <span style={{ fontSize: 11, color: C.light }}>
                                  {slot.slotType === "LUNCH_BREAK"
                                    ? "Lunch"
                                    : "Break"}
                                </span>
                              </td>
                            );
                          }
                          const daySlots = getSlotsForDay(day);
                          const matchSlot =
                            daySlots.find(
                              (s) =>
                                s.slotType === slot.slotType &&
                                s.slotOrder === slot.slotOrder,
                            ) || slot;
                          const entry = timetable[day]?.[matchSlot.id];
                          const subjectId =
                            entry?.subject?.id || entry?.subjectId;
                          const color = subjectId
                            ? subjectColors[subjectId]
                            : null;
                          return (
                            <td key={day} style={{ padding: "6px 10px" }}>
                              {entry ? (
                                <div
                                  style={{
                                    padding: "7px 9px",
                                    borderRadius: 8,
                                    background: color + "14",
                                    border: `1.5px solid ${color + "44"}`,
                                  }}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
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
                                        fontFamily: "Inter, sans-serif",
                                      }}
                                    >
                                      {entry.subject?.name}
                                    </p>
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: C.mid,
                                      fontFamily: "Inter, sans-serif",
                                    }}
                                  >
                                    {entry.teacher?.firstName}{" "}
                                    {entry.teacher?.lastName}
                                  </p>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    padding: "7px 9px",
                                    borderRadius: 8,
                                    background: "rgba(189,221,252,0.06)",
                                    border: `1px dashed ${C.border}`,
                                    minHeight: 42,
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subject legend */}
            {Object.keys(subjectColors).length > 0 && (
              <div
                className="bg-white rounded-2xl shadow-sm p-4"
                style={{ border: `1px solid ${C.border}` }}
              >
                <p
                  className="text-xs font-semibold uppercase mb-3"
                  style={{ color: C.mid, letterSpacing: "0.5px" }}
                >
                  Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(subjectColors).map(([subjectId, color]) => {
                    const entry = Object.values(timetable)
                      .flatMap((d) => Object.values(d))
                      .find(
                        (e) => (e.subject?.id || e.subjectId) === subjectId,
                      );
                    const name = entry?.subject?.name;
                    if (!name) return null;
                    return (
                      <span
                        key={subjectId}
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                        style={{
                          background: color + "14",
                          color: C.primary,
                          border: `1px solid ${color + "33"}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 2,
                            background: color,
                          }}
                        />
                        {name}
                      </span>
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
