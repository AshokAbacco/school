// client/src/student/pages/ExamTimetable/ExamTimetable.jsx
import React, { useState, useEffect, useMemo } from "react";
import { CalendarDays, BookOpen, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { getToken } from "../../../auth/storage.js";

const API_URL = import.meta.env.VITE_API_URL;

const C = {
  dark: "#243340", mid: "#6A89A7", light: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", border: "#C8DCF0", bg: "#EDF3FA", card: "#ffffff",
  success: "#059669", warn: "#d97706", danger: "#dc2626", info: "#3b82f6",
};
const F = { fontFamily: "'Inter', sans-serif" };
const grad = "linear-gradient(135deg, #384959 0%, #6A89A7 100%)";

// ── Date / Time helpers ────────────────────────────────────────────────────
const parseLocalDate = (d) => {
  if (!d) return new Date();
  const s = (typeof d === "string" ? d : "").split("T")[0];
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
};
const fmtDate = (d) => parseLocalDate(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDay  = (d) => parseLocalDate(d).toLocaleDateString("en-IN", { weekday: "long" });
const fmtTime = (t) => {
  if (!t) return "";
  const plain = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (plain) {
    let h = parseInt(plain[1], 10);
    const m = plain[2];
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const isUpcoming = (dateStr) => { const d = parseLocalDate(dateStr); const t = new Date(); t.setHours(0,0,0,0); return d >= t; };
const isToday    = (dateStr) => { const d = parseLocalDate(dateStr); const t = new Date(); return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear(); };

// ── Decode JWT ─────────────────────────────────────────────────────────────
const decodeToken = () => {
  try {
    const token = getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

const getClassSectionId = () => {
  try {
    const token = getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.classSectionId) return payload.classSectionId;
    }
  } catch {}

  // ✅ fallback from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return user?.classSectionId || user?.currentEnrollment?.classSection?.id || null;
};

const getStudentIdFromToken = () => {
  const payload = decodeToken();
  return payload?.id || null;
};

// ── Sub-components ─────────────────────────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span style={{ ...F, fontSize: 10, fontWeight: 700, letterSpacing: ".04em", padding: "3px 10px", borderRadius: 99, background: bg, color, border: `1px solid ${color}33`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SubjectCard({ sc }) {
  return (
    <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ ...F, fontSize: 13, fontWeight: 700, color: C.dark }}>{sc.subject?.name || "—"}</div>
      <div style={{ ...F, fontSize: 11, color: C.mid }}>{fmtTime(sc.startTime)} – {fmtTime(sc.endTime)}</div>
      {sc.maxMarks != null && (
        <div style={{ ...F, fontSize: 10, color: C.mid, marginTop: 2 }}>
          Max: <strong style={{ color: C.dark }}>{sc.maxMarks}</strong>
          {sc.passingMarks ? ` · Pass: ${sc.passingMarks}` : ""}
        </div>
      )}
    </div>
  );
}

function DayRow({ date, schedules, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const today    = isToday(date);
  const upcoming = isUpcoming(date);
  return (
    <div style={{ borderRadius: 16, border: `1.5px solid ${today ? C.sky : C.border}`, background: C.card, overflow: "hidden", boxShadow: today ? `0 0 0 3px ${C.sky}22` : "0 2px 8px rgba(56,73,89,0.05)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: today ? `${C.sky}12` : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: today ? C.sky : upcoming ? grad : "#f0f0f0", color: (today || upcoming) ? "#fff" : C.mid, flexShrink: 0 }}>
          <span style={{ ...F, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{parseLocalDate(date).getDate()}</span>
          <span style={{ ...F, fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{parseLocalDate(date).toLocaleDateString("en-IN", { month: "short" })}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark }}>
            {fmtDay(date)}
            {today && <span style={{ marginLeft: 8, ...F, fontSize: 10, fontWeight: 700, background: C.sky, color: "#fff", padding: "2px 8px", borderRadius: 99 }}>TODAY</span>}
          </div>
          <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 2 }}>{fmtDate(date)} · {schedules.length} subject{schedules.length !== 1 ? "s" : ""}</div>
        </div>
        {!open && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 260 }}>
            {schedules.slice(0, 3).map(sc => (
              <span key={sc.id} style={{ ...F, fontSize: 11, fontWeight: 600, background: `${C.sky}18`, color: C.deep, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                {sc.subject?.name || "—"}
              </span>
            ))}
            {schedules.length > 3 && <span style={{ ...F, fontSize: 11, color: C.mid }}>+{schedules.length - 3}</span>}
          </div>
        )}
        <div style={{ color: C.mid, flexShrink: 0 }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>
      {open && (
        <div style={{ padding: "16px 20px 20px", display: "flex", flexWrap: "wrap", gap: 10, borderTop: `1px solid ${C.border}` }}>
          {schedules.map(sc => <SubjectCard key={sc.id} sc={sc} />)}
        </div>
      )}
    </div>
  );
}

function ExamGroupSection({ group, classSectionId }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    if (!group?.id) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/exams/schedules/${group.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const all  = Array.isArray(data) ? data : [];
        // Filter only schedules that belong to this student's class section
        const mine = classSectionId
          ? all.filter(sc => sc.classSectionId === classSectionId)
          : all;
        setSchedules(mine);
      })
      .catch(() => setError("Failed to load schedules. Please try again."))
      .finally(() => setLoading(false));
  }, [group?.id, classSectionId]);

  const byDate = useMemo(() => {
    const map = {};
    schedules.forEach(sc => {
      const date = (sc.examDate || "").split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(sc);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")));
    return map;
  }, [schedules]);

  const sortedDates      = useMemo(() => Object.keys(byDate).sort(), [byDate]);
  const firstUpcomingIdx = useMemo(() => sortedDates.findIndex(d => isUpcoming(d)), [sortedDates]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: C.mid, ...F }}>
      <Loader2 size={16} style={{ animation: "spin .8s linear infinite" }} />
      <span style={{ fontSize: 13 }}>Loading schedule…</span>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.danger, ...F, fontSize: 13, padding: "12px 0" }}>
      <AlertCircle size={16} />{error}
    </div>
  );

  if (sortedDates.length === 0) return (
    <div style={{ padding: "20px 0", color: C.mid, ...F, fontSize: 13, fontStyle: "italic" }}>
      No exam schedule found for your class in this exam.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sortedDates.map((date, idx) => (
        <DayRow
          key={date}
          date={date}
          schedules={byDate[date]}
          defaultOpen={idx === firstUpcomingIdx || isToday(date)}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function ExamTimetablePage() {
  const [groups,          setGroups]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [activeGroup,     setActiveGroup]     = useState(null);
  const [academicYearId,  setAcademicYearId]  = useState(null);

  // ── classSectionId: read from token first, then fallback to API ──────────
    const [classSectionId, setClassSectionId] = useState(() => getClassSectionId());
  const [classSectionLoading, setClassSectionLoading] = useState(!getClassSectionId());

  // ── Fallback: fetch classSectionId from enrollment API if not in token ───
  useEffect(() => {
    if (classSectionId) {
      setClassSectionLoading(false);
      return;
    }

    const studentId = getStudentIdFromToken();
    if (!studentId) {
      setClassSectionLoading(false);
      return;
    }

    // Try fetching the student's active enrollment to get classSectionId
    fetch(`${API_URL}/api/students/${studentId}/enrollments`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Handle both array and object response shapes
        const enrollments = Array.isArray(data) ? data : (data.enrollments || []);
        const active = enrollments.find(e => e.status === "ACTIVE") || enrollments[0];
        if (active?.classSectionId) {
          setClassSectionId(active.classSectionId);
        }
      })
      .catch(() => {
        // Silently fail — we'll show a warning below if still missing
      })
      .finally(() => setClassSectionLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get active academic year ─────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/academic-years`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const years  = Array.isArray(data) ? data : (data.academicYears || []);
        const active = years.find(y => y.isActive) || years[0];
        if (active) setAcademicYearId(active.id);
      })
      .catch(() => {});
  }, []);

  // ── Get published exam groups ────────────────────────────────────────────
  useEffect(() => {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/exams/groups/${academicYearId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    .then(async data => {
    const all = Array.isArray(data) ? data : [];

    const published = all.filter(g => g.isPublished || g.isLocked);

    // 🔥 NEW: filter groups that have schedules for this class
    const validGroups = [];

    for (const g of published) {
        try {
        const res = await fetch(`${API_URL}/api/exams/schedules/${g.id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (!res.ok) continue;

        const schedules = await res.json();

        // If backend already filters → just check length
        if (Array.isArray(schedules) && schedules.length > 0) {
            validGroups.push(g);
        }

        } catch (err) {
        console.error("Error checking schedules", err);
        }
    }

    setGroups(validGroups);

    if (validGroups.length > 0) {
        setActiveGroup(validGroups[0]);
    } else {
        setActiveGroup(null);
    }
    })
      .catch(() => setError("Failed to load exams. Please try again."))
      .finally(() => setLoading(false));
  }, [academicYearId]);

  const isPageLoading = loading || classSectionLoading;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...F }}>

      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1.5px solid ${C.border}`, padding: "20px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarDays size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ ...F, fontSize: 18, fontWeight: 800, color: C.dark, margin: 0 }}>Exam Timetable</h1>
          <p style={{ ...F, fontSize: 12, color: C.mid, margin: "2px 0 0" }}>Your class exam schedule · dates, subjects &amp; timings</p>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "24px 28px", maxWidth: 860, margin: "0 auto" }}>

        {/* Loading */}
        {isPageLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: C.mid }}>
            <Loader2 size={24} style={{ animation: "spin .8s linear infinite" }} />
            <span style={{ ...F, fontSize: 13 }}>Loading your exam schedule…</span>
          </div>
        )}

        {/* Error */}
        {!isPageLoading && error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.danger, background: "#fef2f2", border: `1.5px solid ${C.danger}33`, borderRadius: 14, padding: "16px 20px", ...F, fontSize: 14 }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* No exams */}
        {!isPageLoading && !error && groups.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "80px 0", color: C.mid }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: C.card, border: `1.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={26} color={C.mid} />
            </div>
            <p style={{ ...F, fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>No exams scheduled</p>
            <p style={{ ...F, fontSize: 12, color: C.mid, margin: 0 }}>Check back when your school publishes the exam timetable.</p>
          </div>
        )}

        {/* Main content */}
        {!isPageLoading && !error && groups.length > 0 && (
          <>
            {/* Exam tab switcher */}
            {groups.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {groups.map(g => {
                  const active = activeGroup?.id === g.id;
                  return (
                    <button key={g.id} onClick={() => setActiveGroup(g)}
                      style={{ ...F, padding: "8px 18px", borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${active ? C.deep : C.border}`, background: active ? C.deep : C.card, color: active ? "#fff" : C.mid, transition: "all .15s" }}>
                      {g.name}
                      {g.isLocked && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: `${C.success}22`, color: C.success, padding: "1px 6px", borderRadius: 99 }}>Done</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active group header */}
            {activeGroup && (
              <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...F, fontSize: 16, fontWeight: 800, color: C.dark }}>{activeGroup.name}</div>
                  {activeGroup.term?.name && <div style={{ ...F, fontSize: 12, color: C.mid, marginTop: 2 }}>{activeGroup.term.name}</div>}
                </div>
                <div>
                  {activeGroup.isLocked
                    ? <Pill label="Completed" color={C.success} bg="#f0fdf4" />
                    : <Pill label="Upcoming"  color={C.info}    bg="#eff6ff" />}
                </div>
              </div>
            )}

            {/* ── Timetable ─────────────────────────────────────────────── */}

            {/* Case 1: classSectionId resolved — show timetable normally */}
            {activeGroup && classSectionId && (
              <ExamGroupSection group={activeGroup} classSectionId={classSectionId} />
            )}

            {/* Case 2: classSectionId could not be resolved — prompt re-login */}
            {activeGroup && !classSectionId && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, color: C.warn, background: "#fffbeb", border: `1.5px solid ${C.warn}44`, borderRadius: 14, padding: "18px 20px", ...F }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Session needs refresh</div>
                  <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
                    Your session is missing class information. Please log out and log back in to view your exam timetable.
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, ...F, fontSize: 12, fontWeight: 700, color: C.deep, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}