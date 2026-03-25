// client/src/parent/pages/Timetable/Timetable.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Class Time Table
//  Design: 1:1 copy of student TimeTable.jsx
//  Differences from student version:
//    1. No <PageLayout> wrapper (Routes.jsx handles layout)
//    2. Fetches children from /api/parent/students on mount
//    3. ChildSelector shown when parent has > 1 child
//    4. Timetable fetched from /api/parent/timetable?studentId=
//    5. Re-fetches timetable when selected child changes
//    6. Header subtitle shows child name + class
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
    Calendar, Clock, BookOpen, Coffee, UtensilsCrossed,
    MapPin, User, AlertCircle, Loader2,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json"))
        throw new Error(`Server error (${res.status})`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Request failed");
    return json;
}

// ── Design tokens (identical to student version) ──────────────
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
    green: "#22c55e",
    amber: "#f59e0b",
    orange: "#f97316",
};

const F = { fontFamily: "'Inter', sans-serif" };

const DAY_LABELS = {
    MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const DAY_SHORT = {
    MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
    THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

function fmtTime(t) {
    if (!t) return "—";
    const [hh, mm] = t.split(":");
    const h = parseInt(hh, 10);
    return `${h % 12 || 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
}

const TODAY_KEY = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();

// ── Responsive hook ───────────────────────────────────────────
function useWindowWidth() {
    const [w, setW] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1024
    );
    useEffect(() => {
        const handle = () => setW(window.innerWidth);
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);
    return w;
}

// ── Pulse skeleton ────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
    return (
        <div
            className="animate-pulse"
            style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
        />
    );
}

// ── Loading skeleton ──────────────────────────────────────────
function LoadingSkeleton({ isMobile }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="animate-pulse"
                    style={{
                        background: C.white,
                        borderRadius: 14,
                        border: `1.5px solid ${C.borderLight}`,
                        padding: isMobile ? "12px 14px" : "16px 20px",
                        display: "flex", alignItems: "center", gap: 12,
                    }}
                >

                    <Pulse w={32} h={32} r={99} />
                    {!isMobile && <Pulse w={90} h={32} r={10} />}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                        <Pulse w="50%" h={13} />
                        <Pulse w="30%" h={10} />
                    </div>
                    <Pulse w={60} h={22} r={20} />
                </div>
            ))}
        </div>
    );
}


// ── Period Card (identical to student) ────────────────────────
function PeriodCard({ slot, classIndex, isMobile, isTablet }) {
    const isBreak = slot.slotType === "BREAK" || slot.slotType === "LUNCH"
        || slot.slotType === "SHORT_BREAK" || slot.slotType === "LUNCH_BREAK"
        || slot.slotType === "PRAYER" || slot.slotType === "OTHER";
    const isLunch = slot.slotType === "LUNCH" || slot.slotType === "LUNCH_BREAK";
    const accentColor = isLunch ? C.green : isBreak ? C.orange : C.sky;

    return (
        <div
            style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                gap: isMobile ? 10 : 14,
                padding: isMobile ? "12px 14px" : "14px 20px",
                background: C.white,
                borderRadius: 14,
                border: `1.5px solid ${C.borderLight}`,
                boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
                transition: "box-shadow 0.2s, transform 0.2s",
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 24px ${C.sky}28`;
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 2px 10px rgba(56,73,89,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            {/* Period number / break icon */}
            {!isBreak ? (
                <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: `${C.sky}18`,
                    border: `1.5px solid ${C.sky}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11, fontWeight: 800, color: C.deep,
                }}>
                    {classIndex + 1}
                </div>
            ) : (
                <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: `${accentColor}18`,
                    border: `1.5px solid ${accentColor}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                }}>
                    {isLunch
                        ? <UtensilsCrossed size={13} color={accentColor} />
                        : <Coffee size={13} color={accentColor} />
                    }
                </div>
            )}

            {/* Time block — hidden on mobile, shown inline on tablet+ */}
            {!isMobile && (
                <div style={{
                    minWidth: 94, flexShrink: 0,
                    padding: "5px 10px",
                    background: C.bg,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 10,
                    display: "flex", alignItems: "center", gap: 5,
                }}>
                    <Clock size={11} color={C.textLight} />
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                            {fmtTime(slot.startTime)}
                        </div>
                        <div style={{ fontSize: 10, color: C.textLight }}>
                            {fmtTime(slot.endTime)}
                        </div>
                    </div>
                </div>
            )}

            {/* Subject / break info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Name + code */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {!isBreak && <BookOpen size={13} color={C.slate} style={{ flexShrink: 0 }} />}
                    <span style={{
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 700, color: C.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                        {slot.subject?.name ?? (isLunch ? "Lunch Break" : slot.label ?? "Break")}
                    </span>
                    {slot.subject?.code && (
                        <span style={{
                            fontSize: 10, fontWeight: 600, color: C.textLight,
                            background: C.bg, border: `1px solid ${C.borderLight}`,
                            borderRadius: 20, padding: "1px 7px", flexShrink: 0,
                        }}>
                            {slot.subject.code}
                        </span>
                    )}
                </div>

                {/* Time on mobile — shown below name */}
                {isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                        <Clock size={10} color={C.textLight} />
                        <span style={{ fontSize: 10, color: C.textLight, fontWeight: 500 }}>
                            {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                        </span>
                    </div>
                )}

                {/* Teacher + room */}
                {!isBreak && (slot.teacher?.name || slot.roomNumber) && (
                    <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                        {slot.teacher?.name && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textLight }}>
                                <User size={10} /> {slot.teacher.name}
                            </span>
                        )}
                        {slot.roomNumber && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: C.textLight }}>
                                <MapPin size={10} /> Room {slot.roomNumber}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Right badge */}
            {isBreak ? (
                <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: `${accentColor}15`,
                    color: accentColor,
                    border: `1px solid ${accentColor}33`,
                    borderRadius: 20,
                    padding: isMobile ? "2px 8px" : "3px 10px",
                    flexShrink: 0,
                }}>
                    {isLunch ? "Lunch" : slot.label ?? "Break"}
                </span>
            ) : slot.roomNumber && !isMobile ? (
                <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: `${C.sky}18`,
                    color: C.deep,
                    border: `1px solid ${C.sky}33`,
                    borderRadius: 20, padding: "3px 10px", flexShrink: 0,
                }}>
                    Room {slot.roomNumber}
                </span>
            ) : null}
        </div>
    );
}

