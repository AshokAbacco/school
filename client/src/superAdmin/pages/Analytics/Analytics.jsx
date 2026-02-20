// client/src/superAdmin/pages/analytics/Analytics.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Users, Building2, CreditCard,
  GraduationCap, BookOpen, Users2, RefreshCw,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  DollarSign, UserCog, ShieldCheck, TrendingUp,
  School, X, Search, MapPin, Phone, Mail, Globe,
  CheckCircle2, XCircle, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import PageLayout from "../../components/PageLayout";
import { getAnalytics } from "./api/analyticsApi";
import AllSchools from "./AllSchool";

const font = { fontFamily: "'DM Sans', sans-serif" };

// ─── Stormy Morning Palette ───────────────────────────────────
const C = {
  dark:  "#384959",
  slate: "#6A89A7",
  sky:   "#88BDF2",
  light: "#BDDDFC",
  bg:    "#EFF6FD",
};

const PIE_COLORS = [C.dark, C.slate, C.sky, "#10b981", "#f59e0b", "#ec4899"];


// ─── Safe number helper ───────────────────────────────────────
const num = (v) => (v !== undefined && v !== null ? Number(v) : null);
const fmt = (v) => (v !== null && v !== undefined ? Number(v).toLocaleString() : "—");

// ─── Custom Recharts Tooltip ──────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#384959] rounded-xl px-3 py-2.5 shadow-xl border border-[#BDDDFC]/20 text-[11px]" style={font}>
      <p className="text-[#BDDDFC] font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-white">{Number(p.value ?? 0).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, sub, change, up, Icon, accent, accentBg, delay = 0 }) {
  return (
    <div
      className="bg-white rounded-2xl p-4 border-l-4 border border-[#BDDDFC]/30 shadow-sm hover:shadow-md transition-all duration-200"
      style={{ animation: `fadeUp .4s ${delay}s both`, borderLeftColor: accent }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[#6A89A7] uppercase tracking-wide mb-1 truncate">{label}</p>
          <p className="text-2xl font-extrabold text-[#384959]">{value ?? "—"}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2" style={{ background: accentBg }}>
          <Icon size={18} color={accent} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {change && (
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: up ? "#dcfce7" : "#fee2e2", color: up ? "#16a34a" : "#dc2626" }}
          >
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {change}
          </span>
        )}
        {sub && <p className="text-[10px] text-[#6A89A7]">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Chart Section Wrapper ────────────────────────────────────
function Section({ title, sub, children, delay = 0, extra }) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm overflow-hidden"
      style={{ animation: `fadeUp .4s ${delay}s both` }}
    >
      <div className="px-5 py-4 border-b border-[#EFF6FD] flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-[#384959] text-sm">{title}</h2>
          {sub && <p className="text-[11px] text-[#6A89A7] mt-0.5">{sub}</p>}
        </div>
        {extra}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Empty chart placeholder ─────────────────────────────────
function EmptyChart({ message = "No data for this period" }) {
  return (
    <div className="flex items-center justify-center h-[220px] text-[#6A89A7] text-sm flex-col gap-2">
      <TrendingUp size={28} className="opacity-20" />
      <span className="text-[12px] opacity-60">{message}</span>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-28 border border-[#BDDDFC]/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-72 border border-[#BDDDFC]/40 animate-pulse" />
        ))}
      </div>
      <div className="bg-white rounded-2xl h-64 border border-[#BDDDFC]/40 animate-pulse" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function Analytics() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [range,   setRange]   = useState("30d");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState(null);

// ── Fetch ─────────────────────────────────────────────────────
// ── Fetch ─────────────────────────────────────────────────────
const fetchData = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const token = localStorage.getItem("token");

    const result = await getAnalytics({
      range,
      token,
    });

    setData(result);   // ✅ correct state setter
  } catch (err) {
    console.error("Failed to load analytics", err);
    setError(err.message || "Failed to load analytics.");
  } finally {
    setLoading(false);
  }
}, [range]);

