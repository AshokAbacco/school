// client/src/admin/pages/Staff/index.jsx
// Stormy Morning palette — matches Dashboard.jsx design language exactly

import { useEffect, useState } from "react";
import {
  Users, FlaskConical, Home, Eye, Pencil, Trash2,
  Plus, RefreshCw, X, Phone, Mail, CalendarDays,
  Banknote, Building2, CreditCard, Hash, ShieldCheck,
  UserCircle2, ChevronRight, Search, UserX, AlertTriangle,
} from "lucide-react";
import { fetchStaff, deleteStaff } from "./api/api";
import StaffAdd from "./components/StaffAdd";
import BulkImportStaff from "./components/BulkImportStaff";

/* ── Design tokens — Stormy Morning (single source of truth) ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textMid: "#4A6880", textLight: "#6A89A7",
  success: "#3DA882", danger: "#D95C5C", warn: "#D4944A",
};

/* ── Shared tiny helpers ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

function SectionHead({ title, sub, IconComp, iconColor = C.slate }) {
  return (
    <div style={{ padding: "15px 20px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {IconComp && (
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.sky}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.sky}33` }}>
            <IconComp size={15} color={iconColor} strokeWidth={2} />
          </div>
        )}
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      {sub && (
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textLight, fontWeight: 600, background: `${C.sky}18`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.sky}33`, letterSpacing: "0.03em" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function Panel({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function Empty({ IconComp, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 10 }}>
      <div style={{ width: 50, height: 50, borderRadius: 16, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sky}33` }}>
        <IconComp size={22} color={C.sky} strokeWidth={1.5} />
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textLight, margin: 0 }}>{text}</p>
    </div>
  );
}

/* ── Stat card — matches Dashboard StatCard feel ── */
function StatCard({ IconComp, label, value, accent = C.sky, delay = 0, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="fade-up"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animationDelay: `${delay}ms`, background: C.white, borderRadius: 22,
        border: `1.5px solid ${C.borderLight}`, padding: "22px 20px 18px",
        display: "flex", flexDirection: "column", gap: 14, position: "relative", overflow: "hidden",
        boxShadow: hov ? `0 16px 48px rgba(56,73,89,0.13), 0 0 0 2px ${C.sky}44` : "0 2px 20px rgba(56,73,89,0.07)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.sky}, ${C.slate}, ${C.deep})`, borderRadius: "22px 22px 0 0", opacity: hov ? 1 : 0.6, transition: "opacity 0.3s" }} />
      {/* bg glow */}
      <div style={{ position: "absolute", right: -20, bottom: -20, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${C.mist}33, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.borderLight}` }}>
        <IconComp size={18} color={C.deep} strokeWidth={1.8} />
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Pulse w="50%" h={32} r={8} /><Pulse w="65%" h={11} r={6} /></div>
      ) : (
        <div>
          <p style={{ margin: 0, fontSize: 38, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-1.5px" }}>{value}</p>
          <p style={{ margin: "5px 0 0", fontSize: 11, color: C.textLight, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
        </div>
      )}
    </div>
  );
}

/* ── Group badge pill ── */
function GroupBadge({ group }) {
  const isB = group === "Group B";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", background: isB ? `${C.sky}18` : `${C.mist}55`, color: isB ? C.slate : C.deep, border: `1px solid ${isB ? C.sky + "44" : C.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isB ? C.sky : C.slate, flexShrink: 0 }} />
      {group}
    </span>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = { ACTIVE: { bg: "#e2f5ee", fg: "#236644", dot: C.success }, ON_LEAVE: { bg: "#fef3e2", fg: "#7a4a0e", dot: C.warn }, RESIGNED: { bg: `${C.mist}55`, fg: C.deep, dot: C.slate }, TERMINATED: { bg: "#fce8e8", fg: "#8b1c1c", dot: C.danger } };
  const s = map[status] ?? map.ACTIVE;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />
      {status?.replace("_", " ")}
    </span>
  );
}