// ── Child Selector ────────────────────────────────────────────
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function ChildSelector({ children, selectedId, onChange }) {
    if (!children || children.length <= 1) return null;
    return (
        <div style={{ marginBottom: 20 }}>
            <p style={{
                margin: "0 0 10px", fontSize: 11, fontWeight: 800,
                color: C.textLight, textTransform: "uppercase",
                letterSpacing: "0.10em", ...F,
            }}>
                Select Child
            </p>
            <div style={{
                display: "flex", gap: 10, overflowX: "auto",
                paddingBottom: 4, scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
            }}>
                {children.map((child) => {
                    const active = child.studentId === selectedId;
                    return (
                        <button
                            key={child.studentId}
                            onClick={() => onChange(child.studentId)}
                            style={{
                                flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 14px", borderRadius: 14,
                                border: active ? `1.5px solid ${C.sky}` : `1.5px solid ${C.borderLight}`,
                                background: active ? `${C.sky}22` : C.white,
                                cursor: "pointer", ...F, transition: "all 0.15s",
                                boxShadow: active ? `0 2px 10px rgba(136,189,242,0.22)` : "none",
                                outline: "none",
                            }}
                        >
                            <div style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: active
                                    ? `linear-gradient(135deg, ${C.sky}, ${C.deep})`
                                    : `linear-gradient(135deg, ${C.mist}, ${C.borderLight})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 900,
                                color: active ? C.white : C.textLight,
                            }}>
                                {child.profileImage
                                    ? <img src={child.profileImage} alt={child.name}
                                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                                    : initials(child.name)}
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <p style={{
                                    margin: 0, fontSize: 13,
                                    fontWeight: active ? 700 : 500,
                                    color: active ? C.deep : C.textLight,
                                    whiteSpace: "nowrap",
                                }}>
                                    {child.name}
                                </p>
                                {child.className && (
                                    <p style={{ margin: 0, fontSize: 10, color: C.textLight, fontWeight: 500 }}>
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

// ═════════════════════════════════════════════════════════════
//  MAIN — No <PageLayout> (Routes.jsx wraps all pages already)
// ═════════════════════════════════════════════════════════════
export default function ParentTimetable() {
    const width = useWindowWidth();
    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;

    // ── Children ─────────────────────────────────────────────────
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    // ── Timetable ─────────────────────────────────────────────────
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeDay, setActiveDay] = useState(null);

    const pagePadding = isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px";
    const titleSize = isMobile ? 20 : 26;

    // 1. Load children on mount
    useEffect(() => {
        (async () => {
            setLoadingChildren(true); setErrorChildren(null);
            try {
                const res = await apiFetch("/api/parent/students");
                const raw = Array.isArray(res.data) ? res.data : (res.data?.students ?? []);
                const list = raw.map((s) => ({
                    studentId: s.id,
                    name: s.personalInfo
                        ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim()
                        : s.name,
                    className: s.enrollments?.[0]?.classSection?.name
                        ?? s.enrollment?.className
                        ?? null,
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

    // 2. Load timetable whenever selected child changes
    useEffect(() => {
        if (!selectedChild) return;
        setData(null); setActiveDay(null);
        setLoading(true); setError(null);

        apiFetch(`/api/parent/timetable?studentId=${selectedChild}`)
            .then((res) => {
                if (!res.success) throw new Error(res.message ?? "Failed to load timetable");
                setData(res.data);
                const days = res.data.days ?? [];
                setActiveDay(days.includes(TODAY_KEY) ? TODAY_KEY : days[0] ?? null);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [selectedChild]);

    const slots = data?.timetable?.[activeDay] ?? [];
    const classSlots = slots.filter(s => s.slotType !== "BREAK" && s.slotType !== "LUNCH"
        && s.slotType !== "SHORT_BREAK" && s.slotType !== "LUNCH_BREAK"
        && s.slotType !== "PRAYER" && s.slotType !== "OTHER");
    const enrollment = data?.enrollment;
    const stats = data?.stats;
    const activeChild = children.find(c => c.studentId === selectedChild);

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                rel="stylesheet"
            />
            <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.sky}; border-radius: 99px; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.38s ease forwards; opacity: 0; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; opacity: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .day-btn:hover {
          background: ${C.bg} !important;
          border-color: ${C.sky} !important;
          color: ${C.deep} !important;
        }
        .stat-card {
          background: ${C.white};
          border-radius: 14px;
          border: 1.5px solid ${C.borderLight};
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 10px rgba(56,73,89,0.05);
        }
      `}</style>

            <div style={{
                minHeight: "100vh",
                background: C.bg,
                padding: pagePadding,
                ...F,
                backgroundImage: `radial-gradient(circle at 10% 0%, ${C.mist}28 0%, transparent 45%)`,
            }}>

                {/* ── Loading children ── */}
                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.sky} style={{ animation: "spin 0.9s linear infinite" }} />
                    </div>
                )}

                {/* ── Error loading children ── */}
                {!loadingChildren && errorChildren && (
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "12px 16px", borderRadius: 12,
                        background: "#fee8e8", border: "1px solid #f5b0b0",
                        marginBottom: 16, fontSize: 13, color: "#8b1c1c",
                    }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{errorChildren}</span>
                    </div>
                )}

                {!loadingChildren && !errorChildren && (
                    <>
                        {/* ── Child selector ── */}
                        <div className="fade-up">
                            <ChildSelector
                                children={children}
                                selectedId={selectedChild}
                                onChange={(id) => setSelectedChild(id)}
                            />
                        </div>

                        {/* ── Page header ── */}
                        <div className="fade-up" style={{ marginBottom: isMobile ? 16 : 24 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
                                <div style={{
                                    width: 4,
                                    height: isMobile ? 26 : 32,
                                    borderRadius: 99,
                                    background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                                    flexShrink: 0,
                                }} />
                                <h1 style={{
                                    margin: 0, fontSize: titleSize,
                                    fontWeight: 800, color: C.text, letterSpacing: "-0.5px",
                                }}>
                                    Class Time Table
                                </h1>
                            </div>
                            <p style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                                {loading
                                    ? "Loading schedule…"
                                    : activeChild && enrollment
                                        ? `${activeChild.name} · ${enrollment.className} · ${enrollment.academicYear}`
                                        : activeChild
                                            ? activeChild.name
                                            : "Select a child to view their timetable"}
                            </p>
                        </div>

                        {/* ── Timetable error ── */}
                        {error && (
                            <div style={{
                                display: "flex", alignItems: "flex-start", gap: 8,
                                padding: "12px 16px", borderRadius: 12,
                                background: "#fee8e8", border: "1px solid #f5b0b0",
                                marginBottom: 16, fontSize: 13, color: "#8b1c1c",
                            }}>
                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ── No child selected ── */}
                        {!selectedChild && (
                            <div style={{
                                textAlign: "center", padding: "56px 24px",
                                background: C.white, borderRadius: 14,
                                border: `1.5px solid ${C.borderLight}`,
                                boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
                            }}>
                                <div style={{
                                    width: 46, height: 46, borderRadius: 13,
                                    background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 12px",
                                }}>
                                    <Calendar size={20} color={C.sky} />
                                </div>
                                <p style={{ fontWeight: 700, margin: 0, fontSize: 14, color: C.text }}>No Child Selected</p>
                                <p style={{ fontSize: 12, margin: "5px 0 0", color: C.textLight }}>
                                    Select a child above to view their timetable.
                                </p>
                            </div>
                        )}

                        {/* ── Loading timetable skeleton ── */}
                        {selectedChild && loading && <LoadingSkeleton isMobile={isMobile} />}

                        {/* ── Timetable content ── */}
                        {selectedChild && !loading && data && (
                            <div className="fade-in">

                                {/* Stat cards */}
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3,1fr)" : "repeat(3,1fr)",
                                    gap: isMobile ? 10 : 12,
                                    marginBottom: isMobile ? 14 : 20,
                                }}>
                                    {[
                                        {
                                            label: "WORKING DAYS",
                                            value: stats?.workingDays ?? "—",
                                            sub: "days / week",
                                            accent: C.sky,
                                            icon: <Calendar size={isMobile ? 18 : 22} color={C.sky} />,
                                        },
                                        {
                                            label: "SCHOOL HOURS",
                                            value: fmtTime(stats?.dayStart),
                                            sub: `ends ${fmtTime(stats?.dayEnd)}`,
                                            accent: C.slate,
                                            icon: <Clock size={isMobile ? 18 : 22} color={C.slate} />,
                                        },
                                        {
                                            label: "CLASSES TODAY",
                                            value: classSlots.length,
                                            sub: `${slots.length} total slots`,
                                            accent: C.green,
                                            icon: <BookOpen size={isMobile ? 18 : 22} color={C.green} />,
                                        },
                                    ].map((card, idx) => (
                                        <div
                                            key={card.label}
                                            className="stat-card"
                                            style={{
                                                borderTop: `3px solid ${card.accent}`,
                                                gridColumn: isMobile && idx === 2 ? "1 / -1" : undefined,
                                            }}
                                        >
                                            <div>
                                                <p style={{
                                                    margin: 0, fontSize: 9, fontWeight: 700,
                                                    color: C.textLight, letterSpacing: "0.5px", textTransform: "uppercase",
                                                }}>
                                                    {card.label}
                                                </p>
                                                <p style={{
                                                    margin: "3px 0 1px",
                                                    fontSize: isMobile ? 20 : 24,
                                                    fontWeight: 800, color: C.text,
                                                    letterSpacing: "-0.5px", lineHeight: 1,
                                                }}>
                                                    {card.value}
                                                </p>
                                                <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>{card.sub}</p>
                                            </div>
                                            <div style={{
                                                width: isMobile ? 36 : 42, height: isMobile ? 36 : 42,
                                                borderRadius: 11,
                                                background: `${card.accent}15`,
                                                border: `1px solid ${card.accent}30`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                flexShrink: 0,
                                            }}>
                                                {card.icon}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Day selector */}
                                <div style={{
                                    background: C.white, borderRadius: 14,
                                    border: `1.5px solid ${C.borderLight}`,
                                    padding: isMobile ? "12px 14px" : "14px 20px",
                                    marginBottom: isMobile ? 14 : 20,
                                    boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
                                }}>
                                    <p style={{
                                        margin: "0 0 10px", fontSize: 10, fontWeight: 700,
                                        color: C.textLight, letterSpacing: "0.5px", textTransform: "uppercase",
                                    }}>
                                        Select Day
                                    </p>
                                    <div style={{
                                        display: "flex", gap: 6,
                                        overflowX: isMobile ? "auto" : "unset",
                                        flexWrap: isMobile ? "nowrap" : "wrap",
                                        paddingBottom: isMobile ? 2 : 0,
                                        WebkitOverflowScrolling: "touch",
                                    }}>
                                        {(data?.days ?? []).map((day) => {
                                            const isActive = day === activeDay;
                                            const isToday = day === TODAY_KEY;
                                            return (
                                                <button
                                                    key={day}
                                                    className="day-btn"
                                                    onClick={() => setActiveDay(day)}
                                                    style={{
                                                        flexShrink: 0,
                                                        padding: isMobile ? "6px 14px" : "7px 18px",
                                                        borderRadius: 20,
                                                        fontSize: isMobile ? 11 : 12,
                                                        fontWeight: isActive ? 700 : 500,
                                                        ...F,
                                                        border: isActive
                                                            ? `1.5px solid ${C.sky}`
                                                            : `1.5px solid ${C.borderLight}`,
                                                        background: isActive ? `${C.sky}22` : C.white,
                                                        color: isActive ? C.deep : C.textLight,
                                                        cursor: "pointer",
                                                        position: "relative",
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    {isMobile ? DAY_SHORT[day]?.slice(0, 2) ?? day : DAY_SHORT[day] ?? day}
                                                    {isToday && (
                                                        <span style={{
                                                            position: "absolute", top: -3, right: -3,
                                                            width: 7, height: 7, borderRadius: "50%",
                                                            background: C.green, border: `2px solid ${C.white}`,
                                                        }} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Period list */}
                                <div style={{
                                    background: C.white, borderRadius: 14,
                                    border: `1.5px solid ${C.borderLight}`,
                                    padding: isMobile ? "14px 14px" : "16px 20px",
                                    boxShadow: "0 2px 10px rgba(56,73,89,0.05)",
                                }}>
                                    {/* Section heading */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: isMobile ? "flex-start" : "center",
                                        justifyContent: "space-between",
                                        flexDirection: isMobile ? "column" : "row",
                                        gap: isMobile ? 10 : 0,
                                        marginBottom: 14, paddingBottom: 12,
                                        borderBottom: `1px solid ${C.borderLight}`,
                                    }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 800, color: C.text }}>
                                                {DAY_LABELS[activeDay] ?? activeDay}
                                                {activeDay === TODAY_KEY && (
                                                    <span style={{
                                                        marginLeft: 7, fontSize: 9, fontWeight: 700,
                                                        background: `${C.green}18`, color: C.green,
                                                        border: `1px solid ${C.green}40`,
                                                        borderRadius: 20, padding: "2px 7px",
                                                        verticalAlign: "middle",
                                                    }}>
                                                        TODAY
                                                    </span>
                                                )}
                                            </h2>
                                            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight }}>
                                                {classSlots.length} class{classSlots.length !== 1 ? "es" : ""} · {slots.length} total slots
                                            </p>
                                        </div>

                                        {stats && (
                                            <div style={{
                                                padding: isMobile ? "6px 10px" : "6px 14px",
                                                background: C.bg, border: `1px solid ${C.borderLight}`,
                                                borderRadius: 10,
                                                textAlign: isMobile ? "left" : "right",
                                                alignSelf: isMobile ? "flex-start" : "auto",
                                            }}>
                                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>
                                                    {fmtTime(stats.dayStart)} – {fmtTime(stats.dayEnd)}
                                                </p>
                                                <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>School hours</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Empty state */}
                                    {slots.length === 0 && (
                                        <div style={{ textAlign: "center", padding: "40px 20px", color: C.textLight }}>
                                            <div style={{
                                                width: 46, height: 46, borderRadius: 13,
                                                background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                margin: "0 auto 12px",
                                            }}>
                                                <Calendar size={20} color={C.sky} />
                                            </div>
                                            <p style={{ fontWeight: 700, margin: 0, fontSize: 13, color: C.text }}>
                                                No periods scheduled
                                            </p>
                                            <p style={{ fontSize: 11, margin: "4px 0 0" }}>
                                                Nothing planned for {DAY_LABELS[activeDay] ?? "this day"}
                                            </p>
                                        </div>
                                    )}

                                    {/* Period rows */}
                                    {slots.length > 0 && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
                                            {(() => {
                                                let cc = 0;
                                                return slots.map((slot, i) => {
                                                    const isBreak = slot.slotType !== "PERIOD";
                                                    const ci = isBreak ? 0 : cc;
                                                    if (!isBreak) cc++;
                                                    return (
                                                        <PeriodCard
                                                            key={slot.id ?? i}
                                                            slot={slot}
                                                            classIndex={ci}
                                                            isMobile={isMobile}
                                                            isTablet={isTablet}
                                                        />
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}