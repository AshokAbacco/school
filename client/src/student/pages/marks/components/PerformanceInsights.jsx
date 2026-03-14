// client/src/student/pages/marks/components/PerformanceInsights.jsx
import { Target, BarChart3, AlertCircle, TrendingUp, TrendingDown, Info } from "lucide-react";
import { C, FONT, GRADE_SCALE } from "../tokens.js";

function Sk({ h = 16, w = "100%", r = 8 }) {
  return <div className="mrk-sk" style={{ height: h, width: w, borderRadius: r }} />;
}

function InsightBox({ bg, border, titleColor, icon: Icon, title, children }) {
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`,
      borderRadius: 12, padding: "11px 13px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <Icon size={13} color={titleColor} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: titleColor, fontFamily: FONT.sans }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function PanelHeader({ icon: Icon, title }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "14px 16px",
      borderBottom: `1.5px solid rgba(136,189,242,0.20)`,
      background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: "rgba(136,189,242,0.18)",
        border: "1px solid rgba(136,189,242,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={13} color={C.light} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, fontFamily: FONT.sans }}>
        {title}
      </span>
    </div>
  );
}

export default function PerformanceInsights({ subjects, summary, loading, isMobile }) {
  const topSubjects = [...(subjects ?? [])]
    .filter(s => !s.isAbsent && s.marksObtained !== null)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    .slice(0, 3);

  const weakSubjects = [...(subjects ?? [])]
    .filter(s => !s.isAbsent && s.marksObtained !== null && (s.percentage ?? 100) < 60)
    .sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));

  const absentCount = (subjects ?? []).filter(s => s.isAbsent).length;

  const overallMsg = summary
    ? summary.percentage >= 90 ? "Outstanding performance! Keep it up."
    : summary.percentage >= 75 ? "Good work! Push for 90% next time."
    : summary.percentage >= 50 ? "You're passing — aim higher!"
    : "Needs improvement. Don't give up!"
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Performance Insights ── */}
      <div className="mrk-card anim-3">
        <PanelHeader icon={Target} title="Performance Insights" />
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            [80, 70, 80].map((w, i) => <Sk key={i} h={64} r={12} />)
          ) : (
            <>
              {topSubjects.length > 0 && (
                <InsightBox
                  bg="rgba(5,150,105,0.07)" border="rgba(5,150,105,0.18)"
                  titleColor="#065f46" icon={TrendingUp} title="Top Subjects"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {topSubjects.map(s => (
                      <div key={s.subjectId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "#047857", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {s.subjectName}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#059669", flexShrink: 0, marginLeft: 8 }}>
                          {s.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </InsightBox>
              )}

              {weakSubjects.length > 0 && (
                <InsightBox
                  bg="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.18)"
                  titleColor="#991b1b" icon={TrendingDown} title="Needs Attention"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {weakSubjects.map(s => (
                      <div key={s.subjectId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "#dc2626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {s.subjectName}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.red, flexShrink: 0, marginLeft: 8 }}>
                          {s.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </InsightBox>
              )}

              {overallMsg && (
                <InsightBox
                  bg="rgba(136,189,242,0.10)" border="rgba(136,189,242,0.25)"
                  titleColor={C.dark} icon={Info} title="Overall Status"
                >
                  <p style={{ margin: 0, fontSize: 11, color: C.mid, lineHeight: 1.5 }}>{overallMsg}</p>
                </InsightBox>
              )}

              {absentCount > 0 && (
                <div style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.28)",
                  borderRadius: 12, padding: "10px 12px",
                }}>
                  <AlertCircle size={13} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>
                    Absent in <strong>{absentCount}</strong> subject{absentCount > 1 ? "s" : ""}. Not counted in total.
                  </p>
                </div>
              )}

              {topSubjects.length === 0 && weakSubjects.length === 0 && !overallMsg && absentCount === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: C.mid, textAlign: "center", padding: "16px 0" }}>
                  No performance data available.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Grade Scale ── */}
      <div className="mrk-card anim-4">
        <PanelHeader icon={BarChart3} title="Grade Scale" />
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {GRADE_SCALE.map(g => (
            <div key={g.grade} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px", borderRadius: 10,
              background: `${g.color}08`,
              border: `1px solid ${g.color}18`,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: `${g.color}18`, color: g.color,
                border: `1.5px solid ${g.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900,
                fontFamily: "'Georgia', serif",
              }}>
                {g.grade}
              </span>
              <span style={{ fontSize: 11, color: C.mid, flexShrink: 0, minWidth: 46 }}>{g.min}–{g.max}%</span>
              <span style={{ fontSize: 11, color: g.color, fontWeight: 700, marginLeft: "auto", flexShrink: 0 }}>{g.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}