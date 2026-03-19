// client/src/parent/pages/FeesAndPayments.jsx
// ═══════════════════════════════════════════════════════════════
//  Parent Portal — Extracurricular Activities
//  Design: 1:1 copy of student ActivitiesPage.jsx
//  Differences from student version:
//    1. No <PageLayout> wrapper (Routes.jsx handles layout)
//    2. Fetches children from /api/parent/students on mount
//    3. ChildSelector shown when parent has > 1 child
//    4. All API calls use /api/parent/activities?studentId=
//    5. Re-fetches everything when selected child changes
//    6. View-only — Enroll/Withdraw buttons removed (parent cannot act on behalf of student)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from "react";
import {
    Trophy, Users, Star, Brain, Music, Dumbbell,
    Palette, Camera, Globe, BookOpen, Loader2,
    CheckCircle, AlertCircle, X,
    Swords, Medal, Calendar, Search,
    EyeOff, Activity,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

// ─── Design tokens (identical to student version) ──────────────
const C = {
    dark: "#384959",
    mid: "#6A89A7",
    light: "#88BDF2",
    pale: "#BDDDFC",
    bg: "#EDF3FA",
    white: "#ffffff",
    border: "rgba(136,189,242,0.30)",
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";



const apiFetch = async (path) => {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || `HTTP ${res.status}`);
    return json;
};

// ─── Constants (identical to student) ─────────────────────────
const RESULT_META = {
    WINNER: { icon: "🥇", label: "Winner", color: "#f59e0b" },
    RUNNER_UP: { icon: "🥈", label: "Runner Up", color: "#94a3b8" },
    THIRD_PLACE: { icon: "🥉", label: "Third Place", color: "#b45309" },
    SPECIAL_AWARD: { icon: "🏅", label: "Special Award", color: "#a855f7" },
    PARTICIPATED: { icon: "⭐", label: "Participated", color: "#22c55e" },
};

const EVENT_TYPE_META = {
    COMPETITION: { label: "Competition", color: "#f59e0b", Icon: Swords },
    CULTURAL: { label: "Cultural", color: "#a855f7", Icon: Music },
    PARTICIPATION: { label: "Participation", color: "#22c55e", Icon: Star },
    CEREMONY: { label: "Ceremony", color: C.light, Icon: Trophy },
};

const CATEGORY_META = {
    SPORTS: { label: "Sports", color: "#f59e0b", emoji: "🏆" },
    CULTURAL: { label: "Cultural", color: "#a855f7", emoji: "🎵" },
    ACADEMIC: { label: "Academic", color: "#22c55e", emoji: "📚" },
    OTHER: { label: "Other", color: C.mid, emoji: "⭐" },
};

const activityIcon = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("music") || n.includes("band") || n.includes("choir")) return Music;
    if (n.includes("basket") || n.includes("football") || n.includes("cricket")) return Dumbbell;
    if (n.includes("art") || n.includes("paint") || n.includes("draw")) return Palette;
    if (n.includes("photo")) return Camera;
    if (n.includes("environ") || n.includes("nature") || n.includes("eco")) return Globe;
    if (n.includes("debate") || n.includes("quiz") || n.includes("science")) return Brain;
    if (n.includes("drama") || n.includes("theater") || n.includes("dance")) return Music;
    return BookOpen;
};

