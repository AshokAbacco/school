// client/src/parent/pages/Attendance.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Attendance Tracker
//  Design: 1:1 copy of student Attendance.jsx
//  Differences from student version:
//    1. No <PageLayout> wrapper (Routes.jsx handles layout)
//    2. Fetches children from /api/parent/students on mount
//    3. ChildSelector shown when parent has > 1 child
//    4. Attendance fetched from /api/parent/attendance?studentId=&year=&month=
//    5. Re-fetches when selected child or month changes
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import {
    Calendar, CheckCircle, XCircle, TrendingUp,
    Award, AlertCircle, Loader2,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

// ─── Stormy Morning palette (identical to student) ────────────
const C = {
    dark: "#384959",
    mid: "#6A89A7",
    light: "#88BDF2",
    pale: "#BDDDFC",
    bg: "#EDF3FA",
    white: "#ffffff",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ─── Global CSS (identical to student) ───────────────────────
const ATT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  @keyframes spin    { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.45} }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.pale}; border-radius: 99px; }

  .att-page {
    min-height: 100vh;
    background: ${C.bg};
    font-family: 'Inter', sans-serif;
    background-image:
      radial-gradient(ellipse 70% 50% at 6% 0%,   rgba(136,189,242,0.20) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 95% 100%, rgba(189,221,252,0.13) 0%, transparent 50%);
    padding: 14px 12px 52px;
    padding-left:  max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
    padding-bottom: max(52px, env(safe-area-inset-bottom));
  }
  @media (min-width: 480px)  { .att-page { padding: 18px 18px 56px; } }
  @media (min-width: 768px)  { .att-page { padding: 22px 26px 60px; } }
  @media (min-width: 1024px) { .att-page { padding: 28px 32px 64px; } }

  .att-card {
    background: linear-gradient(150deg, rgba(255,255,255,0.90) 0%, rgba(237,243,250,0.78) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1.5px solid rgba(136,189,242,0.26);
    border-radius: 20px;
    box-shadow: 0 2px 18px rgba(56,73,89,0.07);
    overflow: hidden;
  }

  .att-sk {
    background: linear-gradient(90deg,
      rgba(189,221,252,0.28) 25%,
      rgba(189,221,252,0.52) 50%,
      rgba(189,221,252,0.28) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }

  .att-stat-grid {
    display: grid; gap: 12px;
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 768px) { .att-stat-grid { grid-template-columns: repeat(3, 1fr); } }

  .att-bottom-grid {
    display: grid; gap: 14px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 900px)  { .att-bottom-grid { grid-template-columns: 1fr 300px; } }
  @media (min-width: 1100px) { .att-bottom-grid { grid-template-columns: 1fr 320px; } }

  .att-day {
    aspect-ratio: 1;
    border-radius: 12px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-weight: 700; cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: transform 0.15s, box-shadow 0.15s;
    position: relative; overflow: visible;
    font-size: clamp(11px, 2.2vw, 14px);
  }
  .att-day:hover { transform: scale(1.07); box-shadow: 0 4px 12px rgba(56,73,89,0.13); }
  @media (max-width: 639px) { .att-day:hover { transform: none; } }

  .att-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
  }
  @media (min-width: 480px) { .att-cal-grid { gap: 7px; } }

  .att-row { transition: background 0.14s; }
  .att-row:hover { background: ${C.bg} !important; }

  .att-select {
    padding: 6px 10px; border-radius: 10px;
    border: 1.5px solid ${C.pale};
    background: rgba(237,243,250,0.90);
    color: ${C.dark}; font-size: 12px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    outline: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .att-select:focus { border-color: ${C.light}; }

  /* Child selector scrollbar hide */
  .child-scroll::-webkit-scrollbar { display: none; }
  .child-scroll { scrollbar-width: none; }

  .a1 { animation: fadeUp .38s ease both .04s; }
  .a2 { animation: fadeUp .38s ease both .10s; }
  .a3 { animation: fadeUp .38s ease both .17s; }
  .a4 { animation: fadeUp .38s ease both .24s; }
  .a5 { animation: fadeUp .38s ease both .30s; }
`;

// ─── Status helpers (identical to student) ────────────────────
function statusStyle(status) {
    switch (status) {
        case "present": return { bg: "rgba(187,247,208,0.85)", color: "#166534" };
        case "absent": return { bg: "rgba(254,202,202,0.85)", color: "#991b1b" };
        case "holiday": return { bg: "rgba(189,221,252,0.60)", color: "#384959" };
        case "upcoming": return { bg: "rgba(241,245,249,0.80)", color: "#94a3b8" };
        default: return { bg: "rgba(241,245,249,0.80)", color: "#94a3b8" };
    }
}

const Sk = ({ h = 14, w = "100%", r = 8 }) => (
    <div className="att-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ─── Stat card (identical to student) ────────────────────────
function StatCard({ label, value, Icon, accent, loading, delay = "0s" }) {
    return (
        <div className="att-card" style={{
            padding: "16px",
            animation: `fadeUp .38s ease both ${delay}`,
            position: "relative", overflow: "hidden",
        }}>
            <div style={{
                position: "absolute", bottom: -12, right: 10,
                opacity: 0.07, pointerEvents: "none",
            }}>
                <Icon size={52} color={accent} />
            </div>
            <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: `${accent}1A`, border: `1px solid ${accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
            }}>
                <Icon size={14} color={accent} />
            </div>
            <div style={{
                fontSize: 9, fontWeight: 800, color: C.mid,
                textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 5,
            }}>
                {label}
            </div>
            {loading
                ? <Sk h={28} w="50%" />
                : <div style={{
                    fontSize: 28, fontWeight: 900, color: C.dark, lineHeight: 1,
                    fontFamily: "'Sora', sans-serif",
                }}>
                    {value ?? "—"}
                </div>
            }
        </div>
    );
}

