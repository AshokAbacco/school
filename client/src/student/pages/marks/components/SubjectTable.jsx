// client/src/student/pages/marks/components/SubjectTable.jsx
import { BookOpen, Lock } from "lucide-react";
import { C, FONT, calcGrade, pctColor } from "../tokens.js";

/* ── Primitives ── */
function Sk({ h = 16, w = "100%", r = 8 }) {
  return <div className="mrk-sk" style={{ height: h, width: w, borderRadius: r }} />;
}

function ResultBadge({ status }) {
  const map = {
    pass:   { bg: "rgba(5,150,105,0.10)",  color: "#059669", text: "✓ PASS"  },
    fail:   { bg: "rgba(239,68,68,0.10)",  color: "#dc2626", text: "✗ FAIL"  },
    absent: { bg: "rgba(106,137,167,0.12)",color: C.mid,     text: "ABSENT"  },
  };
  const s = map[status] ?? map.absent;
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 7, padding: "3px 9px",
      fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
      border: `1px solid ${s.color}25`,
      fontFamily: FONT.sans,
      whiteSpace: "nowrap",
    }}>
      {s.text}
    </span>
  );
}

function GradeBadge({ grade }) {
  if (!grade || grade === "—") return <span style={{ color: C.mid, fontSize: 12 }}>—</span>;
  const colorMap = {
    "A+": "#059669", A: "#3b82f6", "B+": "#6366f1", B: "#6366f1",
    C: C.amber, D: C.orange, F: C.red,
  };
  const color = colorMap[grade] ?? C.mid;
  return (
    <span style={{
      background: `${color}14`, color,
      border: `1.5px solid ${color}28`, borderRadius: 8,
      padding: "2px 9px", fontSize: 12, fontWeight: 900,
      fontFamily: "'Georgia', serif", letterSpacing: "-0.5px",
    }}>
      {grade}
    </span>
  );
}

function MiniBar({ pct }) {
  const color = pctColor(pct ?? 0);
  return (
    <div style={{
      height: 4, background: "rgba(189,221,252,0.35)",
      borderRadius: 99, overflow: "hidden", width: "100%", marginTop: 5,
    }}>
      <div style={{
        height: "100%", width: `${Math.min(pct ?? 0, 100)}%`,
        background: color, borderRadius: 99,
        transition: "width 0.9s ease",
      }} />
    </div>
  );
}

/* ── Panel section header ── */
function PanelHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderBottom: `1.5px solid rgba(136,189,242,0.20)`,
      background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "rgba(136,189,242,0.18)",
          border: "1px solid rgba(136,189,242,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={14} color={C.light} />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: C.dark, fontFamily: FONT.sans }}>{title}</p>
          {subtitle && <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontWeight: 500 }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── Mobile card per subject ── */
