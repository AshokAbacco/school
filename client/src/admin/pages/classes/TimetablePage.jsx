// client/src/admin/pages/classes/TimetablePage.jsx
// Standalone timetable builder — no step wizard.
// Features:
//  - All classes/sections available; pick one or get pre-selected via state.sectionId
//  - Ask: "Same pattern Mon–Fri?" — if Yes, setting Mon Period 1 fills Tue–Fri Period 1 too
//  - When editing, shows only subjects assigned to that class
//  - Teacher conflict detection
//  - Extra Classes section: add/edit/delete one-off or recurring extra sessions
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Grid3X3,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  ArrowLeft,
  Info,
  Trash2,
  ChevronDown,
  Search,
  Plus,
  Calendar,
  Clock,
  Pencil,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchClassSections,
  fetchTimetableConfig,
  fetchTimetableEntries,
  saveTimetableEntries,
  fetchAcademicYears,
  fetchClassSectionById,
  fetchTeachersForDropdown,
  fetchExtraClasses,
  saveExtraClass,
  updateExtraClass,
  deleteExtraClass,
} from "./api/classesApi";
import AddExtraClassModal from "./AddExtraClassModal";

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

const EXTRA_TYPE_COLORS = {
  WEEKEND: "#8b5cf6",
  HOLIDAY: "#ef4444",
  BEFORE_HOURS: "#06b6d4",
  AFTER_HOURS: "#f59e0b",
  OTHER: "#6A89A7",
};
const EXTRA_TYPE_LABELS = {
  WEEKEND: "Weekend",
  HOLIDAY: "Holiday",
  BEFORE_HOURS: "Before School",
  AFTER_HOURS: "After School",
  OTHER: "Other",
};
const DAY_FULL = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

