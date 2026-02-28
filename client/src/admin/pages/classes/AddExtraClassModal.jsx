// client/src/admin/pages/classes/AddExtraClassModal.jsx
import { useState, useEffect } from "react";
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  BookOpen,
  User,
  Search,
  ChevronDown,
} from "lucide-react";

const C = {
  bg: "#F4F8FC",
  card: "#FFFFFF",
  primary: "#384959",
  mid: "#6A89A7",
  light: "#88BDF2",
  pale: "rgba(189,221,252,0.25)",
  border: "rgba(136,189,242,0.25)",
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
];

const DAYS_OF_WEEK = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const EXTRA_CLASS_TYPES = [
  {
    value: "WEEKEND",
    label: "Weekend Class",
    color: "#8b5cf6",
    desc: "Saturday or Sunday session",
  },
  {
    value: "HOLIDAY",
    label: "Holiday Class",
    color: "#ef4444",
    desc: "During a school holiday",
  },
  {
    value: "BEFORE_HOURS",
    label: "Before School",
    color: "#06b6d4",
    desc: "Before regular school hours",
  },
  {
    value: "AFTER_HOURS",
    label: "After School",
    color: "#f59e0b",
    desc: "After regular school hours",
  },
  {
    value: "OTHER",
    label: "Other",
    color: "#6A89A7",
    desc: "Any other extra session",
  },
];

// ── Small helpers ─────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <p
    className="text-xs font-semibold uppercase mb-1.5"
    style={{
      color: C.mid,
      letterSpacing: "0.5px",
      fontFamily: "Inter, sans-serif",
    }}
  >
    {children}
  </p>
);

