import React from "react";
import PageLayout from "./components/PageLayout";
import {
  IndianRupee, TrendingUp, TrendingDown, AlertCircle,
  PiggyBank, PlusCircle, MinusCircle, BarChart3,
  School, ArrowUpRight, ArrowDownRight, Wallet,
  GraduationCap, Bus, BookOpen, Users, Receipt,
  ChevronRight, CreditCard, Building2
} from "lucide-react";

// ── STATIC DATA (no backend on this page) ────────────────────────────────────
const stats = [
  { label: "Total Revenue", value: "₹25,000", sub: "+12% this month", up: true, color: "#2A7A4F", icon: TrendingUp },
  { label: "Total Expenses", value: "₹15,000", sub: "+4% this month", up: false, color: "#A83228", icon: TrendingDown },
  { label: "Pending Fees", value: "₹5,000", sub: "8 students due", up: false, color: "#A07010", icon: AlertCircle },
  { label: "Net Balance", value: "₹10,000", sub: "Healthy surplus", up: true, color: "#2E4F6B", icon: PiggyBank },
];

const quickActions = [
  { label: "Add Payment", icon: PlusCircle, color: "#2A7A4F", bg: "rgba(42,122,79,.12)" },
  { label: "Add Expense", icon: MinusCircle, color: "#A83228", bg: "rgba(168,50,40,.11)" },
  { label: "View Reports", icon: BarChart3, color: "#2E4F6B", bg: "rgba(46,79,107,.13)" },
];

const recentActivity = [
  { desc: "Fee collected – Grade 5", type: "credit", amount: 4500, date: "Today, 10:32 AM", icon: GraduationCap },
  { desc: "Bus maintenance payment", type: "debit", amount: 8000, date: "Yesterday, 3:15 PM", icon: Bus },
  { desc: "Library book purchase", type: "debit", amount: 2200, date: "24 Feb, 11:00 AM", icon: BookOpen },
  { desc: "Staff salary – Feb 2026", type: "debit", amount: 45000, date: "24 Feb, 9:00 AM", icon: Users },
  { desc: "Fee collected – Grade 3", type: "credit", amount: 6000, date: "23 Feb, 2:45 PM", icon: Receipt },
];

const expenseBreakdown = [
  { label: "Staff Salaries", pct: 52, color: "#2E4F6B", icon: Users },
  { label: "Infrastructure", pct: 14, color: "#5A8FA8", icon: Building2 },
  { label: "Transport", pct: 9, color: "#6BA3B8", icon: Bus },
  { label: "Academics", pct: 11, color: "#2A7A4F", icon: BookOpen },
  { label: "Miscellaneous", pct: 14, color: "#A07010", icon: Wallet },
];