// ─── Font + CSS (identical to student) ────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .act-root, .act-root * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }
  @keyframes act-spin { to { transform: rotate(360deg); } }
  @keyframes act-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.45; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .act-sk { animation: act-pulse 1.5s ease-in-out infinite; background: ${C.pale}; border-radius: 8px; }
  .act-card-hover { transition: box-shadow 0.18s, border-color 0.18s; }
  .act-card-hover:hover { box-shadow: 0 4px 20px rgba(56,73,89,0.10); border-color: rgba(136,189,242,0.55) !important; }
  .act-btn { transition: opacity 0.14s, background 0.14s; cursor: pointer; border: none; font-family: 'Inter', sans-serif !important; }
  .act-btn:hover { opacity: 0.85; }
  .act-btn:active { opacity: 0.7; }
  .act-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .act-row:hover { background: rgba(237,243,250,0.9) !important; }

  .act-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }
  @media (max-width: 1024px) { .act-stat-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .act-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

  .act-cards-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 1200px) { .act-cards-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 860px)  { .act-cards-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 540px)  { .act-cards-grid { grid-template-columns: 1fr; gap: 12px; } }

  .act-2col {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  @media (max-width: 700px) { .act-2col { grid-template-columns: 1fr; } }

  .act-page { padding: 24px 28px; }
  @media (max-width: 768px) { .act-page { padding: 16px; } }
  @media (max-width: 480px) { .act-page { padding: 12px 10px; } }

  .act-tabbar { display: flex; gap: 4px; padding: 4px; flex-wrap: wrap; }
  .act-filters { display: flex; gap: 8px; flex-wrap: wrap; }

  .act-search-bar {
    display: flex; align-items: center; gap: 8px;
    background: ${C.white}; border: 1.5px solid ${C.border};
    border-radius: 10px; padding: 0 12px; height: 36px;
    flex: 1; max-width: 340px;
  }
  .act-search-bar input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: ${C.dark}; width: 100%;
    font-family: 'Inter', sans-serif !important;
  }
  .act-search-bar input::placeholder { color: ${C.mid}; }

  .act-line-clamp2 {
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }

  /* Child selector scrollbar hide */
  .child-scroll { scrollbar-width: none; }
  .child-scroll::-webkit-scrollbar { display: none; }
`;

// ─── Skeleton ──────────────────────────────────────────────────
const Sk = ({ h = 14, w = "100%", r = 6 }) => (
    <div className="act-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ─── Toast ─────────────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);
    const push = (msg, type = "success") => {
        const id = Date.now();
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    };
    return { toasts, push };
}

// ─── Child Selector ────────────────────────────────────────────
function initials(name = "") {
    return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function ChildSelector({ children, selectedId, onChange }) {
    if (!children || children.length <= 1) return null;
    return (
        <div style={{ marginBottom: 20 }}>
            <p style={{
                margin: "0 0 10px", fontSize: 11, fontWeight: 800,
                color: C.mid, textTransform: "uppercase", letterSpacing: "0.10em",
                fontFamily: "'Inter', sans-serif",
            }}>
                Select Child
            </p>
            <div className="child-scroll" style={{
                display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            }}>
                {children.map((child) => {
                    const active = child.studentId === selectedId;
                    return (
                        <button
                            key={child.studentId}
                            onClick={() => onChange(child.studentId)}
                            style={{
                                flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
                                padding: "9px 14px", borderRadius: 14, outline: "none",
                                border: active ? `1.5px solid ${C.light}` : `1.5px solid rgba(136,189,242,0.28)`,
                                background: active ? `rgba(136,189,242,0.14)` : C.white,
                                cursor: "pointer", transition: "all 0.15s",
                                boxShadow: active ? `0 2px 10px rgba(136,189,242,0.22)` : "none",
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            <div style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: active
                                    ? `linear-gradient(135deg, ${C.light}, ${C.dark})`
                                    : `linear-gradient(135deg, ${C.pale}, rgba(200,220,240,1))`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 900,
                                color: active ? C.white : C.mid,
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
                                    color: active ? C.dark : C.mid,
                                    whiteSpace: "nowrap",
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

// ─── Stat Card (identical to student) ─────────────────────────
function StatCard({ label, value, sub, accent, Icon, loading }) {
    return (
        <div style={{
            background: C.white, borderRadius: 12, padding: "18px 20px",
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${accent}`,
            position: "relative", overflow: "hidden",
        }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mid, margin: 0 }}>
                    {label}
                </p>
                <Icon size={22} color={accent} style={{ opacity: 0.18 }} />
            </div>
            <div style={{ marginTop: 10 }}>
                {loading
                    ? <><Sk h={32} w="60%" r={6} /><div style={{ marginTop: 8 }}><Sk h={11} w="45%" /></div></>
                    : <>
                        <p style={{ fontSize: 32, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>
                            {value ?? "—"}
                        </p>
                        {sub && <p style={{ fontSize: 11, color: C.mid, margin: "5px 0 0", fontWeight: 500 }}>{sub}</p>}
                    </>
                }
            </div>
        </div>
    );
}

