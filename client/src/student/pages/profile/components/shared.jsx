// client/src/student/pages/profile/components/shared.jsx
import React from "react";
import { Loader2, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

// ─── Stormy Morning Palette ───────────────────────────────────────────────────
export const C = {
  dark:   "#384959",
  mid:    "#6A89A7",
  light:  "#88BDF2",
  pale:   "#BDDDFC",
  bg:     "#EDF3FA",
  white:  "#ffffff",
  border: "rgba(136,189,242,0.28)",
  glass:  "rgba(255,255,255,0.82)",
};

export const font = { fontFamily: "'Inter', sans-serif" };

// ─── Global CSS (inject once from profile.jsx) ────────────────────────────────
export const PROFILE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Sora:wght@700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.95); }      to { opacity:1; transform:scale(1); } }
  @keyframes spin    { from { transform:rotate(0deg); }                 to { transform:rotate(360deg); } }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.pale}; border-radius: 99px; }

  .pf-page {
    min-height: 100vh;
    background: ${C.bg};
    font-family: 'Inter', sans-serif;
    background-image:
      radial-gradient(ellipse 70% 50% at 5% 0%,   rgba(136,189,242,0.20) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 95% 100%, rgba(189,221,252,0.14) 0%, transparent 50%);
    padding: 14px 12px 48px;
    padding-left:  max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
    padding-bottom: max(48px, env(safe-area-inset-bottom));
  }
  @media (min-width: 480px)  { .pf-page { padding: 18px 18px 52px; } }
  @media (min-width: 768px)  { .pf-page { padding: 22px 26px 56px; } }
  @media (min-width: 1024px) { .pf-page { padding: 28px 32px 60px; } }

  /* Glass card */
  .pf-card {
    background: linear-gradient(150deg, rgba(255,255,255,0.90) 0%, rgba(237,243,250,0.78) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1.5px solid rgba(136,189,242,0.26);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 2px 18px rgba(56,73,89,0.08);
  }

  /* Info card hover */
  .pf-info-card {
    background: rgba(248,251,255,0.95);
    border: 1.5px solid ${C.pale};
    border-radius: 14px;
    padding: 11px 13px;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
  }
  .pf-info-card:hover {
    border-color: rgba(136,189,242,0.55);
    box-shadow: 0 4px 14px rgba(136,189,242,0.14);
    transform: translateY(-1px);
  }
  @media (max-width: 767px) { .pf-info-card:hover { transform: none; } }

  /* Skeleton shimmer */
  .pf-sk {
    background: linear-gradient(90deg,
      rgba(189,221,252,0.28) 25%,
      rgba(189,221,252,0.50) 50%,
      rgba(189,221,252,0.28) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }

  /* Tab button */
  .pf-tab {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 15px; border-radius: 13px; border: none;
    font-family: 'Inter', sans-serif;
    font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.16s; white-space: nowrap;
    flex-shrink: 0;
  }
  .pf-tab.active {
    background: ${C.dark}; color: ${C.white};
    box-shadow: 0 3px 10px rgba(56,73,89,0.26);
  }
  .pf-tab:not(.active) {
    background: transparent; color: ${C.mid};
  }
  .pf-tab:not(.active):hover { background: rgba(136,189,242,0.13); color: ${C.dark}; }

  /* Section heading */
  .pf-section-heading {
    display: flex; align-items: center; gap: 8px;
    font-size: 14px; font-weight: 800; color: ${C.dark};
    border-bottom: 2px solid rgba(136,189,242,0.30);
    padding-bottom: 9px; margin-bottom: 14px;
    font-family: 'Inter', sans-serif;
  }

  /* Info grid - responsive via CSS grid */
  .pf-info-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 480px)  { .pf-info-grid { grid-template-columns: repeat(2, 1fr); gap: 9px; } }
  @media (min-width: 1024px) { .pf-info-grid { gap: 10px; } }

  /* Main layout: sidebar + content */
  .pf-layout {
    display: grid;
    grid-template-columns: 1fr;
    border-radius: 18px;
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .pf-layout { grid-template-columns: 230px 1fr; }
  }
  @media (min-width: 1024px) {
    .pf-layout { grid-template-columns: 268px 1fr; }
  }

  /* Sidebar scroll area */
  .pf-sidebar {
    border-bottom: 1.5px solid ${C.pale};
    padding: 20px 18px;
    font-family: 'Inter', sans-serif;
  }
  @media (min-width: 768px) {
    .pf-sidebar {
      border-bottom: none;
      border-right: 1.5px solid ${C.pale};
      padding: 26px 20px;
      overflow-y: auto;
      max-height: calc(100vh - 160px);
    }
  }

  /* Content area */
  .pf-content {
    padding: 16px;
    overflow-y: auto;
  }
  @media (min-width: 480px)  { .pf-content { padding: 20px; } }
  @media (min-width: 768px)  { .pf-content { padding: 24px; max-height: calc(100vh - 160px); } }
  @media (min-width: 1024px) { .pf-content { padding: 28px; } }

  /* Health / doc grid */
  .pf-health-grid {
    display: grid; gap: 8px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 480px)  { .pf-health-grid { grid-template-columns: repeat(2, 1fr); gap: 9px; } }
  @media (min-width: 1024px) { .pf-health-grid { gap: 10px; } }

  .pf-doc-grid {
    display: grid; gap: 9px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 480px)  { .pf-doc-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1200px) { .pf-doc-grid { grid-template-columns: repeat(3, 1fr); } }

  /* Pill badge */
  .pf-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 20px;
    font-size: 10px; font-weight: 700;
    font-family: 'Inter', sans-serif; white-space: nowrap;
  }

  /* Sidebar mobile strip: horizontal layout */
  .pf-sidebar-mobile {
    display: flex; align-items: center; gap: 14px;
  }
  @media (min-width: 768px) {
    .pf-sidebar-mobile {
      flex-direction: column; align-items: center; gap: 0;
    }
  }

  /* Sidebar quick-stats grid */
  .pf-stat-grid {
    display: grid; grid-template-columns: repeat(4,1fr); gap: 6px;
    width: 100%;
  }
  @media (min-width: 768px) {
    .pf-stat-grid { grid-template-columns: repeat(2,1fr); gap: 7px; }
  }

  /* View doc button */
  .pf-view-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 8px 0; border-radius: 10px;
    border: 1.5px solid ${C.pale};
    background: ${C.bg}; cursor: pointer;
    font-size: 12px; font-weight: 700; color: ${C.dark};
    font-family: 'Inter', sans-serif;
    transition: all 0.18s;
  }
  .pf-view-btn:hover {
    background: ${C.dark}; color: #fff; border-color: ${C.dark};
  }

  /* Animations */
  .a1 { animation: fadeUp .38s ease both .04s; }
  .a2 { animation: fadeUp .38s ease both .10s; }
  .a3 { animation: fadeUp .38s ease both .17s; }
  .a4 { animation: fadeUp .38s ease both .22s; }
