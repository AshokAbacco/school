// client/src/student/pages/Certificates/CertificatesPage.jsx
//
// PDF STRATEGY: We render the certificate at FULL SIZE (794×562) inside the
// modal, then use html2canvas to capture THAT visible element. The scaled
// preview the user sees is a CSS transform on a wrapper — the actual DOM
// element is always full-size and in the viewport.
//
// Install: npm install html2canvas jspdf

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CertificateDesign } from "./CertificateDesigns";
import { getToken } from "../../../auth/storage.js";
import PageLayout from "../../components/PageLayout";
import { Medal, X, Search, Loader2, AlertCircle, Download, FileText } from "lucide-react";

// ─── Design tokens ──────────────────────────────────────────────
const C = {
  dark:  "#384959",
  mid:   "#6A89A7",
  light: "#88BDF2",
  pale:  "#BDDDFC",
  bg:    "#EDF3FA",
  white: "#ffffff",
  border:"rgba(136,189,242,0.30)",
};

const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/certificates`;

// ─── Filter constants (UNCHANGED) ──────────────────────────────
const SOURCES    = ["All", "Teacher Award", "Activity Award", "Achievement"];
const CATEGORIES = ["All", "Academic", "Attendance", "Sports", "Cultural", "Discipline", "Leadership", "Special"];
const SOURCE_MAP = { "Teacher Award": "MANUAL", "Activity Award": "EVENT", "Achievement": "CALCULATED" };
const CAT_MAP    = {
  Academic: "ACADEMIC", Attendance: "ATTENDANCE", Sports: "SPORTS",
  Cultural: "CULTURAL", Discipline: "DISCIPLINE", Leadership: "LEADERSHIP", Special: "SPECIAL",
};
const CAT_STYLE = {
  ACADEMIC:   { bg: "#EFF6FF", color: "#1D4ED8", icon: "🎓" },
  ATTENDANCE: { bg: "#F0FDF4", color: "#16A34A", icon: "✅" },
  SPORTS:     { bg: "#FFF7ED", color: "#EA580C", icon: "🏆" },
  CULTURAL:   { bg: "#FDF4FF", color: "#9333EA", icon: "🎭" },
  DISCIPLINE: { bg: "#F8FAFC", color: "#475569", icon: "🛡️" },
  LEADERSHIP: { bg: "#FFFBEB", color: "#B45309", icon: "👑" },
  SPECIAL:    { bg: "#F5F3FF", color: "#7C3AED", icon: "⭐" },
};
const SRC_STYLE = {
  MANUAL:     { bg: "#F0FDF4", color: "#15803D", label: "Teacher Award",  icon: "👨‍🏫" },
  EVENT:      { bg: "#FFF7ED", color: "#C2410C", label: "Activity Award", icon: "🏅" },
  CALCULATED: { bg: "#EFF6FF", color: "#1D4ED8", label: "Achievement",    icon: "⭐" },
};
const RESULT_LABEL = {
  WINNER: "🥇 1st Place", RUNNER_UP: "🥈 2nd Place", THIRD_PLACE: "🥉 3rd Place",
  PARTICIPATED: "🎖️ Participated", SPECIAL_AWARD: "🏅 Special",
};

// ─── Font + scoped CSS ─────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  .cert-root, .cert-root * { font-family: 'Inter', sans-serif !important; box-sizing: border-box; }

  @keyframes cert-spin { to { transform: rotate(360deg); } }
  @keyframes cert-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.45; } }

  .cert-sk { animation: cert-pulse 1.5s ease-in-out infinite; background: ${C.pale}; border-radius: 7px; }

  .cert-card {
    transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;
    cursor: pointer;
  }
  .cert-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(56,73,89,0.12) !important;
    border-color: rgba(136,189,242,0.55) !important;
  }

  .cert-pill {
    transition: background 0.13s, color 0.13s, border-color 0.13s;
    cursor: pointer; border: none;
  }
  .cert-pill:hover { opacity: 0.82; }

  .cert-btn {
    transition: opacity 0.13s;
    cursor: pointer; border: none;
    font-family: 'Inter', sans-serif !important;
  }
  .cert-btn:hover { opacity: 0.85; }
  .cert-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Responsive grid */
  .cert-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 1100px) { .cert-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 620px)  { .cert-grid { grid-template-columns: 1fr; gap: 12px; } }

  .cert-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  @media (max-width: 900px)  { .cert-stat-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px)  { .cert-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

  .cert-page { padding: 24px 28px; }
  @media (max-width: 768px)  { .cert-page { padding: 16px; } }
  @media (max-width: 480px)  { .cert-page { padding: 12px 10px; } }

  .cert-filters-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .cert-search {
    display: flex; align-items: center; gap: 8px;
    background: ${C.white}; border: 1.5px solid ${C.border};
    border-radius: 10px; padding: 0 13px; height: 38px;
    width: 100%;
  }
  .cert-search input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: ${C.dark}; width: 100%;
    font-family: 'Inter', sans-serif !important;
  }
  .cert-search input::placeholder { color: ${C.mid}; }

  .cert-line-clamp2 {
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
`;

