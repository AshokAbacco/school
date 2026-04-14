// client/src/superAdmin/pages/schoolAdmins/SchoolAdmins.jsx
import React, { useState, useEffect } from "react";
import {
  Plus, Search, Edit, Trash2, UserCog,
  ShieldCheck, ShieldX, Mail, RefreshCw, Building2,
  X, AlertTriangle, Loader2,
} from "lucide-react";
import AddSchoolAdminModal from "./AddScholAdmin";
import { getSchoolAdmins, deleteSchoolAdmin, updateSchoolAdmin } from "./components/schoolAdminApi";

/* ── Design tokens — Stormy Morning ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textMid: "#4A6880", textLight: "#6A89A7",
  success: "#3DA882", danger: "#D95C5C",
};

const SCHOOL_TYPE_LABELS = {
  PRIMARY: "Primary", UPPER_PRIMARY: "Upper Primary",
  HIGH_SCHOOL: "High School", PUC: "PUC",
  DEGREE: "Degree", POSTGRADUATE: "Postgraduate", OTHER: "Other",
};

/* ── Status Badge ── */
const StatusBadge = ({ isActive }) => {
  const s = isActive
    ? { bg: "#e2f5ee", fg: "#236644", dot: C.success, label: "Active" }
    : { bg: "#fce8e8", fg: "#8b1c1c", dot: C.danger,  label: "Inactive" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", background: s.bg, color: s.fg, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

/* ── Stat Card ── */
function StatCard({ IconComp, label, value, loading, delay = 0 }) {
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
      {/* Top accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.sky}, ${C.slate}, ${C.deep})`, borderRadius: "22px 22px 0 0", opacity: hov ? 1 : 0.6, transition: "opacity 0.3s" }} />
      {/* Bg glow */}
      <div style={{ position: "absolute", right: -20, bottom: -20, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${C.mist}33, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.borderLight}` }}>
        <IconComp size={18} color={C.deep} strokeWidth={1.8} />
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="animate-pulse" style={{ width: "50%", height: 32, borderRadius: 8, background: `${C.mist}55` }} />
          <div className="animate-pulse" style={{ width: "65%", height: 11, borderRadius: 6, background: `${C.mist}55` }} />
        </div>
      ) : (
        <div>
          <p style={{ margin: 0, fontSize: 38, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-1.5px" }}>{value}</p>
          <p style={{ margin: "5px 0 0", fontSize: 11, color: C.textLight, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
        </div>
      )}
    </div>
  );
}

/* ── Panel ── */
function Panel({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

/* ── Deactivate Confirm Dialog ──────────────────────────────────────────────── */
function DeactivateDialog({ admin, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onCancel}
      />
      <div
        style={{
          position: "fixed", zIndex: 50,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 420, maxWidth: "92vw",
          background: C.white, borderRadius: 22,
          boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
          animation: "fadeUp 0.18s ease",
          fontFamily: "'Inter', sans-serif",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "28px 24px 24px" }}>
          {/* Icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg, #fef2f2, #fee2e2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={26} color="#D95C5C" />
            </div>
          </div>

          {/* Text */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: C.text, textAlign: "center" }}>
            Deactivate Admin?
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: C.textLight, textAlign: "center" }}>
            You're about to deactivate
          </p>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: C.text, textAlign: "center" }}>
            {admin.name}
          </p>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: C.textLight, textAlign: "center" }}>
            {admin.email}
          </p>
          <div style={{ padding: "10px 16px", borderRadius: 12, fontSize: 12, textAlign: "center", marginBottom: 20, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
            The admin will lose access to their school dashboard immediately.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, background: C.bg, color: C.textMid, border: `1.5px solid ${C.borderLight}`, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: "linear-gradient(135deg, #D95C5C, #b91c1c)",
                color: "#fff", border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Deactivating…</> : <><ShieldX size={14} /> Deactivate</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function SchoolAdmins() {
  const [admins, setAdmins]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");

  // Modal: null | { mode: "add" } | { mode: "edit", admin: {...} }
  const [modal, setModal] = useState(null);

  // Deactivate dialog: null | { admin: {...} }
  const [deactivateDialog, setDeactivateDialog]   = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSchoolAdmins();
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreated = (newAdmin) => {
    setAdmins((prev) => [newAdmin, ...prev]);
  };

  const handleUpdated = (updatedAdmin) => {
    setAdmins((prev) =>
      prev.map((a) => {
        if (a.id !== updatedAdmin.id) return a;
        // Deep-merge school so existing school.type is never lost
        return {
          ...a,
          ...updatedAdmin,
          school: { ...a.school, ...(updatedAdmin.school || {}) },
        };
      })
    );
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateDialog) return;
    setDeactivateLoading(true);
    try {
      await deleteSchoolAdmin(deactivateDialog.admin.id);
      setAdmins((prev) =>
        prev.map((a) => a.id === deactivateDialog.admin.id ? { ...a, isActive: false } : a)
      );
      setDeactivateDialog(null);
    } catch {
      // Keep dialog open on error — user can retry
    } finally {
      setDeactivateLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    (a.school?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total:    admins.length,
    active:   admins.filter((a) => a.isActive).length,
    inactive: admins.filter((a) => !a.isActive).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .admins-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media (max-width:900px) { .admins-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:560px) { .admins-grid { grid-template-columns:1fr; } }
        .admin-table { width:100%; border-collapse:collapse; }
        .admin-table th { padding:11px 16px; text-align:left; font-size:11px; font-weight:700; color:${C.textLight}; text-transform:uppercase; letter-spacing:0.07em; background:${C.bg}; font-family:'Inter',sans-serif; border-bottom:1.5px solid ${C.borderLight}; white-space:nowrap; }
        .admin-table th.center { text-align:center; }
        .admin-table td { padding:13px 16px; font-size:13px; color:${C.text}; font-family:'Inter',sans-serif; border-bottom:1px solid ${C.borderLight}; }
        .admin-row:hover td { background:${C.bg}; }
        .admin-row { transition:background 0.12s; }
        .act-btn { width:32px; height:32px; border-radius:9px; border:1.5px solid ${C.borderLight}; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s; background:${C.bg}; }
        @media (max-width:768px) { .hide-md { display:none !important; } }
        @media (max-width:540px) { .hide-sm { display:none !important; } .admin-table th, .admin-table td { padding:11px 10px; } }
      `}</style>

      <div style={{
        minHeight: "100vh", background: C.bg, padding: "28px 30px",
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${C.sky}18 0%, transparent 50%)`,
      }}>

        {/* ══ HEADER ══ */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
            <div style={{ width: 4, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                    Platform Administration
                  </p>
                  <h1 style={{ margin: 0, fontSize: "clamp(20px,3vw,28px)", fontWeight: 900, color: C.text, letterSpacing: "-0.6px", lineHeight: 1.1 }}>
                    School{" "}
                    <span style={{ background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Admins
                    </span>
                  </h1>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                    Manage admin accounts across all schools
                  </p>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={fetchAdmins}
                    style={{ width: 38, height: 38, borderRadius: 12, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, boxShadow: "0 2px 8px rgba(56,73,89,0.07)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.sky}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}
                    title="Refresh"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={() => setModal({ mode: "add" })}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px rgba(56,73,89,0.25)`, fontFamily: "'Inter', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <Plus size={15} /> Add Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ STAT CARDS ══ */}
        <div className="admins-grid fade-up" style={{ marginBottom: 20, animationDelay: "60ms" }}>
          <StatCard IconComp={UserCog}     label="Total Admins" value={totals.total}    delay={0}   loading={loading} />
          <StatCard IconComp={ShieldCheck} label="Active"        value={totals.active}   delay={60}  loading={loading} />
          <StatCard IconComp={ShieldX}     label="Inactive"      value={totals.inactive} delay={120} loading={loading} />
        </div>

        {/* ══ TABLE PANEL ══ */}
        <Panel>
          {/* Panel header + search */}
          <div style={{ padding: "15px 20px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.sky}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.sky}33` }}>
                <UserCog size={15} color={C.slate} strokeWidth={2} />
              </div>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.text }}>All Admins</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textLight, fontWeight: 600, background: `${C.sky}18`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.sky}33`, letterSpacing: "0.03em" }}>
                {filtered.length} admin{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Search */}
            <div style={{ position: "relative", minWidth: 200, flex: "0 1 260px" }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textLight }} />
              <input
                type="text"
                placeholder="Search by name, email or school…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={ev => ev.target.style.borderColor = C.sky}
                onBlur={ev => ev.target.style.borderColor = C.border}
                style={{ width: "100%", paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, fontSize: 13, color: C.text, outline: "none", fontFamily: "'Inter', sans-serif" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textLight, display: "flex", alignItems: "center" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="animate-pulse" style={{ width: 34, height: 34, borderRadius: 8, background: `${C.mist}55` }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div className="animate-pulse" style={{ width: "40%", height: 11, borderRadius: 6, background: `${C.mist}55` }} />
                    <div className="animate-pulse" style={{ width: "25%", height: 9, borderRadius: 6, background: `${C.mist}55` }} />
                  </div>
                  <div className="animate-pulse" style={{ width: "12%", height: 11, borderRadius: 6, background: `${C.mist}55` }} />
                  <div className="animate-pulse" style={{ width: "10%", height: 22, borderRadius: 20, background: `${C.mist}55` }} />
                </div>
              ))}
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div style={{ margin: 20, padding: "14px 18px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'Inter', sans-serif" }}>
              <span>{error}</span>
              <button onClick={fetchAdmins} style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
            </div>
          )}

          {/* ── Desktop Table ── */}
          {!loading && !error && (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th className="center">Email</th>
                    <th className="center">School</th>
                    <th className="center hide-sm">Type</th>
                    <th className="center">Status</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((admin, i) => (
                    <tr
                      key={admin.id}
                      className="admin-row"
                      style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.borderLight}` }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.deep }}>
                              {admin.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{admin.name}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: C.textMid, fontSize: 12 }}>
                          <Mail size={12} color={C.sky} />
                          {admin.email}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: C.textMid, fontSize: 12 }}>
                          <Building2 size={12} color={C.sky} />
                          {admin.school?.name || "—"}
                        </span>
                      </td>
                      <td className="hide-sm" style={{ textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", background: `${C.mist}55`, color: C.deep, border: `1px solid ${C.border}` }}>
                          {SCHOOL_TYPE_LABELS[admin.school?.type] || admin.school?.type || "—"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}><StatusBadge isActive={admin.isActive} /></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <button
                            className="act-btn"
                            onClick={() => setModal({ mode: "edit", admin })}
                            title="Edit admin"
                            onMouseEnter={e => { e.currentTarget.style.background = `${C.mist}55`; e.currentTarget.style.borderColor = C.slate; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.borderLight; }}
                          >
                            <Edit size={14} color={C.slate} strokeWidth={2} />
                          </button>
                          <button
                            className="act-btn"
                            onClick={() => setDeactivateDialog({ admin })}
                            title={admin.isActive ? "Deactivate admin" : "Already inactive"}
                            disabled={!admin.isActive}
                            style={{ opacity: admin.isActive ? 1 : 0.35, cursor: admin.isActive ? "pointer" : "not-allowed" }}
                            onMouseEnter={e => { if (admin.isActive) { e.currentTarget.style.background = "#fee8e8"; e.currentTarget.style.borderColor = C.danger; } }}
                            onMouseLeave={e => { if (admin.isActive) { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.borderLight; } }}
                          >
                            <Trash2 size={14} color={admin.isActive ? C.danger : C.textLight} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="6">
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", gap: 10 }}>
                          <div style={{ width: 50, height: 50, borderRadius: 16, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sky}33` }}>
                            <UserCog size={22} color={C.sky} strokeWidth={1.5} />
                          </div>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textLight, margin: 0 }}>
                            {search ? `No admins matching "${search}".` : "No school admins created yet."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* ── Footer ── */}
        {!loading && !error && (
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 12, textAlign: "right", fontFamily: "'Inter', sans-serif" }}>
            Showing {filtered.length} of {admins.length} admins
          </p>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal?.mode === "add" && (
        <AddSchoolAdminModal
          onClose={() => setModal(null)}
          onSuccess={handleCreated}
        />
      )}
      {modal?.mode === "edit" && (
        <AddSchoolAdminModal
          admin={modal.admin}
          onClose={() => setModal(null)}
          onSuccess={handleUpdated}
        />
      )}

      {/* ── Deactivate Dialog ── */}
      {deactivateDialog && (
        <DeactivateDialog
          admin={deactivateDialog.admin}
          loading={deactivateLoading}
          onConfirm={handleDeactivateConfirm}
          onCancel={() => setDeactivateDialog(null)}
        />
      )}
    </>
  );
}