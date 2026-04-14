import React, { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Clock, Wallet, GraduationCap,
  Users, Wrench, ChevronDown, Package, BookOpen, Shield,
  Monitor, Truck, Coffee, Globe, Star, Home, CheckCircle2,
  AlertCircle, IndianRupee, BarChart3, Receipt, BadgeCheck,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n || 0);

// ── Responsive hook (measures actual container, not window) ──────────────────
// This avoids false breakpoints caused by the sidebar eating into page width.
function useContainerBreakpoint() {
  const ref = React.useRef(null);
  const getBreakpoint = (w) => {
    if (w < 400) return "xs";
    if (w < 560) return "sm";
    if (w < 720) return "md";
    if (w < 960) return "lg";
    return "xl";
  };
  const [bp, setBp] = useState("lg");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBp(getBreakpoint(entry.contentRect.width));
      }
    });
    ro.observe(el);
    setBp(getBreakpoint(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  return [ref, bp];
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <div style={{ background: "#e8f0f5", borderRadius: 99, height: 5, overflow: "hidden", marginTop: 5 }}>
      <div style={{
        width: `${Math.min(Math.max(value, 0), 100)}%`,
        background: color, height: "100%", borderRadius: 99,
        transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

// ── Icon resolver ─────────────────────────────────────────────────────────────
function ResolveIcon({ name, size = 16, color = "#3c5d74" }) {
  const map = {
    Package, BookOpen, Wrench, Shield, Monitor, Truck, Coffee,
    Globe, Star, Home, GraduationCap, Users, Receipt, BarChart3,
    Wallet, TrendingUp, TrendingDown,
  };
  const Icon = map[name] || Package;
  return <Icon size={size} color={color} />;
}

// ── Collapsible Section Card ──────────────────────────────────────────────────
function SectionCard({ title, total, items = [], color, iconName, badge }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e4edf3",
      overflow: "hidden",
      boxShadow: open ? "0 4px 18px rgba(44,85,120,.09)" : "0 1px 5px rgba(44,85,120,.05)",
      transition: "box-shadow .25s",
    }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ResolveIcon name={iconName} size={15} color={color} />
        </div>
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1c3040", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ fontSize: 10.5, color: "#7a9ab0", marginTop: 1 }}>
            {items.length} {items.length === 1 ? "entry" : "entries"}
          </div>
        </div>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99,
            background: badge.bg, color: badge.color, letterSpacing: ".4px", flexShrink: 0,
          }}>{badge.text}</span>
        )}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1c3040", fontFamily: "'DM Mono',monospace", flexShrink: 0, marginLeft: 4 }}>
          {fmt(total)}
        </div>
        <ChevronDown size={14} color="#7a9ab0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s", marginLeft: 3, flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #f0f5f8", padding: "5px 14px 10px" }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "#aac0ce", padding: "7px 0" }}>No entries found</div>
          ) : items.map((it, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "5px 0",
              borderBottom: i < items.length - 1 ? "1px dashed #edf2f5" : "none",
              gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "#3a5a70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1c3040", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                {fmt(it.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Column Header ─────────────────────────────────────────────────────────────
function ColHeader({ IconComp, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 2 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: "#172a38",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <IconComp size={15} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1c3040" }}>{title}</div>
        <div style={{ fontSize: 10.5, color: "#7a9ab0", fontWeight: 500 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Status Chip ───────────────────────────────────────────────────────────────
function StatusChip({ label, count, color, IconComp }) {
  return (
    <div style={{
      flex: 1, background: color + "10", borderRadius: 10,
      padding: "9px 8px", border: `1px solid ${color}20`,
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <IconComp size={12} color={color} />
        <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{count}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const [studentData, setStudentData] = useState([]);
  const [expenseSections, setExpenseSections] = useState([]);
  const [baseRevenue, setBaseRevenue] = useState([]);
  const [teacherSalaries, setTeacherSalaries] = useState([]);
  const [groupBSalaries, setGroupBSalaries] = useState([]);
  const [groupCSalaries, setGroupCSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErrors, setFetchErrors] = useState({});

  const [rootRef, bp] = useContainerBreakpoint();
  const isMobile = bp === "xs" || bp === "sm";
  const isTablet = bp === "md";
  const isDesktop = bp === "lg" || bp === "xl";

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem("auth"));
    const token = auth?.token;
    let school = "";
    try {
      const raw = localStorage.getItem("auth");
      if (raw) {
        const auth = JSON.parse(raw);
        school =
          auth.user?.schoolId ||
          auth.user?.school?.id ||
          auth.schoolId || "";
      }
    } catch { school = ""; }
    if (!school) school = localStorage.getItem("selectedSchoolId") || "";

    const safe = async (key, fn) => {
      try { return await fn(); }
      catch (e) { setFetchErrors(prev => ({ ...prev, [key]: e.message })); return null; }
    };

    const fetchWithAuth = async (url) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}` // ✅ FIX
        }
      });

      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    };

    const doFetch = async (url, opts = {}) => {
      const res = await fetch(url, opts);
      // Treat 404 as "not implemented yet" — return null silently instead of throwing
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    };

    Promise.all([
      safe("students", () =>
        fetchWithAuth(`${API_URL}/api/finance/getStudentFinance`)
      ),
      safe("expenses", () =>
        fetchWithAuth(`${API_URL}/api/finance/list`)
      ),
      // /api/finance/revenue is optional — falls back to totalFees if 404
      safe("revenue", () =>
        fetchWithAuth(`${API_URL}/api/finance/revenue`)
      ),
      (school && token)
        ? safe("teachers", () =>
          doFetch(`${API_URL}/api/teachers/salary/list/${school}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
        : Promise.resolve(null),


      school
        ? safe("groupB", () =>
            fetch(`${API_URL}/api/groupb/salary/list/${school}`, {
              headers: {
                Authorization: `Bearer ${token}` // ✅ FIX
              }
            }).then(res => res.json())
          )
        : safe("groupBAll", () =>
            fetch(`${API_URL}/api/groupb/salary/list/all`, {
              headers: {
                Authorization: `Bearer ${token}` // ✅ FIX
              }
            }).then(res => res.json())
          ),

      school
        ? safe("groupC", () =>
            fetch(`${API_URL}/api/groupc/salary/list/${school}`, {
              headers: {
                Authorization: `Bearer ${token}` // ✅ FIX
              }
            }).then(res => res.json())
          )
        : safe("groupCAll", () =>
            fetch(`${API_URL}/api/groupc/salary/list/all`, {
              headers: {
                Authorization: `Bearer ${token}` // ✅ FIX
              }
            }).then(res => res.json())
          ),
    ]).then(([stu, exp, rev, teach, gb, gc]) => {
      if (Array.isArray(stu)) setStudentData(stu);
      if (Array.isArray(exp)) setExpenseSections(exp);
      if (Array.isArray(rev)) setBaseRevenue(rev);
      if (Array.isArray(teach)) setTeacherSalaries(teach);
      if (Array.isArray(gb)) setGroupBSalaries(gb);
      if (Array.isArray(gc)) setGroupCSalaries(gc);
      setLoading(false);
    });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalFees = studentData.reduce((s, r) => s + Number(r.fees || 0), 0);
  const paidFees = studentData.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
  const pendingFees = Math.max(totalFees - paidFees, 0);

  const paidCount = studentData.filter(r => (r.paymentStatus || r.status || "").toUpperCase() === "PAID").length;
  const partialCount = studentData.filter(r => (r.paymentStatus || r.status || "").toUpperCase() === "PARTIAL").length;
  const pendingCount = studentData.length - paidCount - partialCount;

  const teachTotal = teacherSalaries.reduce((s, t) => s + Number(t.netSalary || 0), 0);
  const gbTotal = groupBSalaries.reduce((s, t) => s + Number(t.netSalary || 0), 0);
  const gcTotal = groupCSalaries.reduce((s, t) => s + Number(t.netSalary || 0), 0);
  const allSalaries = teachTotal + gbTotal + gcTotal;

  const totalExpenses = expenseSections.reduce((s, e) => s + (e.total || 0), 0);
  const totalRevenue = baseRevenue.length
    ? baseRevenue.reduce((s, r) => s + (r.amount || 0), 0)
    : totalFees;
  const netBalance = totalRevenue - totalExpenses - allSalaries;
  const pctCollected = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0;

  const teachItems = teacherSalaries.map(t => ({
    label: `${[t.teacher?.firstName, t.teacher?.lastName].filter(Boolean).join(" ") || t.teacherName || t.name || "Teacher"} — ${t.status || "PENDING"}`,
    amount: Number(t.netSalary || 0),
  }));
  const gbItems = groupBSalaries.map(t => ({
    label: `${t.staffName || "Staff"} (${t.staffRole || "Group B"}) — ${t.status || "PENDING"}`,
    amount: Number(t.netSalary || 0),
  }));
  const gcItems = groupCSalaries.map(t => ({
    label: `${t.staffName || "Staff"} (${t.staffRole || "Group C"}) — ${t.status || "PENDING"}`,
    amount: Number(t.netSalary || 0),
  }));

  const now = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const COLORS = ["#172a38", "#c8960c", "#2e7d5a", "#3c5d74", "#a0522d", "#1a6e8e"];

  // ── Responsive layout helpers ──────────────────────────────────────────────
  const pad = bp === "xs" ? "10px 10px 24px" : isMobile ? "14px 14px 28px" : isTablet ? "16px 18px 28px" : "20px 24px 32px";

  const kpiCols = bp === "xs" ? "1fr" : isMobile ? "1fr 1fr" : "repeat(4,1fr)";

  // 3-col on desktop, 2-col on tablet, 1-col on mobile
  const bodyCols = isDesktop ? "1fr 1fr 1fr" : isTablet ? "1fr 1fr" : "1fr";

  // Bottom strip: 2-col on mobile, else 5-col
  const stripCols = bp === "xs" ? "1fr" : isMobile ? "1fr 1fr" : "repeat(5,1fr)";

  if (loading) return (
    <div ref={rootRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", width: "100%", minWidth: 0 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #3c5d74", borderTopColor: "transparent", borderRadius: "50%", animation: "fdSpin 0.9s linear infinite", margin: "0 auto 10px" }} />
        <p style={{ color: "#3c5d74", fontFamily: "sans-serif", fontWeight: 600, fontSize: 12 }}>Loading…</p>
        <style>{`@keyframes fdSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      style={{
        width: "100%",
        minWidth: 0,
        overflowX: "hidden",
        fontFamily: "'DM Sans', sans-serif",
        background: "#d1e2ed",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600;700&display=swap');
        .fd-root * { box-sizing: border-box; }
      `}</style>

      <div className="fd-root" style={{ padding: pad }}>

        {/* ── Page title row ───────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #172a38 0%, #1e3a4f 100%)",
          borderRadius: 16, padding: isMobile ? "14px 16px" : "18px 24px",
          marginBottom: 16,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 12 : 0,
          boxShadow: "0 4px 20px rgba(23,42,56,.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(255,255,255,.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,255,255,.15)", flexShrink: 0,
            }}>
              <IndianRupee size={20} color="#ffd166" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.8, color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginBottom: 2 }}>
                Finance Module
              </div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#fff" }}>Financial Dashboard</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 2, fontWeight: 500 }}>
                {months[now.getMonth()]} {now.getFullYear()} · Real-time overview
              </div>
            </div>
          </div>

          {/* Net balance pill */}
          <div style={{
            border: `1.5px solid ${netBalance >= 0 ? "#48c78e" : "#e05c3a"}`,
            borderRadius: 12,
            padding: isMobile ? "8px 14px" : "10px 18px",
            textAlign: isMobile ? "left" : "center",
            background: netBalance >= 0 ? "rgba(72,199,142,.12)" : "rgba(224,92,58,.12)",
            flexShrink: 0,
            alignSelf: isMobile ? "stretch" : "auto",
            display: "flex", flexDirection: isMobile ? "row" : "column",
            alignItems: isMobile ? "center" : "flex-start",
            justifyContent: isMobile ? "space-between" : "center",
            gap: isMobile ? 8 : 0,
          }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: netBalance >= 0 ? "#48c78e" : "#e05c3a", textTransform: "uppercase", marginBottom: 2 }}>
                Net Balance
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: netBalance >= 0 ? "#48c78e" : "#e05c3a" }}>
                {netBalance >= 0 ? "Healthy Surplus" : "Running Deficit"}
              </div>
            </div>
            <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 800, color: "#fff", fontFamily: "'DM Mono',monospace" }}>
              {fmt(netBalance)}
            </div>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: kpiCols, gap: isMobile ? 8 : 12, marginBottom: 18 }}>
          {[
            { label: "Total Revenue", value: fmt(totalRevenue), Icon: TrendingUp, color: "#3c5d74", accent: "#e8f3f8", strip: "#3c5d74" },
            { label: "Total Expenses", value: fmt(totalExpenses + allSalaries), Icon: TrendingDown, color: "#e05c3a", accent: "#fef2ee", strip: "#e05c3a" },
            { label: "Total Salaries", value: fmt(allSalaries), Icon: Users, color: "#c8960c", accent: "#fffbeb", strip: "#d4a017" },
            { label: "Fees Pending", value: fmt(pendingFees), Icon: Clock, color: "#2e7d5a", accent: "#e8f8f1", strip: "#2ecc71" },
          ].map((k, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 12,
              border: "1px solid #dce8f0", boxShadow: "0 1px 6px rgba(23,42,56,.07)",
              overflow: "hidden",
            }}>
              <div style={{ height: 4, background: k.strip, borderRadius: "12px 12px 0 0" }} />
              <div style={{ padding: isMobile ? "10px 12px" : "12px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                <div style={{
                  width: isMobile ? 32 : 38, height: isMobile ? 32 : 38,
                  borderRadius: 10, background: k.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <k.Icon size={isMobile ? 15 : 17} color={k.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 8.5 : 9.5, fontWeight: 700, color: "#7a9ab0", textTransform: "uppercase", letterSpacing: ".7px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
                  <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 800, color: "#172a38", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{k.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 3-col body ───────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: bodyCols, gap: isMobile ? 14 : 18, alignItems: "start" }}>

          {/* ══ COL 1 – Student Fees ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ColHeader IconComp={GraduationCap} title="Student Fees" sub={`${studentData.length} students enrolled`} />

            {/* Collection rate */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e4edf3", boxShadow: "0 1px 6px rgba(44,85,120,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7a9ab0", textTransform: "uppercase", letterSpacing: ".7px" }}>Collection Rate</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#3c5d74", fontFamily: "'DM Mono',monospace" }}>{pctCollected}%</span>
              </div>
              <ProgressBar value={pctCollected} color="#3c5d74" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14 }}>
                {[
                  { l: "Total", v: fmt(totalFees), c: "#3c5d74" },
                  { l: "Collected", v: fmt(paidFees), c: "#48c78e" },
                  { l: "Pending", v: fmt(pendingFees), c: "#e05c3a" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#f6f9fc", borderRadius: 9, padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#9ab5c5", textTransform: "uppercase", letterSpacing: ".5px" }}>{s.l}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: s.c, fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment status + student list */}
            <div style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #e4edf3", boxShadow: "0 1px 6px rgba(44,85,120,.06)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7a9ab0", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 10 }}>
                Payment Status
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <StatusChip label="Paid" count={paidCount} color="#48c78e" IconComp={CheckCircle2} />
                <StatusChip label="Partial" count={partialCount} color="#f59e0b" IconComp={Clock} />
                <StatusChip label="Pending" count={pendingCount} color="#e05c3a" IconComp={AlertCircle} />
              </div>
 
            </div>
          </div>

          {/* ══ COL 2 – Staff Salaries ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ColHeader IconComp={Users} title="Staff Salaries" sub={`${months[now.getMonth()]} ${now.getFullYear()}`} />

            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e4edf3", boxShadow: "0 1px 6px rgba(44,85,120,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IndianRupee size={13} color="#7a9ab0" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7a9ab0", textTransform: "uppercase", letterSpacing: ".7px" }}>Total Payroll</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#1c3040", fontFamily: "'DM Mono',monospace" }}>{fmt(allSalaries)}</span>
              </div>

              {[
                { label: "Teaching Staff (Group A)", total: teachTotal, count: teacherSalaries.length, color: "#172a38" },
                { label: "Support Staff (Group B)", total: gbTotal, count: groupBSalaries.length, color: "#c8960c" },
                { label: "Support Staff (Group C)", total: gcTotal, count: groupCSalaries.length, color: "#2e7d5a" },
              ].map((g, i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "#3a5a70", fontWeight: 600 }}>{g.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1c3040", fontFamily: "'DM Mono',monospace", flexShrink: 0, marginLeft: 8 }}>{fmt(g.total)}</span>
                  </div>
                  <ProgressBar value={allSalaries > 0 ? (g.total / allSalaries) * 100 : 0} color={g.color} />
                  <div style={{ fontSize: 9.5, color: "#9ab5c5", marginTop: 2 }}>
                    {g.count} {g.count === 1 ? "member" : "members"}
                    {g.total === 0 && <span style={{ color: "#e05c3a", marginLeft: 5 }}>· No records this month</span>}
                  </div>
                </div>
              ))}
            </div>

            
          </div>

          {/* ══ COL 3 – Expenses ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ColHeader IconComp={Receipt} title="Expenses" sub={`${expenseSections.length} categories`} />

            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #e4edf3", boxShadow: "0 1px 6px rgba(44,85,120,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <BarChart3 size={13} color="#7a9ab0" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7a9ab0", textTransform: "uppercase", letterSpacing: ".7px" }}>Total Expenses</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#1c3040", fontFamily: "'DM Mono',monospace" }}>{fmt(totalExpenses)}</span>
              </div>

              {expenseSections.length === 0 ? (
                <div style={{ textAlign: "center", padding: "12px 0", color: "#9ab5c5", fontSize: 11.5 }}>
                  No expense categories found
                </div>
              ) : expenseSections.slice(0, 5).map((sec, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#3a5a70", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec.label}</span>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1c3040", fontFamily: "'DM Mono',monospace", flexShrink: 0, marginLeft: 8 }}>{fmt(sec.total)}</span>
                  </div>
                  <ProgressBar value={totalExpenses > 0 ? (sec.total / totalExpenses) * 100 : 0} color={COLORS[i % COLORS.length]} />
                  <div style={{ fontSize: 9.5, color: "#9ab5c5", marginTop: 2 }}>{sec.items?.length || 0} items</div>
                </div>
              ))}
            </div>

            {expenseSections.map((sec, i) => (
              <SectionCard
                key={sec.key || i}
                title={sec.label} total={sec.total} items={sec.items || []}
                color={sec.color || COLORS[i % COLORS.length]}
                iconName={sec.icon || "Package"}
              />
            ))}
          </div>
        </div>

        {/* ── Bottom summary strip ──────────────────────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            background: "linear-gradient(135deg, #172a38 0%, #1e3a4f 100%)",
            borderRadius: 16,
            padding: isMobile ? "14px 16px" : "18px 24px",
            display: "grid",
            gridTemplateColumns: stripCols,
            gap: isMobile ? "12px 0" : 0,
            boxShadow: "0 4px 20px rgba(28,48,64,.18)",
          }}>
            {[
              { l: "Total Revenue", v: fmt(totalRevenue), I: TrendingUp, c: "#48c78e" },
              { l: "Total Salaries", v: fmt(allSalaries), I: Users, c: "#64b5f6" },
              { l: "Other Expenses", v: fmt(totalExpenses), I: Receipt, c: "#ff8c6b" },
              { l: "Fees Collected", v: fmt(paidFees), I: BadgeCheck, c: "#ffd166" },
              { l: "Net Balance", v: fmt(netBalance), I: Wallet, c: netBalance >= 0 ? "#48c78e" : "#ff6363" },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <div style={{ textAlign: "center", padding: isMobile ? "0 8px" : "0 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
                    <s.I size={11} color={s.c} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.4)", letterSpacing: ".8px", textTransform: "uppercase" }}>{s.l}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 800, color: s.c, fontFamily: "'DM Mono',monospace" }}>{s.v}</div>
                </div>
                {/* Dividers: vertical on desktop, skip on last item of each row on mobile */}
                {!isMobile && i < arr.length - 1 && (
                  <div style={{ width: 1, background: "rgba(255,255,255,.1)", alignSelf: "stretch" }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}