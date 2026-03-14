// client/src/student/pages/marks/components/SummaryCards.jsx
import { Trophy } from "lucide-react";
import { C, FONT, calcGrade, pctColor } from "../tokens.js";

function Sk({ h = 16, w = "100%", r = 8 }) {
  return <div className="mrk-sk" style={{ height: h, width: w, borderRadius: r }} />;
}

function RadialRing({ pct = 0, size = 104, stroke = 8 }) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = (Math.min(pct, 100) / 100) * circ;
  const color = pctColor(pct);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(189,221,252,0.40)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: size < 92 ? 14 : 18,
          fontWeight: 900, color, lineHeight: 1,
          fontFamily: FONT.sans,
        }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, loading, children, accent, style = {} }) {
  return (
    <div className="mrk-card" style={{
      padding: "18px 16px",
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 10, minWidth: 0,
      background: accent
        ? `linear-gradient(150deg, ${accent}14 0%, rgba(255,255,255,0.90) 100%)`
        : "linear-gradient(150deg, rgba(255,255,255,0.88) 0%, rgba(237,243,250,0.75) 100%)",
      border: `1.5px solid ${accent ? accent + "30" : "rgba(136,189,242,0.28)"}`,
      ...style,
    }}>
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.10em",
        textTransform: "uppercase", color: C.mid,
        fontFamily: FONT.sans,
      }}>{label}</span>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
          <Sk h={72} w={72} r={36} />
          <Sk h={12} w="55%" />
        </div>
      ) : children}
    </div>
  );
}

export default function SummaryCards({ summary, loading, isMobile, isTablet }) {
  const pct       = summary?.percentage ?? 0;
  const gradeInfo = summary ? calcGrade(pct) : null;
  const ringSize  = isMobile ? 84 : 100;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)",
      gap: isMobile ? 10 : 14,
      marginBottom: isMobile ? 14 : 20,
    }}
      className="anim-2"
    >
      {/* ── Percentage ── */}
      <StatCard label="Percentage" loading={loading}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RadialRing pct={pct} size={ringSize} />
        </div>
      </StatCard>

      {/* ── Grade ── */}
      <StatCard label="Grade" loading={loading} accent={gradeInfo?.color}>
        {summary && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: isMobile ? 46 : 56,
              fontWeight: 900,
              color: gradeInfo?.color ?? C.mid,
              lineHeight: 1,
              fontFamily: "'Georgia', serif",
              letterSpacing: "-2px",
            }}>
              {summary.grade ?? "—"}
            </div>
            <div style={{
              marginTop: 6, fontSize: 10, fontWeight: 700,
              color: gradeInfo?.color ?? C.mid,
              textTransform: "uppercase", letterSpacing: "0.09em",
            }}>
              {gradeInfo?.label ?? "—"}
            </div>
          </div>
        )}
      </StatCard>

      {/* ── Total Marks ── */}
      <StatCard label="Total Marks" loading={loading}>
        {summary && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div>
              <span style={{ fontSize: isMobile ? 30 : 40, fontWeight: 900, color: C.dark, lineHeight: 1 }}>
                {summary.totalObtained ?? "—"}
              </span>
              <span style={{ fontSize: isMobile ? 15 : 18, color: C.mid, fontWeight: 500 }}>
                /{summary.totalMax ?? "—"}
              </span>
            </div>
            {/* progress bar */}
            <div style={{
              height: 5, background: "rgba(189,221,252,0.40)",
              borderRadius: 99, overflow: "hidden",
              width: "80%", margin: "12px auto 0",
            }}>
              <div style={{
                height: "100%",
                width: `${summary.totalMax ? Math.min((summary.totalObtained / summary.totalMax) * 100, 100) : 0}%`,
                background: `linear-gradient(90deg, ${C.light}, ${C.dark})`,
                borderRadius: 99, transition: "width 1s ease",
              }} />
            </div>
          </div>
        )}
      </StatCard>

      {/* ── Class Rank ── */}
      <StatCard label="Class Rank" loading={loading}
        style={{ background: `linear-gradient(150deg, rgba(189,221,252,0.28) 0%, rgba(255,255,255,0.88) 100%)`, border: `1.5px solid rgba(136,189,242,0.35)` }}
      >
        {summary && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Trophy size={isMobile ? 14 : 18} color={C.mid} />
              <span style={{ fontSize: isMobile ? 32 : 44, fontWeight: 900, color: C.dark, lineHeight: 1 }}>
                #{summary.rank ?? "—"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.mid, marginTop: 4, fontWeight: 500 }}>
              of {summary.totalStudentsInClass ?? "—"} students
            </div>
          </div>
        )}
      </StatCard>
    </div>
  );
}