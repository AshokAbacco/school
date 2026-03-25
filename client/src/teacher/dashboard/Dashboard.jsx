// client/src/teacher/dashboard/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen, CalendarDays, GraduationCap, RefreshCw,
  AlertCircle, Zap, TrendingUp, BookMarked,
} from "lucide-react";
import { getToken } from "../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340", bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0",
  borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const JS_DAY_TO_KEY = { 0:"SUNDAY",1:"MONDAY",2:"TUESDAY",3:"WEDNESDAY",4:"THURSDAY",5:"FRIDAY",6:"SATURDAY" };
const DAY_LABELS    = { MONDAY:"Monday",TUESDAY:"Tuesday",WEDNESDAY:"Wednesday",THURSDAY:"Thursday",FRIDAY:"Friday",SATURDAY:"Saturday",SUNDAY:"Sunday" };

const todayKey   = () => JS_DAY_TO_KEY[new Date().getDay()];
const toMinutes  = (t = "00:00") => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const greeting   = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const formatDate = () => new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 14px rgba(56,73,89,0.07)", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${C.deep})` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</p>
          {loading ? (
            <><Pulse w={60} h={28} r={6} /><div style={{ marginTop: 6 }}><Pulse w={90} h={10} r={4} /></div></>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value ?? "—"}</p>
              {sub && <p style={{ margin: "5px 0 0", fontSize: 12, color: C.textLight }}>{sub}</p>}
            </>
          )}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `${accent}16`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 12 }}>
          <Icon size={20} color={accent} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function PeriodRow({ entry, isNow }) {
  const isExtra = entry.type === "EXTRA";
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: isNow ? `${C.sky}10` : C.bg, border: `1.5px solid ${isNow ? C.sky : C.borderLight}`, transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 3px 12px ${C.sky}22`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: isNow ? `linear-gradient(135deg, ${C.sky}, ${C.deep})` : `${C.slate}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isExtra
          ? <Zap size={14} color={isNow ? C.white : C.slate} />
          : <span style={{ fontSize: 13, fontWeight: 900, color: isNow ? C.white : C.slate }}>{entry.periodDefinition?.periodNumber}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject?.name ?? "—"}</span>
          {isNow   && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: C.sky, color: C.white, letterSpacing: "0.05em" }}>NOW</span>}
          {isExtra && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: `${C.mist}55`, color: C.slate }}>EXTRA</span>}
        </div>
        <span style={{ fontSize: 11, color: C.textLight }}>{entry.classSection?.name ?? "—"}</span>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{entry.startTime}</p>
        <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>{entry.endTime}</p>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, iconBg, title, badge, sub, children }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 10, background: `linear-gradient(90deg, ${C.bg}, ${C.white})` }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>
            {title}
            {badge && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${C.sky}18`, color: C.deep }}>{badge}</span>}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{sub}</p>
        </div>
      </div>
      <div style={{ padding: 16, flex: 1 }}>{children}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const headers = { Authorization: `Bearer ${getToken()}` };

  const [timetableLoading, setTimetableLoading] = useState(true);
  const [classesLoading,   setClassesLoading]   = useState(true);
  const [resultsLoading,   setResultsLoading]   = useState(true);
  const [timetableError,   setTimetableError]   = useState("");
  const [refreshKey,       setRefreshKey]       = useState(0);

  const [todayEntries, setTodayEntries] = useState([]);
  const [academicYear, setAcademicYear] = useState(null);
  const [classes,      setClasses]      = useState([]);
  const [resultStats,  setResultStats]  = useState(null);

  const today = todayKey();
  const now   = new Date().getHours() * 60 + new Date().getMinutes();

  const currentPeriod = todayEntries.find((e) => now >= toMinutes(e.startTime) && now < toMinutes(e.endTime));
  const nextPeriod    = todayEntries.find((e) => toMinutes(e.startTime) > now);
  const totalStudents = React.useMemo(() => classes.reduce((s, c) => s + (c.studentCount ?? 0), 0), [classes]);

  const fetchTimetable = useCallback(async () => {
    setTimetableLoading(true); setTimetableError("");
    try {
      const json = await fetch(`${API}/api/teacher/timetable/today`, { headers }).then((r) => r.json());
      if (json.success) { setTodayEntries(json.data.entries ?? []); setAcademicYear(json.data.academicYear ?? null); }
      else setTimetableError(json.message || "Failed to load timetable");
    } catch { setTimetableError("Network error — could not load timetable"); }
    finally   { setTimetableLoading(false); }
  }, [refreshKey]);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const json = await fetch(`${API}/api/results/teacher/classes`, { headers }).then((r) => r.json());
      if (json.success) setClasses(json.classes ?? []);
    } catch { /* silently fail */ } finally { setClassesLoading(false); }
  }, [refreshKey]);

  // ── Avg Score from /summary (pre-aggregated per-student totals) ───────────
  const fetchResultStats = useCallback(async () => {
    setResultsLoading(true);
    try {
      const json = await fetch(`${API}/api/results/summary`, { headers }).then((r) => r.json());
      if (json.success) {
        const data = json.data ?? [];
        const avg  = data.length ? Math.round(data.reduce((s, r) => s + (Number(r.percentage) || 0), 0) / data.length) : 0;
        const pass = data.filter((r) => r.grade !== "F").length;
        setResultStats({ avg, pass, total: data.length });
      }
    } catch { /* silently fail */ } finally { setResultsLoading(false); }
  }, [refreshKey]);

  useEffect(() => {
    fetchTimetable(); fetchClasses(); fetchResultStats();
  }, [fetchTimetable, fetchClasses, fetchResultStats]);

  const SkeletonRows = ({ n = 4 }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
          <Pulse w={32} h={32} r={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Pulse w="50%" h={12} r={5} /><Pulse w="35%" h={10} r={4} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <Pulse w={40} h={11} r={4} /><Pulse w={30} h={9} r={4} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *{font-family:'DM Sans',sans-serif}
        .df{animation:dfUp 0.45s cubic-bezier(0.22,1,0.36,1) both}
        .df1{animation-delay:.04s}.df2{animation-delay:.1s}.df3{animation-delay:.16s}
        @keyframes dfUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .animate-pulse{animation:pulse 1.8s cubic-bezier(0.4,0,0.6,1) infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .animate-spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:700px){.two-col{grid-template-columns:1fr !important}}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 20px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* Header */}
          <div className="df" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 30, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
                <h1 style={{ margin: 0, fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>{greeting()} 👋</h1>
              </div>
              <p style={{ margin: 0, paddingLeft: 14, fontSize: 13, color: C.textLight, fontWeight: 500 }}>
                {formatDate()} · {academicYear?.name ?? (timetableLoading ? "Loading…" : "Academic Year")}
              </p>
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)} title="Refresh"
              style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, boxShadow: "0 1px 4px rgba(56,73,89,0.06)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}55`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
            >
              <RefreshCw size={15} className={timetableLoading || classesLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Stat Cards */}
          <div className="df df1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 24 }}>
            <StatCard
              label="My Classes" value={classes.length}
              sub={`across ${classes.length} section${classes.length !== 1 ? "s" : ""}`}
              icon={BookOpen} accent={C.sky} loading={classesLoading}
            />
            <StatCard
              label="Today's Periods" value={todayEntries.length}
              sub={
                currentPeriod ? `${currentPeriod.subject?.name ?? "Class"} in progress`
                : nextPeriod   ? `Next: ${nextPeriod.subject?.name ?? "Class"} at ${nextPeriod.startTime}`
                : todayEntries.length > 0 ? "All periods done for today" : "No classes today"
              }
              icon={CalendarDays} accent="#059669" loading={timetableLoading}
            />
            <StatCard
              label="Avg. Score"
              value={resultStats ? `${resultStats.avg}%` : "—"}
              sub={resultStats ? `${resultStats.pass} / ${resultStats.total} passed` : "No results yet"}
              icon={TrendingUp} accent="#D97706" loading={resultsLoading}
            />
          </div>

          {/* Today's Schedule | My Classes — side by side */}
          <div className="df df2 two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>

            {/* Today's Schedule */}
            <Panel
              icon={CalendarDays}
              iconBg={`linear-gradient(135deg, ${C.sky}, ${C.deep})`}
              title="Today's Schedule"
              badge={DAY_LABELS[today]}
              sub={timetableLoading ? "Loading…" : `${todayEntries.length} period${todayEntries.length !== 1 ? "s" : ""} scheduled`}
            >
              {timetableError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 12, background: `${C.mist}55`, border: `1px solid ${C.border}`, marginBottom: 12, fontSize: 13, color: C.slate }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />{timetableError}
                </div>
              )}
              {timetableLoading && !timetableError && <SkeletonRows n={4} />}
              {!timetableLoading && !timetableError && todayEntries.length === 0 && (
                <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CalendarDays size={22} color={C.sky} strokeWidth={1.5} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>No classes today</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.textLight, textAlign: "center" }}>No periods assigned for {DAY_LABELS[today]}</p>
                </div>
              )}
              {!timetableLoading && !timetableError && todayEntries.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {todayEntries.map((entry, i) => (
                    <PeriodRow key={entry.id ?? i} entry={entry} isNow={now >= toMinutes(entry.startTime) && now < toMinutes(entry.endTime)} />
                  ))}
                </div>
              )}
            </Panel>

            {/* My Classes */}
            <Panel
              icon={GraduationCap}
              iconBg="linear-gradient(135deg, #7C3AED, #4C1D95)"
              title="My Classes"
              sub={classesLoading ? "Loading…" : `${classes.length} section${classes.length !== 1 ? "s" : ""} · ${totalStudents} students`}
            >
              {classesLoading
                ? <SkeletonRows n={3} />
                : classes.length === 0
                ? (
                  <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#7C3AED18", border: "1px solid #7C3AED33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <GraduationCap size={22} color="#7C3AED" strokeWidth={1.5} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>No classes assigned</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classes.map((cls, i) => (
                      <div key={cls.id ?? i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED22,#4C1D9522)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <BookMarked size={14} color="#7C3AED" strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cls.name ?? `Grade ${cls.grade}${cls.section ? ` – ${cls.section}` : ""}`}
                          </p>
                          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{cls.subject ?? ""}</p>
                        </div>
                        {cls.studentCount != null && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, background: `${C.mist}55`, padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>{cls.studentCount} students</span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            </Panel>
          </div>

          <p style={{ textAlign: "center", color: C.textLight, fontSize: 11, marginTop: 32 }}>
            School Management System · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}