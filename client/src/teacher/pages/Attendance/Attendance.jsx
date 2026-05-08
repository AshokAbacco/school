// client/src/teacher/pages/Attendance/Attendance.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  fetchTeacherClasses,
  fetchStudentsForAttendance,
  saveAttendance,
} from "../api/attendanceApi";
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

// ── Design tokens ─────────────────────────────────────────────
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

// ── Skeleton pulse ────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

// ── Toast System ──────────────────────────────────────────────
const TOAST_CFG = {
  success: { bg: "#f0fdf4", border: "#86efac", color: "#15803d", icon: CheckCircle,  iconColor: "#22c55e" },
  error:   { bg: "#fef2f2", border: "#fca5a5", color: "#b91c1c", icon: XCircle,      iconColor: "#ef4444" },
  info:    { bg: `${C.mist}55`, border: C.sky,  color: C.deep,   icon: Info,          iconColor: C.sky    },
  absent:  { bg: "#fef2f2", border: "#fca5a5", color: "#b91c1c", icon: XCircle,      iconColor: "#ef4444" },
  present: { bg: "#f0fdf4", border: "#86efac", color: "#15803d", icon: CheckCircle,  iconColor: "#22c55e" },
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, left: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media (min-width: 480px) { .toast-wrap { left: auto !important; max-width: 340px !important; } }
      `}</style>
      {toasts.map((t) => {
        const cfg = TOAST_CFG[t.type] || TOAST_CFG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className="toast-wrap"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 14,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              boxShadow: "0 4px 20px rgba(56,73,89,0.13)",
              pointerEvents: "auto", fontFamily: "'DM Sans', sans-serif",
              opacity: t.leaving ? 0 : 1,
              transform: t.leaving ? "translateY(10px)" : "translateY(0)",
              transition: t.leaving ? "all 0.2s ease" : "none",
              animation: t.leaving ? "none" : "toastIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <Icon size={15} style={{ color: cfg.iconColor, flexShrink: 0 }} />
            <span style={{ color: cfg.color, fontSize: 13, fontWeight: 600, flex: 1 }}>{t.message}</span>
            <button onClick={() => onRemove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: cfg.color, opacity: 0.5, padding: 0, display: "flex" }}>
              <X size={13} />
            </button>
          </div>
        );
      })}
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
  const toast = useCallback((message, type = "info", duration = 2800) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type, leaving: false }]);
    timers.current[id] = setTimeout(() => remove(id), duration);
  }, [remove]);
  return { toasts, toast, remove };
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      border: `1.5px solid ${C.borderLight}`,
      boxShadow: "0 2px 12px rgba(56,73,89,0.06)",
      overflow: "hidden", position: "relative",
      padding: "14px 16px",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${C.deep})` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${accent}28` }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1, fontFamily: "'DM Sans', sans-serif" }}>{value}</p>
          <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 600, color: C.textLight, fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ pct }) {
  const color = pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.textLight, fontWeight: 500 }}>Attendance</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: `${C.mist}55`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function Attendance() {
  const [classes, setClasses]               = useState([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [academicYearId, setAcademicYearId]   = useState("");
  const [date, setDate]                       = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents]               = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [initError, setInitError]             = useState(null);
  const { toasts, toast, remove }             = useToast();
  const [sendingMonthlyReport, setSendingMonthlyReport] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const filteredStudents = searchQuery.trim()
    ? students.filter((s) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.rollNumber != null && String(s.rollNumber).includes(q)) ||
          (s.tempIndex  != null && String(s.tempIndex).includes(q))
        );
      })
    : students;

  const duplicateNames = useMemo(() => {
    const counts = {};
    students.forEach((s) => {
      const key = (s.name || "").trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
  }, [students]);

  const loadStudents = useCallback(async (classId, yearId, targetDate) => {
    if (!classId || !yearId || !targetDate) return;
    setLoading(true);
    try {
      const res = await fetchStudentsForAttendance({ classSectionId: classId, academicYearId: yearId, date: targetDate });
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
        if (res?.activeAcademicYear) setActiveAcademicYear(res.activeAcademicYear);
        const assignedClasses = res?.data || [];
        setClasses(assignedClasses);
        if (assignedClasses.length > 0) {
          const first = assignedClasses[0];
          setSelectedClassId(first.classSectionId);
          setAcademicYearId(first.academicYearId);
        } else {
          setInitError(
            res?.activeAcademicYear
              ? `No classes assigned for ${res.activeAcademicYear.name}. Contact admin.`
              : "No active academic year found. Ask admin to activate the current year.",
          );
        }
      } catch {
        setInitError("Failed to load your classes. Please refresh.");
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
    setStudents((p) => p.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
    if (status === "PRESENT") toast(`${studentName} marked Present`, "present", 2000);
    if (status === "ABSENT")  toast(`${studentName} marked Absent`,  "absent",  2000);
  };

  const handleRemarksChange = (studentId, remarks) =>
    setStudents((p) => p.map((s) => (s.studentId === studentId ? { ...s, remarks } : s)));

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
  const completionPct  = students.length
    ? Math.round((summary.PRESENT / students.length) * 100)
    : 0;

  const getClassLabel  = (cls) => cls.name || `${cls.grade}${cls.section ? `-${cls.section}` : ""}`;
  const selectedClass  = classes.find((c) => c.classSectionId === selectedClassId);

  const handleSave = async () => {
    if (!students.length) return;
    if (hasEmptyStatus) {
      toast(`${summary.UNMARKED} student${summary.UNMARKED !== 1 ? "s" : ""} still unmarked`, "error", 3500);
      return;
    }
    try {
      setSaving(true);
      await saveAttendance({ classSectionId: selectedClassId, academicYearId, date, records: students.filter((s) => s.status) });
      toast(`Submitted — ${summary.PRESENT} present, ${summary.ABSENT} absent`, "success", 4000);
    } catch {
      toast("Failed to save attendance. Please try again.", "error", 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleSendAttendanceReport = async () => {
    try {
      setSendingReport(true);

      await saveAttendance({
        classSectionId: selectedClassId,
        academicYearId,
        date,
        records: students.filter((s) => s.status),
        sendWhatsApp: true,
      });

      toast(
        "Attendance report sent to parents successfully",
        "success",
        4000
      );
    } catch (err) {
      toast(
        "Failed to send attendance report",
        "error",
        4000
      );
    } finally {
      setSendingReport(false);
    }
  };

  const handleSendMonthlyReport = async () => {
    try {
      setSendingMonthlyReport(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/attendance/send-monthly-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            classSectionId: selectedClassId,
            academicYearId,
            month: new Date(date).getMonth() + 1,
            year: new Date(date).getFullYear(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }

      toast(
        "Monthly attendance report sent successfully",
        "success",
        4000
      );
    } catch (err) {
      toast(
        err.message || "Failed to send monthly report",
        "error",
        4000
      );
    } finally {
      setSendingMonthlyReport(false);
    }
  };

  const SubmitButton = ({ full = false }) => (
    <button
      disabled={saving || hasEmptyStatus}
      onClick={handleSave}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        padding: "11px 20px",
        width: full ? "100%" : "auto",
        borderRadius: 12, border: "none",
        background: saving || hasEmptyStatus
          ? C.borderLight
          : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
        color: saving || hasEmptyStatus ? C.textLight : "#fff",
        fontSize: 13, fontWeight: 700,
        cursor: saving || hasEmptyStatus ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        transition: "opacity 0.2s, transform 0.15s",
        boxShadow: saving || hasEmptyStatus ? "none" : `0 4px 14px ${C.deep}44`,
        opacity: saving || hasEmptyStatus ? 0.65 : 1,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!saving && !hasEmptyStatus) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {saving
        ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
        : <><CalendarCheck size={13} /> Submit Attendance</>
      }
    </button>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        .fade-up  { animation: fadeUp  0.4s ease forwards; }
        .fade-in  { animation: fadeIn  0.3s ease forwards; }

        /* Responsive grid */
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Filter bar stacks on mobile */
        .filter-bar { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 640px) { .filter-bar { flex-direction: row; align-items: flex-end; flex-wrap: wrap; } }

        /* Progress bar hides on very small screens */
        .progress-wrap { display: none; }
        @media (min-width: 480px) { .progress-wrap { display: block; min-width: 130px; } }

        /* Student row layout */
        .student-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1.5px solid ${C.borderLight}; transition: background 0.15s; flex-wrap: wrap; }
        .student-row:hover { background: ${C.bg} !important; }
        .student-row.unmarked { background: #fffbeb !important; }
        .student-row.unmarked:hover { background: #fff3cd !important; }

        /* Toggle: compact on mobile */
        .toggle-btn { padding: 8px 12px !important; font-size: 12px !important; }
        @media (min-width: 400px) { .toggle-btn { padding: 8px 18px !important; } }

        /* Remarks: full width on mobile, fixed on larger */
        .remarks-input { width: 100% !important; margin-top: 6px; }
        @media (min-width: 600px) { .remarks-input { width: 150px !important; margin-top: 0; } }

        /* Header actions: stack on mobile */
        .card-header-actions { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        @media (min-width: 640px) { .card-header-actions { flex-direction: row; align-items: center; width: auto; } }

        /* Submit sticky on mobile */
        .sticky-submit { display: flex; position: sticky; bottom: 0; left: 0; right: 0; z-index: 10; padding: 12px 14px; background: ${C.white}; border-top: 1.5px solid ${C.borderLight}; box-shadow: 0 -4px 20px rgba(56,73,89,0.08); }
        @media (min-width: 640px) { .sticky-submit { display: none; } }

        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", padding: "16px 14px 80px" }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 20 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 4, height: 26, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px", fontFamily: "'DM Sans', sans-serif" }}>
              Attendance
            </h1>
          </div>
          <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
            {activeAcademicYear ? `Marking for ${activeAcademicYear.name}` : "Mark daily attendance for your class"}
          </p>
        </div>

        {/* ── Error Banner ── */}
        {initError && (
          <div className="fade-up" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14, background: "#fffbeb", border: "1px solid #fcd34d", marginBottom: 16 }}>
            <AlertCircle size={15} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 500, margin: 0 }}>{initError}</p>
          </div>
        )}

        {/* ── Stat Cards ── */}
        {students.length > 0 && (
          <div className="stat-grid fade-up" style={{ marginBottom: 14 }}>
            <StatCard label="Present" value={summary.PRESENT} icon={UserCheck} accent="#22c55e" />
            <StatCard label="Absent"  value={summary.ABSENT}  icon={UserX}    accent="#ef4444" />
          </div>
        )}

        {/* ── Filter / Control Bar ── */}
        <div className="fade-up" style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 12px rgba(56,73,89,0.06)", padding: "14px", marginBottom: 14 }}>
          <div className="filter-bar">

            {/* Class selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 0 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Class {activeAcademicYear ? `· ${activeAcademicYear.name}` : ""}
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.classSectionId === e.target.value);
                    if (cls) { setSelectedClassId(cls.classSectionId); setAcademicYearId(cls.academicYearId); }
                  }}
                  style={{ appearance: "none", WebkitAppearance: "none", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 36px 9px 12px", fontSize: 13, fontWeight: 600, color: C.text, background: C.bg, outline: "none", cursor: "pointer", width: "100%", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {classes.length === 0 && <option value="">No classes assigned</option>}
                  {classes.map((cls) => (
                    <option key={cls.classSectionId} value={cls.classSectionId}>{getClassLabel(cls)}</option>
                  ))}
                </select>
                <ChevronDown size={13} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
              </div>
            </div>

            {/* Date picker */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em" }}>Date</label>
              <div style={{ position: "relative" }}>
                <CalendarDays size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 12px 9px 30px", fontSize: 13, fontWeight: 600, color: C.text, background: C.bg, outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%" }}
                />
              </div>
            </div>

            {/* Right side: progress + count + refresh */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
              {students.length > 0 && (
                <div className="progress-wrap">
                  <ProgressBar pct={completionPct} />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 20, background: `${C.mist}55`, border: `1px solid ${C.borderLight}` }}>
                <Users size={12} color={C.textLight} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: C.deep }}>{students.length}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.textLight }}>students</span>
              </div>
              <button
                onClick={() => loadStudents(selectedClassId, academicYearId, date)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        {loading ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Pulse w={34} h={34} r={99} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    <Pulse w="45%" h={12} />
                    <Pulse w="28%" h={9} />
                  </div>
                  <Pulse w={130} h={34} r={10} />
                </div>
              </div>
            ))}
          </div>
        ) : students.length > 0 ? (
          <div className="fade-up" style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden" }}>

            {/* ── Card Header ── */}
            <div style={{ padding: "14px", background: `linear-gradient(135deg, ${C.bg} 0%, ${C.white} 100%)`, borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>

              {/* Left: class info */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 10px ${C.sky}44`, flexShrink: 0 }}>
                  <BookOpen size={16} color="#fff" strokeWidth={2} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
                    {selectedClass ? getClassLabel(selectedClass) : "Class"} — {date}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
                    {students.length} students{activeAcademicYear ? ` · ${activeAcademicYear.name}` : ""}
                  </p>
                </div>
              </div>

              {/* Right: actions */}
              <div className="card-header-actions">

                {/* Status chip */}
                {hasEmptyStatus ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 20, background: "#fffbeb", border: "1px solid #fcd34d", alignSelf: "flex-start" }}>
                    <AlertCircle size={11} color="#d97706" />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: "#92400e" }}>{summary.UNMARKED} unmarked</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #86efac", alignSelf: "flex-start" }}>
                    <CheckCircle size={11} color="#22c55e" />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: "#15803d" }}>All marked</span>
                  </div>
                )}

                {/* Mark All Present */}
                <button
                  onClick={markAllPresent}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 12, background: `${C.sky}18`, border: `1px solid ${C.sky}44`, color: C.deep, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${C.sky}30`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = `${C.sky}18`)}
                >
                  <CheckCircle2 size={13} /> Mark All Present
                </button>

                

                {/* Submit — hidden on mobile (sticky footer handles it) */}
                <div style={{ display: "none" }} className="desktop-submit">
                  <SubmitButton />
                </div>

                <button
                  disabled={sendingReport || hasEmptyStatus}
                  onClick={handleSendAttendanceReport}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: "none",
                    background:
                      sendingReport || hasEmptyStatus
                        ? C.borderLight
                        : "linear-gradient(135deg, #22c55e, #15803d)",
                    color:
                      sendingReport || hasEmptyStatus
                        ? C.textLight
                        : "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor:
                      sendingReport || hasEmptyStatus
                        ? "not-allowed"
                        : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                    boxShadow:
                      sendingReport || hasEmptyStatus
                        ? "none"
                        : "0 4px 14px rgba(34,197,94,0.25)",
                  }}
                >
                  {sendingReport ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      Send Attendance Report
                    </>
                  )}
                </button>

                <button
                  disabled={sendingMonthlyReport}
                  onClick={handleSendMonthlyReport}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: "none",
                    background: sendingMonthlyReport
                      ? C.borderLight
                      : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: sendingMonthlyReport
                      ? C.textLight
                      : "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: sendingMonthlyReport
                      ? "not-allowed"
                      : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "nowrap",
                    boxShadow: sendingMonthlyReport
                      ? "none"
                      : "0 4px 14px rgba(37,99,235,0.25)",
                  }}
                >
                  {sendingMonthlyReport ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <CalendarCheck size={13} />
                      Send Monthly Report
                    </>
                  )}
                </button>
                
                <style>{`@media (min-width: 640px) { .desktop-submit { display: block !important; } }`}</style>
              </div>
            </div>

            {/* ── Search ── */}
            <div style={{ padding: "10px 14px", borderBottom: `1.5px solid ${C.borderLight}`, background: `${C.bg}88` }}>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Search by name, father's name or roll number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "9px 36px 9px 32px", fontSize: 13, fontWeight: 500, color: C.text, background: C.white, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e)  => (e.target.style.borderColor = C.border)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textLight, padding: 0, display: "flex" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p style={{ fontSize: 11, color: C.textLight, margin: "5px 0 0 2px", fontFamily: "'DM Sans', sans-serif" }}>
                  {filteredStudents.length} of {students.length} students
                </p>
              )}
            </div>

            {/* ── Student rows ── */}
            <div>
              {filteredStudents.map((student, idx) => {
                const isPresent  = student.status === "PRESENT";
                const isAbsent   = student.status === "ABSENT";
                const isUnmarked = !student.status;
                const isDuplicate = duplicateNames.has((student.name || "").trim().toLowerCase());

                return (
                  <div
                    key={student.studentId}
                    className={`student-row${isUnmarked ? " unmarked" : ""}`}
                    style={{ background: isUnmarked ? "#fffbeb" : C.white }}
                  >
                    {/* Index */}
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.textLight, width: 20, flexShrink: 0 }}>
                      {idx + 1}
                    </span>

                    {/* Avatar + Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 100 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0, boxShadow: `0 2px 6px ${C.sky}44` }}>
                        {student.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
                            {student.name}
                          </span>
                          {isDuplicate && student.fatherName && (
                            <>
                              <span style={{ color: C.border, fontSize: 13 }}>·</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: C.textLight, fontStyle: "italic", fontFamily: "'DM Sans', sans-serif" }}>
                                {student.fatherName}
                              </span>
                            </>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <span style={{ fontSize: 10, color: C.textLight, fontFamily: "'DM Mono', monospace" }}>
                            Roll {student.rollNumber || "—"}
                          </span>
                          {isDuplicate && student.fatherName && (
                            <span style={{ fontWeight: 700, color: C.deep, fontSize: 10, background: `${C.sky}22`, padding: "1px 5px", borderRadius: 5, border: `1px solid ${C.sky}44`, fontFamily: "'DM Sans', sans-serif" }}>
                              {student.fatherName.trim().split(/\s+/).pop()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Present / Absent toggle */}
                    <div style={{ display: "inline-flex", borderRadius: 10, border: `1.5px solid ${isPresent ? "#86efac" : isAbsent ? "#fca5a5" : C.border}`, overflow: "hidden", flexShrink: 0 }}>
                      <button
                        className="toggle-btn"
                        onClick={() => handleStatusChange(student.studentId, "PRESENT", student.name)}
                        style={{ display: "flex", alignItems: "center", gap: 4, border: "none", borderRight: `1.5px solid ${isPresent ? "#86efac" : C.borderLight}`, background: isPresent ? "rgba(34,197,94,0.12)" : C.white, color: isPresent ? "#15803d" : C.textLight, fontSize: 12, fontWeight: isPresent ? 800 : 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { if (!isPresent) { e.currentTarget.style.background = "rgba(34,197,94,0.07)"; e.currentTarget.style.color = "#15803d"; } }}
                        onMouseLeave={(e) => { if (!isPresent) { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.textLight; } }}
                      >
                        <Check size={12} strokeWidth={isPresent ? 3 : 2} /> Present
                      </button>
                      <button
                        className="toggle-btn"
                        onClick={() => handleStatusChange(student.studentId, "ABSENT", student.name)}
                        style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: isAbsent ? "rgba(239,68,68,0.12)" : C.white, color: isAbsent ? "#b91c1c" : C.textLight, fontSize: 12, fontWeight: isAbsent ? 800 : 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
                        onMouseEnter={(e) => { if (!isAbsent) { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.color = "#b91c1c"; } }}
                        onMouseLeave={(e) => { if (!isAbsent) { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.textLight; } }}
                      >
                        <X size={12} strokeWidth={isAbsent ? 3 : 2} /> Absent
                      </button>
                    </div>

                    {/* Remarks */}
                    <input
                      type="text"
                      className="remarks-input"
                      value={student.remarks || ""}
                      onChange={(e) => handleRemarksChange(student.studentId, e.target.value)}
                      placeholder="Add remark…"
                      style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid transparent", background: `${C.mist}33`, color: C.text, fontSize: 12, fontWeight: 500, outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s, background 0.15s", flexShrink: 0 }}
                      onFocus={(e) => { e.target.style.borderColor = C.sky; e.target.style.background = C.white; }}
                      onBlur={(e)  => { e.target.style.borderColor = "transparent"; e.target.style.background = `${C.mist}33`; }}
                    />
                  </div>
                );
              })}
            </div>

            {/* ── Card footer ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: `linear-gradient(90deg, ${C.bg}, ${C.white})`, borderTop: `1.5px solid ${C.borderLight}`, flexWrap: "wrap", gap: 8 }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.textLight, margin: 0 }}>
                {hasEmptyStatus
                  ? `${summary.UNMARKED} student${summary.UNMARKED !== 1 ? "s" : ""} still need attention`
                  : "All students marked — ready to submit"}
              </p>
              {students.length > 8 && (
                <div style={{ display: "none" }} className="desktop-footer-submit">
                  <SubmitButton />
                </div>
              )}
              <style>{`@media (min-width: 640px) { .desktop-footer-submit { display: block !important; } }`}</style>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 0", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sky}33` }}>
              <Search size={24} color={C.sky} strokeWidth={1.5} />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.textLight, margin: 0, textAlign: "center", padding: "0 20px" }}>
              {classes.length > 0
                ? "Select a class and date to load attendance"
                : "No classes assigned for the current academic year"}
            </p>
          </div>
        )}

        {/* ── Sticky submit footer (mobile only) ── */}
        {students.length > 0 && (
          <div className="sticky-submit">
            <SubmitButton full />
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
}