// ─── Activity Card (view-only — no enroll/withdraw) ────────────
function ActivityCard({ activity }) {
    const catMeta = CATEGORY_META[activity.category] ?? CATEGORY_META.OTHER;
    const isEnrolled = activity.isEnrolled;
    const classes = activity.activityClasses?.map(ac => ac.classSection?.name ?? ac.classSection) ?? [];
    const shownClasses = classes.slice(0, 3);
    const extraClasses = classes.length - 3;

    return (
        <div className="act-card-hover" style={{
            background: C.white, borderRadius: 12,
            border: `1px solid ${C.border}`,
            padding: "16px 18px",
            display: "flex", flexDirection: "column", gap: 0,
            position: "relative",
        }}>
            {/* Enrolled indicator dot */}
            {isEnrolled && (
                <div style={{
                    position: "absolute", top: 12, right: 12,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 0 2px rgba(34,197,94,0.20)",
                }} />
            )}

            <p style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: "0 0 3px", paddingRight: 16 }}>
                {activity.name}
            </p>
            <p style={{ fontSize: 11, color: C.mid, margin: "0 0 10px" }}>
                {activity.academicYear?.name}
            </p>

            {/* Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                <span style={{
                    fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 20,
                    background: catMeta.color + "15", color: catMeta.color,
                    display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                    <span style={{ fontSize: 10 }}>{catMeta.emoji}</span>
                    {catMeta.label}
                </span>
                <span style={{
                    fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 20,
                    background: activity.participationType === "TEAM"
                        ? "rgba(59,130,246,0.10)" : "rgba(34,197,94,0.10)",
                    color: activity.participationType === "TEAM" ? "#2563eb" : "#16a34a",
                }}>
                    {activity.participationType === "TEAM" ? "Team" : "Individual"}
                </span>
                {shownClasses.map(cls => (
                    <span key={cls} style={{
                        fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                        background: "rgba(189,221,252,0.40)", color: C.mid,
                    }}>
                        {cls}
                    </span>
                ))}
                {extraClasses > 0 && (
                    <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                        background: "rgba(189,221,252,0.40)", color: C.mid,
                    }}>
                        +{extraClasses}
                    </span>
                )}
            </div>

            {activity.description && (
                <p className="act-line-clamp2" style={{ fontSize: 11, color: C.mid, margin: "0 0 10px", lineHeight: 1.5 }}>
                    {activity.description}
                </p>
            )}

            <div style={{ height: 1, background: C.border, margin: "8px 0 10px" }} />

            {/* Stats + enrolled badge (no action button) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 16 }}>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1 }}>
                            {activity._count?.enrollments ?? 0}
                        </p>
                        <p style={{ fontSize: 10, color: C.mid, margin: "2px 0 0", fontWeight: 500 }}>Enrolled</p>
                    </div>
                    <div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1 }}>
                            {activity._count?.events ?? 0}
                        </p>
                        <p style={{ fontSize: 10, color: C.mid, margin: "2px 0 0", fontWeight: 500 }}>Events</p>
                    </div>
                </div>

                {/* Status badge instead of action button */}
                <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: "4px 12px", borderRadius: 8,
                    background: isEnrolled ? "rgba(34,197,94,0.10)" : "rgba(189,221,252,0.30)",
                    color: isEnrolled ? "#16a34a" : C.mid,
                    border: `1px solid ${isEnrolled ? "rgba(34,197,94,0.25)" : C.border}`,
                }}>
                    {isEnrolled ? "✓ Enrolled" : "Not Enrolled"}
                </span>
            </div>
        </div>
    );
}

