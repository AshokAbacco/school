// client/src/student/dashboard/Dashboard.jsx
// REDESIGNED — Stormy Morning palette only: #6A89A7 · #BDDDFC · #88BDF2 · #384959
// FULLY RESPONSIVE — mobile / tablet / desktop

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Trophy, Clock, ArrowUpRight,
  User, Award, CheckCircle, AlertCircle,
  Star, Users, BookMarked, Target, Zap,
  ChevronRight, Flame, BarChart3, Menu, X,
} from "lucide-react";
import { getToken } from "../../auth/storage.js";

/* ─── STORMY MORNING palette only ─── */
const C = {
  dark:        "#384959",
  mid:         "#6A89A7",
  light:       "#88BDF2",
  pale:        "#BDDDFC",
  bg:          "#EDF3FA",
  white:       "#ffffff",
  glassBorder: "rgba(136,189,242,0.28)",
  glass:       "rgba(255,255,255,0.75)",
};

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/dashboard`;

const apiFetch = async (path = "", opts = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    ...opts,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};

/* ─── Helpers ─── */
const gradeFromPct = (p) => {
  if (p == null) return "—";
  if (p >= 90) return "A+"; if (p >= 80) return "A";
  if (p >= 70) return "B+"; if (p >= 60) return "B";
  if (p >= 50) return "C";  return "F";
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const fmtDay = (d) =>
  new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

const TODAY_LABEL = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

/* ─── Breakpoints hook ─── */
function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 480) return "mobile";
    if (w < 768) return "mobileLg";
    if (w < 1024) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w < 480) setBp("mobile");
      else if (w < 768) setBp("mobileLg");
      else if (w < 1024) setBp("tablet");
      else setBp("desktop");
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    bp,
    isMobile:   bp === "mobile" || bp === "mobileLg",
    isTablet:   bp === "tablet",
    isDesktop:  bp === "desktop",
    isSmall:    bp === "mobile",
  };
}

/* ─── Global CSS ─── */
const GLOBAL_CSS = `

  @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); }      to { opacity:1; transform:scale(1); } }
  @keyframes shimmer { 0% { background-position:-500px 0; } 100% { background-position:500px 0; } }
  @keyframes liveRing{ 0%,100%{ box-shadow:0 0 0 0 rgba(136,189,242,0.5); } 60%{ box-shadow:0 0 0 7px rgba(136,189,242,0); } }

  *, *::before, *::after { box-sizing: border-box; }

  .sdb { font-family:'Inter',sans-serif; }
  .sdb .sora { font-family:'Inter',sans-serif; }
  .sora { font-family:'Inter',sans-serif; }

  .sdb-card {
    background: linear-gradient(150deg, rgba(255,255,255,0.84) 0%, rgba(237,243,250,0.72) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(136,189,242,0.28);
    border-radius: 20px;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .sdb-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(56,73,89,0.11);
  }

  .sdb-sk {
    background: linear-gradient(90deg,
      rgba(189,221,252,0.3) 25%,
      rgba(189,221,252,0.6) 50%,
      rgba(189,221,252,0.3) 75%);
    background-size: 500px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .sdb-row { transition: background 0.14s; border-radius: 13px; }
  .sdb-row:hover { background: rgba(136,189,242,0.12) !important; }
  .sdb-live { animation: liveRing 2s ease-in-out infinite; }

  .sdb-a1 { animation: fadeUp .42s ease both .05s; }
  .sdb-a2 { animation: fadeUp .42s ease both .12s; }
  .sdb-a3 { animation: fadeUp .42s ease both .20s; }
  .sdb-a4 { animation: fadeUp .42s ease both .28s; }

  /* ── Responsive grid helpers ── */
  .sdb-stat-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 640px) {
    .sdb-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  }
  @media (min-width: 1024px) {
    .sdb-stat-grid { grid-template-columns: repeat(4, 1fr); }
  }

  .sdb-mid-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 600px) {
    .sdb-mid-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); }
  }

  .sdb-bottom-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 480px) {
    .sdb-bottom-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .sdb-bottom-grid { grid-template-columns: repeat(4, 1fr); }
  }

  /* ── Touch-friendly tap targets ── */
  @media (max-width: 767px) {
    .sdb-row { padding: 10px 12px !important; }
    .sdb-card:hover { transform: none; }
  }

  /* ── Scrollable horizontal stats on tiny screens ── */
  @media (max-width: 479px) {
    .sdb-stat-grid {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      gap: 10px;
      padding-bottom: 6px;
    }
    .sdb-stat-grid > * {
      flex: 0 0 calc(80vw - 32px);
      scroll-snap-align: start;
      min-width: 200px;
    }
    /* scrollbar hidden */
    .sdb-stat-grid::-webkit-scrollbar { display: none; }
    .sdb-stat-grid { scrollbar-width: none; }
  }

  /* ── Safe area insets (notched phones) ── */
  .sdb-page {
    padding: 16px 14px;
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(14px, env(safe-area-inset-right));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
  @media (min-width: 480px) {
    .sdb-page { padding: 18px 18px; }
  }
  @media (min-width: 768px) {
    .sdb-page { padding: 22px 24px; }
  }
  @media (min-width: 1024px) {
    .sdb-page { padding: 24px 28px; }
  }

  /* ── Truncation utility ── */
  .sdb-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Prevent schedule/results cards from overflowing ── */
  .sdb-mid-grid > * { min-width: 0; overflow: hidden; }
  .sdb-bottom-grid > * { min-width: 0; overflow: hidden; }
  .sdb-stat-grid > * { min-width: 0; }
`;

/* ─── Primitives ─── */
const Sk = ({ h = 14, w = "100%", r = 8 }) => (
  <div className="sdb-sk" style={{ height: h, width: w, borderRadius: r }} />
);

function useToast() {
  const [toast, setToast] = useState(null);
  const push = (msg) => { setToast({ msg }); setTimeout(() => setToast(null), 4000); };
  return { toast, push };
}

const Card = ({ children, style = {} }) => (
  <div className="sdb-card" style={{ overflow: "hidden", ...style }}>{children}</div>
);

function SectionHeader({ icon: Icon, title, action, onAction }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "13px 16px",
      borderBottom: "1px solid rgba(136,189,242,0.20)",
      background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(136,189,242,0.18)",
          border: "1px solid rgba(136,189,242,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={13} color={C.light} />
        </div>
        <span className="sora" style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
          {title}
        </span>
      </div>
      {action && (
        <button onClick={onAction} style={{
          display: "flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600, color: C.mid,
          background: "rgba(136,189,242,0.12)",
          border: "1px solid rgba(136,189,242,0.22)",
          padding: "4px 10px", borderRadius: 8, cursor: "pointer",
          whiteSpace: "nowrap",
        }}>
          {action} <ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}

const EmptyState = ({ icon: Icon, text }) => (
  <div style={{ padding: "28px 16px", textAlign: "center" }}>
    <Icon size={22} color={C.pale} style={{ display: "block", margin: "0 auto 8px" }} />
    <p style={{ margin: 0, fontSize: 12, color: C.mid }}>{text}</p>
  </div>
);

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, Icon, loading, delay = "0s", dark = false }) {
  return (
    <div className="sdb-card" style={{
      padding: "16px 18px",
      animation: `fadeUp 0.42s ease both ${delay}`,
      position: "relative", overflow: "hidden",
      background: dark
        ? `linear-gradient(135deg, ${C.dark} 0%, ${C.mid} 100%)`
        : `linear-gradient(150deg, rgba(255,255,255,0.88) 0%, rgba(237,243,250,0.75) 100%)`,
    }}>
      <div style={{
        position: "absolute", top: -22, right: -22,
        width: 72, height: 72, borderRadius: "50%",
        background: dark ? "rgba(255,255,255,0.07)" : "rgba(136,189,242,0.12)",
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: dark ? "rgba(255,255,255,0.14)" : "rgba(136,189,242,0.18)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.18)" : "rgba(136,189,242,0.28)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={15} color={dark ? C.pale : C.light} />
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: dark ? "rgba(189,221,252,0.65)" : C.mid,
          textAlign: "right",
        }}>{label}</span>
      </div>
      {loading ? (
        <>
          <Sk h={28} w="58%" r={6} />
          <div style={{ marginTop: 8 }}><Sk h={10} w="42%" /></div>
        </>
      ) : (
        <>
          <p className="sora" style={{ margin: 0, fontSize: "clamp(22px,4vw,28px)", fontWeight: 900, lineHeight: 1.1, color: dark ? C.white : C.dark }}>
            {value ?? "—"}
          </p>
          {sub && <p style={{ margin: "5px 0 0", fontSize: 11, color: dark ? C.pale : C.mid, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</p>}
        </>
      )}
    </div>
  );
}

/* ─── Today's Schedule ─── */
function TodaySchedule({ slots, loading }) {
  const toMin = (t = "") => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const getStatus = (s, e) => {
    const sm = toMin(s), em = toMin(e);
    if (nowMin >= sm && nowMin <= em) return "current";
    if (nowMin > em) return "done";
    return "upcoming";
  };
  const tints = [
    { bg: "rgba(136,189,242,0.16)", fg: C.light },
    { bg: "rgba(56,73,89,0.10)",    fg: C.dark  },
    { bg: "rgba(106,137,167,0.14)", fg: C.mid   },
    { bg: "rgba(189,221,252,0.30)", fg: C.mid   },
  ];
  const tintFor = (s) => tints[s.charCodeAt(0) % tints.length];

  // When every slot is in the past the school day is over — don't dim anything
  const allDone = slots.length > 0 && slots.every(s => getStatus(s.startTime, s.endTime) === "done");

  return (
    <Card>
      <SectionHeader icon={Calendar} title="Today's Schedule" />
      {/* "All done" banner shown only when every class has passed */}
      {!loading && allDone && (
        <div style={{
          margin: "10px 14px 0",
          padding: "7px 12px",
          borderRadius: 10,
          background: "rgba(136,189,242,0.10)",
          border: "1px solid rgba(136,189,242,0.22)",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <CheckCircle size={13} color={C.light} />
          <span style={{ fontSize: 11, color: C.mid, fontWeight: 600 }}>
            All classes completed for today
          </span>
        </div>
      )}
      <div style={{ padding: "10px 14px 12px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Sk h={34} w={34} r={9} />
                <div style={{ flex: 1 }}><Sk h={12} w="55%" /><div style={{ marginTop: 6 }}><Sk h={10} w="35%" /></div></div>
              </div>
            ))}
          </div>
        ) : slots.length === 0 ? <EmptyState icon={Calendar} text="No classes today" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {slots.map((slot, i) => {
              const st        = getStatus(slot.startTime, slot.endTime);
              const isCurrent = st === "current";
              const isDone    = st === "done";
              const t         = tintFor(slot.subject);
              // Only dim if day is NOT fully over (mixed state: some done, some upcoming)
              const rowOpacity = isDone && !allDone ? 0.52 : 1;
              return (
                <div key={i} className="sdb-row" style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 10px",
                  background: isCurrent ? "rgba(136,189,242,0.14)" : "transparent",
                  border: `1.5px solid ${isCurrent ? "rgba(136,189,242,0.32)" : "transparent"}`,
                  opacity: rowOpacity,
                }}>
                  <div className="sora" style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: isCurrent ? C.light : t.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isCurrent ? C.white : t.fg,
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {slot.subject.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sora sdb-truncate" style={{
                      margin: 0, fontSize: 12, fontWeight: 700,
                      color: C.dark,
                    }}>
                      {slot.subject}
                    </p>
                    <p className="sdb-truncate" style={{ margin: "2px 0 0", fontSize: 10, color: C.mid }}>
                      {slot.teacher}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, maxWidth: 68 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: isCurrent ? C.light : C.mid, whiteSpace: "nowrap" }}>{fmtTime(slot.startTime)}</p>
                    <p style={{ margin: "1px 0 0", fontSize: 9, color: C.mid, opacity: 0.65, whiteSpace: "nowrap" }}>{fmtTime(slot.endTime)}</p>
                  </div>
                  {isCurrent && (
                    <span className="sdb-live" style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
                      padding: "3px 6px", borderRadius: 20, flexShrink: 0,
                      background: C.light, color: C.white,
                    }}>LIVE</span>
                  )}
                  {isDone && (
                    <CheckCircle size={12} color={allDone ? C.light : C.pale} style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Recent Marks ─── */
function RecentMarks({ marks, loading, isMobile }) {
  const gradeSwatch = (p) => {
    if (p >= 85) return { bg: C.dark,  fg: C.white };
    if (p >= 65) return { bg: C.mid,   fg: C.white };
    if (p >= 50) return { bg: C.light, fg: C.dark  };
    return            { bg: C.pale,  fg: C.mid   };
  };
  const barColor = (p) => p >= 85 ? C.dark : p >= 65 ? C.mid : C.light;

  return (
    <Card>
      <SectionHeader icon={BarChart3} title="Recent Results" />
      <div style={{ padding: "12px 14px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Sk h={38} w={38} r={10} /><div style={{ flex: 1 }}><Sk h={12} w="50%" /><div style={{ marginTop: 6 }}><Sk h={10} w="35%" /></div></div>
                <Sk h={20} w={42} r={7} />
              </div>
            ))}
          </div>
        ) : marks.length === 0 ? <EmptyState icon={BookMarked} text="No results published yet" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {marks.map((m) => {
              const pct   = m.percentage;
              const grade = gradeFromPct(pct);
              const sw    = gradeSwatch(pct);
              return (
                <div key={m.id} className="sdb-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "transparent" }}>
                  <div className="sora" style={{
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
                    borderRadius: 10, flexShrink: 0,
                    background: sw.bg, color: sw.fg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900,
                  }}>{grade}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sora sdb-truncate" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.dark }}>
                      {m.subject}
                    </p>
                    <p className="sdb-truncate" style={{ margin: "2px 0 5px", fontSize: 10, color: C.mid }}>
                      {m.assessmentName}
                    </p>
                    <div style={{ height: 4, background: "rgba(136,189,242,0.20)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pct ?? 0, 100)}%`, background: barColor(pct), borderRadius: 99, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p className="sora" style={{ margin: 0, fontSize: isMobile ? 13 : 15, fontWeight: 900, color: C.dark }}>
                      {m.marksObtained}<span style={{ fontSize: 10, fontWeight: 400, color: C.mid }}>/{m.maxMarks}</span>
                    </p>
                    {pct != null && <p style={{ margin: "2px 0 0", fontSize: 10, color: C.mid, fontWeight: 600 }}>{pct}%</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Upcoming Exams ─── */
function UpcomingExams({ exams, loading }) {
  const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
  return (
    <Card>
      <SectionHeader icon={Target} title="Upcoming Exams" />
      <div style={{ padding: "12px 14px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2].map(i => <Sk key={i} h={60} r={12} />)}
          </div>
        ) : exams.length === 0 ? <EmptyState icon={Target} text="No upcoming exams" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exams.map((ex) => {
              const days   = daysUntil(ex.examDate);
              const urgent = days <= 3;
              return (
                <div key={ex.id} style={{
                  padding: "11px 13px", borderRadius: 14,
                  background: urgent ? "rgba(56,73,89,0.07)" : "rgba(136,189,242,0.09)",
                  border: `1.5px solid ${urgent ? "rgba(56,73,89,0.18)" : "rgba(136,189,242,0.20)"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="sora sdb-truncate" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.dark }}>
                        {ex.subject}
                      </p>
                      <p className="sdb-truncate" style={{ margin: "2px 0 0", fontSize: 10, color: C.mid }}>{ex.assessmentName}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 20, flexShrink: 0,
                      background: urgent ? C.dark : C.light, color: C.white,
                    }}>
                      {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {[{ icon: Calendar, label: fmtDay(ex.examDate) }, { icon: Clock, label: fmtTime(ex.startTime?.toString()) }].map(({ icon: Ic, label }) => (
                      <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.mid }}>
                        <Ic size={9} />{label}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, color: C.mid, fontWeight: 600, marginLeft: "auto" }}>{ex.maxMarks} marks</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Attendance Ring ─── */
function AttendanceRing({ attendance, loading, isSmall }) {
  const pct  = attendance?.percentage ?? 0;
  const ringSize = isSmall ? 72 : 88;
  const r    = isSmall ? 28 : 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const ringCol = pct >= 85 ? C.dark : pct >= 75 ? C.mid : C.light;

  return (
    <Card>
      <SectionHeader icon={CheckCircle} title="Attendance" />
      <div style={{ padding: "16px 18px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Sk h={ringSize} w={ringSize} r={ringSize / 2} />
            <div style={{ flex: 1 }}><Sk h={12} w="70%" /><div style={{ marginTop: 8 }}><Sk h={12} w="55%" /></div></div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width={ringSize} height={ringSize} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="rgba(189,221,252,0.40)" strokeWidth="7" />
                <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none"
                  stroke={ringCol} strokeWidth="7"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p className="sora" style={{ margin: 0, fontSize: isSmall ? 13 : 16, fontWeight: 900, color: ringCol }}>
                  {attendance?.percentage != null ? `${attendance.percentage}%` : "—"}
                </p>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {[
                { label: "Present", val: attendance?.presentDays ?? 0, dot: C.dark  },
                { label: "Absent",  val: attendance?.absentDays  ?? 0, dot: C.light },
                { label: "Late",    val: attendance?.lateDays    ?? 0, dot: C.mid   },
              ].map(({ label, val, dot }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.mid }}>{label}</span>
                  </div>
                  <span className="sora" style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>{val}</span>
                </div>
              ))}
              <div style={{ paddingTop: 6, borderTop: "1px solid rgba(136,189,242,0.20)", fontSize: 10, color: C.mid, marginTop: 2 }}>
                {attendance?.totalDays ?? 0} total days
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Awards ─── */
function AwardsPanel({ awards, loading }) {
  const tints = [
    { bg: "rgba(136,189,242,0.16)", color: C.light },
    { bg: "rgba(56,73,89,0.10)",    color: C.dark  },
    { bg: "rgba(106,137,167,0.14)", color: C.mid   },
    { bg: "rgba(189,221,252,0.28)", color: C.mid   },
  ];
  const tintFor = (cat) => tints[cat.charCodeAt(0) % tints.length];

  return (
    <Card>
      <SectionHeader icon={Star} title="Recent Awards" />
      <div style={{ padding: "12px 14px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2].map(i => <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}><Sk h={32} w={32} r={9} /><Sk h={13} w="55%" /></div>)}
          </div>
        ) : awards.length === 0 ? <EmptyState icon={Star} text="No awards yet" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {awards.map((a) => {
              const t = tintFor(a.category);
              return (
                <div key={a.id} className="sdb-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Star size={13} color={t.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sora sdb-truncate" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.dark }}>
                      {a.name}
                    </p>
                    <p className="sdb-truncate" style={{ margin: "2px 0 0", fontSize: 10, color: C.mid }}>
                      {a.category.charAt(0) + a.category.slice(1).toLowerCase()} · {fmtDay(a.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Meetings ─── */
function MeetingsPanel({ meetings, loading }) {
  const typeAccent = (t) => {
    const map = { STAFF: C.dark, PARENT: C.mid, STUDENT: C.light, GENERAL: C.pale, BOARD: C.dark, CUSTOM: C.mid };
    return map[t] ?? C.mid;
  };

  return (
    <Card>
      <SectionHeader icon={Users} title="Upcoming Meetings" />
      <div style={{ padding: "12px 14px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2].map(i => <Sk key={i} h={52} r={12} />)}
          </div>
        ) : meetings.length === 0 ? <EmptyState icon={Users} text="No upcoming meetings" /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {meetings.map((m) => {
              const acc = typeAccent(m.type);
              return (
                <div key={m.id} className="sdb-row" style={{
                  padding: "10px 12px",
                  background: "rgba(136,189,242,0.07)",
                  borderLeft: `3px solid ${acc}`,
                  borderRadius: "0 13px 13px 0",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="sora sdb-truncate" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.dark }}>
                        {m.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {[{ icon: Calendar, label: fmtDay(m.meetingDate) }, { icon: Clock, label: fmtTime(m.startTime) }].map(({ icon: Ic, label }) => (
                          <span key={label} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: C.mid }}>
                            <Ic size={9} />{label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 20, flexShrink: 0,
                      background: `${acc === C.pale ? "rgba(189,221,252,0.40)" : acc + "20"}`,
                      color: acc === C.pale ? C.mid : acc,
                      border: `1px solid ${acc}40`,
                    }}>
                      {m.type.charAt(0) + m.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════ */
export default function StudentDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast, push } = useToast();
  const { isMobile, isSmall, isTablet, isDesktop, bp } = useBreakpoint();

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await apiFetch(); setData(res.data); }
    catch (e) { push(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const d             = data;
  const attendancePct = d?.attendance?.percentage;
  const latestPct     = d?.latestResult?.percentage;
  const grade         = d?.latestResult?.grade ?? gradeFromPct(latestPct);

  const statCards = [
    {
      label: "Attendance", Icon: CheckCircle, delay: "0.08s", dark: true,
      value: attendancePct != null ? `${attendancePct}%` : "—",
      sub:   d?.attendance ? `${d.attendance.presentDays} / ${d.attendance.totalDays} days` : null,
    },
    {
      label: "Latest Grade", Icon: Trophy, delay: "0.14s",
      value: grade !== "—" ? grade : (latestPct != null ? `${latestPct}%` : "—"),
      sub:   d?.latestResult ? `${d.latestResult.assessmentGroup ?? d.latestResult.termName ?? ""}`.trim() || null : null,
    },
    {
      label: "Activities", Icon: Flame, delay: "0.20s",
      value: d?.activities?.enrolled ?? "—",
      sub:   d?.activities ? `${d.activities.achievements} achievement${d.activities.achievements === 1 ? "" : "s"}` : null,
    },
    {
      label: "Upcoming Exams", Icon: Zap, delay: "0.26s",
      value: d?.upcomingExams?.length ?? "—",
      sub:   d?.upcomingExams?.[0] ? `Next: ${d.upcomingExams[0].subject}` : "None scheduled",
    },
  ];

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed",
          top: isMobile ? "auto" : 20,
          bottom: isMobile ? 20 : "auto",
          left: isMobile ? 16 : "auto",
          right: isMobile ? 16 : 20,
          zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 16px", borderRadius: 13, fontSize: 13, fontWeight: 600,
          background: C.white, border: `1px solid ${C.glassBorder}`,
          color: C.dark, boxShadow: "0 8px 28px rgba(56,73,89,0.14)",
          animation: "scaleIn 0.2s ease",
        }}>
          <AlertCircle size={14} color={C.mid} />{toast.msg}
        </div>
      )}

      <div className="sdb sdb-page" style={{
        minHeight: "100vh",
        background: C.bg,
        backgroundImage: `
          radial-gradient(ellipse 65% 45% at 8% 0%,   rgba(136,189,242,0.24) 0%, transparent 58%),
          radial-gradient(ellipse 50% 40% at 92% 100%, rgba(189,221,252,0.18) 0%, transparent 55%)
        `,
      }}>

        {/* ── Header ── */}
        <div className="sdb-a1" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: isMobile ? 16 : 20, flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 4, height: isMobile ? 26 : 32, borderRadius: 99,
              background: `linear-gradient(180deg, ${C.light} 0%, ${C.dark} 100%)`,
              flexShrink: 0,
            }} />
            <div style={{ minWidth: 0 }}>
              <h1 className="sora" style={{
                margin: 0,
                fontSize: isMobile ? "clamp(16px,5vw,20px)" : "clamp(18px,3.5vw,26px)",
                fontWeight: 900, color: C.dark, letterSpacing: "-0.5px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {loading ? "Loading…" : `Hey, ${d?.student?.firstName ?? "Student"} 👋`}
              </h1>
              {!isSmall && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.mid }}>{TODAY_LABEL}</p>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!loading && d?.enrollment && !isMobile && (
              <div style={{
                padding: "6px 12px", borderRadius: 30,
                background: C.glass, border: `1px solid ${C.glassBorder}`,
                fontSize: 11, fontWeight: 600, color: C.dark,
                backdropFilter: "blur(10px)",
                maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {d.enrollment.classSection?.name ?? ""}
                {d.enrollment.rollNumber ? ` · #${d.enrollment.rollNumber}` : ""}
              </div>
            )}
            <div style={{
              width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
              borderRadius: 11, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.light}, ${C.dark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: isMobile ? 13 : 15, fontWeight: 900,
              fontFamily: "Sora, sans-serif", cursor: "pointer",
              border: `2px solid rgba(136,189,242,0.35)`,
              overflow: "hidden",
            }}>
            <span>
              {(d?.student?.firstName?.charAt(0) || "S").toUpperCase()}
            </span>
            </div>
          </div>
        </div>

        {/* ── Mobile enrollment badge ── */}
        {isMobile && !loading && d?.enrollment && (
          <div style={{
            display: "inline-flex", padding: "5px 12px", borderRadius: 20,
            background: C.glass, border: `1px solid ${C.glassBorder}`,
            fontSize: 11, fontWeight: 600, color: C.dark,
            backdropFilter: "blur(10px)", marginBottom: 14,
            maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {d.enrollment.classSection?.name ?? ""}
            {d.enrollment.rollNumber ? ` · Roll #${d.enrollment.rollNumber}` : ""}
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="sdb-a2 sdb-stat-grid" style={{ marginBottom: isMobile ? 14 : 18 }}>
          {statCards.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>

        {/* ── Schedule + Results ── */}
        <div className="sdb-a3 sdb-mid-grid" style={{ marginBottom: isMobile ? 14 : 16 }}>
          <TodaySchedule slots={d?.todaySchedule ?? []} loading={loading} />
          <RecentMarks   marks={d?.recentMarks   ?? []} loading={loading} isMobile={isMobile} />
        </div>

        {/* ── Bottom row ── */}
        <div className="sdb-a4 sdb-bottom-grid">
          <AttendanceRing attendance={d?.attendance}           loading={loading} isSmall={isSmall} />
          <UpcomingExams  exams={d?.upcomingExams ?? []}       loading={loading} />
          <AwardsPanel    awards={d?.awards ?? []}             loading={loading} />
          <MeetingsPanel  meetings={d?.upcomingMeetings ?? []} loading={loading} />
        </div>

      </div>
    </>
  );
}