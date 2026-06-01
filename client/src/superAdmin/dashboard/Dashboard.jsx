// client/src/superAdmin/dashboard/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  GraduationCap, BookOpen, Building2, Users,
  Calendar, RefreshCw, School, AlertCircle,
  Activity, ShieldCheck, DollarSign, UserCheck,
} from "lucide-react";
import { getToken } from "../../auth/storage"; // ✅ same import as teacher dashboard

// ── API base — same pattern as teacher dashboard ──────────────
// VITE_API_URL=http://localhost:5000  (no /api suffix)
// per-call we add /api/...  e.g. ${API}/api/schools
const API = import.meta.env.VITE_API_URL;

// ── Design tokens — matching teacher dashboard palette ─────────
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  deepDark:    "#243340",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

// ── Helpers ────────────────────────────────────────────────────
const greeting   = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const formatDate = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const acYear     = () => { const n = new Date(), y = n.getFullYear(); return n.getMonth() >= 5 ? `${y}-${String(y+1).slice(2)}` : `${y-1}-${String(y).slice(2)}`; };

function getAdminName() {
  try {
    for (const k of ["user", "authUser", "userData", "currentUser"]) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (p?.name)       return p.name;
      if (p?.user?.name) return p.user.name;
    }
  } catch { /* ignore */ }
  return "Admin";
}

// ── Shared skeleton ────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

