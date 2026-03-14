// client/src/admin/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import PageLayout from "../components/PageLayout";
import { getToken } from "../../auth/storage";
import {
  GraduationCap,
  BookOpen,
  Building2,
  CalendarDays,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  CalendarCheck2,
  Presentation,
  UsersRound,
  School,
  ClipboardList,
  Inbox,
  UserPlus,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

async function fetchDashboardSummary() {
  const res = await fetch(`${API_URL}/api/admindashboard/summary`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Cache-Control": "no-store",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const pct = (part, total) => (!total ? 0 : Math.round((part / total) * 100));
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const MEETING_ICON_MAP = {
  STAFF: UsersRound,
  PARENT: Users,
  STUDENT: GraduationCap,
  GENERAL: ClipboardList,
  BOARD: School,
  CUSTOM: CalendarCheck2,
};

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
  textMid: "#4A6880",
  textLight: "#6A89A7",
  success: "#3DA882",
  danger: "#D95C5C",
  warn: "#D4944A",
};

const MEETING_COLORS = {
  STAFF: { bg: `${C.mist}22`, accent: C.deep, border: `${C.sky}66` },
  PARENT: { bg: "#e8f7f0", accent: C.success, border: "#a7dfc8" },
  STUDENT: { bg: "#fff5e8", accent: C.warn, border: "#f5c98a" },
  GENERAL: { bg: `${C.sky}18`, accent: C.slate, border: `${C.sky}55` },
  BOARD: { bg: `${C.deep}14`, accent: C.deep, border: `${C.slate}66` },
  CUSTOM: { bg: "#f0eafa", accent: "#7c5cbf", border: "#c4a9ed" },
};

/* ── Pulse ── */
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

/* ── Donut ── */
function Donut({ segments, size = 110, stroke = 11, centerLabel, centerSub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2,
    cy = size / 2;
  let cum = 0;
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`${C.slate}22`}
          strokeWidth={stroke}
        />
        {segments.map((seg, i) => {
          const len = (seg.pct / 100) * circ;
          const offset = -(cum / 100) * circ;
          cum += seg.pct;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: C.text,
            lineHeight: 1,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {centerLabel}
        </span>
        <span
          style={{
            fontSize: 9,
            color: C.textLight,
            marginTop: 3,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {centerSub}
        </span>
      </div>
    </div>
  );
}

/* ── Mini bar ── */
function MiniBar({ value, max, color }) {
  const w = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      style={{
        height: 4,
        borderRadius: 99,
        background: `${C.mist}55`,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
          borderRadius: 99,
          transition: "width 0.9s ease",
        }}
      />
    </div>
  );
}

/* ── Stat card — new dramatic design ── */
function StatCard({
  IconComp,
  label,
  value,
  badge,
  badgeIcon: BadgeIcon,
  loading,
  delay = 0,
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="fade-up"
      style={{
        animationDelay: `${delay}ms`,
        background: C.white,
        borderRadius: 22,
        border: `1.5px solid ${C.borderLight}`,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        boxShadow: hov
          ? `0 16px 48px rgba(56,73,89,0.13), 0 0 0 2px ${C.sky}44`
          : "0 2px 20px rgba(56,73,89,0.07)",
        transform: hov ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* top accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${C.sky}, ${C.slate}, ${C.deep})`,
          borderRadius: "22px 22px 0 0",
          opacity: hov ? 1 : 0.6,
          transition: "opacity 0.3s",
        }}
      />
      {/* bg pattern */}
      <div
        style={{
          position: "absolute",
          right: -20,
          bottom: -20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.mist}33, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1.5px solid ${C.borderLight}`,
          }}
        >
          <IconComp size={20} color={C.deep} strokeWidth={1.8} />
        </div>
        {loading ? (
          <Pulse w={70} h={22} r={20} />
        ) : (
          badge && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
                background: `${C.mist}44`,
                color: C.deep,
                border: `1px solid ${C.border}`,
                letterSpacing: "0.03em",
              }}
            >
              {BadgeIcon && <BadgeIcon size={9} color={C.slate} />}
              {badge}
            </div>
          )
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Pulse w="50%" h={38} r={8} />
          <Pulse w="70%" h={12} r={6} />
        </div>
      ) : (
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 42,
              fontWeight: 800,
              color: C.text,
              lineHeight: 1,
              letterSpacing: "-2px",
            }}
          >
            {value ?? "—"}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 11,
              color: C.textLight,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Section header ── */
function SectionHead({ title, sub, IconComp, iconColor = C.slate }) {
  return (
    <div
      style={{
        padding: "15px 20px",
        borderBottom: `1.5px solid ${C.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {IconComp && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `${C.sky}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1.5px solid ${C.sky}33`,
            }}
          >
            <IconComp size={15} color={iconColor} strokeWidth={2} />
          </div>
        )}
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
          }}
        >
          {title}
        </span>
      </div>
      {sub && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            color: C.textLight,
            fontWeight: 600,
            background: `${C.sky}18`,
            padding: "3px 10px",
            borderRadius: 20,
            border: `1px solid ${C.sky}33`,
            letterSpacing: "0.03em",
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

/* ── White panel ── */
function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 20,
        border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Attendance row ── */
function AttRow({ IconComp, label, value, max, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <IconComp
        size={12}
        color={color}
        strokeWidth={2.5}
        style={{ flexShrink: 0 }}
      />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: C.textLight,
          width: 52,
          flexShrink: 0,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <MiniBar value={value || 0} max={max} color={color} />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: C.text,
          width: 28,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {value || 0}
      </span>
    </div>
  );
}

/* ── Person row ── */
function PersonRow({ initials, name, sub, badge, badgeColor = C.success }) {
  const bc = {
    [C.success]: { bg: "#e2f5ee", fg: "#236644" },
    [C.danger]: { bg: "#fce8e8", fg: "#8b1c1c" },
    [C.warn]: { bg: "#fef3e2", fg: "#7a4a0e" },
    [C.slate]: { bg: `${C.mist}55`, fg: C.deep },
  };
  const sc = bc[badgeColor] ?? bc[C.slate];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 18px",
        borderBottom: `1px solid ${C.borderLight}`,
        transition: "background 0.12s",
        cursor: "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          flexShrink: 0,
          background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
          boxShadow: `0 3px 10px ${C.sky}44`,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: C.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            color: C.textLight,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </p>
      </div>
      {badge && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 20,
            background: sc.bg,
            color: sc.fg,
            flexShrink: 0,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function Empty({ IconComp, text }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px 0",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: `${C.sky}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${C.sky}33`,
        }}
      >
        <IconComp size={22} color={C.sky} strokeWidth={1.5} />
      </div>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: C.textLight,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════ */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const d = data ?? {};
  const sAtt = d.studentAttendanceToday ?? {};
  const tAtt = d.teacherAttendanceToday ?? {};
  const sTotal = sAtt.total || 0;
  const tTotal = tAtt.total || 0;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const studentSegs = sTotal
    ? [
        { pct: pct(sAtt.present, sTotal), color: C.deep },
        { pct: pct(sAtt.absent, sTotal), color: C.sky },
        { pct: pct(sAtt.late, sTotal), color: C.mist },
      ]
    : [{ pct: 100, color: C.border }];
  const teacherSegs = tTotal
    ? [
        { pct: pct(tAtt.present, tTotal), color: C.slate },
        { pct: pct(tAtt.absent, tTotal), color: "#3d6070" },
        { pct: pct(tAtt.onLeave, tTotal), color: C.deepDark },
      ]
    : [{ pct: 100, color: C.border }];

  return (
    <PageLayout>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.sky}; border-radius: 99px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 ${C.sky}44; } 50% { box-shadow: 0 0 0 8px transparent; } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .slide-in { animation: slideIn 0.4s ease both; }
        .dash-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .dash-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dash-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 1100px) { .dash-grid-4 { grid-template-columns: repeat(2,1fr); } .dash-grid-3 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 700px) { .dash-grid-4,.dash-grid-2,.dash-grid-3 { grid-template-columns: 1fr; } }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "28px 30px",
          fontFamily: "'Inter', sans-serif",
          backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${C.sky}18 0%, transparent 50%)`,
        }}
      >
        {/* ══ HEADER ══ */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          {/* Top rule */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 4,
                borderRadius: 99,
                background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.textLight,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Admin Dashboard
                  </p>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "clamp(22px,3.5vw,32px)",
                      fontWeight: 900,
                      color: C.text,
                      letterSpacing: "-0.8px",
                      lineHeight: 1.1,
                    }}
                  >
                    {greeting},{" "}
                    <span
                      style={{
                        background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Admin
                    </span>
                  </h1>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 7,
                    }}
                  >
                    <CalendarDays size={12} color={C.textLight} />
                    <span
                      style={{
                        fontSize: 12,
                        color: C.textLight,
                        fontWeight: 500,
                      }}
                    >
                      {new Date().toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    {!loading && d.activeAcademicYear && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          background: C.deep,
                          color: C.mist,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {d.activeAcademicYear.name}
                      </span>
                    )}
                  </div>
                </div>
                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12,
                      padding: "8px 14px",
                      borderRadius: 12,
                      background: "#fee8e8",
                      color: "#8b1c1c",
                      border: "1px solid #f5b0b0",
                    }}
                  >
                    <AlertTriangle size={13} /> {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary strip */}
          {!loading && (
            <div
              className="slide-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 14,
                background: C.white,
                border: `1.5px solid ${C.borderLight}`,
                width: "fit-content",
                boxShadow: "0 2px 12px rgba(56,73,89,0.06)",
              }}
            >
              <Sparkles size={12} color={C.sky} />
              <span
                style={{ fontSize: 11, color: C.textLight, fontWeight: 500 }}
              >
                Quick summary —
              </span>
              {[
                { label: "students", val: d.students?.total },
                { label: "teachers", val: d.teachers?.total },
                { label: "classes", val: d.totalClasses },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span style={{ color: C.border, fontSize: 12 }}>·</span>
                  )}
                  <span
                    style={{ fontSize: 11, fontWeight: 700, color: C.deep }}
                  >
                    {item.val ?? "—"}
                  </span>
                  <span style={{ fontSize: 11, color: C.textLight }}>
                    {item.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* ══ STAT CARDS ══ */}
        <div className="dash-grid-4" style={{ marginBottom: 18 }}>
          {[
            {
              IconComp: GraduationCap,
              label: "Total Students",
              value: d.students?.total?.toLocaleString("en-IN"),
              badge: d.students?.active
                ? `${d.students.active} enrolled`
                : null,
              badgeIcon: TrendingUp,
              delay: 0,
            },
            {
              IconComp: BookOpen,
              label: "Total Teachers",
              value: d.teachers?.total?.toLocaleString("en-IN"),
              badge: d.teachers?.active ? `${d.teachers.active} active` : null,
              badgeIcon: UserCheck,
              delay: 60,
            },
            {
              IconComp: Building2,
              label: "Total Classes",
              value: d.totalClasses?.toLocaleString("en-IN"),
              badge: d.activeAcademicYear?.name ?? null,
              badgeIcon: School,
              delay: 120,
            },
            {
              IconComp: CalendarDays,
              label: "Meetings This Week",
              value: d.upcomingMeetings?.length ?? 0,
              badge: d.upcomingMeetings?.length
                ? `${d.upcomingMeetings.length} upcoming`
                : "none scheduled",
              badgeIcon: d.upcomingMeetings?.length ? CalendarCheck2 : Inbox,
              delay: 180,
            },
          ].map((props, i) => (
            <StatCard key={i} {...props} loading={loading} />
          ))}
        </div>

        {/* ══ ATTENDANCE ROW ══ */}
        <div
          className="dash-grid-2 fade-up"
          style={{ marginBottom: 18, animationDelay: "220ms" }}
        >
          {[
            {
              title: "Student Attendance",
              IconComp: Users,
              iconColor: C.sky,
              segs: studentSegs,
              total: sTotal,
              cl: sTotal ? `${pct(sAtt.present, sTotal)}%` : "—",
              cs: "present",
              rows: [
                {
                  label: "Present",
                  val: sAtt.present,
                  color: C.deep,
                  Icon: CheckCircle2,
                },
                {
                  label: "Absent",
                  val: sAtt.absent,
                  color: C.sky,
                  Icon: XCircle,
                },
                // { label: "Late", val: sAtt.late, color: C.mist, Icon: Clock },
              ],
            },
            {
              title: "Teacher Attendance",
              IconComp: UserCheck,
              iconColor: C.success,
              segs: teacherSegs,
              total: tTotal,
              cl: tTotal ? `${pct(tAtt.present, tTotal)}%` : "—",
              cs: "present",
              rows: [
                {
                  label: "Present",
                  val: tAtt.present,
                  color: C.slate,
                  Icon: CheckCircle2,
                },
                {
                  label: "Absent",
                  val: tAtt.absent,
                  color: "#3d6070",
                  Icon: XCircle,
                },
                {
                  label: "On Leave",
                  val: tAtt.onLeave,
                  color: C.deepDark,
                  Icon: Clock,
                },
              ],
            },
          ].map((panel) => (
            <Panel key={panel.title}>
              <SectionHead
                title={panel.title}
                sub="Today"
                IconComp={panel.IconComp}
                iconColor={panel.iconColor}
              />
              <div style={{ padding: "20px 22px" }}>
                {loading ? (
                  <div
                    style={{ display: "flex", gap: 22, alignItems: "center" }}
                  >
                    <div
                      className="animate-pulse"
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        background: C.border,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {[80, 65, 72, 55].map((w, i) => (
                        <Pulse key={i} w={`${w}%`} h={10} />
                      ))}
                    </div>
                  </div>
                ) : panel.total === 0 ? (
                  <Empty
                    IconComp={ClipboardList}
                    text="No attendance marked yet today"
                  />
                ) : (
                  <div
                    style={{ display: "flex", gap: 24, alignItems: "center" }}
                  >
                    <Donut
                      segments={panel.segs}
                      centerLabel={panel.cl}
                      centerSub={panel.cs}
                    />
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {panel.rows.map((row) => (
                        <AttRow
                          key={row.label}
                          IconComp={row.Icon}
                          label={row.label}
                          value={row.val}
                          max={panel.total}
                          color={row.color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>

        {/* ══ BOTTOM 3-COL ══ */}
        <div
          className="dash-grid-3 fade-up"
          style={{ marginBottom: 18, animationDelay: "280ms" }}
        >
          {/* Recently Enrolled */}
          <Panel>
            <SectionHead
              title="Recently Enrolled"
              sub="Last 5 students"
              IconComp={UserPlus}
              iconColor={C.sky}
            />
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 18px",
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div
                    className="animate-pulse"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: C.border,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <Pulse w="68%" h={10} />
                    <Pulse w="45%" h={9} />
                  </div>
                </div>
              ))
            ) : !d.recentStudents?.length ? (
              <Empty IconComp={GraduationCap} text="No students yet" />
            ) : (
              d.recentStudents.map((s) => {
                const en = s.enrollments?.[0];
                const ini = s.name
                  ?.split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <PersonRow
                    key={s.id}
                    initials={ini}
                    name={s.name}
                    sub={`${en?.classSection?.name ?? "Not enrolled"}${en?.admissionNumber ? ` · #${en.admissionNumber}` : ""}`}
                    badge={en?.status ?? "—"}
                    badgeColor={en?.status === "ACTIVE" ? C.success : C.slate}
                  />
                );
              })
            )}
          </Panel>

          {/* Recent Teachers */}
          <Panel>
            <SectionHead
              title="Recent Teachers"
              sub="Last 5 joined"
              IconComp={BookOpen}
              iconColor={C.success}
            />
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 18px",
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div
                    className="animate-pulse"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: C.border,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <Pulse w="68%" h={10} />
                    <Pulse w="45%" h={9} />
                  </div>
                </div>
              ))
            ) : !d.recentTeachers?.length ? (
              <Empty IconComp={BookOpen} text="No teachers yet" />
            ) : (
              d.recentTeachers.map((t) => {
                const ini =
                  `${t.firstName?.[0] ?? ""}${t.lastName?.[0] ?? ""}`.toUpperCase();
                const sc =
                  {
                    ACTIVE: C.success,
                    ON_LEAVE: C.warn,
                    RESIGNED: C.slate,
                    TERMINATED: C.danger,
                  }[t.status] ?? C.slate;
                return (
                  <PersonRow
                    key={t.id}
                    initials={ini}
                    name={`${t.firstName} ${t.lastName}`}
                    sub={`${t.department} · ${t.designation}`}
                    badge={t.status?.replace("_", " ")}
                    badgeColor={sc}
                  />
                );
              })
            )}
          </Panel>

          {/* Upcoming Meetings */}
          <Panel>
            <SectionHead
              title="Upcoming Meetings"
              sub="Next 7 days"
              IconComp={CalendarDays}
              iconColor="#7c5cbf"
            />
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "13px 18px",
                    borderBottom: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div
                    className="animate-pulse"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: C.border,
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                    }}
                  >
                    <Pulse w="80%" h={10} />
                    <Pulse w="50%" h={9} />
                  </div>
                </div>
              ))
            ) : !d.upcomingMeetings?.length ? (
              <Empty IconComp={CalendarDays} text="No meetings scheduled" />
            ) : (
              d.upcomingMeetings.map((m) => {
                const mc = MEETING_COLORS[m.type] ?? MEETING_COLORS.GENERAL;
                const MIcon = MEETING_ICON_MAP[m.type] ?? ClipboardList;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "13px 18px",
                      borderBottom: `1px solid ${C.borderLight}`,
                      transition: "background 0.12s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.bg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: mc.bg,
                        border: `1.5px solid ${mc.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MIcon size={15} color={mc.accent} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.title}
                      </p>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 10,
                          color: C.textLight,
                        }}
                      >
                        {fmtDate(m.meetingDate)} · {fmtTime(m.startTime)}
                      </p>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          display: "inline-block",
                          marginTop: 4,
                          background: mc.bg,
                          color: mc.accent,
                          border: `1px solid ${mc.border}`,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {m.type}
                      </span>
                    </div>
                    <ChevronRight
                      size={12}
                      color={C.sky}
                      style={{ flexShrink: 0, alignSelf: "center" }}
                    />
                  </div>
                );
              })
            )}
          </Panel>
        </div>

        {/* ══ ABSENT ALERT ══ */}
        {!loading && d.todayAbsentStudents?.length > 0 && (
          <div
            className="fade-up"
            style={{
              animationDelay: "320ms",
              borderRadius: 18,
              padding: "16px 20px",
              background: "linear-gradient(135deg,#fff8f8,#fde8e8)",
              border: "1.5px solid #f5b8b8",
              boxShadow: "0 4px 24px rgba(217,92,92,0.10)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "#fde8e8",
                  border: "1.5px solid #f5b8b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={14} color={C.danger} strokeWidth={2.2} />
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8b1c1c",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Today's Absent Students —{" "}
                {d.studentAttendanceToday?.absent ?? 0} total
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {d.todayAbsentStudents.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "5px 12px",
                    borderRadius: 20,
                    background: "#fff",
                    border: "1px solid #f5b8b8",
                    boxShadow: "0 1px 4px rgba(217,92,92,0.09)",
                  }}
                >
                  <UserX size={10} color={C.danger} />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8b1c1c",
                    }}
                  >
                    {a.student?.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 10,
                      color: "#b02020",
                    }}
                  >
                    · {a.classSection?.name}
                  </span>
                </div>
              ))}
              {(d.studentAttendanceToday?.absent ?? 0) > 5 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 20,
                    background: "#fde8e8",
                    border: "1px solid #f5b8b8",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#8b1c1c",
                    }}
                  >
                    +{(d.studentAttendanceToday?.absent ?? 0) - 5} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
