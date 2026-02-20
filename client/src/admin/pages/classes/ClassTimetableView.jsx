// client/src/admin/pages/classes/ClassTimetableView.jsx
// FIX 1: Extra classes show in timetable grid (as special row per unique day)
// FIX 2: Edit Timetable navigates with classId so builder pre-selects correct class
// FIX 3: subjects loaded from class-specific assignments (classSubjects), not global list
// FIX 4: assignSubjectToClass now sends academicYearId to avoid 400 error

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Calendar,
  Edit,
  X,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchClassSectionById,
  fetchTimetableConfig,
  fetchTimetableEntries,
  fetchTeachersForDropdown,
  fetchAcademicYears,
  fetchSubjects,
} from "./api/classesApi";

// All days including SUNDAY for extra classes
const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const ALL_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const DAY_LABEL = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
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

// ── Extra Class Form ────────────────────────────────────────────────────────
function ExtraClassForm({ subjects, teachers, onSave, onCancel }) {
  const [form, setForm] = useState({
    day: "MONDAY",
    date: "",
    startTime: "",
    endTime: "",
    subjectId: "",
    teacherId: "",
    reason: "",
  });

  const handleSave = () => {
    if (
      !form.subjectId ||
      !form.teacherId ||
      !form.startTime ||
      !form.endTime
    ) {
      alert("Please fill Subject, Teacher, Start Time and End Time");
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="rounded-2xl bg-white shadow-sm mb-4"
      style={{ border: "1px solid rgba(245,158,11,0.3)", padding: "18px 20px" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)" }}
          >
            <Plus size={16} style={{ color: "#b45309" }} />
          </div>
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: "#384959" }}
            >
              Schedule Extra Class
            </h3>
            <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
              Add a special/extra class outside the regular timetable
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
        {/* Day */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            Day *
          </p>
          <select
            value={form.day}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
              background: "#fff",
            }}
          >
            {ALL_DAYS.map((d) => (
              <option key={d} value={d}>
                {DAY_LABEL[d]} {d === "SUNDAY" ? "(Extra/Special)" : ""}
              </option>
            ))}
          </select>
        </div>
        {/* Date */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            Date (optional)
          </p>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
        {/* Start Time */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            Start Time *
          </p>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, startTime: e.target.value }))
            }
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
        {/* End Time */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            End Time *
          </p>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, endTime: e.target.value }))
            }
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
            }}
          />
        </div>
        {/* Subject */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            Subject *
          </p>
          <select
            value={form.subjectId}
            onChange={(e) =>
              setForm((f) => ({ ...f, subjectId: e.target.value }))
            }
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
              background: "#fff",
            }}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {/* Teacher */}
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
            Teacher *
          </p>
          <select
            value={form.teacherId}
            onChange={(e) =>
              setForm((f) => ({ ...f, teacherId: e.target.value }))
            }
            className="w-full rounded-xl text-sm font-normal outline-none"
            style={{
              padding: "8px 11px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#384959",
              fontFamily: "Inter, sans-serif",
              background: "#fff",
            }}
          >
            <option value="">Select teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-1" style={{ color: "#384959" }}>
          Reason / Note
        </p>
        <input
          type="text"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="e.g. Makeup class, Special lecture, Holiday catch-up..."
          className="w-full rounded-xl text-sm font-normal outline-none"
          style={{
            padding: "8px 11px",
            border: "1.5px solid rgba(136,189,242,0.4)",
            color: "#384959",
            fontFamily: "Inter, sans-serif",
          }}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
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
        <button
          onClick={handleSave}
          className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
          style={{
            padding: "8px 18px",
            background: "#384959",
            border: "none",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <Save size={13} /> Schedule Extra Class
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ClassTimetableView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [activeYearId, setActiveYearId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [satSlots, setSatSlots] = useState([]);
  const [timetable, setTimetable] = useState({});
  // FIX 3: subjects are class-specific (from classSubjects), not global
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  // FIX 1: extra classes stored and shown in the grid
  const [extraClasses, setExtraClasses] = useState([]);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fmtTime = (t) => {
    if (!t) return "";
    const parts = t.split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  };

  const subjectColor = (subjectId) => {
    const idx = subjects.findIndex((s) => s.id === subjectId);
    return COLORS[idx >= 0 ? idx % COLORS.length : 0];
  };

  const getSlotsForDay = (day) =>
    day === "SATURDAY" && satSlots.length > 0 ? satSlots : slots;

  const SLOT_BG = {
    SHORT_BREAK: "rgba(136,189,242,0.1)",
    LUNCH_BREAK: "rgba(245,158,11,0.08)",
    PRAYER: "rgba(139,92,246,0.08)",
    OTHER: "rgba(106,137,167,0.08)",
  };

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetchClassSectionById(id),
      fetchAcademicYears(),
      fetchTeachersForDropdown(),
    ])
      .then(async ([classData, yearData, teacherData]) => {
        const cls = classData.classSection || classData;
        setClassInfo(cls);
        setTeachers(teacherData.teachers || teacherData.data || []);

        const activeYear =
          (yearData.academicYears || []).find((y) => y.isActive) ||
          (yearData.academicYears || [])[0];
        const yearId = activeYear?.id;
        setActiveYearId(yearId);

        if (yearId) {
          // Load class section WITH classSubjects for subject filtering (FIX 3)
          const [clsDetail, cfgData, entryData] = await Promise.all([
            fetchClassSectionById(id, { academicYearId: yearId }),
            fetchTimetableConfig({ academicYearId: yearId }),
            fetchTimetableEntries(id, { academicYearId: yearId }),
          ]);

          // FIX 3: Get subjects assigned to THIS class only
          const clsDetail2 = clsDetail.classSection || clsDetail;
          const assignedSubjectIds = new Set(
            (clsDetail2.classSubjects || []).map((cs) => cs.subjectId),
          );

          let classSubjectList = [];
          if (assignedSubjectIds.size > 0) {
            // Get full subject details from assigned subjects
            const allSubjectsData = await fetchSubjects();
            classSubjectList = (allSubjectsData.subjects || []).filter((s) =>
              assignedSubjectIds.has(s.id),
            );
          } else {
            // Fallback: if no class-specific subjects assigned, use classSubjects include
            classSubjectList = (clsDetail2.classSubjects || [])
              .map((cs) => cs.subject)
              .filter(Boolean);
          }
          setSubjects(classSubjectList);

          // Load timetable slots
          const allSlots = cfgData.config?.slots || [];
          setSlots(allSlots.filter((s) => s.slotOrder < 1000));
          setSatSlots(allSlots.filter((s) => s.slotOrder >= 1000));

          // Build timetable map
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
        }
      })
      .catch((err) => setToast({ type: "error", msg: err.message }))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Add extra class ────────────────────────────────────────────────────────
  const handleAddExtraClass = (form) => {
    const subject = subjects.find((s) => s.id === form.subjectId);
    const teacher = teachers.find((t) => t.id === form.teacherId);
    const newExtra = {
      ...form,
      id: `extra_${Date.now()}`,
      subjectName: subject?.name || "",
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
      subjectColor: subject ? subjectColor(form.subjectId) : COLORS[0],
    };
    setExtraClasses((prev) => [...prev, newExtra]);
    setShowExtraForm(false);
    setToast({
      type: "success",
      msg: `Extra class scheduled for ${DAY_LABEL[form.day]}!`,
    });
  };

  const removeExtraClass = (exId) => {
    setExtraClasses((prev) => prev.filter((e) => e.id !== exId));
  };

  // FIX 1: Group extra classes by day so we can render them in the grid
  const extraByDay = extraClasses.reduce((acc, ec) => {
    if (!acc[ec.day]) acc[ec.day] = [];
    acc[ec.day].push(ec);
    return acc;
  }, {});

  // Days that appear in the extra classes section (may include SUNDAY)
  const extraDays = [...new Set(extraClasses.map((ec) => ec.day))];
  // All days to render in the timetable (regular + extra days)
  const allTimetableDays = [
    ...DAYS,
    ...extraDays.filter((d) => !DAYS.includes(d)),
  ];

  // Completion %
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

  // FIX 2: Edit navigates to setup with classId param so builder pre-selects this class
  const handleEditTimetable = () => {
    navigate(`/classes/setup?classId=${id}`);
  };

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* ── Header ── */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/classes")}
            className="flex items-center gap-1.5 rounded-xl text-sm font-medium mb-3"
            style={{
              padding: "6px 12px",
              border: "1.5px solid rgba(136,189,242,0.4)",
              color: "#6A89A7",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(189,221,252,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ background: "#384959" }}
                />
                <h1
                  className="text-xl font-semibold"
                  style={{ color: "#384959" }}
                >
                  {classInfo
                    ? `Class ${classInfo.name} — Timetable`
                    : "Class Timetable"}
                </h1>
              </div>
              {classInfo && (
                <p
                  className="text-sm font-normal ml-3"
                  style={{ color: "#6A89A7" }}
                >
                  Grade {classInfo.grade} · Section {classInfo.section}
                  {classInfo.academicYearLinks?.[0]?.academicYear?.name &&
                    ` · ${classInfo.academicYearLinks[0].academicYear.name}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* FIX 2: Edit passes classId */}
              <button
                onClick={handleEditTimetable}
                className="flex items-center gap-2 rounded-xl text-sm font-medium"
                style={{
                  padding: "8px 14px",
                  background: "rgba(189,221,252,0.25)",
                  border: "1.5px solid rgba(136,189,242,0.35)",
                  color: "#384959",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Edit size={13} /> Edit Timetable
              </button>
              <button
                onClick={() => setShowExtraForm(true)}
                className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  padding: "8px 14px",
                  background: "#384959",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                <Plus size={13} /> Add Extra Class
              </button>
            </div>
          </div>
        </div>

        {/* ── Extra Class Form ── */}
        {showExtraForm && (
          <ExtraClassForm
            subjects={subjects}
            teachers={teachers}
            onSave={handleAddExtraClass}
            onCancel={() => setShowExtraForm(false)}
          />
        )}

        {/* ── Timetable ── */}
        {loading ? (
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              height: 200,
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
              height: 200,
              background: "rgba(189,221,252,0.08)",
              border: "1px solid rgba(136,189,242,0.22)",
            }}
          >
            <AlertCircle size={22} style={{ color: "#88BDF2" }} />
            <p
              className="text-sm font-normal mt-2"
              style={{ color: "#6A89A7" }}
            >
              No timetable found. Complete school timings setup first.
            </p>
            <button
              onClick={() => navigate("/classes/setup")}
              className="mt-3 text-sm font-medium rounded-xl"
              style={{
                padding: "7px 14px",
                background: "#384959",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Go to Setup
            </button>
          </div>
        ) : (
          <div
            className="rounded-2xl bg-white shadow-sm mb-5 overflow-hidden"
            style={{ border: "1px solid rgba(136,189,242,0.22)" }}
          >
            {/* Table header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                borderBottom: "1px solid rgba(136,189,242,0.18)",
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#384959" }}
                >
                  Weekly Timetable — Read Only
                </p>
                <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                  {pct()}% complete
                  {extraClasses.length > 0 &&
                    ` · ${extraClasses.length} extra class${extraClasses.length !== 1 ? "es" : ""}`}
                </p>
              </div>
              <div
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ background: "rgba(16,185,129,0.1)", color: "#065f46" }}
              >
                📋 View Mode
              </div>
            </div>

            {/* Table */}
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
                        width: 100,
                      }}
                    >
                      Slot
                    </th>
                    {allTimetableDays.map((day) => (
                      <th
                        key={day}
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: DAYS.includes(day) ? "#384959" : "#b45309",
                          borderRight: "1px solid rgba(136,189,242,0.18)",
                          background: !DAYS.includes(day)
                            ? "rgba(245,158,11,0.05)"
                            : "transparent",
                        }}
                      >
                        {DAY_LABEL[day]}
                        {!DAYS.includes(day) && (
                          <span
                            className="block text-xs font-normal"
                            style={{ color: "#f59e0b" }}
                          >
                            Extra
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Regular period rows */}
                  {slots.map((slot) => (
                    <tr
                      key={slot.id}
                      style={{
                        borderBottom: "1px solid rgba(136,189,242,0.12)",
                      }}
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
                              slot.slotType === "PERIOD"
                                ? "#384959"
                                : "#6A89A7",
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

                      {/* Day cells */}
                      {allTimetableDays.map((day) => {
                        const isExtraDay = !DAYS.includes(day);

                        // For extra days (like SUNDAY), show extra class if it exists for this slot time range
                        if (isExtraDay) {
                          const extrasForDay = extraByDay[day] || [];
                          // Match extra class by time overlap with this slot
                          const matchingExtra = extrasForDay.find(
                            (ec) =>
                              ec.startTime >= slot.startTime &&
                              ec.startTime < slot.endTime,
                          );
                          return (
                            <td
                              key={day}
                              style={{
                                padding: 4,
                                borderRight: "1px solid rgba(136,189,242,0.18)",
                                background: "rgba(245,158,11,0.04)",
                                verticalAlign: "top",
                              }}
                            >
                              {matchingExtra ? (
                                <div
                                  style={{
                                    padding: "6px 8px",
                                    borderRadius: 8,
                                    background:
                                      (matchingExtra.subjectColor ||
                                        COLORS[0]) + "18",
                                    border: `1.5px solid ${(matchingExtra.subjectColor || COLORS[0]) + "35"}`,
                                  }}
                                >
                                  <p
                                    className="text-sm font-semibold"
                                    style={{
                                      color:
                                        matchingExtra.subjectColor || COLORS[0],
                                    }}
                                  >
                                    {matchingExtra.subjectName}
                                  </p>
                                  <p
                                    className="text-sm font-normal"
                                    style={{ color: "#6A89A7" }}
                                  >
                                    {matchingExtra.teacherName}
                                  </p>
                                  <p
                                    className="text-xs font-normal"
                                    style={{ color: "#f59e0b" }}
                                  >
                                    Extra
                                  </p>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    minHeight: 44,
                                    borderRadius: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span
                                    className="text-sm font-normal"
                                    style={{ color: "#e5d9c7" }}
                                  >
                                    —
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // Regular day
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
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 8,
                                  background: color + "18",
                                  border: `1.5px solid ${color + "35"}`,
                                }}
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
                              </div>
                            ) : (
                              <div
                                style={{
                                  minHeight: 44,
                                  borderRadius: 8,
                                  border: "1.5px dashed rgba(136,189,242,0.2)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <span
                                  className="text-sm font-normal"
                                  style={{ color: "#BDDDFC" }}
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

                  {/* FIX 1: Extra-class-only rows for classes that don't match any regular slot time */}
                  {extraClasses
                    .filter((ec) => {
                      // Only show in a separate row if it doesn't overlap any existing slot
                      return !slots.some(
                        (s) =>
                          s.slotType === "PERIOD" &&
                          ec.startTime >= s.startTime &&
                          ec.startTime < s.endTime,
                      );
                    })
                    .map((ec) => (
                      <tr
                        key={`extra_row_${ec.id}`}
                        style={{
                          borderBottom: "1px solid rgba(136,189,242,0.12)",
                          background: "rgba(245,158,11,0.03)",
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 12px",
                            borderRight: "1px solid rgba(136,189,242,0.18)",
                            background: "rgba(245,158,11,0.06)",
                            verticalAlign: "middle",
                          }}
                        >
                          <p
                            className="text-sm font-medium"
                            style={{ color: "#b45309" }}
                          >
                            ⚡ Extra Class
                          </p>
                          <p
                            className="text-sm font-normal"
                            style={{ color: "#f59e0b" }}
                          >
                            {ec.startTime} – {ec.endTime}
                          </p>
                        </td>
                        {allTimetableDays.map((day) => {
                          if (day !== ec.day) {
                            return (
                              <td
                                key={day}
                                style={{
                                  padding: 4,
                                  borderRight:
                                    "1px solid rgba(136,189,242,0.18)",
                                }}
                              >
                                <div
                                  style={{
                                    minHeight: 40,
                                    borderRadius: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <span
                                    className="text-sm"
                                    style={{ color: "#BDDDFC" }}
                                  >
                                    —
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td
                              key={day}
                              style={{
                                padding: 4,
                                borderRight: "1px solid rgba(136,189,242,0.18)",
                              }}
                            >
                              <div
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 8,
                                  background:
                                    (ec.subjectColor || COLORS[0]) + "18",
                                  border: `1.5px solid ${(ec.subjectColor || COLORS[0]) + "35"}`,
                                  position: "relative",
                                }}
                              >
                                <span
                                  className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: "rgba(245,158,11,0.15)",
                                    color: "#b45309",
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                  }}
                                >
                                  Extra
                                </span>
                                <p
                                  className="text-sm font-semibold"
                                  style={{
                                    color: ec.subjectColor || COLORS[0],
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {ec.subjectName}
                                </p>
                                <p
                                  className="text-sm font-normal"
                                  style={{ color: "#6A89A7" }}
                                >
                                  {ec.teacherName}
                                </p>
                                {ec.reason && (
                                  <p
                                    className="text-xs font-normal mt-0.5"
                                    style={{ color: "#88BDF2" }}
                                  >
                                    {ec.reason}
                                  </p>
                                )}
                              </div>
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
              {subjects.length === 0 && (
                <p className="text-sm font-normal" style={{ color: "#88BDF2" }}>
                  No subjects assigned to this class yet.
                </p>
              )}
              {extraClasses.length > 0 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: "#f59e0b",
                    }}
                  />
                  <span
                    className="text-sm font-normal"
                    style={{ color: "#b45309" }}
                  >
                    Extra class
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Extra Classes Summary Section ── */}
        <div
          className="rounded-2xl bg-white shadow-sm mb-5"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom:
                extraClasses.length > 0
                  ? "1px solid rgba(136,189,242,0.18)"
                  : "none",
              background: "rgba(245,158,11,0.04)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.12)" }}
              >
                <Calendar size={14} style={{ color: "#b45309" }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#384959" }}
                >
                  Extra Classes
                </p>
                <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                  Special / makeup classes outside regular schedule
                  {extraClasses.length > 0 &&
                    ` · ${extraClasses.length} scheduled`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowExtraForm(true)}
              className="flex items-center gap-1.5 rounded-xl text-sm font-medium"
              style={{
                padding: "6px 12px",
                border: "1.5px solid rgba(245,158,11,0.4)",
                color: "#b45309",
                background: "rgba(245,158,11,0.08)",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Plus size={13} /> Add Extra Class
            </button>
          </div>

          {extraClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock size={24} style={{ color: "#BDDDFC" }} />
              <p
                className="text-sm font-normal mt-2"
                style={{ color: "#88BDF2" }}
              >
                No extra classes scheduled
              </p>
              <p className="text-sm font-normal" style={{ color: "#BDDDFC" }}>
                Click "Add Extra Class" to schedule a special class for any day
                including Sunday
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {extraClasses.map((ec) => {
                const color = ec.subjectColor || COLORS[0];
                return (
                  <div
                    key={ec.id}
                    className="flex items-center justify-between rounded-xl"
                    style={{
                      padding: "10px 14px",
                      background: color + "10",
                      border: `1px solid ${color + "25"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: color + "20", color }}
                      >
                        {ec.subjectName?.[0]}
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#384959" }}
                        >
                          {ec.subjectName}
                          {ec.reason && (
                            <span
                              className="text-sm font-normal ml-2"
                              style={{ color: "#6A89A7" }}
                            >
                              — {ec.reason}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              color: "#b45309",
                            }}
                          >
                            ⚡ {DAY_LABEL[ec.day]}
                          </span>
                          {ec.date && (
                            <span
                              className="text-xs font-normal"
                              style={{ color: "#6A89A7" }}
                            >
                              📅 {ec.date}
                            </span>
                          )}
                          <span
                            className="text-xs font-normal"
                            style={{ color: "#6A89A7" }}
                          >
                            🕐 {ec.startTime} – {ec.endTime}
                          </span>
                          <span
                            className="text-xs font-normal"
                            style={{ color: "#6A89A7" }}
                          >
                            👤 {ec.teacherName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeExtraClass(ec.id)}
                      style={{
                        padding: "5px 6px",
                        background: "rgba(239,68,68,0.08)",
                        border: "none",
                        borderRadius: 7,
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <Trash2 size={12} color="#ef4444" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {toast && (
          <Toast
            type={toast.type}
            msg={toast.msg}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}