useEffect(() => {
  fetchData();
}, [fetchData]);



  // ── Stat cards — safely read from data ────────────────────────
  const s = data?.stats || {};

  const statCards = [
    {
      label:    "Total Revenue",
      value:    s.totalRevenue ? `$${Number(s.totalRevenue).toLocaleString()}` : "—",
      change:   s.revenueChange,
      up:       s.revenueUp,
      sub:      "vs last period",
      Icon:     DollarSign,
      accent:   C.sky,
      accentBg: "#88BDF215",
    },
    {
      label:    "Active Schools",
      value:    fmt(num(s.activeSchools)),
      change:   s.schoolsChange,
      up:       s.schoolsUp,
      sub:      "registered",
      Icon:     Building2,
      accent:   C.slate,
      accentBg: "#6A89A715",
    },
    {
      label:    "Total Users",
      value:    fmt(num(s.totalUsers)),
      change:   s.usersChange,
      up:       s.usersUp,
      sub:      "all roles",
      Icon:     Users,
      accent:   C.sky,
      accentBg: "#88BDF215",
    },
    {
      label:    "School Admins",
      value:    fmt(num(s.totalAdmins)),
      sub:      "platform admins",
      Icon:     UserCog,
      accent:   C.dark,
      accentBg: "#38495915",
    },
    {
      label:    "Teachers",
      value:    fmt(num(s.totalTeachers)),
      sub:      "across all schools",
      Icon:     BookOpen,
      accent:   C.sky,
      accentBg: "#88BDF215",
    },
    {
      label:    "Students",
      value:    fmt(num(s.totalStudents)),
      sub:      "enrolled",
      Icon:     GraduationCap,
      accent:   C.slate,
      accentBg: "#6A89A715",
    },
    {
      label:    "Parents",
      value:    fmt(num(s.totalParents)),
      sub:      "linked",
      Icon:     Users2,
      accent:   C.sky,
      accentBg: "#88BDF215",
    },
    {
      label:    "Active Subs",
      value:    fmt(num(s.activeSubscriptions)),
      sub:      "paid plans",
      Icon:     CreditCard,
      accent:   C.slate,
      accentBg: "#6A89A715",
    },
  ];

  // ── Safe chart arrays ─────────────────────────────────────────
  const revenueOverTime  = Array.isArray(data?.revenueOverTime)  ? data.revenueOverTime  : [];
  const schoolsPerMonth  = Array.isArray(data?.schoolsPerMonth)  ? data.schoolsPerMonth  : [];
  const mau              = Array.isArray(data?.mau)              ? data.mau              : [];
  const usersByRole      = Array.isArray(data?.usersByRole)      ? data.usersByRole      : [];
  const topSchools       = Array.isArray(data?.topSchools)       ? data.topSchools       : [];

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 min-h-screen bg-[#EFF6FD]" style={font}>

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-[#6A89A7] flex items-center gap-1 mb-1">
              SuperAdmin <ChevronRight size={12} />
              <span className="text-[#88BDF2] font-semibold">
                {activeTab === "analytics" ? "Reports & Analytics" : "All Schools"}
              </span>
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-[#384959] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow shadow-[#88BDF2]/40 flex-shrink-0">
                {activeTab === "analytics" ? <BarChart3 size={15} color="#fff" /> : <School size={15} color="#fff" />}
              </div>
              {activeTab === "analytics" ? "Reports & Analytics" : "All Schools"}
            </h1>
            <p className="text-xs text-[#6A89A7] mt-1 ml-10">
              {activeTab === "analytics"
                ? "Platform-wide metrics, growth trends and subscription insights"
                : "View and manage all registered schools on the platform"}
            </p>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-white border border-[#BDDDFC]/50 rounded-xl p-1 w-fit shadow-sm">
          {[
            { key: "analytics", label: "Reports & Analytics", icon: BarChart3 },
            { key: "schools",   label: "All Schools",          icon: School    },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-0 cursor-pointer"
              style={{
                background:  activeTab === key ? C.dark : "transparent",
                color:       activeTab === key ? "#BDDDFC" : C.slate,
                boxShadow:   activeTab === key ? "0 2px 8px rgba(56,73,89,0.25)" : "none",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Analytics Tab Content ──────────────────────────── */}
        {activeTab === "analytics" && (<>

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600 text-sm flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="font-semibold mb-0.5">Failed to load analytics</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs font-bold underline whitespace-nowrap flex-shrink-0 border-0 bg-transparent cursor-pointer text-red-600"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────── */}
        {loading && <Skeleton />}

        {/* ── Main content ──────────────────────────────────────── */}
        {!loading && !error && data && (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mb-5">
              {statCards.map((card, i) => (
                <StatCard key={card.label} {...card} delay={i * 0.04} />
              ))}
            </div>

            {/* ── Row 1: Revenue + User Growth ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

              <Section title="Revenue Trend" sub="Monthly subscription revenue" delay={0.1}>
                {revenueOverTime.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.sky} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={C.sky} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FD" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="Revenue ($)"
                        stroke={C.sky} strokeWidth={2.5} fill="url(#revGrad)"
                        dot={{ fill: C.sky, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: C.dark }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Section>

             <Section title="Schools Registered" sub="New school onboarding per month" delay={0.2}>
                {schoolsPerMonth.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={schoolsPerMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FD" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="schools" name="Schools" fill={C.sky} radius={[6, 6, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>

            {/* ── Row 2: Users by role + MAU ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

              <Section title="Users by Role" sub="Total users across each role type" delay={0.3}>
                {usersByRole.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={usersByRole}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FD" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="role"
                        tick={{ fontSize: 11, fill: C.dark, fontWeight: 600 }}
                        axisLine={false} tickLine={false} width={90}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Users" radius={[0, 6, 6, 0]} maxBarSize={22}>
                        {usersByRole.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Section>

              <Section title="Monthly Active Users" sub="Staff logins tracked by month" delay={0.35}>
                {mau.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={mau} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF6FD" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: C.slate }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="active" name="Active Users"
                        stroke={C.slate} strokeWidth={2.5}
                        dot={{ fill: C.slate, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: C.dark }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>

            {/* ── Top Schools Table ── */}
            <div
              className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm overflow-hidden"
              style={{ animation: "fadeUp .4s 0.4s both" }}
            >
              <div className="px-5 py-4 border-b border-[#EFF6FD] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-bold text-[#384959] text-sm">Top Schools</h2>
                  <p className="text-[11px] text-[#6A89A7] mt-0.5">Ranked by total enrolled students</p>
                </div>
                <span className="text-[11px] font-semibold text-[#6A89A7] bg-[#EFF6FD] px-3 py-1 rounded-full">
                  Top {topSchools.length}
                </span>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#384959] text-[#BDDDFC] text-[11px] uppercase tracking-wider">
                      {["#", "School","Students", "Teachers", "Parents", "Status"].map((h, i) => (
                        <th key={h} className={`px-4 py-3 font-semibold whitespace-nowrap ${i <= 1 ? "text-left" : "text-center"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topSchools.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center text-[#6A89A7] text-sm">
                          No school data available yet.
                        </td>
                      </tr>
                    ) : topSchools.map((school, i) => (
                      <tr
                        key={school.id || i}
                        className="border-b border-[#EFF6FD] hover:bg-[#BDDDFC]/10 transition-colors"
                        style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                      >
                        <td className="px-4 py-3 text-[#6A89A7] font-bold text-[13px]">#{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#BDDDFC]/40 flex items-center justify-center flex-shrink-0">
                              <Building2 size={13} color={C.slate} />
                            </div>
                            <div>
                              <p className="font-semibold text-[#384959] text-[13px]">{school.name || "—"}</p>
                              <p className="text-[10px] text-[#6A89A7]">{school.city || "—"}</p>
                            </div>
                          </div>
                        </td>
                         
                        <td className="px-4 py-3 text-center font-semibold text-[#384959] text-[13px]">{fmt(school.students)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[#384959] text-[13px]">{fmt(school.teachers)}</td>
                        <td className="px-4 py-3 text-center font-semibold text-[#384959] text-[13px]">{fmt(school.parents)}</td>
                        <td className="px-4 py-3 text-center">
                          {school.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <ShieldCheck size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col divide-y divide-[#EFF6FD]">
                {topSchools.length === 0 ? (
                  <p className="py-10 text-center text-[#6A89A7] text-sm">No school data available yet.</p>
                ) : topSchools.map((school, i) => (
                  <div key={school.id || i} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#6A89A7] font-bold text-xs">#{i + 1}</span>
                        <div className="w-7 h-7 rounded-lg bg-[#BDDDFC]/40 flex items-center justify-center">
                          <Building2 size={12} color={C.slate} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#384959] text-[13px]">{school.name}</p>
                          <p className="text-[10px] text-[#6A89A7]">{school.city || "—"}</p>
                        </div>
                      </div>
                      {school.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <ShieldCheck size={9} /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center mt-2">
                      {[
                        { label: "Plan",     val: school.plan || "—"      },
                        { label: "Students", val: fmt(school.students)     },
                        { label: "Teachers", val: fmt(school.teachers)     },
                        { label: "Parents",  val: fmt(school.parents)      },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-[#EFF6FD] rounded-lg py-1.5 px-1">
                          <p className="text-[11px] font-bold text-[#384959]">{val}</p>
                          <p className="text-[9px] text-[#6A89A7] uppercase tracking-wide">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── No data state (loaded but empty) ── */}
        {!loading && !error && !data && (
          <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm py-20 flex flex-col items-center gap-3 text-center">
            <BarChart3 size={40} color={C.light} />
            <p className="font-semibold text-[#384959]">No analytics data yet</p>
            <p className="text-sm text-[#6A89A7]">Data will appear once schools and users are registered.</p>
            <button
              onClick={fetchData}
              className="mt-2 flex items-center gap-2 bg-[#384959] text-[#BDDDFC] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#6A89A7] transition-all border-0 cursor-pointer"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        )}

        </>)}

           {/* ── All Schools Tab Content ────────────────────────────── */}
        {activeTab === "schools" && <AllSchools />}


      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </PageLayout>
  );
}