`;

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmt      = (v) => (v !== null && v !== undefined && v !== "") ? String(v) : "—";
export const fmtDate  = (v) => v ? new Date(v).toLocaleDateString("en-GB") : "—";
export const fmtSize  = (b) => !b ? "" : b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;
export const fmtBlood = (v) => v ? v.replace("_POS","+").replace("_NEG","-") : "—";
export const initials = (name = "") =>
  name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0,2) || "ST";

// ─── InfoCard ─────────────────────────────────────────────────────────────────
export function InfoCard({ icon: Icon, label, value, wide, accent }) {
  const grad = accent
    ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
    : `linear-gradient(135deg, ${C.light}, ${C.mid})`;

  return (
    <div
      className="pf-info-card"
      style={{ gridColumn: wide ? "1 / -1" : undefined }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: grad,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={14} color={C.white} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: C.mid,
          textTransform: "uppercase", letterSpacing: ".07em",
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.dark,
          marginTop: 2, wordBreak: "break-word", lineHeight: 1.35,
        }}>
          {fmt(value)}
        </div>
      </div>
    </div>
  );
}

// ─── InfoGrid — pure CSS grid via className ───────────────────────────────────
export function InfoGrid({ children }) {
  return (
    <div className="pf-info-grid">
      {children}
    </div>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────
export function SectionHeading({ icon: Icon, title, color }) {
  const col = color ?? C.light;
  return (
    <div className="pf-section-heading" style={{ marginTop: 0 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
        background: `${col}1A`, border: `1px solid ${col}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={13} color={col} />
      </div>
      {title}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Sk({ h = 14, w = "100%", r = 8 }) {
  return <div className="pf-sk" style={{ height: h, width: w, borderRadius: r }} />;
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
export function Loading({ height = 200 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height, gap: 10, color: C.mid, fontFamily: "'Inter', sans-serif",
    }}>
      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>Loading…</span>
    </div>
  );
}

// ─── Error message ────────────────────────────────────────────────────────────
export function ErrorMsg({ msg, onRetry }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 10, padding: "13px 16px",
      background: "#fef2f2", border: "1.5px solid #fca5a5",
      borderRadius: 14, color: "#b91c1c", fontSize: 12,
      flexWrap: "wrap", fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <AlertCircle size={15} /> {msg}
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 13px", borderRadius: 20, border: "none",
          background: "#b91c1c", color: "#fff",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
        }}>
          <RefreshCw size={11} /> Retry
        </button>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ message }) {
  return (
    <div style={{
      textAlign: "center", padding: "44px 20px",
      color: C.mid, fontSize: 13, fontFamily: "'Inter', sans-serif",
    }}>
      {message}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
export function StatusPill({ verified }) {
  return verified ? (
    <span className="pf-badge" style={{ background:"#f0fdf4", color:"#16a34a", border:"1px solid #bbf7d0" }}>
      <CheckCircle size={10}/> Verified
    </span>
  ) : (
    <span className="pf-badge" style={{ background:"#fffbeb", color:"#d97706", border:"1px solid #fde68a" }}>
      <Clock size={10}/> Pending
    </span>
  );
}

// ─── Document type labels ─────────────────────────────────────────────────────
export const DOC_LABELS = {
  AADHAR_CARD:           "Aadhar Card",
  BIRTH_CERTIFICATE:     "Birth Certificate",
  PASSBOOK:              "Bank Passbook",
  TRANSFER_CERTIFICATE:  "Transfer Certificate",
  MARKSHEET:             "Marksheet",
  MIGRATION_CERTIFICATE: "Migration Certificate",
  CHARACTER_CERTIFICATE: "Character Certificate",
  MEDICAL_CERTIFICATE:   "Medical Certificate",
  PASSPORT:              "Passport",
  CASTE_CERTIFICATE:     "Caste Certificate",
  INCOME_CERTIFICATE:    "Income Certificate",
  PHOTO:                 "Photograph",
  CUSTOM:                "Document",
};