function MobileSubjectCard({ s, idx, total }) {
  const absent = s.isAbsent;
  const pct    = s.percentage;
  const color  = absent ? C.mid : pctColor(pct ?? 0);

  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: idx < total - 1 ? `1px solid rgba(136,189,242,0.18)` : "none",
      background: absent ? `${C.bg}88` : C.white,
    }}>
      {/* Row 1: subject name + result */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700,
            color: absent ? C.mid : C.dark,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {s.subjectName}
          </p>
          {s.subjectCode && (
            <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textLight, fontWeight: 500 }}>{s.subjectCode}</p>
          )}
          <MiniBar pct={pct ?? 0} />
        </div>
        <ResultBadge status={s.resultStatus} />
      </div>

      {/* Row 2: stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {[
          { label: "Obtained", value: absent ? "—" : (s.marksObtained ?? "—"), color: absent ? C.mid : color, large: true },
          { label: "Max",      value: s.maxMarks,            color: C.mid },
          { label: "Pass",     value: s.passingMarks ?? "—", color: C.mid },
          { label: "Overall",  value: absent ? "—" : (pct != null ? `${pct}%` : "—"), color: absent ? C.mid : color },
        ].map(({ label, value, color: col, large }) => (
          <div key={label} style={{
            textAlign: "center",
            background: "rgba(237,243,250,0.70)",
            borderRadius: 9, padding: "7px 4px",
            border: "1px solid rgba(136,189,242,0.18)",
          }}>
            <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, fontWeight: 700 }}>
              {label}
            </div>
            <div style={{ fontSize: large ? 16 : 13, fontWeight: large ? 900 : 700, color: col, fontFamily: FONT.sans }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {!absent && s.grade && (
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Grade:</span>
          <GradeBadge grade={s.grade} />
        </div>
      )}
    </div>
  );
}

/* ── Desktop column config ── */
const COLS = [
  { key: "subject",  label: "Subject",    flex: "1 1 160px", align: "left"   },
  { key: "obtained", label: "Obtained",   flex: "0 0 80px",  align: "center" },
  { key: "maxMarks", label: "Max",        flex: "0 0 66px",  align: "center" },
  { key: "passing",  label: "Pass Mark",  flex: "0 0 72px",  align: "center" },
  { key: "overall",  label: "Overall %",  flex: "0 0 80px",  align: "center" },
  { key: "grade",    label: "Grade",      flex: "0 0 70px",  align: "center" },
  { key: "result",   label: "Result",     flex: "0 0 82px",  align: "center" },
];

export default function SubjectTable({ subjects, summary, loading, isLocked, isMobile }) {
  return (
    <div className="mrk-card anim-3" style={{ minWidth: 0 }}>
      {/* Header */}
      <PanelHeader
        icon={BookOpen}
        title="Subject-wise Results"
        subtitle={loading ? "Loading…" : `${subjects?.length ?? 0} subjects`}
        right={isLocked && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: C.bg, border: `1.5px solid rgba(136,189,242,0.28)`,
            borderRadius: 20, padding: "4px 12px",
            fontSize: 11, color: C.mid, fontWeight: 700,
          }}>
            <Lock size={10} /> Locked
          </div>
        )}
      />

      {/* Loading skeleton */}
      {loading && (
        <div style={{ padding: isMobile ? "14px 16px" : "16px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3,4,5].map(i => <Sk key={i} h={isMobile ? 96 : 46} r={12} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && (!subjects || subjects.length === 0) && (
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <p style={{ color: C.mid, fontSize: 13, fontWeight: 500 }}>No subjects found for this exam.</p>
        </div>
      )}

      {/* ── MOBILE layout ── */}
      {!loading && subjects && subjects.length > 0 && isMobile && (
        <>
          {subjects.map((s, idx) => (
            <MobileSubjectCard key={s.subjectId} s={s} idx={idx} total={subjects.length} />
          ))}
          {/* Mobile totals */}
          <div style={{
            padding: "14px 16px",
            borderTop: `2px solid rgba(136,189,242,0.30)`,
            background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: C.mid, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Grand Total
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: "Obtained", value: summary?.totalObtained ?? "—", color: C.dark, large: true },
                { label: "Max",      value: summary?.totalMax ?? "—",      color: C.mid },
                { label: "Overall",  value: summary?.percentage != null ? `${summary.percentage}%` : "—", color: pctColor(summary?.percentage ?? 0) },
                { label: "Result",   value: summary?.hasFail ? "FAIL" : "PASS", color: summary?.hasFail ? C.red : "#059669" },
              ].map(({ label, value, color, large }) => (
                <div key={label} style={{
                  textAlign: "center", background: "rgba(237,243,250,0.75)",
                  borderRadius: 9, padding: "7px 4px",
                  border: `1px solid rgba(136,189,242,0.22)`,
                }}>
                  <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: large ? 16 : 13, fontWeight: large ? 900 : 800, color, fontFamily: FONT.sans }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: C.textLight, fontWeight: 600 }}>Grade:</span>
              <GradeBadge grade={summary?.grade} />
            </div>
          </div>
        </>
      )}

      {/* ── DESKTOP table layout ── */}
      {!loading && subjects && subjects.length > 0 && !isMobile && (
        <div style={{ overflowX: "auto" }}>
          {/* Column headers */}
          <div style={{
            display: "flex", padding: "9px 20px",
            background: C.bg,
            borderBottom: `1.5px solid rgba(136,189,242,0.20)`,
            gap: 8, minWidth: 620,
          }}>
            {COLS.map(col => (
              <div key={col.key} style={{
                flex: col.flex, textAlign: col.align,
                fontSize: 9, fontWeight: 800, color: C.mid,
                letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: FONT.sans,
              }}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Subject rows */}
          {subjects.map((s, idx) => {
            const absent = s.isAbsent;
            const pct    = s.percentage;
            const color  = absent ? C.mid : pctColor(pct ?? 0);
            return (
              <div
                key={s.subjectId}
                className="subj-row"
                style={{
                  display: "flex", alignItems: "center",
                  padding: "13px 20px", gap: 8,
                  borderBottom: idx < subjects.length - 1 ? `1px solid rgba(136,189,242,0.15)` : "none",
                  background: absent ? `${C.bg}88` : C.white,
                  minWidth: 620,
                }}
              >
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 700,
                    color: absent ? C.mid : C.dark,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {s.subjectName}
                  </p>
                  {s.subjectCode && <p style={{ margin: 0, fontSize: 10, color: C.textLight, marginTop: 1 }}>{s.subjectCode}</p>}
                  <MiniBar pct={pct ?? 0} />
                </div>
                <div style={{ flex: "0 0 80px", textAlign: "center" }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: absent ? C.mid : color, fontFamily: FONT.sans }}>
                    {absent ? "—" : (s.marksObtained ?? "—")}
                  </span>
                </div>
                <div style={{ flex: "0 0 66px", textAlign: "center" }}>
                  <span style={{ fontSize: 12, color: C.mid }}>{s.maxMarks}</span>
                </div>
                <div style={{ flex: "0 0 72px", textAlign: "center" }}>
                  <span style={{ fontSize: 12, color: C.mid }}>{s.passingMarks ?? "—"}</span>
                </div>
                <div style={{ flex: "0 0 80px", textAlign: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: absent ? C.mid : color }}>
                    {absent ? "—" : pct != null ? `${pct}%` : "—"}
                  </span>
                </div>
                <div style={{ flex: "0 0 70px", textAlign: "center" }}>
                  {absent ? <span style={{ color: C.mid, fontSize: 12 }}>—</span> : <GradeBadge grade={s.grade} />}
                </div>
                <div style={{ flex: "0 0 82px", textAlign: "center" }}>
                  <ResultBadge status={s.resultStatus} />
                </div>
              </div>
            );
          })}

          {/* Totals row */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "13px 20px", gap: 8,
            borderTop: `2px solid rgba(136,189,242,0.30)`,
            background: `linear-gradient(90deg, ${C.bg}, ${C.white})`,
            minWidth: 620,
          }}>
            <div style={{ flex: "1 1 160px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.dark, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Grand Total
              </span>
            </div>
            <div style={{ flex: "0 0 80px", textAlign: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: C.dark }}>{summary?.totalObtained ?? "—"}</span>
            </div>
            <div style={{ flex: "0 0 66px", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.mid }}>{summary?.totalMax ?? "—"}</span>
            </div>
            <div style={{ flex: "0 0 72px" }} />
            <div style={{ flex: "0 0 80px", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: pctColor(summary?.percentage ?? 0) }}>
                {summary?.percentage ?? "—"}%
              </span>
            </div>
            <div style={{ flex: "0 0 70px", textAlign: "center" }}>
              <GradeBadge grade={summary?.grade} />
            </div>
            <div style={{ flex: "0 0 82px", textAlign: "center" }}>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: summary?.hasFail ? C.red : "#059669",
                letterSpacing: "0.04em",
              }}>
                {summary?.hasFail ? "✗ FAIL" : "✓ PASS"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}