const FieldWrap = ({ children, error }) => (
  <div className="mb-4">
    {children}
    {error && (
      <p
        className="text-xs mt-1 flex items-center gap-1"
        style={{ color: "#ef4444" }}
      >
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Props:
 *  open           boolean
 *  onClose        () => void
 *  onSave         (data) => Promise<void>    — called with form payload
 *  subjects       [{ id, name, code }]       — class subjects
 *  allTeachers    [{ id, firstName, lastName, department, designation }]
 *  editData?      existing ExtraClass object — when editing
 *  classSectionName string
 */
export default function AddExtraClassModal({
  open,
  onClose,
  onSave,
  subjects = [],
  allTeachers = [],
  editData = null,
  classSectionName = "",
}) {
  const isEditing = !!editData;

  // ── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState("WEEKEND");
  const [scheduleMode, setMode] = useState("recurring"); // "recurring" | "specific"
  const [recurringDays, setRecDays] = useState(["SATURDAY"]); // multi-select
  const [specificDate, setSpecDate] = useState("");
  const [startTime, setStart] = useState("09:00");
  const [endTime, setEnd] = useState("10:30");
  const [subjectId, setSubject] = useState("");
  const [teacherId, setTeacher] = useState("");
  const [reason, setReason] = useState("");

  // UI state
  const [teacherSearch, setTSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editData) {
      setType(editData.type || "OTHER");
      setMode(editData.recurringDays?.length ? "recurring" : "specific");
      setRecDays(
        editData.recurringDays?.length
          ? editData.recurringDays
          : editData.recurringDay
            ? [editData.recurringDay] // backwards compat with old single-day records
            : ["SATURDAY"],
      );
      setSpecDate(
        editData.specificDate
          ? new Date(editData.specificDate).toISOString().slice(0, 10)
          : "",
      );
      setStart(editData.startTime || "09:00");
      setEnd(editData.endTime || "10:30");
      setSubject(editData.subjectId || editData.subject?.id || "");
      setTeacher(editData.teacherId || editData.teacher?.id || "");
      setReason(editData.reason || "");
    } else {
      // reset
      setType("WEEKEND");
      setMode("recurring");
      setRecDays(["SATURDAY"]);
      setSpecDate("");
      setStart("09:00");
      setEnd("10:30");
      setSubject("");
      setTeacher("");
      setReason("");
    }
    setErrors({});
    setApiError("");
    setTSearch("");
  }, [open, editData]);

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!subjectId) e.subjectId = "Select a subject";
    if (!teacherId) e.teacherId = "Select a teacher";
    if (!startTime) e.startTime = "Start time required";
    if (!endTime) e.endTime = "End time required";
    if (startTime && endTime) {
      const toMin = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      if (toMin(endTime) <= toMin(startTime))
        e.endTime = "End time must be after start time";
    }
    if (scheduleMode === "recurring" && recurringDays.length === 0)
      e.recurringDays = "Select at least one day";
    if (scheduleMode === "specific" && !specificDate)
      e.specificDate = "Select a date";
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setApiError("");
    setSaving(true);
    try {
      const payload = {
        type,
        subjectId,
        teacherId,
        startTime,
        endTime,
        reason: reason.trim() || null,
        ...(scheduleMode === "recurring"
          ? { recurringDays, specificDate: null }
          : { specificDate, recurringDays: [] }),
      };
      await onSave(payload);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // ── Filtered teachers ─────────────────────────────────────────────────────
  const filteredTeachers = allTeachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    if (!q) return true;
    return (
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q) ||
      t.designation?.toLowerCase().includes(q)
    );
  });

  const selectedType = EXTRA_CLASS_TYPES.find((t) => t.value === type);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl flex flex-col"
        style={{
          width: "min(540px,95vw)",
          maxHeight: "92vh",
          border: `1px solid ${C.border}`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex justify-between items-center px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${selectedType?.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={16} style={{ color: selectedType?.color }} />
            </div>
            <div>
              <h3
                className="text-base font-semibold"
                style={{ color: C.primary, fontFamily: "Inter, sans-serif" }}
              >
                {isEditing ? "Edit Extra Class" : "Add Extra Class"}
              </h3>
              <p
                className="text-xs"
                style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
              >
                {classSectionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {/* API error banner */}
          {apiError && (
            <div
              className="flex items-start gap-2 rounded-xl mb-4 text-sm"
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                color: "#dc2626",
              }}
            >
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              {apiError}
            </div>
          )}

          {/* ── Type selector ── */}
          <FieldWrap>
            <Label>Class Type</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXTRA_CLASS_TYPES.map((t) => {
                const sel = type === t.value;
                return (
                  <div
                    key={t.value}
                    onClick={() => setType(t.value)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1.5px solid ${sel ? t.color : C.border}`,
                      background: sel ? `${t.color}12` : "#fff",
                      transition: "all 0.12s",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: t.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: sel ? t.color : C.primary,
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                    >
                      {t.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </FieldWrap>

          {/* ── Schedule mode: Recurring day vs Specific date ── */}
          <FieldWrap>
            <Label>Schedule</Label>
            <div className="flex gap-2 mb-3">
              {[
                { val: "recurring", label: "Every week (recurring)" },
                { val: "specific", label: "One-time (specific date)" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setMode(val)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    border: `1.5px solid ${scheduleMode === val ? C.primary : C.border}`,
                    background: scheduleMode === val ? C.primary : "#fff",
                    color: scheduleMode === val ? "#fff" : C.mid,
                    transition: "all 0.12s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {scheduleMode === "recurring" ? (
              <div>
                {/* Selected count badge */}
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-xs"
                    style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                  >
                    Select one or more days
                  </p>
                  {recurringDays.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 20,
                        background: C.primary,
                        color: "#fff",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {recurringDays.length} selected
                    </span>
                  )}
                </div>

                {/* Day pills — multi-select */}
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map((d) => {
                    const sel = recurringDays.includes(d.value);
                    return (
                      <div
                        key={d.value}
                        onClick={() => {
                          setRecDays((prev) =>
                            sel
                              ? prev.filter((v) => v !== d.value)
                              : [...prev, d.value],
                          );
                          setErrors((v) => ({ ...v, recurringDays: "" }));
                        }}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          textAlign: "center",
                          cursor: "pointer",
                          border: `1.5px solid ${sel ? C.primary : C.border}`,
                          background: sel ? C.primary : "#fff",
                          transition: "all 0.12s",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          userSelect: "none",
                        }}
                      >
                        {sel && (
                          <Check
                            size={11}
                            style={{ color: "#fff", flexShrink: 0 }}
                          />
                        )}
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: sel ? "#fff" : C.mid,
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {d.label.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick-select helpers */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    {
                      label: "Weekdays",
                      days: [
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                      ],
                    },
                    { label: "Weekend", days: ["SATURDAY", "SUNDAY"] },
                    { label: "All", days: DAYS_OF_WEEK.map((d) => d.value) },
                    { label: "Clear", days: [] },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      onClick={() => {
                        setRecDays(days);
                        setErrors((v) => ({ ...v, recurringDays: "" }));
                      }}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        border: `1.5px solid ${C.border}`,
                        background: label === "Clear" ? "transparent" : C.pale,
                        color: label === "Clear" ? "#ef4444" : C.mid,
                        transition: "all 0.12s",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {errors.recurringDays && (
                  <p
                    className="text-xs mt-1.5 flex items-center gap-1"
                    style={{
                      color: "#ef4444",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    <AlertCircle size={11} /> {errors.recurringDays}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div
                  className="flex items-center gap-2 rounded-xl"
                  style={{
                    padding: "8px 12px",
                    border: `1.5px solid ${errors.specificDate ? "#ef4444" : C.border}`,
                    background: "#fff",
                  }}
                >
                  <Calendar
                    size={14}
                    style={{ color: C.light, flexShrink: 0 }}
                  />
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => {
                      setSpecDate(e.target.value);
                      setErrors((v) => ({ ...v, specificDate: "" }));
                    }}
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: C.primary,
                      fontFamily: "Inter, sans-serif",
                      background: "transparent",
                      flex: 1,
                    }}
                  />
                </div>
                {errors.specificDate && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.specificDate}
                  </p>
                )}
              </div>
            )}
          </FieldWrap>

          {/* ── Time range ── */}
          <FieldWrap>
            <Label>Time</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p
                  className="text-xs mb-1"
                  style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                >
                  Start
                </p>
                <div
                  className="flex items-center gap-2 rounded-xl"
                  style={{
                    padding: "8px 12px",
                    border: `1.5px solid ${errors.startTime ? "#ef4444" : C.border}`,
                    background: "#fff",
                  }}
                >
                  <Clock size={13} style={{ color: C.light }} />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStart(e.target.value);
                      setErrors((v) => ({ ...v, startTime: "" }));
                    }}
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: C.primary,
                      fontFamily: "Inter, sans-serif",
                      background: "transparent",
                      flex: 1,
                    }}
                  />
                </div>
                {errors.startTime && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.startTime}
                  </p>
                )}
              </div>
              <div
                style={{
                  width: 16,
                  textAlign: "center",
                  marginTop: 18,
                  fontSize: 13,
                  color: C.mid,
                }}
              >
                →
              </div>
              <div className="flex-1">
                <p
                  className="text-xs mb-1"
                  style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
                >
                  End
                </p>
                <div
                  className="flex items-center gap-2 rounded-xl"
                  style={{
                    padding: "8px 12px",
                    border: `1.5px solid ${errors.endTime ? "#ef4444" : C.border}`,
                    background: "#fff",
                  }}
                >
                  <Clock size={13} style={{ color: C.light }} />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      setErrors((v) => ({ ...v, endTime: "" }));
                    }}
                    style={{
                      border: "none",
                      outline: "none",
                      fontSize: 13,
                      color: C.primary,
                      fontFamily: "Inter, sans-serif",
                      background: "transparent",
                      flex: 1,
                    }}
                  />
                </div>
                {errors.endTime && (
                  <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>
          </FieldWrap>

          {/* ── Subject picker ── */}
          <FieldWrap error={errors.subjectId}>
            <Label>Subject</Label>
            {subjects.length === 0 ? (
              <div
                className="flex items-center gap-2 rounded-xl text-sm"
                style={{
                  padding: "10px 12px",
                  background: "#fef9ec",
                  border: "1.5px solid #fde68a",
                  color: "#92400e",
                }}
              >
                <AlertCircle size={13} />
                No subjects assigned to this class. Assign subjects first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {subjects.map((s, i) => {
                  const color = COLORS[i % COLORS.length];
                  const sel = subjectId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSubject(s.id);
                        setErrors((v) => ({ ...v, subjectId: "" }));
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: `1.5px solid ${sel ? color : C.border}`,
                        background: sel ? `${color}15` : "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.12s",
                      }}
                    >
                      <span
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
                        style={{
                          color: sel ? color : C.primary,
                          fontFamily: "Inter, sans-serif",
                        }}
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
          </FieldWrap>

          {/* ── Teacher picker ── */}
          <FieldWrap error={errors.teacherId}>
            <Label>Teacher</Label>
            {/* Search box */}
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
                onChange={(e) => setTSearch(e.target.value)}
                placeholder="Search by name or department…"
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
                  onClick={() => setTSearch("")}
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

            {filteredTeachers.length === 0 ? (
              <p
                className="text-xs"
                style={{ color: C.mid, fontFamily: "Inter, sans-serif" }}
              >
                {teacherSearch
                  ? `No teachers match "${teacherSearch}"`
                  : "No teachers available"}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {filteredTeachers.map((t) => {
                  const sel = teacherId === t.id;
                  const initials = `${t.firstName?.[0] || ""}${t.lastName?.[0] || ""}`;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setTeacher(t.id);
                        setErrors((v) => ({ ...v, teacherId: "" }));
                      }}
                      style={{
                        padding: "8px 12px",
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
                            fontFamily: "Inter, sans-serif",
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
                            {t.designation && (
                              <span
                                className="text-xs"
                                style={{
                                  color: C.mid,
                                  fontFamily: "Inter, sans-serif",
                                }}
                              >
                                {t.designation}
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
            )}
          </FieldWrap>

          {/* ── Reason / note ── */}
          <FieldWrap>
            <Label>
              Reason / Note{" "}
              <span
                style={{
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                (optional)
              </span>
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Exam revision, Makeup class for missed session…"
              rows={2}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 10,
                border: `1.5px solid ${C.border}`,
                outline: "none",
                fontSize: 13,
                color: C.primary,
                fontFamily: "Inter, sans-serif",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </FieldWrap>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex justify-end gap-2 px-6 py-4 shrink-0"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              color: C.mid,
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
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold text-white rounded-xl"
            style={{
              padding: "8px 22px",
              background: saving ? "rgba(106,137,167,0.5)" : C.primary,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={14} />{" "}
                {isEditing ? "Save Changes" : "Add Extra Class"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
