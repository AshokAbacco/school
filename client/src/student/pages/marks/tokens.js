// client/src/student/pages/marks/tokens.js
// Stormy Morning palette — shared across all marks components

export const C = {
  dark:        "#384959",
  mid:         "#6A89A7",
  light:       "#88BDF2",
  pale:        "#BDDDFC",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
  glass:       "rgba(255,255,255,0.80)",
  glassBorder: "rgba(136,189,242,0.28)",
  green:       "#22c55e",
  red:         "#ef4444",
  amber:       "#f59e0b",
  orange:      "#f97316",
};

export const GRADE_SCALE = [
  { min: 90, max: 100, grade: "A+", label: "Outstanding",    color: "#059669" },
  { min: 80, max:  89, grade: "A",  label: "Excellent",      color: "#3b82f6" },
  { min: 70, max:  79, grade: "B",  label: "Very Good",      color: "#6366f1" },
  { min: 60, max:  69, grade: "C",  label: "Good",           color: C.amber   },
  { min: 50, max:  59, grade: "D",  label: "Average",        color: C.orange  },
  { min:  0, max:  49, grade: "F",  label: "Below Average",  color: C.red     },
];

export function calcGrade(pct) {
  return (
    GRADE_SCALE.find((g) => pct >= g.min && pct <= g.max) ??
    { grade: "F", label: "Below Average", color: C.red }
  );
}

export function pctColor(pct) {
  if (pct >= 90) return "#059669";
  if (pct >= 80) return "#3b82f6";
  if (pct >= 70) return "#6366f1";
  if (pct >= 60) return C.amber;
  if (pct >= 50) return C.orange;
  return C.red;
}

export const FONT = {
  sans: "'Inter', 'DM Sans', system-ui, sans-serif",
};

// Shared global CSS injected once at the page level
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.96); }      to { opacity:1; transform:scale(1); } }
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ringIn  { from{stroke-dashoffset:var(--circ)} to{stroke-dashoffset:var(--offset)} }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.pale}; border-radius: 99px; }

  .mrk-page {
    min-height: 100vh;
    background: ${C.bg};
    font-family: 'Inter', sans-serif;
    background-image:
      radial-gradient(ellipse 70% 50% at 5% 0%,   rgba(136,189,242,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 55% 45% at 95% 100%, rgba(189,221,252,0.16) 0%, transparent 50%);
    padding: 16px 14px 40px;
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(14px, env(safe-area-inset-right));
    padding-bottom: max(40px, env(safe-area-inset-bottom));
  }
  @media (min-width: 480px) { .mrk-page { padding: 20px 20px 48px; } }
  @media (min-width: 768px) { .mrk-page { padding: 24px 28px 52px; } }
  @media (min-width: 1024px){ .mrk-page { padding: 28px 36px 56px; } }

  /* ── Glass card ── */
  .mrk-card {
    background: linear-gradient(150deg, rgba(255,255,255,0.88) 0%, rgba(237,243,250,0.75) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1.5px solid rgba(136,189,242,0.28);
    border-radius: 20px;
    overflow: hidden;
    transition: box-shadow 0.22s ease, transform 0.22s ease;
  }
  .mrk-card:hover { box-shadow: 0 12px 32px rgba(56,73,89,0.10); }

  /* ── Skeleton shimmer ── */
  .mrk-sk {
    background: linear-gradient(90deg,
      rgba(189,221,252,0.30) 25%,
      rgba(189,221,252,0.55) 50%,
      rgba(189,221,252,0.30) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 8px;
  }

  /* ── Hover row ── */
  .mrk-row { transition: background 0.13s; border-radius: 12px; }
  .mrk-row:hover { background: rgba(136,189,242,0.11) !important; }

  /* ── Exam tab button ── */
  .mrk-tab {
    display: flex; align-items: center; gap: 5px;
    padding: 6px 16px; border-radius: 22px; flex-shrink: 0;
    border: 1.5px solid ${C.borderLight};
    background: ${C.white};
    color: ${C.textLight};
    font-weight: 500; font-size: 12px;
    cursor: pointer; font-family: 'Inter', sans-serif;
    transition: all 0.15s;
  }
  .mrk-tab:hover { background: ${C.borderLight}; color: ${C.dark}; }
  .mrk-tab.active {
    background: linear-gradient(135deg, ${C.light}28, ${C.pale}50);
    border-color: ${C.light};
    color: ${C.dark}; font-weight: 700;
    box-shadow: 0 2px 10px rgba(136,189,242,0.22);
  }

  /* ── Download button ── */
  .mrk-dl-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 18px; border-radius: 11px;
    background: ${C.dark}; border: none; color: ${C.white};
    font-weight: 700; font-size: 12px; cursor: pointer;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 3px 12px rgba(56,73,89,0.28);
    transition: opacity 0.18s, transform 0.18s;
  }
  .mrk-dl-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .mrk-dl-btn:disabled { cursor: not-allowed; opacity: 0.65; transform: none; }

  /* ── Select ── */
  .mrk-select {
    appearance: none; background: ${C.white};
    border: 1.5px solid ${C.borderLight}; border-radius: 11px;
    color: ${C.dark}; padding: 8px 34px 8px 13px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; outline: none;
    box-shadow: 0 1px 4px rgba(56,73,89,0.07);
    transition: border-color 0.15s;
  }
  .mrk-select:focus { border-color: ${C.light}; }

  /* ── Table subject row hover ── */
  .subj-row { transition: background 0.13s; }
  .subj-row:hover { background: rgba(136,189,242,0.08) !important; }

  /* ── Animations ── */
  .anim-1 { animation: fadeUp 0.40s ease both 0.04s; }
  .anim-2 { animation: fadeUp 0.40s ease both 0.10s; }
  .anim-3 { animation: fadeUp 0.40s ease both 0.17s; }
  .anim-4 { animation: fadeUp 0.40s ease both 0.24s; }
`;