// ─── Extra Class Card ──────────────────────────────────────────────────────────
function ExtraClassCard({ ec, onEdit, onDelete, subjectColor }) {
  const typeColor = EXTRA_TYPE_COLORS[ec.type] || "#6A89A7";
  const subColor = subjectColor(ec.subjectId || ec.subject?.id);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Remove this extra class?")) return;
    setDeleting(true);
    await onDelete(ec.id);
    setDeleting(false);
  };

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1.5px solid ${subColor}33`,
        background: `${subColor}08`,
        padding: "12px 14px",
        minWidth: 180,
        maxWidth: 220,
        position: "relative",
      }}
    >
      {/* Type badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.4px",
          padding: "2px 7px",
          borderRadius: 6,
          background: `${typeColor}18`,
          color: typeColor,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {EXTRA_TYPE_LABELS[ec.type] || ec.type}
      </span>

      {/* Day / Date */}
      <div className="flex items-center gap-1.5 mt-2 mb-1">
        <Calendar size={11} style={{ color: C.mid, flexShrink: 0 }} />
        <p
          className="text-xs font-semibold"
          style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
        >
          {ec.recurringDay
            ? `Every ${DAY_FULL[ec.recurringDay]}`
            : fmtDate(ec.specificDate)}
        </p>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={11} style={{ color: C.mid, flexShrink: 0 }} />
        <p
          className="text-xs"
          style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
        >
          {fmtTime(ec.startTime)} – {fmtTime(ec.endTime)}
        </p>
      </div>

      {/* Subject chip */}
      <div
        className="flex items-center gap-1.5 mb-1"
        style={{
          display: "inline-flex",
          padding: "3px 8px",
          borderRadius: 6,
          background: `${subColor}18`,
          border: `1px solid ${subColor}33`,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 1.5,
            background: subColor,
            flexShrink: 0,
          }}
        />
        <span
          className="text-xs font-semibold"
          style={{ color: subColor, fontFamily: "Inter, sans-serif" }}
        >
          {ec.subject?.name || "—"}
        </span>
      </div>

      {/* Teacher */}
      <p
        className="text-xs mt-1.5"
        style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
      >
        {ec.teacher ? `${ec.teacher.firstName} ${ec.teacher.lastName}` : "—"}
      </p>

      {/* Reason */}
      {ec.reason && (
        <p
          className="text-xs mt-1.5 italic"
          style={{
            color: C.mid,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.4,
          }}
        >
          "{ec.reason}"
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 mt-3">
        <button
          onClick={() => onEdit(ec)}
          style={{
            flex: 1,
            padding: "5px 0",
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 600,
            border: `1.5px solid ${C.border}`,
            background: "#fff",
            cursor: "pointer",
            color: C.mid,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <Pencil size={10} /> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1,
            padding: "5px 0",
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 600,
            border: "1.5px solid rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.06)",
            cursor: deleting ? "not-allowed" : "pointer",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {deleting ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Trash2 size={10} />
          )}
          {deleting ? "…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedId = location.state?.sectionId ?? null;

  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [slots, setSlots] = useState([]);
  const [satSlots, setSatSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [editCell, setEditCell] = useState(null);
  const [cellForm, setCellForm] = useState({ teacherId: "", subjectId: "" });
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [samePattern, setSamePattern] = useState(null);

  // ── Extra Classes state ───────────────────────────────────────────────────
  const [extraClasses, setExtraClasses] = useState([]);
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraModalOpen, setExtraModalOpen] = useState(false);
  const [extraEditData, setExtraEditData] = useState(null); // null = create mode

  // ── Load years + classes + all teachers on mount ───────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [yd, cd, td] = await Promise.all([
          fetchAcademicYears(),
          fetchClassSections(),
          fetchTeachersForDropdown(),
        ]);
        const yr = yd.academicYears || [];
        setYears(yr);
        const active = yr.find((y) => y.isActive);
        const activeId = active?.id || "";
        if (activeId) setYearId(activeId);
        const allSections = cd.classSections || [];
        setClasses(allSections);
        setAllTeachers(td.data || []);
        if (preSelectedId) {
          const pre = allSections.find((c) => c.id === preSelectedId);
          if (pre) setSelectedClass(pre);
        } else if (allSections.length > 0) {
          setSelectedClass(allSections[0]);
        }
      } catch (err) {
        setToast({ type: "error", msg: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load timetable config + entries + subjects + extra classes ─────────────
  useEffect(() => {
    if (!selectedClass || !yearId) return;
    setSubjects([]);
    setTimetable({});
    setSamePattern(null);
    setExtraClasses([]);
    setConfigLoading(true);
    setExtraLoading(true);

    Promise.all([
      fetchTimetableConfig({ academicYearId: yearId }),
      fetchTimetableEntries(selectedClass.id, { academicYearId: yearId }),
      fetchClassSectionById(selectedClass.id, { academicYearId: yearId }),
    ])
      .then(([cfgData, entryData, sectionData]) => {
        const allSlots = cfgData.config?.slots || [];
        setSlots(allSlots.filter((s) => s.slotOrder < 1000));
        setSatSlots(allSlots.filter((s) => s.slotOrder >= 1000));

        const classSubjects = (
          sectionData.classSection?.classSubjects || []
        ).map((cs) => cs.subject);
        setSubjects(classSubjects);

        const teacherAssignments =
          sectionData.classSection?.teacherAssignments || [];
        const uniqueTeachers = [];
        const seen = new Set();
        teacherAssignments.forEach((ta) => {
          if (!seen.has(ta.teacher.id)) {
            seen.add(ta.teacher.id);
            uniqueTeachers.push(ta.teacher);
          }
        });
        setTeachers(uniqueTeachers);

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
          };
        });
        setTimetable(map);

        const entryList = entryData.entries || [];
        if (entryList.length > 0) {
          const weekdayEntries = entryList.filter((e) => e.day !== "SATURDAY");
          const monEntries = weekdayEntries.filter((e) => e.day === "MONDAY");
          if (monEntries.length > 0) {
            const tueEntries = weekdayEntries.filter(
              (e) => e.day === "TUESDAY",
            );
            const monSlots = new Set(
              monEntries.map((e) => `${e.periodSlotId}:${e.subjectId}`),
            );
            const tueSlots = new Set(
              tueEntries.map((e) => `${e.periodSlotId}:${e.subjectId}`),
            );
            const isSame =
              monSlots.size === tueSlots.size &&
              [...monSlots].every((s) => tueSlots.has(s));
            setSamePattern(isSame ? true : false);
          }
        }
      })
      .catch((err) => setToast({ type: "error", msg: err.message }))
      .finally(() => setConfigLoading(false));

    // Load extra classes independently so they don't block the timetable grid
    fetchExtraClasses(selectedClass.id, { academicYearId: yearId })
      .then((data) => setExtraClasses(data.extraClasses || []))
      .catch((err) =>
        setToast({ type: "error", msg: `Extra classes: ${err.message}` }),
      )
      .finally(() => setExtraLoading(false));
  }, [selectedClass, yearId]);

  // ── Extra class handlers ───────────────────────────────────────────────────
  const handleExtraSave = async (payload) => {
    const data = { ...payload, academicYearId: yearId };
    if (extraEditData) {
      const res = await updateExtraClass(
        selectedClass.id,
        extraEditData.id,
        data,
      );
      setExtraClasses((prev) =>
        prev.map((ec) => (ec.id === extraEditData.id ? res.extraClass : ec)),
      );
      setToast({ type: "success", msg: "Extra class updated!" });
    } else {
      const res = await saveExtraClass(selectedClass.id, data);
      // POST returns extraClasses (array) when multiple days selected, or extraClass (single)
      const newItems = res.extraClasses || [res.extraClass];
      setExtraClasses((prev) => [...prev, ...newItems]);
      const count = newItems.length;
      setToast({
        type: "success",
        msg: count > 1 ? `${count} extra classes added!` : "Extra class added!",
      });
    }
    setExtraModalOpen(false);
    setExtraEditData(null);
  };

  const handleExtraEdit = (ec) => {
    setExtraEditData(ec);
    setExtraModalOpen(true);
  };

  const handleExtraDelete = async (extraClassId) => {
    await deleteExtraClass(selectedClass.id, extraClassId);
    setExtraClasses((prev) => prev.filter((ec) => ec.id !== extraClassId));
    setToast({ type: "success", msg: "Extra class removed" });
  };

  // ── Timetable helpers ──────────────────────────────────────────────────────
  const getSlotsForDay = (day) =>
    day === "SATURDAY" && satSlots.length > 0 ? satSlots : slots;

  const subjectColor = (id) => {
    const idx = subjects.findIndex((s) => s.id === id);
    return COLORS[idx >= 0 ? idx % COLORS.length : 0];
  };

  const openCell = (day, slot) => {
    if (slot.slotType !== "PERIOD") return;
    const existing = timetable[day]?.[slot.id] || {};
    setCellForm({
      teacherId: existing.teacherId || "",
      subjectId: existing.subjectId || "",
    });
    setTeacherSearch("");
    setEditCell({ day, slot });
  };

  const saveCell = () => {
    if (!editCell) return;
    const { day, slot } = editCell;
    const foundTeacher = allTeachers.find((t) => t.id === cellForm.teacherId);
    const cellData =
      cellForm.teacherId && cellForm.subjectId
        ? {
            teacherId: cellForm.teacherId,
            subjectId: cellForm.subjectId,
            teacherName: foundTeacher
              ? `${foundTeacher.firstName} ${foundTeacher.lastName}`
              : "",
            subjectName:
              subjects.find((s) => s.id === cellForm.subjectId)?.name || "",
          }
        : undefined;

    setTimetable((prev) => {
      const next = { ...prev };
      if (samePattern && day !== "SATURDAY") {
        ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].forEach(
          (d) => {
            next[d] = { ...(next[d] || {}) };
            if (cellData) next[d][slot.id] = cellData;
            else delete next[d][slot.id];
          },
        );
      } else {
        next[day] = { ...(next[day] || {}) };
        if (cellData) next[day][slot.id] = cellData;
        else delete next[day][slot.id];
      }
      return next;
    });
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
                subjectId: cell.subjectId,
                teacherId: cell.teacherId,
              });
            }
          });
      });
      await saveTimetableEntries(selectedClass.id, {
        academicYearId: yearId,
        entries,
      });
      setToast({ type: "success", msg: "Timetable saved!" });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const weekdays = DAYS.filter((d) => d !== "SATURDAY");
  const activeDays = satSlots.length > 0 ? DAYS : weekdays;

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
        {/* ── Header ── */}
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
              Timetable Builder
            </h1>
          </div>
          <p className="text-sm ml-3" style={{ color: C.mid }}>
            Assign subjects and teachers to class periods
          </p>
        </div>

        {/* ── Controls row ── */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div>
            <label
              className="text-xs font-semibold uppercase block mb-1"
              style={{
                color: C.mid,
                letterSpacing: "0.5px",
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
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " ✓" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="text-xs font-semibold uppercase block mb-1"
              style={{
                color: C.mid,
                letterSpacing: "0.5px",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Class Section
            </label>
            <select
              value={selectedClass?.id || ""}
              onChange={(e) =>
                setSelectedClass(classes.find((c) => c.id === e.target.value))
              }
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "8px 12px",
                border: `1.5px solid ${C.border}`,
                color: C.primary,
                fontFamily: "Inter, sans-serif",
                background: "#fff",
                minWidth: 160,
              }}
            >
              {(() => {
                const grades = [...new Set(classes.map((c) => c.grade))].sort(
                  (a, b) =>
                    isNaN(a) || isNaN(b)
                      ? a.localeCompare(b)
                      : Number(a) - Number(b),
                );
                return grades.map((grade) => {
                  const sections = classes.filter((c) => c.grade === grade);
                  return (
                    <optgroup key={grade} label={`Grade ${grade}`}>
                      {sections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                });
              })()}
            </select>
          </div>
        </div>

        {/* ── Mon–Fri same pattern question ── */}
        <div
          className="bg-white rounded-2xl shadow-sm mb-4 p-4"
          style={{
            border: `1.5px solid ${samePattern === null ? "#f59e0b" : C.border}`,
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "rgba(245,158,11,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Info size={14} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.primary }}>
                Same schedule Monday–Friday?
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.mid }}>
                If Yes: setting Period 1 on Monday automatically fills the same
                period for Tue–Fri. Saturday is always independent.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { val: true, label: "Yes — same Mon–Fri" },
              { val: false, label: "No — set each day individually" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                onClick={() => setSamePattern(val)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 9,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  border: `1.5px solid ${samePattern === val ? C.primary : C.border}`,
                  background: samePattern === val ? C.primary : "#fff",
                  color: samePattern === val ? "#fff" : C.mid,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── No subjects warning ── */}
        {!configLoading && selectedClass && subjects.length === 0 && (
          <div
            className="rounded-xl p-4 mb-4 flex items-start gap-3"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <AlertCircle
              size={16}
              style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#92400e" }}>
                No subjects assigned to {selectedClass.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#92400e" }}>
                Assign subjects to this class first via the Subjects page, then
                come back to build the timetable.
              </p>
            </div>
          </div>
        )}

        {/* ── Timetable grid ── */}
        {configLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={22}
              className="animate-spin"
              style={{ color: C.light }}
            />
          </div>
        ) : slots.length === 0 ? (
          <div
            className="bg-white rounded-2xl shadow-sm p-8 text-center mb-4"
            style={{ border: `1px solid ${C.border}` }}
          >
            <Grid3X3
              size={32}
              style={{ color: C.light, margin: "0 auto 12px" }}
            />
            <p className="text-sm font-semibold" style={{ color: C.primary }}>
              No timetable configuration found
            </p>
            <p className="text-xs mt-1 mb-4" style={{ color: C.mid }}>
              Set up school timings first to define periods and breaks.
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
              Set Up School Timings
            </button>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
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
                        minWidth: 100,
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
                          minWidth: 120,
                        }}
                      >
                        {DAY_SHORT[day]}
                        {samePattern &&
                          day !== "SATURDAY" &&
                          day !== "MONDAY" && (
                            <span
                              style={{
                                fontSize: 9,
                                color: C.light,
                                marginLeft: 4,
                              }}
                            >
                              auto
                            </span>
                          )}
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
                        const daySlots = getSlotsForDay(day);
                        const matchSlot =
                          daySlots.find(
                            (s) =>
                              s.slotType === slot.slotType &&
                              s.label.replace("[Sat] ", "") ===
                                slot.label.replace("[Sat] ", ""),
                          ) || slot;
                        if (slot.slotType !== "PERIOD") {
                          return (
                            <td
                              key={day}
                              style={{
                                padding: "8px 16px",
                                background: "rgba(189,221,252,0.05)",
                              }}
                            >
                              <span style={{ fontSize: 11, color: C.light }}>
                                {slot.label}
                              </span>
                            </td>
                          );
                        }
                        const cell = timetable[day]?.[matchSlot.id];
                        const color = cell
                          ? subjectColor(cell.subjectId)
                          : null;
                        return (
                          <td key={day} style={{ padding: "6px 10px" }}>
                            <div
                              onClick={() => openCell(day, matchSlot)}
                              style={{
                                minHeight: 52,
                                padding: "6px 8px",
                                borderRadius: 8,
                                cursor: "pointer",
                                background: cell
                                  ? color + "14"
                                  : "rgba(189,221,252,0.06)",
                                border: `1.5px solid ${cell ? color + "44" : C.border}`,
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = cell
                                  ? color + "22"
                                  : C.pale)
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = cell
                                  ? color + "14"
                                  : "rgba(189,221,252,0.06)")
                              }
                            >
                              {cell ? (
                                <div>
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
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      {cell.subjectName}
                                    </p>
                                  </div>
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: C.mid,
                                      fontFamily: "Inter, sans-serif",
                                    }}
                                  >
                                    {cell.teacherName}
                                  </p>
                                </div>
                              ) : (
                                <p
                                  style={{
                                    fontSize: 10,
                                    color: C.light,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  + Assign
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
          </div>
        )}

        {/* ── Save button ── */}
        <div className="flex justify-between items-center mb-8">
          <div>
            {samePattern !== null && (
              <p className="text-xs" style={{ color: C.mid }}>
                {samePattern
                  ? "✓ Same Mon–Fri pattern — editing any period applies to all weekdays"
                  : "Each day is configured individually"}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || samePattern === null}
            className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
            style={{
              padding: "10px 24px",
              background:
                samePattern === null
                  ? "rgba(106,137,167,0.35)"
                  : saving
                    ? "rgba(106,137,167,0.5)"
                    : C.primary,
              border: "none",
              cursor:
                saving || samePattern === null ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Saving…" : "Save Timetable"}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            EXTRA CLASSES SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        {selectedClass && (
          <div className="mb-6">
            {/* Section header */}
            <div
              className="flex items-center justify-between mb-4 px-5 py-3 rounded-2xl"
              style={{ background: "#fff", border: `1.5px solid ${C.border}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "rgba(139,92,246,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={15} style={{ color: "#8b5cf6" }} />
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: C.primary,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    Extra Classes
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                  >
                    Weekend, holiday or out-of-hours sessions for{" "}
                    {selectedClass.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setExtraEditData(null);
                  setExtraModalOpen(true);
                }}
                disabled={subjects.length === 0}
                className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-xl"
                style={{
                  padding: "8px 16px",
                  background:
                    subjects.length === 0
                      ? "rgba(106,137,167,0.35)"
                      : C.primary,
                  border: "none",
                  cursor: subjects.length === 0 ? "not-allowed" : "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
                title={
                  subjects.length === 0
                    ? "Assign subjects to this class first"
                    : "Add extra class"
                }
              >
                <Plus size={14} /> Add Extra Class
              </button>
            </div>

            {/* Extra class cards */}
            {extraLoading ? (
              <div
                className="flex items-center gap-2 py-6 px-2"
                style={{ color: C.mid }}
              >
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: C.light }}
                />
                <span
                  className="text-sm"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Loading extra classes…
                </span>
              </div>
            ) : extraClasses.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: "#fff",
                  border: `1.5px dashed ${C.border}`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(139,92,246,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <Calendar size={20} style={{ color: "#8b5cf6" }} />
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
                >
                  No extra classes yet
                </p>
                <p
                  className="text-xs"
                  style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                >
                  Add weekend or holiday sessions that fall outside regular
                  timetable slots.
                </p>
              </div>
            ) : (
              <>
                {/* Group by recurringDay / specificDate for easy scanning */}
                {(() => {
                  // Build groups: key = "rec:SATURDAY" or "date:2025-03-15"
                  const groups = {};
                  extraClasses.forEach((ec) => {
                    const key = ec.recurringDay
                      ? `rec:${ec.recurringDay}`
                      : `date:${ec.specificDate}`;
                    if (!groups[key]) groups[key] = { label: null, items: [] };
                    groups[key].label = ec.recurringDay
                      ? `Every ${DAY_FULL[ec.recurringDay]}`
                      : fmtDate(ec.specificDate);
                    groups[key].items.push(ec);
                  });

                  return Object.entries(groups).map(
                    ([key, { label, items }]) => (
                      <div key={key} className="mb-5">
                        {/* Group label */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="text-xs font-bold uppercase"
                            style={{
                              color: C.mid,
                              letterSpacing: "0.6px",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {label}
                          </span>
                          <div
                            style={{ flex: 1, height: 1, background: C.border }}
                          />
                          <span
                            className="text-xs font-semibold"
                            style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: C.pale,
                              color: C.mid,
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {items.length}{" "}
                            {items.length === 1 ? "class" : "classes"}
                          </span>
                        </div>

                        {/* Cards row */}
                        <div className="flex flex-wrap gap-3">
                          {items.map((ec) => (
                            <ExtraClassCard
                              key={ec.id}
                              ec={ec}
                              onEdit={handleExtraEdit}
                              onDelete={handleExtraDelete}
                              subjectColor={subjectColor}
                            />
                          ))}
                        </div>
                      </div>
                    ),
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Cell edit modal (existing) ── */}
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
              width: "min(460px,94vw)",
              padding: 24,
              maxHeight: "85vh",
              overflowY: "auto",
              border: `1px solid ${C.border}`,
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: C.primary }}
                >
                  Assign Period
                </h3>
                <p className="text-sm" style={{ color: C.mid }}>
                  {selectedClass?.name} · {DAY_SHORT[editCell.day]} ·{" "}
                  {editCell.slot.label}
                  {samePattern && editCell.day !== "SATURDAY" && (
                    <span className="ml-1 text-xs" style={{ color: "#f59e0b" }}>
                      (applies Mon–Fri)
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditCell(null)}
                style={{
                  border: "none",
                  background: C.pale,
                  borderRadius: 8,
                  padding: 7,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={15} style={{ color: C.mid }} />
              </button>
            </div>

            {/* Subject picker */}
            <div className="mb-4">
              <p
                className="text-xs font-semibold uppercase mb-2"
                style={{ color: C.mid, letterSpacing: "0.5px" }}
              >
                Subject
              </p>
              {subjects.length === 0 ? (
                <p className="text-sm" style={{ color: C.light }}>
                  No subjects assigned to this class
                </p>
              ) : (
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
                          border: `1.5px solid ${sel ? color : C.border}`,
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
                          style={{ color: sel ? color : C.primary }}
                        >
                          {s.name}
                        </span>
                        {sel && (
                          <Check
                            size={12}
                            style={{ color, marginLeft: "auto" }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Teacher picker */}
            <div className="mb-5">
              <p
                className="text-xs font-semibold uppercase mb-2"
                style={{ color: C.mid, letterSpacing: "0.5px" }}
              >
                Teacher
              </p>
              {allTeachers.length > 0 && (
                <div
                  className="flex items-center gap-2 mb-2 rounded-xl"
                  style={{
                    padding: "7px 11px",
                    border: `1.5px solid ${C.border}`,
                    background: "#fff",
                  }}
                >
                  <Search size={13} style={{ color: C.light, flexShrink: 0 }} />
                  <input
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search by name, department or qualification…"
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 12,
                      color: C.primary,
                      fontFamily: "Inter, sans-serif",
                      flex: 1,
                      background: "transparent",
                    }}
                  />
                  {teacherSearch && (
                    <button
                      onClick={() => setTeacherSearch("")}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        display: "flex",
                        padding: 0,
                      }}
                    >
                      <X size={12} style={{ color: C.mid }} />
                    </button>
                  )}
                </div>
              )}

              {allTeachers.length === 0 ? (
                <div
                  className="flex items-center gap-2 rounded-xl text-sm"
                  style={{
                    padding: "10px 12px",
                    background: "#fef9ec",
                    border: "1.5px solid #fde68a",
                    color: "#92400e",
                  }}
                >
                  <AlertCircle size={13} /> No teachers created yet. Add
                  teachers first.
                </div>
              ) : (
                (() => {
                  const q = teacherSearch.toLowerCase();
                  const filtered = allTeachers.filter(
                    (t) =>
                      !q ||
                      `${t.firstName} ${t.lastName}`
                        .toLowerCase()
                        .includes(q) ||
                      t.department?.toLowerCase().includes(q) ||
                      t.designation?.toLowerCase().includes(q) ||
                      t.qualification?.toLowerCase().includes(q),
                  );
                  return filtered.length === 0 ? (
                    <p
                      className="text-xs"
                      style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                    >
                      No teachers match "{teacherSearch}"
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                      {filtered.map((t) => {
                        const sel = cellForm.teacherId === t.id;
                        const initials = `${t.firstName?.[0] || ""}${t.lastName?.[0] || ""}`;
                        return (
                          <div
                            key={t.id}
                            onClick={() =>
                              setCellForm((f) => ({ ...f, teacherId: t.id }))
                            }
                            style={{
                              padding: "9px 12px",
                              borderRadius: 10,
                              cursor: "pointer",
                              border: `1.5px solid ${sel ? C.primary : C.border}`,
                              background: sel ? C.pale : "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.12s",
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{
                                  background: sel
                                    ? "rgba(56,73,89,0.18)"
                                    : "rgba(136,189,242,0.2)",
                                  color: C.primary,
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <p
                                  className="text-sm font-semibold"
                                  style={{
                                    color: C.primary,
                                    fontFamily: "Inter, sans-serif",
                                  }}
                                >
                                  {t.firstName} {t.lastName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {t.department && (
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                      style={{
                                        background: "rgba(79,70,229,0.09)",
                                        color: "#4f46e5",
                                        fontFamily: "Inter, sans-serif",
                                      }}
                                    >
                                      {t.department}
                                    </span>
                                  )}
                                  {t.qualification && (
                                    <span
                                      className="text-xs"
                                      style={{
                                        color: C.mid,
                                        fontFamily: "Inter, sans-serif",
                                      }}
                                    >
                                      {t.qualification}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {sel && (
                              <Check
                                size={14}
                                style={{ color: C.primary, flexShrink: 0 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditCell(null)}
                style={{
                  padding: "8px 16px",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 10,
                  color: C.mid,
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
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
                      : C.primary,
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

      {/* ── Add / Edit Extra Class Modal ── */}
      <AddExtraClassModal
        open={extraModalOpen}
        onClose={() => {
          setExtraModalOpen(false);
          setExtraEditData(null);
        }}
        onSave={handleExtraSave}
        subjects={subjects}
        allTeachers={allTeachers}
        editData={extraEditData}
        classSectionName={selectedClass?.name || ""}
      />

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