// ─── Event Row (identical to student) ─────────────────────────
function EventRow({ event }) {
    const et = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.PARTICIPATION;
    const Et = et.Icon;
    return (
        <div className="act-row" style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "12px 14px", borderRadius: 10,
            transition: "background 0.12s", background: "transparent",
        }}>
            <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: et.color + "15",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <Et size={15} color={et.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>{event.eventName}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: et.color + "15", color: et.color }}>
                        {et.label}
                    </span>
                </div>
                {event.activity && <p style={{ fontSize: 11, color: C.mid, margin: "0 0 4px" }}>{event.activity.name}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {event.eventDate && (
                        <span style={{ fontSize: 11, color: C.mid, display: "flex", alignItems: "center", gap: 3 }}>
                            <Calendar size={9} />
                            {new Date(event.eventDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                    )}
                    {event.asTeam && (
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 3 }}>
                            <Users size={9} />{event.teamName}
                        </span>
                    )}
                    {event.role && <span style={{ fontSize: 11, color: "#a855f7" }}>Role: {event.role}</span>}
                </div>
                {event.results?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                        {event.results.map((r, i) => {
                            const rm = RESULT_META[r.resultType] ?? RESULT_META.PARTICIPATED;
                            return (
                                <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: rm.color + "15", color: rm.color }}>
                                    {rm.icon} {r.awardTitle ?? rm.label}{r.position ? ` · #${r.position}` : ""}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Achievement Row (identical to student) ────────────────────
function AchievementRow({ achievement }) {
    const rm = RESULT_META[achievement.resultType] ?? RESULT_META.PARTICIPATED;
    return (
        <div className="act-row" style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 10,
            background: "transparent", transition: "background 0.12s",
        }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{rm.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.dark, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {achievement.eventName}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: rm.color + "15", color: rm.color }}>
                        {achievement.awardTitle ?? rm.label}
                        {achievement.position ? ` · #${achievement.position}` : ""}
                    </span>
                    {achievement.activityName && (
                        <span style={{ fontSize: 11, color: C.mid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                            {achievement.activityName}
                        </span>
                    )}
                    {achievement.asTeam && (
                        <span style={{ fontSize: 11, color: "#1d4ed8", display: "flex", alignItems: "center", gap: 3 }}>
                            <Users size={9} />{achievement.teamName}
                        </span>
                    )}
                </div>
            </div>
            {achievement.eventDate && (
                <p style={{ fontSize: 11, color: C.mid, flexShrink: 0 }}>
                    {new Date(achievement.eventDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                </p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN — No <PageLayout> (Routes.jsx handles layout)
// ═══════════════════════════════════════════════════════════════
export default function ActivitiesPage() {
    // ── Children ─────────────────────────────────────────────────
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [errorChildren, setErrorChildren] = useState(null);

    // ── Activities data ───────────────────────────────────────────
    const [tab, setTab] = useState("activities");
    const [activities, setActivities] = useState([]);
    const [events, setEvents] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    const { toasts, push } = useToast();

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

    // 2. Load all activities data when child changes
    const load = useCallback(async (studentId) => {
        if (!studentId) return;
        setLoading(true);
        setActivities([]); setEvents([]); setAchievements([]); setSummary(null);
        try {
            const q = `?studentId=${studentId}`;
            const [actRes, evtRes, achRes, sumRes] = await Promise.all([
                apiFetch(`/api/parent/activities${q}`),
                apiFetch(`/api/parent/activities/events${q}`),
                apiFetch(`/api/parent/activities/achievements${q}`),
                apiFetch(`/api/parent/activities/summary${q}`),
            ]);
            setActivities(actRes.data ?? []);
            setEvents(evtRes.data ?? []);
            setAchievements(achRes.data ?? []);
            setSummary(sumRes.data ?? null);
        } catch (e) {
            push(e.message, "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedChild) load(selectedChild);
    }, [selectedChild, load]);

    // ── Derived ───────────────────────────────────────────────────
    const enrolledCount = activities.filter(a => a.isEnrolled).length;
    const availableCount = activities.filter(a => !a.isEnrolled).length;
    const activeChild = children.find(c => c.studentId === selectedChild);

    const filtered = activities.filter(a => {
        const matchesFilter =
            filter === "enrolled" ? a.isEnrolled :
                filter === "available" ? !a.isEnrolled : true;
        const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const statCards = [
        { label: "Activities", value: summary?.enrolledActivities ?? enrolledCount, sub: summary?.academicYear ?? null, accent: C.light, Icon: BookOpen },
        { label: "Events Attended", value: summary?.eventsParticipated ?? events.length, sub: "total events", accent: "#a855f7", Icon: Trophy },
        { label: "Achievements", value: summary?.achievements ?? achievements.length, sub: "awards earned", accent: "#f59e0b", Icon: Medal },
        { label: "Available", value: availableCount, sub: `${activities.length} total`, accent: "#22c55e", Icon: Activity },
    ];

    const TABS = [
        { key: "activities", label: "Activities", count: activities.length },
        { key: "events", label: "My Events", count: events.length },
        { key: "achievements", label: "Achievements", count: achievements.length },
    ];

    return (
        <>
            <style>{STYLE}</style>

            {/* Toasts */}
            {toasts.map(t => (
                <div key={t.id} style={{
                    position: "fixed", top: 20, right: 20, zIndex: 9999,
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: t.type === "error" ? "#fef2f2" : "#f0fdf4",
                    border: `1.5px solid ${t.type === "error" ? "#fca5a5" : "#86efac"}`,
                    color: t.type === "error" ? "#991b1b" : "#166534",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}>
                    {t.type === "error" ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                    {t.msg}
                </div>
            ))}

            <div className="act-root act-page" style={{ minHeight: "100vh", background: C.bg }}>

                {/* ── Loading children ── */}
                {loadingChildren && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                        <Loader2 size={28} color={C.mid} style={{ animation: "spin 0.9s linear infinite" }} />
                    </div>
                )}

                {/* ── Error loading children ── */}
                {!loadingChildren && errorChildren && (
                    <div style={{
                        display: "flex", alignItems: "flex-start", gap: 8,
                        padding: "12px 16px", borderRadius: 12,
                        background: "#fef2f2", border: "1px solid #fca5a5",
                        marginBottom: 16, fontSize: 13, color: "#991b1b",
                    }}>
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{errorChildren}</span>
                    </div>
                )}

                {!loadingChildren && !errorChildren && (
                    <>
                        {/* ── Child selector ── */}
                        <ChildSelector
                            children={children}
                            selectedId={selectedChild}
                            onChange={(id) => setSelectedChild(id)}
                        />

                        {/* ── No child selected ── */}
                        {!selectedChild && (
                            <div style={{
                                background: C.white, borderRadius: 12,
                                border: `1px solid ${C.border}`,
                                padding: "64px 20px", textAlign: "center",
                            }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: "50%",
                                    background: C.bg, border: `1.5px solid ${C.border}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 14px",
                                }}>
                                    <Activity size={22} color={C.mid} />
                                </div>
                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>No Child Selected</p>
                                <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>Select a child above to view their activities.</p>
                            </div>
                        )}

                        {selectedChild && (
                            <>
                                {/* ── Page title ── */}
                                <div style={{
                                    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                    flexWrap: "wrap", gap: 12, marginBottom: 20,
                                }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                                        <div style={{ width: 4, height: 48, background: C.dark, borderRadius: 2, marginRight: 12, flexShrink: 0 }} />
                                        <div>
                                            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1.1 }}>
                                                Extracurricular Activities
                                            </h1>
                                            <p style={{ fontSize: 12, color: C.mid, margin: "4px 0 0", fontWeight: 500 }}>
                                                {loading ? "Loading…"
                                                    : activeChild
                                                        ? `${activeChild.name}${enrolledCount > 0 ? ` · ${enrolledCount} enrolled` : ""} · ${availableCount} available`
                                                        : ""}
                                                {summary?.academicYear ? ` · ${summary.academicYear}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    {loading && <Loader2 size={20} color={C.mid} style={{ animation: "act-spin 0.7s linear infinite", marginTop: 6 }} />}
                                </div>

                                {/* ── Stat cards ── */}
                                <div className="act-stat-grid">
                                    {statCards.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
                                </div>

                                {/* ── Toolbar ── */}
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    flexWrap: "wrap", gap: 10, marginBottom: 18,
                                }}>
                                    <div className="act-tabbar" style={{
                                        background: C.white, borderRadius: 12,
                                        border: `1px solid ${C.border}`, width: "fit-content",
                                    }}>
                                        {TABS.map(t => (
                                            <button key={t.key} className="act-btn" onClick={() => setTab(t.key)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 6,
                                                    padding: "7px 16px", borderRadius: 9,
                                                    fontSize: 13, fontWeight: 600,
                                                    background: tab === t.key ? C.dark : "transparent",
                                                    color: tab === t.key ? C.white : C.mid,
                                                }}>
                                                {t.label}
                                                {!loading && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                                                        background: tab === t.key ? "rgba(255,255,255,0.2)" : "rgba(189,221,252,0.4)",
                                                        color: tab === t.key ? C.white : C.mid,
                                                    }}>
                                                        {t.count}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {tab === "activities" && (
                                        <div className="act-search-bar">
                                            <Search size={13} color={C.mid} style={{ flexShrink: 0 }} />
                                            <input
                                                type="text"
                                                placeholder="Search activities..."
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* ── Content ── */}
                                {loading ? (
                                    <div className="act-cards-grid">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                            <div key={i} style={{ background: C.white, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                                                <Sk h={16} w="70%" r={5} />
                                                <div style={{ marginTop: 6 }}><Sk h={11} w="40%" /></div>
                                                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                                                    <Sk h={20} w={70} r={20} /><Sk h={20} w={60} r={20} /><Sk h={20} w={40} r={20} />
                                                </div>
                                                <div style={{ height: 1, background: C.border, margin: "14px 0 10px" }} />
                                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <div style={{ display: "flex", gap: 16 }}>
                                                        <Sk h={28} w={30} /><Sk h={28} w={30} />
                                                    </div>
                                                    <Sk h={28} w={70} r={8} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                ) : tab === "activities" ? (
                                    <>
                                        <div className="act-filters" style={{ marginBottom: 14 }}>
                                            {[
                                                { key: "all", label: `All (${activities.length})` },
                                                { key: "enrolled", label: `Enrolled (${enrolledCount})` },
                                                { key: "available", label: `Available (${availableCount})` },
                                            ].map(f => (
                                                <button key={f.key} className="act-btn" onClick={() => setFilter(f.key)} style={{
                                                    padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                    background: filter === f.key ? C.dark : C.white,
                                                    color: filter === f.key ? C.white : C.mid,
                                                    border: `1.5px solid ${filter === f.key ? C.dark : C.border}`,
                                                }}>
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>

                                        {filtered.length === 0 ? (
                                            <div style={{
                                                background: C.white, borderRadius: 12,
                                                border: `1px solid ${C.border}`,
                                                padding: "64px 20px", textAlign: "center",
                                            }}>
                                                <div style={{
                                                    width: 56, height: 56, borderRadius: "50%",
                                                    background: C.bg, border: `1.5px solid ${C.border}`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    margin: "0 auto 14px",
                                                }}>
                                                    <EyeOff size={22} color={C.mid} />
                                                </div>
                                                <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>No Activities Found</p>
                                                <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>
                                                    {search ? `No results for "${search}"` : "No activities match the current filter."}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="act-cards-grid">
                                                {filtered.map(act => <ActivityCard key={act.id} activity={act} />)}
                                            </div>
                                        )}
                                    </>

                                ) : tab === "events" ? (
                                    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
                                        <div style={{
                                            padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
                                            display: "flex", alignItems: "center", gap: 10,
                                        }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#a855f715", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Trophy size={14} color="#a855f7" />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>My Events</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(189,221,252,0.4)", color: C.mid, marginLeft: "auto" }}>
                                                {events.length}
                                            </span>
                                        </div>
                                        <div style={{ padding: "8px 6px" }}>
                                            {events.length === 0 ? (
                                                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                                                    <Trophy size={28} color={C.pale} style={{ display: "block", margin: "0 auto 10px" }} />
                                                    <p style={{ fontSize: 13, color: C.mid, margin: 0 }}>No events participated yet</p>
                                                </div>
                                            ) : (
                                                <div className="act-2col" style={{ padding: "4px" }}>
                                                    {events.map((ev, i) => <EventRow key={`${ev.eventId}-${i}`} event={ev} />)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                ) : (
                                    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>
                                        <div style={{
                                            padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
                                            display: "flex", alignItems: "center", gap: 10,
                                        }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#f59e0b15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Medal size={14} color="#f59e0b" />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Achievements</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "rgba(189,221,252,0.4)", color: C.mid, marginLeft: "auto" }}>
                                                {achievements.length}
                                            </span>
                                        </div>
                                        <div style={{ padding: "8px 6px" }}>
                                            {achievements.length === 0 ? (
                                                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                                                    <Medal size={28} color={C.pale} style={{ display: "block", margin: "0 auto 10px" }} />
                                                    <p style={{ fontSize: 13, color: C.mid, margin: 0 }}>No achievements yet — keep participating!</p>
                                                </div>
                                            ) : (
                                                <div className="act-2col" style={{ padding: "4px" }}>
                                                    {achievements.map(a => <AchievementRow key={a.id} achievement={a} />)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}