export default function FinanceHome() {
  return (
    <PageLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .fh-root { --navy:#1E3448; --primary:#2E4F6B; --mid:#3D6480; --accent:#5A8FA8; --pale:#D6E8F2; --white:#fff; --success:#2A7A4F; --danger:#A83228; --warn:#A07010; --text:#162535; --muted:#5A7A90; --border:#A8C8DC; }
        .fh-root * { box-sizing:border-box; }
        .fh-root, .fh-root input, .fh-root select, .fh-root button { font-family:'DM Sans',sans-serif; }

        /* PAGE */
        .fh-page { background:linear-gradient(150deg,#C8DCE9 0%,#B5CEDF 45%,#A4BDD0 100%); min-height:100vh; padding:0; }

        /* TOP BAR */
        .fh-topbar { background:linear-gradient(135deg,#1E3448 0%,#2E4F6B 100%); padding:20px 32px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 24px rgba(30,52,72,.38); }
        .fh-brand  { display:flex; align-items:center; gap:13px; }
        .fh-logo   { width:48px; height:48px; border-radius:13px; background:rgba(255,255,255,.14); border:1.5px solid rgba(255,255,255,.22); display:flex; align-items:center; justify-content:center; }
        .fh-title  { margin:0; font-size:20px; font-weight:700; color:#fff; font-family:'Playfair Display',serif; letter-spacing:.2px; }
        .fh-sub    { margin:0; font-size:12px; color:rgba(255,255,255,.6); margin-top:1px; }
        .fh-datebadge { color:rgba(255,255,255,.7); font-size:12px; background:rgba(255,255,255,.1); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }

        /* CONTENT */
        .fh-content { padding:28px 32px; }

        /* SECTION TITLE */
        .fh-sec-title { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; color:#1E3448; margin:0 0 16px; display:flex; align-items:center; gap:9px; }
        .fh-sec-title span { width:4px; height:20px; background:linear-gradient(135deg,#2E4F6B,#1E3448); border-radius:4px; display:inline-block; }

        /* KPI GRID */
        .fh-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:26px; }
        .fh-kpi {
          background:rgba(255,255,255,.92); border-radius:18px; padding:22px 22px 18px;
          box-shadow:0 2px 16px rgba(30,52,72,.1); position:relative; overflow:hidden;
          border-top:4px solid var(--kc); transition:transform .2s,box-shadow .2s;
        }
        .fh-kpi:hover { transform:translateY(-3px); box-shadow:0 8px 26px rgba(30,52,72,.15); }
        .fh-kpi-lbl  { font-size:11px; font-weight:700; color:#5A7A90; text-transform:uppercase; letter-spacing:.9px; margin-bottom:8px; }
        .fh-kpi-val  { font-size:26px; font-weight:700; color:#1E3448; font-family:'Playfair Display',serif; line-height:1; }
        .fh-kpi-sub  { font-size:11.5px; margin-top:7px; display:flex; align-items:center; gap:4px; font-weight:600; }
        .fh-kpi-ico  { position:absolute; right:18px; top:18px; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .fh-kpi-glow { position:absolute; right:-20px; bottom:-20px; width:90px; height:90px; border-radius:50%; background:var(--kc); opacity:.06; }

        /* QUICK ACTIONS */
        .fh-actions-row { display:flex; gap:14px; margin-bottom:26px; }
        .fh-action-btn {
          display:flex; align-items:center; gap:10px;
          padding:14px 24px; border-radius:14px; border:none;
          background:rgba(255,255,255,.88); cursor:pointer;
          box-shadow:0 2px 12px rgba(30,52,72,.1);
          font-size:14px; font-weight:700; color:#1E3448;
          transition:transform .18s, box-shadow .18s;
          flex:1; justify-content:center;
        }
        .fh-action-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(30,52,72,.16); }
        .fh-action-ico { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; }

        /* PANEL */
        .fh-panel { background:rgba(255,255,255,.9); border-radius:18px; box-shadow:0 2px 14px rgba(30,52,72,.09); overflow:hidden; }
        .fh-panel-head { background:linear-gradient(135deg,#2E4F6B,#1E3448); padding:14px 22px; display:flex; align-items:center; justify-content:space-between; }
        .fh-ph-left  { display:flex; align-items:center; gap:9px; }
        .fh-ph-title { color:#fff; font-size:14.5px; font-weight:700; margin:0; }
        .fh-panel-body { padding:6px 22px 20px; }

        /* TWO COL */
        .fh-two { display:grid; grid-template-columns:1.35fr 1fr; gap:20px; }

        /* ACTIVITY ROW */
        .fh-act-row { display:flex; align-items:center; gap:13px; padding:11px 0; border-bottom:1px solid #E4EFF6; }
        .fh-act-row:last-child { border-bottom:none; }
        .fh-act-dot { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .fh-act-desc { font-size:13.5px; font-weight:600; color:#1E3448; }
        .fh-act-date { font-size:11.5px; color:#5A7A90; margin-top:1px; }
        .fh-act-amt  { font-size:14px; font-weight:700; font-family:'Playfair Display',serif; white-space:nowrap; }

        /* EXPENSE BAR */
        .fh-exp-row { margin-bottom:14px; }
        .fh-exp-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
        .fh-exp-label { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#1E3448; }
        .fh-exp-pct   { font-size:12px; font-weight:700; color:#5A7A90; }
        .fh-progress-track { height:8px; background:#D6E8F2; border-radius:8px; overflow:hidden; }
        .fh-progress-fill  { height:100%; border-radius:8px; transition:width .6s ease; }

        /* SUMMARY BOTTOM STRIP */
        .fh-strip { background:linear-gradient(135deg,#2E4F6B,#1E3448); border-radius:16px; padding:20px 28px; display:flex; align-items:center; justify-content:space-around; margin-top:22px; }
        .fh-strip-item { text-align:center; }
        .fh-strip-lbl  { color:rgba(255,255,255,.6); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
        .fh-strip-val  { color:#fff; font-size:20px; font-weight:700; font-family:'Playfair Display',serif; margin-top:3px; }
        .fh-strip-div  { width:1px; height:40px; background:rgba(255,255,255,.18); }

        /* SEE ALL LINK */
        .fh-see-all { color:rgba(255,255,255,.7); font-size:12px; display:flex; align-items:center; gap:3px; background:rgba(255,255,255,.12); border:none; border-radius:8px; padding:5px 12px; cursor:pointer; transition:background .15s; }
        .fh-see-all:hover { background:rgba(255,255,255,.2); color:#fff; }

        /* BADGE */
        .fh-badge { display:inline-block; padding:3px 11px; border-radius:20px; font-size:11.5px; font-weight:600; }
        .fh-badge-green { color:#2A7A4F; background:rgba(42,122,79,.13); }
        .fh-badge-red   { color:#A83228; background:rgba(168,50,40,.11); }
      `}</style>

      <div className="fh-root fh-page">

        {/* ── TOP BAR ── */}
        <div className="fh-topbar">
          <div className="fh-brand">
            <div className="fh-logo"><School size={24} color="#fff" /></div>
            <div>
              <p className="fh-title">School Financial Dashboard</p>
              <p className="fh-sub">Complete Financial Overview &amp; Operations</p>
            </div>
          </div>
          <span className="fh-datebadge">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <div className="fh-content">

          {/* ── KPI CARDS ── */}
          <div className="fh-kpi-grid">
            {stats.map((s, i) => (
              <div key={i} className="fh-kpi" style={{ "--kc": s.color }}>
                <div className="fh-kpi-lbl">{s.label}</div>
                <div className="fh-kpi-val">{s.value}</div>
                <div className={`fh-kpi-sub`} style={{ color: s.up ? "#2A7A4F" : "#A83228" }}>
                  {s.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {s.sub}
                </div>
                <div className="fh-kpi-ico" style={{ background: s.color + "18", color: s.color }}>
                  <s.icon size={20} />
                </div>
                <div className="fh-kpi-glow" />
              </div>
            ))}
          </div>

          {/* ── QUICK ACTIONS ── */}
          <p className="fh-sec-title"><span />Quick Actions</p>
          <div className="fh-actions-row">
            {quickActions.map((a, i) => (
              <button key={i} className="fh-action-btn">
                <div className="fh-action-ico" style={{ background: a.bg, color: a.color }}>
                  <a.icon size={19} />
                </div>
                {a.label}
              </button>
            ))}
          </div>

          {/* ── TWO COL: ACTIVITY + EXPENSES ── */}
          <div className="fh-two">

            {/* Recent Activity */}
            <div className="fh-panel">
              <div className="fh-panel-head">
                <div className="fh-ph-left">
                  <CreditCard size={15} color="#fff" />
                  <p className="fh-ph-title">Recent Activity</p>
                </div>
                <button className="fh-see-all">View all <ChevronRight size={13} /></button>
              </div>
              <div className="fh-panel-body">
                {recentActivity.map((a, i) => (
                  <div key={i} className="fh-act-row">
                    <div className="fh-act-dot" style={{ background: a.type === "credit" ? "rgba(42,122,79,.13)" : "rgba(168,50,40,.1)", color: a.type === "credit" ? "#2A7A4F" : "#A83228" }}>
                      <a.icon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="fh-act-desc">{a.desc}</div>
                      <div className="fh-act-date">{a.date}</div>
                    </div>
                    <div className="fh-act-amt" style={{ color: a.type === "credit" ? "#2A7A4F" : "#A83228" }}>
                      {a.type === "credit" ? "+" : "−"} ₹{a.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="fh-panel">
              <div className="fh-panel-head">
                <div className="fh-ph-left">
                  <BarChart3 size={15} color="#fff" />
                  <p className="fh-ph-title">Expense Breakdown</p>
                </div>
              </div>
              <div className="fh-panel-body" style={{ paddingTop: 18 }}>
                {expenseBreakdown.map((e, i) => (
                  <div key={i} className="fh-exp-row">
                    <div className="fh-exp-top">
                      <div className="fh-exp-label">
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: e.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <e.icon size={14} color={e.color} />
                        </div>
                        {e.label}
                      </div>
                      <div className="fh-exp-pct">{e.pct}%</div>
                    </div>
                    <div className="fh-progress-track">
                      <div className="fh-progress-fill" style={{ width: `${e.pct}%`, background: `linear-gradient(90deg,${e.color},${e.color}88)` }} />
                    </div>
                  </div>
                ))}

                {/* Mini summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
                  {[
                    { lbl: "Total Revenue", val: "₹25,000", color: "#2A7A4F" },
                    { lbl: "Total Expense", val: "₹15,000", color: "#A83228" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: s.color + "10", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".6px" }}>{s.lbl}</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display',serif", marginTop: 3 }}>{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM SUMMARY STRIP ── */}
          <div className="fh-strip">
            {[
              { lbl: "Total Revenue", val: "₹25,000" },
              { lbl: "Total Expenses", val: "₹15,000" },
              { lbl: "Pending Fees", val: "₹5,000" },
              { lbl: "Net Balance", val: "₹10,000" },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <div className="fh-strip-item">
                  <div className="fh-strip-lbl">{s.lbl}</div>
                  <div className="fh-strip-val">{s.val}</div>
                </div>
                {i < arr.length - 1 && <div className="fh-strip-div" />}
              </React.Fragment>
            ))}
          </div>

        </div>
      </div>
    </PageLayout>
  );
}