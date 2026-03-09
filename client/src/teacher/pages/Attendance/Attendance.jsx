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
  AlertCircle,
  BookOpen,
} from "lucide-react";

// ── Design tokens — matches CurriculumPage exactly ────────────────────────────
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
};

// ── Skeleton pulse (same as curriculum) ───────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: `${C.mist}55`,
      }}
    />
  );
}

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
    bg: `${C.mist}55`,
    border: C.sky,
    color: C.deep,
    icon: Info,
    iconColor: C.sky,
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
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
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
              gap: 10,
              padding: "12px 16px",
              borderRadius: 14,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              boxShadow: "0 4px 20px rgba(56,73,89,0.13)",
              minWidth: 260,
              maxWidth: 340,
              pointerEvents: "auto",
              fontFamily: "'Sora',sans-serif",
              opacity: t.leaving ? 0 : 1,
              transform: t.leaving ? "translateX(20px)" : "translateX(0)",
              transition: t.leaving ? "all 0.2s ease" : "none",
              animation: t.leaving
                ? "none"
                : "toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <Icon size={15} style={{ color: cfg.iconColor, flexShrink: 0 }} />
            <span
              style={{
                color: cfg.color,
                fontSize: 13,
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
                padding: 0,
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

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 18,
        border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}, ${C.deep})`,
          borderRadius: "18px 18px 0 0",
        }}
      />
      <div style={{ padding: "16px 18px 14px" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `${accent}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
            border: `1px solid ${accent}33`,
          }}
        >
          <Icon size={16} color={accent} strokeWidth={2} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            lineHeight: 1,
            fontFamily: "'Sora',sans-serif",
          }}
        >
          {value}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            fontWeight: 600,
            color: C.textLight,
            fontFamily: "'Sora',sans-serif",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Progress bar (reused from curriculum) ─────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontFamily: "'Sora',sans-serif",
            fontSize: 11,
            color: C.textLight,
            fontWeight: 500,
          }}
        >
          Completion
        </span>
        <span
          style={{
            fontFamily: "'Sora',sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: C.deep,
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 7,
          borderRadius: 99,
          background: `${C.mist}55`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
            borderRadius: 99,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initError, setInitError] = useState(null);
  const { toasts, toast, remove } = useToast();

  const filteredStudents = searchQuery.trim()
    ? students.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.rollNumber != null && String(s.rollNumber).includes(q)) ||
          (s.tempIndex != null && String(s.tempIndex).includes(q))
        );
      })
    : students;

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
    } catch {
      toast("Failed to load students. Please try again.", "error", 4000);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetchTeacherClasses();
        if (res?.activeAcademicYear)
          setActiveAcademicYear(res.activeAcademicYear);
        const assignedClasses = res?.data || [];
        setClasses(assignedClasses);
        if (assignedClasses.length > 0) {
          const first = assignedClasses[0];
          setSelectedClassId(first.classSectionId);
          setAcademicYearId(first.academicYearId);
        } else {
          setInitError(
            res?.activeAcademicYear
              ? `No classes assigned to you for ${res.activeAcademicYear.name}. Please contact admin.`
              : "No active academic year found. Please ask admin to activate the current year.",
          );
        }
      } catch {
        setInitError("Failed to load your classes. Please refresh the page.");
        toast("Failed to load your classes. Please refresh.", "error", 5000);
      }
    };
    init();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (selectedClassId && academicYearId && date)
      loadStudents(selectedClassId, academicYearId, date);
  }, [selectedClassId, academicYearId, date, loadStudents]);

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
    const r = { PRESENT: 0, ABSENT: 0, UNMARKED: 0 };
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
  const getClassLabel = (cls) =>
    cls.name || `${cls.grade}${cls.section ? `-${cls.section}` : ""}`;
  const selectedClass = classes.find(
    (c) => c.classSectionId === selectedClassId,
  );

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

  return (
    <PageLayout>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .att-page { padding: 20px 16px; }
        .att-filter-bar { flex-direction: column !important; }
        .att-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        @media (min-width: 480px) { .att-page { padding: 20px 20px; } }
        @media (min-width: 768px) { .att-page { padding: 24px 28px; } .att-filter-bar { flex-direction: row !important; } }
        @media (min-width: 1024px) { .att-page { padding: 28px 32px; } }
        tr:hover td { background: ${C.bg} !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <div
        className="att-page"
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: "'Sora',sans-serif",
          backgroundImage: `radial-gradient(circle at 15% 0%, ${C.mist}28 0%, transparent 50%)`,
        }}
      >
        {/* ── Page Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 4,
                height: 28,
                borderRadius: 99,
                background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                flexShrink: 0,
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(18px,5vw,26px)",
                fontWeight: 800,
                color: C.text,
                letterSpacing: "-0.5px",
              }}
            >
              Attendance
            </h1>
          </div>
          <p
            style={{
              margin: 0,
              paddingLeft: 14,
              fontSize: 12,
              color: C.textLight,
              fontWeight: 500,
            }}
          >
            {activeAcademicYear
              ? `Marking attendance for ${activeAcademicYear.name}`
              : "Mark and submit daily attendance for your assigned class"}
          </p>
        </div>

        {/* ── Error Banner ── */}
        {initError && (
          <div
            className="fade-up"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 14,
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              marginBottom: 18,
            }}
          >
            <AlertCircle
              size={15}
              style={{ color: "#d97706", flexShrink: 0 }}
            />
            <p
              style={{
                color: "#92400e",
                fontSize: 13,
                fontWeight: 500,
                margin: 0,
                fontFamily: "'Sora',sans-serif",
              }}
            >
              {initError}
            </p>
          </div>
        )}

        {/* ── Stat Cards ── */}
        {students.length > 0 && (
          <div
            className="att-stat-grid fade-up"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <StatCard
              label="Present"
              value={summary.PRESENT}
              icon={UserCheck}
              accent="#22c55e"
            />
            <StatCard
              label="Absent"
              value={summary.ABSENT}
              icon={UserX}
              accent="#ef4444"
            />
          </div>
        )}

        {/* ── Filter / Control Bar ── */}
        <div
          className="fade-up"
          style={{
            background: C.white,
            borderRadius: 18,
            border: `1.5px solid ${C.borderLight}`,
            boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
            padding: "16px 18px",
            marginBottom: 18,
          }}
        >
          <div
            className="att-filter-bar"
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* Class selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontFamily: "'Sora',sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textLight,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Class {activeAcademicYear ? `· ${activeAcademicYear.name}` : ""}
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
                    }
                  }}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "9px 36px 9px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    background: C.bg,
                    outline: "none",
                    cursor: "pointer",
                    minWidth: 220,
                    fontFamily: "'Sora',sans-serif",
                  }}
                >
                  {classes.length === 0 && (
                    <option value="">No classes assigned</option>
                  )}
                  {classes.map((cls) => (
                    <option key={cls.classSectionId} value={cls.classSectionId}>
                      {getClassLabel(cls)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textLight,
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Date picker */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontFamily: "'Sora',sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textLight,
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
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textLight,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "9px 14px 9px 32px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    background: C.bg,
                    outline: "none",
                    fontFamily: "'Sora',sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Right: student count + refresh + completion */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {students.length > 0 && (
                <div style={{ minWidth: 160 }}>
                  <ProgressBar pct={completionPct} />
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: `${C.mist}55`,
                  border: `1px solid ${C.borderLight}`,
                }}
              >
                <Users size={12} color={C.textLight} />
                <span
                  style={{
                    fontFamily: "'Sora',sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.deep,
                  }}
                >
                  {students.length}
                </span>
                <span
                  style={{
                    fontFamily: "'Sora',sans-serif",
                    fontSize: 11,
                    color: C.textLight,
                  }}
                >
                  students
                </span>
              </div>
              <button
                onClick={() =>
                  loadStudents(selectedClassId, academicYearId, date)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${C.border}`,
                  background: C.white,
                  color: C.textLight,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Sora',sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = C.white)
                }
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        {loading ? (
          <div
            className="fade-up"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  borderRadius: 16,
                  border: `1.5px solid ${C.borderLight}`,
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Pulse w={36} h={36} r={99} />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <Pulse w="40%" h={13} />
                    <Pulse w="20%" h={9} />
                  </div>
                  <Pulse w={160} h={34} r={10} />
                </div>
              </div>
            ))}
          </div>
        ) : students.length > 0 ? (
          <div
            className="fade-up"
            style={{
              background: C.white,
              borderRadius: 18,
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <div
              style={{
                padding: "14px 18px",
                background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
                borderBottom: `1.5px solid ${C.borderLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 10px ${C.sky}44`,
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={17} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.text,
                    }}
                  >
                    {selectedClass ? getClassLabel(selectedClass) : "Class"} —{" "}
                    {date}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
                    {students.length} student{students.length !== 1 ? "s" : ""}{" "}
                    enrolled
                    {activeAcademicYear ? ` · ${activeAcademicYear.name}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={markAllPresent}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: `${C.sky}18`,
                  border: `1px solid ${C.sky}44`,
                  color: C.deep,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Sora',sans-serif",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${C.sky}30`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = `${C.sky}18`)
                }
              >
                <CheckCircle2 size={13} /> Mark All Present
              </button>
            </div>

            {/* Search bar */}
            <div
              style={{
                padding: "10px 18px",
                borderBottom: `1.5px solid ${C.borderLight}`,
                background: `${C.bg}88`,
              }}
            >
              <div style={{ position: "relative", maxWidth: 360 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textLight,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by name or roll number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "8px 36px 8px 34px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: C.text,
                    background: C.white,
                    outline: "none",
                    fontFamily: "'Sora',sans-serif",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: C.textLight,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p
                  style={{
                    fontSize: 11,
                    color: C.textLight,
                    margin: "5px 0 0 2px",
                    fontFamily: "'Sora',sans-serif",
                  }}
                >
                  {filteredStudents.length} of {students.length} students
                </p>
              )}
            </div>

            {/* Student rows */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredStudents.map((student, idx) => {
                const isPresent = student.status === "PRESENT";
                const isAbsent = student.status === "ABSENT";
                const isUnmarked = !student.status;

                return (
                  <div
                    key={student.studentId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "13px 18px",
                      borderBottom: `1.5px solid ${C.borderLight}`,
                      background: isUnmarked ? `#fffbeb` : C.white,
                      transition: "background 0.15s",
                      flexWrap: "wrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!isUnmarked) e.currentTarget.style.background = C.bg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUnmarked
                        ? "#fffbeb"
                        : C.white;
                    }}
                  >
                    {/* Index */}
                    <span
                      style={{
                        fontFamily: "'Sora',sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.textLight,
                        width: 22,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Avatar + Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                        minWidth: 140,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: `0 2px 8px ${C.sky}44`,
                        }}
                      >
                        {student.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.text,
                            fontFamily: "'Sora',sans-serif",
                          }}
                        >
                          {student.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 10,
                            color: C.textLight,
                            fontFamily: "'Sora',sans-serif",
                          }}
                        >
                          Roll {student.rollNumber || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Present / Absent toggle */}
                    <div
                      style={{
                        display: "inline-flex",
                        borderRadius: 12,
                        border: `1.5px solid ${isPresent ? "#86efac" : isAbsent ? "#fca5a5" : C.border}`,
                        overflow: "hidden",
                        flexShrink: 0,
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
                          gap: 5,
                          padding: "8px 18px",
                          border: "none",
                          borderRight: `1.5px solid ${isPresent ? "#86efac" : C.borderLight}`,
                          background: isPresent
                            ? "rgba(34,197,94,0.12)"
                            : C.white,
                          color: isPresent ? "#15803d" : C.textLight,
                          fontSize: 12,
                          fontWeight: isPresent ? 800 : 600,
                          cursor: "pointer",
                          fontFamily: "'Sora',sans-serif",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isPresent) {
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.07)";
                            e.currentTarget.style.color = "#15803d";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPresent) {
                            e.currentTarget.style.background = C.white;
                            e.currentTarget.style.color = C.textLight;
                          }
                        }}
                      >
                        <Check size={13} strokeWidth={isPresent ? 3 : 2} />{" "}
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
                          gap: 5,
                          padding: "8px 18px",
                          border: "none",
                          background: isAbsent
                            ? "rgba(239,68,68,0.12)"
                            : C.white,
                          color: isAbsent ? "#b91c1c" : C.textLight,
                          fontSize: 12,
                          fontWeight: isAbsent ? 800 : 600,
                          cursor: "pointer",
                          fontFamily: "'Sora',sans-serif",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isAbsent) {
                            e.currentTarget.style.background =
                              "rgba(239,68,68,0.07)";
                            e.currentTarget.style.color = "#b91c1c";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isAbsent) {
                            e.currentTarget.style.background = C.white;
                            e.currentTarget.style.color = C.textLight;
                          }
                        }}
                      >
                        <X size={13} strokeWidth={isAbsent ? 3 : 2} /> Absent
                      </button>
                    </div>

                    {/* Remarks */}
                    <input
                      type="text"
                      value={student.remarks || ""}
                      onChange={(e) =>
                        handleRemarksChange(student.studentId, e.target.value)
                      }
                      placeholder="Add remark…"
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: `1.5px solid transparent`,
                        background: `${C.mist}33`,
                        color: C.text,
                        fontSize: 12,
                        fontWeight: 500,
                        outline: "none",
                        fontFamily: "'Sora',sans-serif",
                        transition: "border-color 0.15s, background 0.15s",
                        width: 160,
                        flexShrink: 0,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = C.sky;
                        e.target.style.background = C.white;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "transparent";
                        e.target.style.background = `${C.mist}33`;
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Card footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
                borderTop: `1.5px solid ${C.borderLight}`,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <p
                style={{
                  fontFamily: "'Sora',sans-serif",
                  fontSize: 12,
                  color: C.textLight,
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
                  gap: 7,
                  padding: "10px 24px",
                  borderRadius: 13,
                  border: "none",
                  background:
                    saving || hasEmptyStatus
                      ? C.border
                      : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: saving || hasEmptyStatus ? C.textLight : "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving || hasEmptyStatus ? "not-allowed" : "pointer",
                  fontFamily: "'Sora',sans-serif",
                  transition: "opacity 0.2s",
                  boxShadow:
                    saving || hasEmptyStatus
                      ? "none"
                      : `0 4px 12px ${C.deep}44`,
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
          /* Empty state */
          <div
            className="fade-up"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "50px 0",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: `${C.sky}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${C.sky}33`,
              }}
            >
              <Search size={26} color={C.sky} strokeWidth={1.5} />
            </div>
            <p
              style={{
                fontFamily: "'Sora',sans-serif",
                fontSize: 13,
                color: C.textLight,
                margin: 0,
              }}
            >
              {classes.length > 0
                ? "Select a class and date to load attendance"
                : "No classes assigned for the current academic year"}
            </p>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </PageLayout>
  );
}
