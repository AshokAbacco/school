import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  fetchTeacherClasses,
  fetchStudentsForAttendance,
  saveAttendance,
} from "../api/attendanceApi";
import PageLayout from "../../components/PageLayout";
import {
  Users,
  UserCheck,
  UserX,
  CalendarCheck,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Loader2,
  Search,
  CalendarDays,
  Check,
  X,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary: "#384959",
  secondary: "#6A89A7",
  accent: "#88BDF2",
  light: "#BDDDFC",
  border: "rgba(136,189,242,0.30)",
  bg: "#F4F8FC",
  cardBg: "white",
  softBg: "rgba(189,221,252,0.08)",
};

const STAT_CARDS = [
  { key: "PRESENT", label: "Present", icon: UserCheck, bar: "#22c55e" },
  { key: "ABSENT", label: "Absent", icon: UserX, bar: "#ef4444" },
];

// ── Toast System ──────────────────────────────────────────────────────────────
const TOAST_CFG = {
  success: {
    bg: "#f0fdf4",
    border: "#86efac",
    color: "#15803d",
    icon: CheckCircle,
    iconColor: "#22c55e",
  },
  error: {
    bg: "#fef2f2",
    border: "#fca5a5",
    color: "#b91c1c",
    icon: XCircle,
    iconColor: "#ef4444",
  },
  info: {
    bg: "#eff6ff",
    border: "#93c5fd",
    color: "#1d4ed8",
    icon: Info,
    iconColor: "#3b82f6",
  },
  absent: {
    bg: "#fef2f2",
    border: "#fca5a5",
    color: "#b91c1c",
    icon: XCircle,
    iconColor: "#ef4444",
  },
  present: {
    bg: "#f0fdf4",
    border: "#86efac",
    color: "#15803d",
    icon: CheckCircle,
    iconColor: "#22c55e",
  },
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const cfg = TOAST_CFG[t.type] || TOAST_CFG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "12px",
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              minWidth: "260px",
              maxWidth: "340px",
              pointerEvents: "auto",
              animation: "toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
              opacity: t.leaving ? 0 : 1,
              transform: t.leaving ? "translateX(20px)" : "translateX(0)",
              transition: t.leaving ? "all 0.2s ease" : "none",
            }}
          >
            <Icon size={16} style={{ color: cfg.iconColor, flexShrink: 0 }} />
            <span
              style={{
                color: cfg.color,
                fontSize: "13px",
                fontWeight: 600,
                flex: 1,
              }}
            >
              {t.message}
            </span>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: cfg.color,
                opacity: 0.5,
                padding: "0",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((p) => p.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 220);
  }, []);

  const toast = useCallback(
    (message, type = "info", duration = 2800) => {
      const id = Date.now() + Math.random();
      setToasts((p) => [...p, { id, message, type, leaving: false }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  return { toasts, toast, remove };
}

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toasts, toast, remove } = useToast();

  const loadStudents = useCallback(async (classId, yearId, targetDate) => {
    if (!classId || !yearId || !targetDate) return;
    setLoading(true);
    try {
      const res = await fetchStudentsForAttendance({
        classSectionId: classId,
        academicYearId: yearId,
        date: targetDate,
      });
      setStudents(res?.data || []);
    } catch (err) {
      console.error("Error fetching students:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetchTeacherClasses();
        const assignedClasses = res?.data || [];
        setClasses(assignedClasses);
        if (assignedClasses.length > 0) {
          const first = assignedClasses[0];
          setSelectedClassId(first.classSectionId);
          setAcademicYearId(first.academicYearId);
          loadStudents(first.classSectionId, first.academicYearId, date);
        }
      } catch (err) {
        console.error("Initialization error:", err.message);
      }
    };
    init();
  }, [loadStudents]);

  const handleStatusChange = (studentId, status, studentName) => {
    setStudents((p) =>
      p.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    );
    if (status === "PRESENT")
      toast(`${studentName} marked Present`, "present", 2000);
    if (status === "ABSENT")
      toast(`${studentName} marked Absent`, "absent", 2000);
  };

  const handleRemarksChange = (studentId, remarks) =>
    setStudents((p) =>
      p.map((s) => (s.studentId === studentId ? { ...s, remarks } : s)),
    );

  const markAllPresent = () => {
    setStudents((p) => p.map((s) => ({ ...s, status: "PRESENT" })));
    toast(`All ${students.length} students marked Present`, "success", 3000);
  };

  const summary = useMemo(() => {
    const r = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      HALF_DAY: 0,
      EXCUSED: 0,
      UNMARKED: 0,
    };
    students.forEach((s) => {
      if (!s.status) r.UNMARKED++;
      else r[s.status] = (r[s.status] || 0) + 1;
    });
    return r;
  }, [students]);

  const hasEmptyStatus = students.some((s) => !s.status || s.status === "");
  const completionPct = students.length
    ? Math.round(((students.length - summary.UNMARKED) / students.length) * 100)
    : 0;

  const handleSave = async () => {
    if (!students.length) return;
    if (hasEmptyStatus) {
      toast(
        `${summary.UNMARKED} student${summary.UNMARKED !== 1 ? "s" : ""} still unmarked`,
        "error",
        3500,
      );
      return;
    }
    try {
      setSaving(true);
      await saveAttendance({
        classSectionId: selectedClassId,
        academicYearId,
        date,
        records: students.filter((s) => s.status),
      });
      toast(
        `Attendance submitted — ${summary.PRESENT} present, ${summary.ABSENT} absent`,
        "success",
        4000,
      );
    } catch {
      toast("Failed to save attendance. Please try again.", "error", 4000);
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = classes.find(
    (c) => c.classSectionId === selectedClassId,
  );

  const ghostBtn = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "10px",
    border: `1px solid ${C.border}`,
    background: "white",
    color: C.secondary,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  return (
    <PageLayout>
      <div style={{ padding: "24px", background: C.bg, minHeight: "100vh" }}>
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2
              style={{
                color: C.primary,
                fontSize: "20px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Attendance Management
            </h2>
            <p
              style={{
                color: C.secondary,
                fontSize: "13px",
                fontWeight: 400,
                margin: "4px 0 0",
              }}
            >
              Mark and submit daily attendance for your assigned class
            </p>
          </div>

          {students.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "white",
                border: `1px solid ${C.border}`,
                borderRadius: "12px",
                padding: "8px 14px",
              }}
            >
              <CalendarCheck size={14} style={{ color: C.accent }} />
              <span
                style={{
                  color: C.secondary,
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Completion
              </span>
              <div
                style={{
                  width: "80px",
                  height: "4px",
                  background: "#E8F2FE",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${completionPct}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.secondary})`,
                    borderRadius: "99px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span
                style={{ color: C.primary, fontSize: "12px", fontWeight: 700 }}
              >
                {completionPct}%
              </span>
            </div>
          )}
        </div>

        {/* ── Stat Cards — Present & Absent only ───────────────────────── */}
        {students.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {STAT_CARDS.map(({ key, label, icon: Icon, bar }) => (
              <div
                key={key}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "16px",
                  background: "white",
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 3px rgba(136,189,242,0.10)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: bar,
                    borderRadius: "16px 16px 0 0",
                  }}
                />
                <div style={{ padding: "16px 18px 14px" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: `${bar}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <Icon size={15} style={{ color: bar }} />
                  </div>
                  <p
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: C.primary,
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {summary[key] ?? 0}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: C.secondary,
                      margin: "4px 0 0",
                    }}
                  >
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter Bar ──────────────────────────────────────────────── */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 3px rgba(136,189,242,0.08)",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: C.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Assigned Class
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const cls = classes.find(
                    (c) => c.classSectionId === e.target.value,
                  );
                  if (cls) {
                    setSelectedClassId(cls.classSectionId);
                    setAcademicYearId(cls.academicYearId);
                    loadStudents(cls.classSectionId, cls.academicYearId, date);
                  }
                }}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  padding: "8px 36px 8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: C.primary,
                  background: "white",
                  outline: "none",
                  cursor: "pointer",
                  minWidth: "220px",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {classes.map((cls) => (
                  <option key={cls.classSectionId} value={cls.classSectionId}>
                    {cls.grade}-{cls.section} ({cls.academicYearName})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.secondary,
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: C.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Date
            </label>
            <div style={{ position: "relative" }}>
              <CalendarDays
                size={13}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.secondary,
                  pointerEvents: "none",
                }}
              />
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (selectedClassId)
                    loadStudents(
                      selectedClassId,
                      academicYearId,
                      e.target.value,
                    );
                }}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: "10px",
                  padding: "8px 12px 8px 30px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: C.primary,
                  background: "white",
                  outline: "none",
                  fontFamily: "Inter, sans-serif",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={13} style={{ color: C.secondary }} />
              <span
                style={{
                  color: C.secondary,
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Active:
              </span>
              <span
                style={{
                  background: "rgba(136,189,242,0.18)",
                  color: C.primary,
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "20px",
                  padding: "2px 10px",
                }}
              >
                {students.length}
              </span>
            </div>
            <button
              onClick={() =>
                loadStudents(selectedClassId, academicYearId, date)
              }
              style={ghostBtn}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Main Table Card ──────────────────────────────────────────── */}
        {loading ? (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              border: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              gap: "12px",
            }}
          >
            <Loader2
              size={28}
              style={{ color: C.accent }}
              className="animate-spin"
            />
            <p
              style={{
                color: C.secondary,
                fontSize: "13px",
                fontWeight: 500,
                margin: 0,
              }}
            >
              Loading students…
            </p>
          </div>
        ) : students.length > 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              border: `1px solid ${C.border}`,
              boxShadow: "0 1px 3px rgba(136,189,242,0.08)",
              overflow: "hidden",
            }}
          >
            {/* Card inner header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                background: C.softBg,
                borderBottom: "1px solid rgba(136,189,242,0.20)",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {selectedClass && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "rgba(136,189,242,0.15)",
                      color: C.primary,
                    }}
                  >
                    Grade {selectedClass.grade} — Section{" "}
                    {selectedClass.section}
                  </span>
                )}
                {summary.UNMARKED > 0 ? (
                  <span
                    style={{
                      color: C.secondary,
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {summary.UNMARKED} student
                    {summary.UNMARKED !== 1 ? "s" : ""} unmarked
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#16a34a",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={12} /> All marked
                  </span>
                )}
              </div>
              <button
                onClick={markAllPresent}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: C.primary,
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = C.secondary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = C.primary)
                }
              >
                <CheckCircle2 size={13} />
                Mark All Present
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(189,221,252,0.12)" }}>
                    {[
                      { label: "Roll No", align: "left" },
                      { label: "Student Name", align: "left" },
                      { label: "Attendance", align: "center" },
                      { label: "Remarks", align: "left" },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        style={{
                          padding: "12px 20px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: C.secondary,
                          textAlign: align,
                          borderBottom: "1px solid rgba(136,189,242,0.20)",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? "white" : "rgba(189,221,252,0.05)";
                    const rowHover = "rgba(189,221,252,0.15)";
                    const isPresent = student.status === "PRESENT";
                    const isAbsent = student.status === "ABSENT";

                    return (
                      <tr
                        key={student.studentId}
                        style={{
                          borderBottom: "1px solid rgba(136,189,242,0.12)",
                          background: rowBg,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = rowHover)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = rowBg)
                        }
                      >
                        {/* Roll No */}
                        <td style={{ padding: "12px 20px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: "34px",
                              padding: "3px 8px",
                              background: "rgba(189,221,252,0.20)",
                              color: C.primary,
                              fontSize: "12px",
                              fontWeight: 700,
                              borderRadius: "8px",
                            }}
                          >
                            {student.rollNumber}
                          </span>
                        </td>

                        {/* Name */}
                        <td style={{ padding: "12px 20px" }}>
                          <p
                            style={{
                              color: C.primary,
                              fontSize: "14px",
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {student.name}
                          </p>
                        </td>

                        {/* ── Present / Absent toggle ── */}
                        <td
                          style={{ padding: "10px 20px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              borderRadius: "10px",
                              overflow: "hidden",
                              border: `1px solid ${C.border}`,
                            }}
                          >
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  student.studentId,
                                  "PRESENT",
                                  student.name,
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "7px 16px",
                                border: "none",
                                borderRight: `1px solid ${C.border}`,
                                background: isPresent
                                  ? "rgba(34,197,94,0.12)"
                                  : "white",
                                color: isPresent ? "#15803d" : C.secondary,
                                fontSize: "12px",
                                fontWeight: isPresent ? 700 : 500,
                                cursor: "pointer",
                                fontFamily: "Inter, sans-serif",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                if (!isPresent) {
                                  e.currentTarget.style.background =
                                    "rgba(34,197,94,0.06)";
                                  e.currentTarget.style.color = "#15803d";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isPresent) {
                                  e.currentTarget.style.background = "white";
                                  e.currentTarget.style.color = C.secondary;
                                }
                              }}
                            >
                              <Check
                                size={13}
                                strokeWidth={isPresent ? 3 : 2}
                              />
                              Present
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(
                                  student.studentId,
                                  "ABSENT",
                                  student.name,
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "7px 16px",
                                border: "none",
                                background: isAbsent
                                  ? "rgba(239,68,68,0.10)"
                                  : "white",
                                color: isAbsent ? "#b91c1c" : C.secondary,
                                fontSize: "12px",
                                fontWeight: isAbsent ? 700 : 500,
                                cursor: "pointer",
                                fontFamily: "Inter, sans-serif",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                if (!isAbsent) {
                                  e.currentTarget.style.background =
                                    "rgba(239,68,68,0.06)";
                                  e.currentTarget.style.color = "#b91c1c";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isAbsent) {
                                  e.currentTarget.style.background = "white";
                                  e.currentTarget.style.color = C.secondary;
                                }
                              }}
                            >
                              <X size={13} strokeWidth={isAbsent ? 3 : 2} />
                              Absent
                            </button>
                          </div>
                        </td>

                        {/* Remarks */}
                        <td style={{ padding: "12px 20px" }}>
                          <input
                            type="text"
                            value={student.remarks || ""}
                            onChange={(e) =>
                              handleRemarksChange(
                                student.studentId,
                                e.target.value,
                              )
                            }
                            placeholder="Add remark…"
                            style={{
                              width: "100%",
                              padding: "7px 12px",
                              borderRadius: "10px",
                              border: "1px solid transparent",
                              background: "rgba(189,221,252,0.12)",
                              color: C.primary,
                              fontSize: "13px",
                              fontWeight: 400,
                              outline: "none",
                              fontFamily: "Inter, sans-serif",
                              transition:
                                "border-color 0.15s, background 0.15s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = C.border;
                              e.target.style.background = "white";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "transparent";
                              e.target.style.background =
                                "rgba(189,221,252,0.12)";
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Card footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: C.softBg,
                borderTop: "1px solid rgba(136,189,242,0.20)",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <p
                style={{
                  color: C.secondary,
                  fontSize: "12px",
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {hasEmptyStatus
                  ? `${summary.UNMARKED} student${summary.UNMARKED !== 1 ? "s" : ""} still need attention`
                  : "All students marked — ready to submit"}
              </p>
              <button
                disabled={saving || hasEmptyStatus}
                onClick={handleSave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  border: "none",
                  background: C.primary,
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: saving || hasEmptyStatus ? "not-allowed" : "pointer",
                  opacity: saving || hasEmptyStatus ? 0.5 : 1,
                  fontFamily: "Inter, sans-serif",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!saving && !hasEmptyStatus)
                    e.currentTarget.style.background = C.secondary;
                }}
                onMouseLeave={(e) => {
                  if (!saving && !hasEmptyStatus)
                    e.currentTarget.style.background = C.primary;
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <CalendarCheck size={14} /> Submit Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: "16px",
              border: `1px solid ${C.border}`,
              padding: "80px 20px",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(189,221,252,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Search size={22} style={{ color: C.secondary }} />
            </div>
            <p
              style={{
                color: C.primary,
                fontSize: "14px",
                fontWeight: 600,
                margin: 0,
              }}
            >
              No students found
            </p>
            <p style={{ color: C.secondary, fontSize: "12px", margin: 0 }}>
              Select a class and date to load attendance
            </p>
          </div>
        )}
      </div>

      {/* ── Toast Portal ─────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </PageLayout>
  );
}