/* ══════════════════════════════════════════
   MAIN — StaffList
══════════════════════════════════════════ */
export default function StaffList() {
  const [staff, setStaff]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editData, setEditData]   = useState(null);
  const [viewData, setViewData]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch]       = useState("");
  const [openImport, setOpenImport] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchStaff({});
      setStaff(res.data || []);
    } catch {
      alert("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit  = (s) => { setEditData(s); setShowAdd(true); };
  const handleClose = ()  => { setShowAdd(false); setEditData(null); };

  const handleDelete = async (s) => {
    if (!window.confirm(`Remove ${s.firstName} ${s.lastName || ""}?`)) return;
    setDeletingId(s.id);
    try { await deleteStaff(s.id); await load(); }
    catch (err) { alert(err.message || "Failed to delete"); }
    finally { setDeletingId(null); }
  };

  const groupB = staff.filter(s => s.groupType === "Group B");
  const groupC = staff.filter(s => s.groupType === "Group C");

  const tabFiltered =
    activeTab === "Group B" ? groupB :
    activeTab === "Group C" ? groupC : staff;

  const visible = search.trim()
    ? tabFiltered.filter(s =>
        `${s.firstName} ${s.lastName} ${s.role} ${s.email}`.toLowerCase().includes(search.toLowerCase()))
    : tabFiltered;

  const tabs = [
    { key: "All",     label: "All Staff",  count: staff.length },
    { key: "Group B", label: "Group B",    count: groupB.length },
    { key: "Group C", label: "Group C",    count: groupC.length },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .staff-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media (max-width:900px) { .staff-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:560px) { .staff-grid { grid-template-columns:1fr; } }
        .staff-table { width:100%; border-collapse:collapse; }
        .staff-table th { padding:11px 16px; text-align:left; font-size:11px; font-weight:700; color:${C.textLight}; text-transform:uppercase; letter-spacing:0.07em; background:${C.bg}; font-family:'Inter',sans-serif; border-bottom:1.5px solid ${C.borderLight}; white-space:nowrap; }
        .staff-table td { padding:13px 16px; font-size:13px; color:${C.text}; font-family:'Inter',sans-serif; border-bottom:1px solid ${C.borderLight}; }
        .staff-row:hover td { background:${C.bg}; }
        .staff-row { transition:background 0.12s; }
        .act-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid #DDE9F5; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; background:#EDF3FA; color:#6A89A7; }        @media (max-width:768px) {
          .hide-md { display:none !important; }
        }
        @media (max-width:540px) {
          .hide-sm { display:none !important; }
          .staff-table th, .staff-table td { padding:11px 10px; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${C.sky}18 0%, transparent 50%)` }}>

        {/* ══ HEADER ══ */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginBottom: 0 }}>
            <div style={{ width: 4, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                    Staff Management
                  </p>
                  <h1 style={{ margin: 0, fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.6px", lineHeight: 1.1 }}>
                    Non-Teaching{" "}
                    <span style={{ background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Staff
                    </span>
                  </h1>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                    Manage Group B &amp; C staff — roles, salary and login access
                  </p>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={load} style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, boxShadow: "0 2px 8px rgba(56,73,89,0.07)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.sky}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}>
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setOpenImport(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, color: C.textMid, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(56,73,89,0.07)", fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.sky; e.currentTarget.style.color = C.sky; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textMid; }}>
                    <Users size={15} /> Bulk Import
                  </button>
                  <button
                    onClick={() => { setEditData(null); setShowAdd(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px rgba(56,73,89,0.25)`, fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    <Plus size={15} /> Add Staff
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ STAT CARDS ══ */}
        <div className="staff-grid fade-up" style={{ marginBottom: 20, animationDelay: "60ms" }}>
          <StatCard IconComp={Users}       label="Total Staff" value={staff.length}  delay={0}   loading={loading} />
          <StatCard IconComp={FlaskConical} label="Group B"    value={groupB.length} delay={60}  loading={loading} />
          <StatCard IconComp={Home}         label="Group C"    value={groupC.length} delay={120} loading={loading} />
        </div>

        {/* ══ TABLE PANEL ══ */}
        <Panel style={{ animationDelay: "180ms" }} className="fade-up">
          <SectionHead title="All Staff" sub={`${visible.length} member${visible.length !== 1 ? "s" : ""}`} IconComp={Users} />

          {/* Tab + Search bar */}
          <div style={{ padding: "12px 18px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: C.white }}>
            {/* Tabs */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.bg, border: `1.5px solid ${C.borderLight}`, borderRadius: 12, padding: 3 }}>
              {tabs.map(({ key, label, count }) => {
                const active = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "'Inter', sans-serif", transition: "all 0.18s ease", background: active ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : "transparent", color: active ? C.white : C.textLight, boxShadow: active ? "0 2px 8px rgba(56,73,89,0.2)" : "none" }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${C.mist}55`; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                    {label}
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: active ? "rgba(255,255,255,0.2)" : `${C.sky}22`, color: active ? "#fff" : C.slate, fontWeight: 700 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div style={{ position: "relative", minWidth: 200, flex: "0 1 260px" }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight }} />
              <input
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif" }}
                placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
                onFocus={ev => ev.target.style.borderColor = C.sky}
                onBlur={ev => ev.target.style.borderColor = C.border}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Pulse w={34} h={34} r={99} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><Pulse w="40%" h={11} /><Pulse w="25%" h={9} /></div>
                  <Pulse w="12%" h={11} />
                  <Pulse w="15%" h={11} />
                  <Pulse w="10%" h={22} r={20} />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Empty IconComp={Users} text={search ? "No staff match your search" : "No staff found"} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th className="hide-sm">Group</th>
                    <th className="hide-md">Email</th>
                    <th className="hide-md">Phone</th>
                    <th className="hide-sm">Joining Date</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(s => (
                    <tr key={s.id} className="staff-row">
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, boxShadow: `0 3px 8px ${C.sky}44` }}>
                            {s.firstName?.[0]}{s.lastName?.[0] || ""}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: C.text }}>{s.firstName} {s.lastName}</p>
                            <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>{s.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: C.textMid, fontSize: 12 }}>{s.role}</td>
                      <td className="hide-sm"><GroupBadge group={s.groupType} /></td>
                      <td className="hide-md" style={{ color: C.textLight, fontSize: 12 }}>{s.email || <span style={{ color: C.border }}>—</span>}</td>
                      <td className="hide-md" style={{ color: C.textLight, fontSize: 12 }}>{s.phone || <span style={{ color: C.border }}>—</span>}</td>
                      <td className="hide-sm" style={{ color: C.textLight, fontSize: 12 }}>{s.joiningDate?.split("T")[0]}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <button className="act-btn" title="View" onClick={() => setViewData(s)}
                            onMouseEnter={e => { e.currentTarget.style.background = `${C.sky}22`; e.currentTarget.style.borderColor = C.sky; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.borderLight; }}>
                            <Eye size={14} color={C.slate} strokeWidth={2} />
                          </button>

                          <button className="act-btn" title="Edit" onClick={() => handleEdit(s)}
                            onMouseEnter={e => { e.currentTarget.style.background = `${C.mist}55`; e.currentTarget.style.borderColor = C.slate; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.borderLight; }}>
                            <Pencil size={14} color={C.slate} strokeWidth={2} />
                          </button>

                          <button className="act-btn" title="Delete" disabled={deletingId === s.id}
                            onClick={() => handleDelete(s)}
                            style={{ opacity: deletingId === s.id ? 0.45 : 1 }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fee8e8"; e.currentTarget.style.borderColor = C.danger; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.borderLight; }}>
                            {deletingId === s.id
                              ? <RefreshCw size={14} color={C.slate} strokeWidth={2} className="animate-spin" />
                              : <Trash2 size={14} color={C.danger} strokeWidth={2} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showAdd && <StaffAdd onClose={handleClose} onSuccess={load} editData={editData} />}

      {/* ── Bulk Import Modal ── */}
      {openImport && (
        <BulkImportStaff
          onClose={() => setOpenImport(false)}
          onSuccess={() => { setOpenImport(false); load(); }}
        />
      )}

      {/* ── View Detail Modal ── */}
      {viewData && <ViewModal staff={viewData} onClose={() => setViewData(null)} onEdit={s => { setViewData(null); handleEdit(s); }} />}
    </>
  );
}

/* ─────────────────────────────────────────
   View Modal — Stormy Morning
───────────────────────────────────────── */
function ViewModal({ staff: s, onClose, onEdit }) {
  const hasBank = s.bankName || s.bankAccountNo || s.ifscCode;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: C.white, borderRadius: 22, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.22)", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

        {/* Top gradient strip + avatar */}
        <div style={{ background: `linear-gradient(135deg, ${C.deep}, ${C.slate})`, padding: "22px 22px 36px", position: "relative", borderRadius: "22px 22px 0 0" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
            <X size={14} />
          </button>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800, fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
              {s.firstName?.[0]}{s.lastName?.[0] || ""}
            </div>
            <div style={{ paddingBottom: 2 }}>
              <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Inter', sans-serif" }}>{s.firstName} {s.lastName}</p>
              <p style={{ margin: "3px 0 8px", color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "'Inter', sans-serif" }}>{s.role}</p>
              <GroupBadge group={s.groupType} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          <InfoSection title="Contact Info">
            <InfoRow icon={<Mail size={13} color={C.sky} />}          label="Email"   value={s.email} />
            <InfoRow icon={<Phone size={13} color={C.sky} />}         label="Phone"   value={s.phone} />
            <InfoRow icon={<CalendarDays size={13} color={C.sky} />}  label="Joined"  value={s.joiningDate?.split("T")[0]} />
          </InfoSection>

          <InfoSection title="Salary">
            <InfoRow icon={<Banknote size={13} color={C.sky} />} label="Basic Salary" value={s.basicSalary ? `₹${Number(s.basicSalary).toLocaleString("en-IN")}` : null} />
          </InfoSection>

          {hasBank && (
            <InfoSection title="Bank Details">
              <InfoRow icon={<Building2 size={13} color={C.sky} />}  label="Bank"       value={s.bankName} />
              <InfoRow icon={<CreditCard size={13} color={C.sky} />} label="Account No" value={s.bankAccountNo} />
              <InfoRow icon={<Hash size={13} color={C.sky} />}       label="IFSC"       value={s.ifscCode} />
            </InfoSection>
          )}

          {s.user && (
            <InfoSection title="Login Access">
              <InfoRow
                icon={<ShieldCheck size={13} color={C.sky} />}
                label="Status"
                value={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.user.isActive ? "#e2f5ee" : `${C.mist}55`, color: s.user.isActive ? "#236644" : C.textMid }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.user.isActive ? C.success : C.slate }} />
                    {s.user.isActive ? "Active" : "Inactive"}
                  </span>
                }
              />
              <InfoRow icon={<UserCircle2 size={13} color={C.sky} />} label="Login Email" value={s.user.email} />
            </InfoSection>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 22px", borderTop: `1.5px solid ${C.borderLight}`, background: C.bg, borderRadius: "0 0 22px 22px" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 11, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 13, color: C.textMid, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
            Close
          </button>
          <button onClick={() => onEdit(s)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Pencil size={13} /> Edit Staff
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Inter', sans-serif" }}>{title}</p>
      <div style={{ background: C.bg, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: "2px 14px", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.borderLight}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon}
        <span style={{ fontSize: 12, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif" }}>
        {value || <span style={{ color: C.border, fontWeight: 400, fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}