// ─── Child Selector ───────────────────────────────────────────
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function ChildSelector({ children, selectedId, onChange }) {
    if (!children || children.length <= 1) return null;
    return (
        <div style={{ marginBottom: 18 }}>
            <p style={{
                margin: "0 0 9px", fontSize: 11, fontWeight: 800, color: C.mid,
                textTransform: "uppercase", letterSpacing: "0.10em", fontFamily: "'Inter',sans-serif",
            }}>
                Select Child
            </p>
            <div className="child-scroll" style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 3 }}>
                {children.map((child) => {
                    const active = child.studentId === selectedId;
                    return (
                        <button
                            key={child.studentId}
                            onClick={() => onChange(child.studentId)}
                            style={{
                                flexShrink: 0, display: "flex", alignItems: "center", gap: 9,
                                padding: "8px 13px", borderRadius: 13, outline: "none", cursor: "pointer",
                                border: active ? `1.5px solid ${C.light}` : `1.5px solid ${C.pale}`,
                                background: active ? "rgba(136,189,242,0.14)" : C.white,
                                transition: "all 0.15s",
                                boxShadow: active ? "0 2px 10px rgba(136,189,242,0.22)" : "none",
                                fontFamily: "'Inter',sans-serif",
                            }}
                        >
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                                background: active
                                    ? `linear-gradient(135deg, ${C.light}, ${C.dark})`
                                    : `linear-gradient(135deg, ${C.pale}, #c8ddf0)`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 900,
                                color: active ? C.white : C.mid, overflow: "hidden",
                            }}>
                                {child.profileImage
                                    ? <img src={child.profileImage} alt={child.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    : initials(child.name)}
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <p style={{
                                    margin: 0, fontSize: 13, fontWeight: active ? 700 : 500,
                                    color: active ? C.dark : C.mid, whiteSpace: "nowrap",
                                }}>
                                    {child.name}
                                </p>
                                {child.className && (
                                    <p style={{ margin: 0, fontSize: 10, color: C.mid, fontWeight: 500 }}>
                                        {child.className}
                                    </p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN — No <PageLayout> (Routes.jsx handles layout)
// ═══════════════════════════════════════════════════════════════
export default function ParentAttendance() {
    const now = new Date();

    // ── Children ─────────────────────────────────────────────────
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    // ── Attendance ────────────────────────────────────────────────
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTooltip, setActiveTooltip] = useState(null);

    useEffect(() => {
        const close = () => setActiveTooltip(null);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, []);

    // 1. Load children on mount
    useEffect(() => {
        (async () => {
            setLoadingChildren(true); setErrorChildren(null);
            try {
                const res = await fetch(`${API_BASE}/api/parent/students`, {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.message ?? "Failed to load students");
                const raw = Array.isArray(json.data) ? json.data : (json.data?.students ?? []);
                const list = raw.map((s) => ({
                    studentId: s.id,
                    name: s.personalInfo
                        ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim()
                        : s.name,
                    className: s.enrollments?.[0]?.classSection?.name
                        ?? s.enrollment?.className ?? null,
                    profileImage: s.personalInfo?.profileImage ?? null,
                }));
                setChildren(list);
                if (list.length > 0) setSelectedChild(list[0].studentId);
            } catch (e) {
                setErrorChildren(e.message);
            } finally {
                setLoadingChildren(false);
            }
        })();
    }, []);

    // 2. Fetch attendance when child or month changes
    const fetchAttendance = useCallback(async (studentId, y, m) => {
        if (!studentId) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/parent/attendance?studentId=${studentId}&year=${y}&month=${m}`,
                {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${getToken()}` },
                }
            );
            const ct = res.headers.get("content-type") ?? "";
            if (!ct.includes("application/json"))
                throw new Error(`Server returned non-JSON (status ${res.status})`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message ?? "Unknown error");
            setData(json.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedChild) fetchAttendance(selectedChild, year, month);
    }, [selectedChild, year, month, fetchAttendance]);

    // Reset data when child changes
    useEffect(() => {
        setData(null); setError(null);
    }, [selectedChild]);

    const handleMonthChange = (e) => {
        const sel = data?.availableMonths?.find(m => `${m.year}-${m.month}` === e.target.value);
        if (sel) { setYear(sel.year); setMonth(sel.month); }
    };

    const stats = data?.stats ?? { totalDays: 0, present: 0, absent: 0, percentage: 0 };
    const calendarDays = data?.calendarDays ?? [];
    const recentRecords = data?.recentRecords ?? [];
    const availableMonths = data?.availableMonths ?? [];
    const enrollment = data?.enrollment;
    const selectedMonthLabel = data?.selectedMonth ?? "—";
    const activeChild = children.find(c => c.studentId === selectedChild);

    const studentLabel = enrollment
        ? `${enrollment.className} — ${enrollment.admissionNumber}`
        : activeChild
            ? activeChild.name
            : loading ? "Loading…" : "No active enrollment";

    const pct = stats.percentage ?? 0;

    const STATS = [
        { label: "Present Days", value: stats.present, accent: "#22c55e", Icon: CheckCircle, delay: "0.06s" },
        { label: "Absent Days", value: stats.absent, accent: "#ef4444", Icon: XCircle, delay: "0.12s" },
        { label: "Total Days", value: stats.totalDays, accent: C.light, Icon: TrendingUp, delay: "0.18s" },
    ];

    return (
        <>
            <style>{ATT_CSS}</style>

            <div className="att-page">

                {/* ── Loading children ── */}
                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.mid} style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                )}

                {/* ── Error loading children ── */}
                {!loadingChildren && errorChildren && (
                    <div className="a1" style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "12px 16px", borderRadius: 14, marginBottom: 16,
                        background: "#fef2f2", border: "1.5px solid #fca5a5",
                    }}>
                        <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>Failed to load students</div>
                            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{errorChildren}</div>
                        </div>
                    </div>
                )}

                {!loadingChildren && !errorChildren && (
                    <>
                        {/* ── Child Selector ── */}
                        <div className="a1">
                            <ChildSelector
                                children={children}
                                selectedId={selectedChild}
                                onChange={(id) => setSelectedChild(id)}
                            />
                        </div>

                        {/* ── No child ── */}
                        {!selectedChild && (
                            <div style={{
                                textAlign: "center", padding: "60px 20px",
                                background: "rgba(255,255,255,0.82)",
                                borderRadius: 20, border: `1.5px solid ${C.pale}`,
                            }}>
                                <Calendar size={36} color={C.pale} style={{ display: "block", margin: "0 auto 12px" }} />
                                <p style={{ fontWeight: 700, color: C.dark, margin: "0 0 6px", fontSize: 15 }}>No Child Selected</p>
                                <p style={{ color: C.mid, fontSize: 13, margin: 0 }}>Select a child above to view their attendance.</p>
                            </div>
                        )}

                        {selectedChild && (
                            <>
                                {/* ── PAGE HEADER ── */}
                                <div className="a1" style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    flexWrap: "wrap", gap: 12, marginBottom: 20,
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{
                                            width: 4, height: 30, borderRadius: 99, flexShrink: 0,
                                            background: `linear-gradient(180deg, ${C.light} 0%, ${C.dark} 100%)`,
                                        }} />
                                        <div>
                                            <h1 style={{
                                                margin: 0,
                                                fontSize: "clamp(18px, 4vw, 25px)",
                                                fontWeight: 900, color: C.dark, letterSpacing: "-0.5px",
                                                fontFamily: "'Sora', sans-serif",
                                            }}>
                                                Attendance Tracker
                                            </h1>
                                            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.mid, fontWeight: 500 }}>
                                                {studentLabel}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Overall % pill */}
                                    <div className="att-card" style={{ padding: "10px 20px", textAlign: "center", minWidth: 90 }}>
                                        {loading
                                            ? <Sk h={26} w={60} />
                                            : <>
                                                <div style={{
                                                    fontSize: 24, fontWeight: 900, color: C.dark,
                                                    fontFamily: "'Sora', sans-serif", lineHeight: 1,
                                                }}>
                                                    {pct}%
                                                </div>
                                                <div style={{
                                                    fontSize: 9, fontWeight: 800, color: C.mid,
                                                    textTransform: "uppercase", letterSpacing: ".08em", marginTop: 3,
                                                }}>
                                                    Overall
                                                </div>
                                            </>
                                        }
                                    </div>
                                </div>

                                {/* ── ERROR ── */}
                                {error && (
                                    <div className="a1" style={{
                                        display: "flex", alignItems: "flex-start", gap: 10,
                                        padding: "12px 16px", borderRadius: 14, marginBottom: 16,
                                        background: "#fef2f2", border: "1.5px solid #fca5a5",
                                    }}>
                                        <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>Failed to load attendance</div>
                                            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>{error}</div>
                                        </div>
                                    </div>
                                )}

                                {/* ── STAT CARDS ── */}
                                <div className="att-stat-grid" style={{ marginBottom: 16 }}>
                                    {STATS.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
                                </div>

                                {/* ── CALENDAR + GOAL ── */}
                                <div className="att-bottom-grid a3">

                                    {/* Calendar card */}
                                    <div className="att-card" style={{ padding: "20px 18px" }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            marginBottom: 18, flexWrap: "wrap", gap: 8,
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8,
                                                    background: `${C.light}1A`, border: `1px solid ${C.light}30`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                }}>
                                                    <Calendar size={13} color={C.light} />
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Monthly Calendar</span>
                                            </div>
                                            <select
                                                value={`${year}-${month}`}
                                                onChange={handleMonthChange}
                                                className="att-select"
                                            >
                                                {availableMonths.length > 0
                                                    ? availableMonths.map(m => (
                                                        <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</option>
                                                    ))
                                                    : <option value={`${year}-${month}`}>{selectedMonthLabel}</option>
                                                }
                                            </select>
                                        </div>

                                        {loading ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
                                                <Loader2 size={30} color={C.light} style={{ animation: "spin 1s linear infinite" }} />
                                            </div>
                                        ) : (
                                            <>
                                                {/* Day headers */}
                                                <div className="att-cal-grid" style={{ marginBottom: 5 }}>
                                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                                                        <div key={d} style={{
                                                            textAlign: "center", fontSize: 9, fontWeight: 800,
                                                            color: C.mid, textTransform: "uppercase", letterSpacing: ".06em",
                                                            paddingBottom: 4,
                                                        }}>
                                                            {d}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Calendar cells */}
                                                {(() => {
                                                    const firstDay = new Date(year, month - 1, 1).getDay();
                                                    const offset = firstDay === 0 ? 6 : firstDay - 1;
                                                    const blanks = Array(offset).fill(null);

                                                    return (
                                                        <div className="att-cal-grid">
                                                            {blanks.map((_, i) => <div key={`b-${i}`} style={{ aspectRatio: "1" }} />)}
                                                            {calendarDays.map((item, idx) => {
                                                                const s = statusStyle(item.status);
                                                                const isHoliday = item.status === "holiday";
                                                                const declaredName = item.holidayName || null;
                                                                const dayNum = new Date(year, month - 1, parseInt(item.date, 10)).getDay();
                                                                const isWeekend = dayNum === 0 || dayNum === 6;
                                                                const weekendLabel = dayNum === 0 ? "Sunday" : "Saturday";
                                                                const tooltipText = isHoliday ? (declaredName || (isWeekend ? weekendLabel : null)) : null;
                                                                const cellLabel = declaredName || (isWeekend && isHoliday ? weekendLabel : null);
                                                                const isOpen = activeTooltip === idx;

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="att-day"
                                                                        style={{ background: s.bg, color: s.color }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveTooltip(tooltipText ? (isOpen ? null : idx) : null);
                                                                        }}
                                                                    >
                                                                        <span style={{ lineHeight: 1 }}>{item.date}</span>
                                                                        {cellLabel && (
                                                                            <span style={{
                                                                                fontSize: "0.46rem", fontWeight: 700,
                                                                                maxWidth: "90%", overflow: "hidden",
                                                                                textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                                                opacity: 0.72, marginTop: 2,
                                                                            }}>
                                                                                {cellLabel}
                                                                            </span>
                                                                        )}
                                                                        {tooltipText && isOpen && (
                                                                            <div style={{
                                                                                position: "absolute", bottom: "calc(100% + 7px)",
                                                                                left: "50%", transform: "translateX(-50%)",
                                                                                zIndex: 30, pointerEvents: "none", minWidth: 120,
                                                                            }}>
                                                                                <div style={{
                                                                                    background: C.dark, color: C.pale,
                                                                                    borderRadius: 10, padding: "6px 10px",
                                                                                    fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                                                                                    textAlign: "center",
                                                                                    boxShadow: "0 6px 20px rgba(56,73,89,0.26)",
                                                                                }}>
                                                                                    {declaredName ? `🎉 ${tooltipText}` : `📅 ${tooltipText}`}
                                                                                </div>
                                                                                <div style={{
                                                                                    width: 8, height: 8, background: C.dark,
                                                                                    margin: "0 auto", marginTop: -4, transform: "rotate(45deg)",
                                                                                    borderRadius: 2,
                                                                                }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Legend */}
                                                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 18 }}>
                                                    {[
                                                        { bg: "rgba(187,247,208,0.85)", color: "#166534", label: "Present" },
                                                        { bg: "rgba(254,202,202,0.85)", color: "#991b1b", label: "Absent" },
                                                        { bg: "rgba(189,221,252,0.60)", color: "#384959", label: "Holiday" },
                                                    ].map(({ bg, color, label }) => (
                                                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <div style={{ width: 12, height: 12, borderRadius: 4, background: bg, border: `1px solid ${color}22` }} />
                                                            <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Attendance Goal card */}
                                    <div className="att-card" style={{ padding: "20px 18px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: 8,
                                                background: `${C.light}1A`, border: `1px solid ${C.light}30`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                            }}>
                                                <Award size={13} color={C.light} />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Attendance Goal</span>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: ".07em" }}>
                                                Progress
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: 10, borderRadius: 99, background: C.pale, overflow: "hidden", marginBottom: 18 }}>
                                            <div style={{
                                                height: "100%", borderRadius: 99,
                                                width: `${Math.min(pct, 100)}%`,
                                                background: `linear-gradient(90deg, ${C.light} 0%, ${C.dark} 100%)`,
                                                transition: "width 0.8s cubic-bezier(.22,.68,0,1.2)",
                                            }} />
                                        </div>

                                        {/* Status alerts */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                            {pct >= 95 ? (
                                                <div style={{ padding: "11px 13px", borderRadius: 12, background: "#f0fdf4", borderLeft: "3px solid #22c55e" }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#166534" }}>Excellent! 🎉</div>
                                                    <div style={{ fontSize: 11, color: "#16a34a", marginTop: 3 }}>Maintaining great attendance</div>
                                                </div>
                                            ) : pct >= 75 ? (
                                                <div style={{ padding: "11px 13px", borderRadius: 12, background: "#fffbeb", borderLeft: "3px solid #f59e0b" }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Keep it up!</div>
                                                    <div style={{ fontSize: 11, color: "#d97706", marginTop: 3 }}>Aim for 95% — currently at {pct}%</div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: "11px 13px", borderRadius: 12, background: "#fef2f2", borderLeft: "3px solid #ef4444" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#991b1b" }}>
                                                        <AlertCircle size={13} /> Attendance Low
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3 }}>Below 75% — needs improvement</div>
                                                </div>
                                            )}

                                            <div style={{ padding: "11px 13px", borderRadius: 12, background: "rgba(237,243,250,0.90)", borderLeft: `3px solid ${C.light}` }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>Target: 95%</div>
                                                <div style={{ fontSize: 11, color: C.mid, marginTop: 3 }}>
                                                    {pct >= 95 ? "On Track ✓" : `${(95 - pct).toFixed(1)}% to go`}
                                                </div>
                                            </div>

                                            {stats.absent > 0 && (
                                                <div style={{ padding: "11px 13px", borderRadius: 12, background: "#fef2f2", borderLeft: "3px solid #fca5a5" }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                                                        {stats.absent} absent day{stats.absent > 1 ? "s" : ""} this month
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── RECENT RECORDS ── */}
                                <div className="att-card a5" style={{ marginTop: 14, overflow: "hidden" }}>
                                    <div style={{
                                        padding: "14px 18px",
                                        borderBottom: "1px solid rgba(136,189,242,0.18)",
                                        background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: `${C.light}1A`, border: `1px solid ${C.light}30`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <Calendar size={13} color={C.light} />
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Recent Attendance Records</span>
                                    </div>

                                    <div style={{ overflowX: "auto" }}>
                                        {loading ? (
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 96 }}>
                                                <Loader2 size={24} color={C.light} style={{ animation: "spin 1s linear infinite" }} />
                                            </div>
                                        ) : recentRecords.length === 0 ? (
                                            <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: C.mid, fontWeight: 500 }}>
                                                No records found for this month.
                                            </div>
                                        ) : (
                                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                <thead>
                                                    <tr style={{ background: C.bg }}>
                                                        {["Date", "Day", "Status"].map(h => (
                                                            <th key={h} style={{
                                                                padding: "10px 18px", textAlign: "left",
                                                                fontSize: 9, fontWeight: 800, color: C.mid,
                                                                textTransform: "uppercase", letterSpacing: ".09em",
                                                                whiteSpace: "nowrap",
                                                            }}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentRecords.map((rec, idx) => {
                                                        const isPresent = rec.status === "present";
                                                        const statusColor = isPresent ? "#22c55e" : "#991b1b";
                                                        const StatusIcon = isPresent ? CheckCircle : XCircle;
                                                        return (
                                                            <tr key={idx} className="att-row" style={{ borderTop: `1px solid ${C.bg}` }}>
                                                                <td style={{ padding: "11px 18px", fontSize: 12, fontWeight: 700, color: C.dark, whiteSpace: "nowrap" }}>
                                                                    {rec.date}
                                                                </td>
                                                                <td style={{ padding: "11px 18px", fontSize: 12, color: C.mid, fontWeight: 500 }}>
                                                                    {rec.day}
                                                                </td>
                                                                <td style={{ padding: "11px 18px" }}>
                                                                    <span style={{
                                                                        display: "inline-flex", alignItems: "center", gap: 6,
                                                                        padding: "3px 10px", borderRadius: 20,
                                                                        fontSize: 11, fontWeight: 700,
                                                                        background: `${statusColor}14`,
                                                                        color: statusColor,
                                                                        border: `1px solid ${statusColor}22`,
                                                                    }}>
                                                                        <StatusIcon size={11} />
                                                                        {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}