function SkeletonRows({ n = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
          <Pulse w={32} h={32} r={10} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Pulse w="55%" h={12} r={5} />
            <Pulse w="38%" h={10} r={4} />
          </div>
          <Pulse w={50} h={22} r={20} />
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 14px rgba(56,73,89,0.07)", padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${C.deep})` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</p>
          {loading ? (
            <>
              <Pulse w={60} h={28} r={6} />
              <div style={{ marginTop: 6 }}><Pulse w={90} h={10} r={4} /></div>
            </>
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

// ── Panel wrapper ─────────────────────────────────────────────
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
            {badge && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${C.sky}18`, color: C.deep }}>
                {badge}
              </span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{sub}</p>
        </div>
      </div>
      <div style={{ padding: 16, flex: 1 }}>{children}</div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────
function UserRow({ user }) {
  const initials = (user.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const roleConfig = {
    ADMIN:       { bg: "#7C3AED22", color: "#7C3AED", label: "Admin"       },
    TEACHER:     { bg: `${C.sky}22`, color: C.deep,   label: "Teacher"     },
    STUDENT:     { bg: "#05966922", color: "#059669",  label: "Student"     },
    PARENT:      { bg: "#D9770622", color: "#D97706",  label: "Parent"      },
    FINANCE:     { bg: "#DC262622", color: "#DC2626",  label: "Finance"     },
    SUPER_ADMIN: { bg: `${C.slate}22`, color: C.slate, label: "Super Admin" },
  };
  const role = roleConfig[user.role] || { bg: `${C.slate}18`, color: C.slate, label: user.role };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}`, transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 3px 12px ${C.sky}22`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: role.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: role.color }}>{initials}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.school?.name || user.email || "—"}</p>
      </div>
      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: role.bg, color: role.color, letterSpacing: "0.04em", flexShrink: 0, whiteSpace: "nowrap" }}>
        {role.label.toUpperCase()}
      </span>
    </div>
  );
}

// ── School row ────────────────────────────────────────────────
function SchoolRow({ school }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}`, transition: "box-shadow 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 3px 12px ${C.sky}22`)}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <School size={14} color={C.sky} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{school.name}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{school.city || "—"} · {school.students ?? 0} students</p>
      </div>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: school.isActive ? "#059669" : C.borderLight, flexShrink: 0 }} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function Empty({ message }) {
  return (
    <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={22} color={C.sky} strokeWidth={1.5} />
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>No data</p>
      <p style={{ margin: 0, fontSize: 12, color: C.textLight, textAlign: "center" }}>{message}</p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  // ✅ Exact same pattern as teacher dashboard
  const headers = { Authorization: `Bearer ${getToken()}` };

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [usersLoading,     setUsersLoading]     = useState(true);
  const [schoolsLoading,   setSchoolsLoading]   = useState(true);
  const [analyticsError,   setAnalyticsError]   = useState("");
  const [refreshKey,       setRefreshKey]       = useState(0);

  const [stats,      setStats]      = useState({});
  const [topSchools, setTopSchools] = useState([]);
  const [users,      setUsers]      = useState([]);
  const [counts,     setCounts]     = useState({});
  const [schoolList, setSchoolList] = useState([]);

  const adminName = getAdminName();

  // ── Fetchers — same style as teacher dashboard ──────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true); setAnalyticsError("");
    try {
      // GET /api/superadmin/analytics?range=30d
      const json = await fetch(`${API}/api/superadmin/analytics?range=30d`, { headers }).then((r) => r.json());
      if (json.stats) {
        setStats(json.stats);
        setTopSchools(json.topSchools ?? []);
      } else {
        setAnalyticsError(json.message || "Failed to load analytics");
      }
    } catch {
      setAnalyticsError("Network error — could not load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [refreshKey]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      // GET /api/users/all?limit=8&page=1
      const json = await fetch(`${API}/api/users/all?limit=8&page=1`, { headers }).then((r) => r.json());
      setUsers(json.users  ?? []);
      setCounts(json.counts ?? {});
    } catch { /* silently fail */ }
    finally   { setUsersLoading(false); }
  }, [refreshKey]);

  const fetchSchools = useCallback(async () => {
    setSchoolsLoading(true);
    try {
      // GET /api/schools  → { source, schools }
      const json = await fetch(`${API}/api/schools`, { headers }).then((r) => r.json());
      setSchoolList(json.schools ?? []);
    } catch { /* silently fail */ }
    finally   { setSchoolsLoading(false); }
  }, [refreshKey]);

  useEffect(() => {
    fetchAnalytics(); fetchUsers(); fetchSchools();
  }, [fetchAnalytics, fetchUsers, fetchSchools]);

  const anyLoading   = analyticsLoading || usersLoading || schoolsLoading;
  const displaySchools = topSchools.length > 0 ? topSchools : schoolList;

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
        @media(max-width:700px){.two-col{grid-template-columns:1fr !important}.pills{grid-template-columns:1fr 1fr !important}}
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 20px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="df" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: "0 0 4px 14px", fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em" }}> Super Admin Dashboard</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 4, height: 30, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
                <h1 style={{ margin: 0, fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.5px" }}>
                  {greeting()},{" "}
                 
                </h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 14, flexWrap: "wrap" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.textLight, fontWeight: 500 }}>{formatDate()}</p>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 20, background: C.deep, color: C.white, letterSpacing: "0.05em" }}>
                  {acYear()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              title="Refresh"
              style={{ width: 40, height: 40, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, boxShadow: "0 1px 4px rgba(56,73,89,0.06)", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}55`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
            >
              <RefreshCw size={15} className={anyLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* ── Quick Summary Bar ───────────────────────────────── */}
          {!analyticsLoading && (
            <div className="df df1" style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 14, padding: "10px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", boxShadow: "0 1px 6px rgba(56,73,89,0.05)" }}>
              <Activity size={13} color={C.sky} strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textLight, marginRight: 8 }}>Quick summary —</span>
              {[
                { label: "students", value: stats.totalStudents },
                { label: "teachers", value: stats.totalTeachers },
                { label: "schools",  value: stats.totalSchools  },
                { label: "admins",   value: stats.totalAdmins   },
              ].map(({ label, value }) => (
                <span key={label} style={{ fontSize: 12, color: C.textLight }}>
                  <span style={{ fontWeight: 800, color: C.text }}>{value?.toLocaleString() ?? "—"}</span>{" "}{label}
                  <span style={{ margin: "0 10px", color: C.borderLight }}>·</span>
                </span>
              ))}
            </div>
          )}

          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="df df1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
            <StatCard label="Total Students" value={stats.totalStudents?.toLocaleString()} sub={`${stats.totalStudents ?? 0} enrolled`}        icon={GraduationCap} accent={C.sky}     loading={analyticsLoading} />
            <StatCard label="Total Teachers" value={stats.totalTeachers?.toLocaleString()} sub={`${stats.totalTeachers ?? 0} active`}           icon={BookOpen}      accent="#059669"   loading={analyticsLoading} />
            <StatCard label="Total Schools"  value={stats.totalSchools?.toLocaleString()}  sub={`${stats.activeSchools ?? 0} active schools`}    icon={Building2}     accent="#7C3AED"   loading={analyticsLoading} />
            <StatCard label="Total Users"    value={stats.totalUsers?.toLocaleString()}    sub={`${counts.active ?? 0} active · ${counts.inactive ?? 0} inactive`} icon={Users} accent="#D97706" loading={analyticsLoading || usersLoading} />
          </div>

          {/* ── Role Pills ──────────────────────────────────────── */}
          {!analyticsLoading && (
            <div className="df df2 pills" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Admins",         value: stats.totalAdmins,   accent: "#7C3AED" },
                { label: "Teachers",       value: stats.totalTeachers, accent: C.deep    },
                { label: "Parents",        value: stats.totalParents,  accent: "#D97706" },
                { label: "Active Schools", value: stats.activeSchools, accent: "#059669" },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ background: C.white, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(56,73,89,0.05)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textLight }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: accent }}>{value?.toLocaleString() ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Middle row: Recent Users | Schools ─────────────── */}
          <div className="df df2 two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18, alignItems: "start" }}>

            {/* Recent Users */}
            <Panel
              icon={Users}
              iconBg={`linear-gradient(135deg, ${C.sky}, ${C.deep})`}
              title="Recent Users"
              badge={users.length ? `Last ${users.length}` : undefined}
              sub={usersLoading ? "Loading…" : `${counts.total ?? 0} total users`}
            >
              {usersLoading ? <SkeletonRows n={5} /> : users.length === 0 ? (
                <Empty message="No users found" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.slice(0, 6).map((u) => <UserRow key={u.id} user={u} />)}
                </div>
              )}

              {!usersLoading && counts.total > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1.5px solid ${C.borderLight}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                  {[
                    { label: "Admins",   val: counts.admin   },
                    { label: "Teachers", val: counts.teacher  },
                    { label: "Students", val: counts.student  },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: C.text }}>{val ?? 0}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* User breakdown bars */}
            <Panel
              icon={Activity}
              iconBg={`linear-gradient(135deg, ${C.slate}, ${C.deep})`}
              title="User Breakdown"
              sub="Distribution across all roles"
            >
              {usersLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[...Array(5)].map((_, i) => <div key={i}><Pulse w="60%" h={10} r={4} /><div style={{ marginTop: 6 }}><Pulse w="100%" h={8} r={4} /></div></div>)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    { role: "Super Admins",  count: counts.superAdmin, color: C.slate    },
                    { role: "School Admins", count: counts.admin,      color: "#7C3AED"  },
                    { role: "Teachers",      count: counts.teacher,    color: C.sky      },
                    { role: "Students",      count: counts.student,    color: "#059669"  },
                    { role: "Parents",       count: counts.parent,     color: "#D97706"  },
                    { role: "Finance",       count: counts.finance,    color: "#DC2626"  },
                  ].map(({ role, count, color }) => {
                    const pct = counts.total ? Math.round(((count || 0) / counts.total) * 100) : 0;
                    return (
                      <div key={role}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.textLight }}>{role}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{count ?? 0}</span>
                        </div>
                        <div style={{ height: 6, background: `${C.borderLight}88`, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.7s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!usersLoading && counts.total > 0 && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1.5px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>{counts.active ?? 0}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Active users</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.borderLight }}>{counts.inactive ?? 0}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>Inactive</p>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {/* ── Bottom row: Breakdown | School Table ───────────── */}
          <div className="df df3 two-col" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, alignItems: "start" }}>

            
            {/* School detail table */}
            <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg, ${C.bg}, ${C.white})` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <School size={17} color="#fff" strokeWidth={2} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>School Details</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
                      {analyticsLoading ? "Loading…" : `Top ${Math.min(topSchools.length, 5)} schools`}
                    </p>
                  </div>
                </div>
                {!analyticsLoading && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${C.sky}18`, color: C.deep }}>
                    {topSchools.length} total
                  </span>
                )}
              </div>

              {analyticsLoading ? (
                <div style={{ padding: 16 }}><SkeletonRows n={4} /></div>
              ) : analyticsError ? (
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 12, background: `${C.mist}55`, border: `1px solid ${C.border}`, fontSize: 13, color: C.slate }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />{analyticsError}
                  </div>
                </div>
              ) : topSchools.length === 0 ? (
                <div style={{ padding: 16 }}><Empty message="No school data available" /></div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bg }}>
                        {["School", "Students", "Teachers", "Admins", "Status"].map((h) => (
                          <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.textLight, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSchools.slice(0, 5).map((s, i) => (
                        <tr key={s.id} style={{ borderTop: `1.5px solid ${C.borderLight}`, transition: "background 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 18px" }}>
                            <p style={{ margin: 0, fontWeight: 700, color: C.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{s.city || "—"}</p>
                          </td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.students ?? 0}</td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.teachers ?? 0}</td>
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: C.text }}>{s.admins ?? 0}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, background: s.isActive ? "#05966918" : `${C.slate}18`, color: s.isActive ? "#059669" : C.slate }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.isActive ? "#059669" : C.borderLight, display: "inline-block" }} />
                              {s.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p style={{ textAlign: "center", color: C.textLight, fontSize: 11, marginTop: 32 }}>
            School Management System · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}