// ─── Skeleton ──────────────────────────────────────────────────
const Sk = ({ h = 14, w = "100%", r = 6 }) => (
  <div className="cert-sk" style={{ height: h, width: w, borderRadius: r }} />
);

// ─── Filter Pill — matches app tab/pill style ──────────────────
function Pill({ label, active, onClick }) {
  return (
    <button
      className="cert-pill"
      onClick={onClick}
      style={{
        padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600,
        background: active ? C.dark : C.white,
        color:      active ? C.white : C.mid,
        border:     `1.5px solid ${active ? C.dark : C.border}`,
      }}
    >
      {label}
    </button>
  );
}

// ─── Stat Card — matches app screenshots exactly ───────────────
function StatCard({ icon, label, value, color, loading }) {
  return (
    <div style={{
      background: C.white, borderRadius: 12, padding: "16px 18px",
      borderLeft: `4px solid ${color}`,
      border: `1px solid ${C.border}`, borderLeftWidth: 4, borderLeftColor: color,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.mid, margin: 0 }}>
          {label}
        </p>
        <span style={{ fontSize: 20, opacity: 0.22, lineHeight: 1 }}>{icon}</span>
      </div>
      <div style={{ marginTop: 10 }}>
        {loading
          ? <><Sk h={32} w="55%" /><div style={{ marginTop: 7 }}><Sk h={11} w="40%" /></div></>
          : <p style={{ fontSize: 32, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>{value}</p>
        }
      </div>
    </div>
  );
}

// ─── Cert Card — redesigned to match app card style ────────────
function CertCard({ cert, onView }) {
  const cat = CAT_STYLE[cert.category] ?? { bg: "#F3F4F6", color: "#6B7280", icon: "🏅" };
  const src = SRC_STYLE[cert.source]   ?? { bg: "#F3F4F6", color: "#6B7280", label: cert.source, icon: "📄" };

  return (
    <div
      className="cert-card"
      onClick={() => onView(cert)}
      style={{
        background: C.white, borderRadius: 12,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Colored top bar — same as activity cards */}
      <div style={{ height: 4, background: cat.color }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
            background: cat.bg, color: cat.color,
          }}>
            {cat.icon} {cert.category?.charAt(0) + cert.category?.slice(1).toLowerCase()}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
            background: src.bg, color: src.color,
          }}>
            {src.icon} {src.label}
          </span>
          {cert.resultType && cert.resultType !== "PARTICIPATED" && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
              background: "#FEF9C3", color: "#92400E",
            }}>
              {RESULT_LABEL[cert.resultType] ?? cert.resultType}
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{ fontSize: 14, fontWeight: 800, color: C.dark, margin: "0 0 5px", lineHeight: 1.3 }}>
          {cert.title}
        </p>

        {/* Description */}
        {cert.description && (
          <p className="cert-line-clamp2" style={{ fontSize: 12, color: C.mid, margin: "0 0 7px", lineHeight: 1.5 }}>
            {cert.description}
          </p>
        )}

        {/* Event name */}
        {cert.eventName && (
          <p style={{ fontSize: 11, color: C.mid, margin: "0 0 5px" }}>📅 {cert.eventName}</p>
        )}

        {/* Date */}
        <p style={{ fontSize: 11, color: C.mid, margin: "0 0 12px" }}>
          🗓️ {new Date(cert.issuedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: "0 0 12px" }} />

        {/* CTA */}
        <button
          className="cert-btn"
          onClick={e => { e.stopPropagation(); onView(cert); }}
          style={{
            width: "100%", padding: "8px 0", borderRadius: 9,
            background: C.dark, color: C.white,
            fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <FileText size={12} /> View Certificate
        </button>
      </div>
    </div>
  );
}

// ─── Certificate Modal (ALL LOGIC UNCHANGED) ───────────────────
function CertificateModal({ selected, student, school, onClose }) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handlePrint = useCallback(() => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  }, []);

  const scale = Math.min(1, (Math.min(window.innerWidth * 0.88, 820)) / 794);

  return (
    <>
      {/* Full-size cert for printing */}
      <div id="cert-printable" style={{
        position: "fixed", top: 0, left: 0,
        width: 794, height: 562,
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}>
        <CertificateDesign cert={selected} student={student} school={school} />
      </div>

      {/* Modal overlay */}
      <div
        className="cert-modal-overlay"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(20,28,40,0.88)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px", overflowY: "auto",
        }}
        onClick={onClose}
      >
        <div
          style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <button onClick={onClose} style={{
            position: "absolute", top: -16, right: -16, zIndex: 10,
            width: 36, height: 36, borderRadius: "50%", background: C.white,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}>
            <X size={16} color={C.dark} />
          </button>

          {/* Visual preview */}
          <div style={{
            width: 794 * scale, height: 562 * scale,
            overflow: "hidden", borderRadius: 8,
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)", flexShrink: 0,
          }}>
            <div style={{ width: 794, height: 562, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
              <CertificateDesign cert={selected} student={student} school={school} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={handlePrint} disabled={printing} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 24px", borderRadius: 12,
              background: C.white, color: C.dark, border: "none",
              cursor: printing ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)", opacity: printing ? 0.7 : 1,
            }}>
              {printing
                ? <><Loader2 size={15} style={{ animation: "cert-spin 1s linear infinite" }} /> Preparing…</>
                : <><Download size={15} /> Download PDF</>}
            </button>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 12,
              background: "rgba(255,255,255,0.08)", color: C.pale,
              border: "1.5px solid rgba(255,255,255,0.15)",
              cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700,
            }}>
              Close
            </button>
          </div>

          <p style={{ fontSize: 11, color: "rgba(189,221,252,0.55)", textAlign: "center", maxWidth: 420, fontFamily: "'Inter', sans-serif" }}>
            In the print dialog → set <strong style={{ color: C.pale }}>Destination: Save as PDF</strong> → enable <strong style={{ color: C.pale }}>Background graphics</strong> → Save
          </p>
        </div>
      </div>

      <style>{`
        @keyframes cert-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        @media print {
          * { visibility: hidden !important; }
          #cert-printable, #cert-printable * { visibility: visible !important; }
          #cert-printable {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 794px !important; height: 562px !important;
            overflow: visible !important; z-index: 99999 !important; transform: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page { size: 794px 562px; margin: 0mm; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function CertificatesPage() {
  const [pageData,   setPageData]  = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);
  const [srcFilter,  setSrc]       = useState("All");
  const [catFilter,  setCat]       = useState("All");
  const [search,     setSearch]    = useState("");
  const [selected,   setSelected]  = useState(null);

  // ── Data fetching (UNCHANGED) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_BASE, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        if (!cancelled) setPageData(json.data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived (UNCHANGED) ───────────────────────────────────
  const certs    = pageData?.certificates ?? [];
  const filtered = certs.filter(c => {
    const srcOk  = srcFilter === "All" || c.source   === SOURCE_MAP[srcFilter];
    const catOk  = catFilter === "All" || c.category === CAT_MAP[catFilter];
    const srchOk = !search.trim()
      || c.title?.toLowerCase().includes(search.toLowerCase())
      || c.description?.toLowerCase().includes(search.toLowerCase())
      || c.eventName?.toLowerCase().includes(search.toLowerCase());
    return srcOk && catOk && srchOk;
  });

  const stats   = pageData?.stats   ?? {};
  const student = pageData?.student ?? {};
  const school  = pageData?.school  ?? {};

  return (
    <PageLayout>
      <style>{STYLE}</style>

      <div className="cert-root cert-page" style={{ minHeight: "100vh", background: C.bg }}>

        {/* ── Page title — matches Marks & Gallery screenshots ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12, marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            {/* Left accent bar */}
            <div style={{ width: 4, height: 48, background: C.dark, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.dark, margin: 0, lineHeight: 1.1 }}>
                My Certificates
              </h1>
              <p style={{ fontSize: 12, color: C.mid, margin: "4px 0 0", fontWeight: 500 }}>
                {loading ? "Loading…" : (
                  <>
                    {student.firstName} {student.lastName}
                    {student.classSection ? ` · ${student.classSection}` : ""}
                    {student.academicYear  ? ` · ${student.academicYear}`  : ""}
                  </>
                )}
              </p>
            </div>
          </div>
          {loading && (
            <Loader2 size={20} color={C.mid} style={{ animation: "cert-spin 0.7s linear infinite", marginTop: 6 }} />
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: "#fef2f2", border: "1.5px solid #fca5a5",
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 18,
          }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="cert-stat-grid">
          <StatCard icon="🏅" label="Total"           value={stats.total      ?? 0} color={C.light}  loading={loading} />
          <StatCard icon="👨‍🏫" label="Teacher Awards"  value={stats.manual     ?? 0} color="#0EA5E9" loading={loading} />
          <StatCard icon="🏆" label="Activity Awards"  value={stats.event      ?? 0} color="#F59E0B" loading={loading} />
          <StatCard icon="⭐" label="Achievements"     value={stats.calculated ?? 0} color="#a855f7" loading={loading} />
        </div>

        {/* ── Filters panel — white card matching app style ── */}
        <div style={{
          background: C.white, borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: "16px 18px",
          marginBottom: 18,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Search */}
          <div className="cert-search">
            <Search size={13} color={C.mid} style={{ flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search certificates…"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
                <X size={13} color={C.mid} />
              </button>
            )}
          </div>

          {/* Source pills */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mid, margin: "0 0 7px" }}>
              Source
            </p>
            <div className="cert-filters-row">
              {SOURCES.map(s => (
                <Pill key={s} label={s} active={srcFilter === s} onClick={() => setSrc(s)} />
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.mid, margin: "0 0 7px" }}>
              Category
            </p>
            <div className="cert-filters-row">
              {CATEGORIES.map(c => (
                <Pill key={c} label={c} active={catFilter === c} onClick={() => setCat(c)} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Result count ── */}
        {!loading && !error && (
          <p style={{ fontSize: 12, fontWeight: 600, color: C.mid, margin: "0 0 14px" }}>
            Showing {filtered.length} of {certs.length} certificate{certs.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Certificate grid ── */}
        {loading ? (
          <div className="cert-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                background: C.white, borderRadius: 12,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}>
                <div className="cert-sk" style={{ height: 4, borderRadius: 0 }} />
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Sk h={20} w={80} r={20} /><Sk h={20} w={70} r={20} />
                  </div>
                  <Sk h={16} w="75%" />
                  <Sk h={11} w="55%" />
                  <Sk h={11} w="40%" />
                  <div style={{ height: 1, background: C.border }} />
                  <Sk h={34} r={9} />
                </div>
              </div>
            ))}
          </div>

        ) : !error && filtered.length === 0 ? (
          /* Empty state — matches "Results Not Published Yet" style */
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
              <Medal size={22} color={C.mid} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>
              No Certificates Found
            </p>
            <p style={{ fontSize: 12, color: C.mid, margin: 0 }}>
              {search || srcFilter !== "All" || catFilter !== "All"
                ? "Try adjusting your filters or search term."
                : "Your certificates will appear here once issued."}
            </p>
            {/* "What to expect" section — mirrors Marks page */}
            {certs.length === 0 && !search && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 auto 14px", maxWidth: 260 }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.mid, margin: 0 }}>
                    What to expect
                  </p>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {[
                    { icon: "👨‍🏫", label: "Teacher Awards" },
                    { icon: "🏆", label: "Activity Awards" },
                    { icon: "⭐", label: "Achievements" },
                    { icon: "📄", label: "PDF Download" },
                  ].map(({ icon, label }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 14px", borderRadius: 10,
                      border: `1px solid ${C.border}`, background: C.bg,
                      fontSize: 12, color: C.mid, fontWeight: 500,
                    }}>
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : !error ? (
          <div className="cert-grid">
            {filtered.map(cert => (
              <CertCard key={cert.id} cert={cert} onView={setSelected} />
            ))}
          </div>
        ) : null}

      </div>

      {/* ── Modal (ALL LOGIC UNCHANGED) ── */}
      {selected && (
        <CertificateModal
          selected={selected}
          student={student}
          school={school}
          onClose={() => setSelected(null)}
        />
      )}
    </PageLayout>
  );
}