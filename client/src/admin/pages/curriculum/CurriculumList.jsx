// client/src/admin/pages/curriculum/AdminCurriculumPage.jsx
import React, { useState, useEffect } from "react";
import { getToken } from "../../../auth/storage";
import {
  BookOpen,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Users,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
};

/* ── helpers ─────────────────────────────────────────────── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />
  );
}

function ProgressBar({ completed, total, height = 6 }) {
  const pct = total ? Math.min(Math.round((completed / total) * 100), 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textLight, fontWeight: 500 }}>
          {completed}/{total} chapters
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 800, color: C.deep }}>
          {pct}%
        </span>
      </div>
      <div style={{ height, borderRadius: 99, background: `${C.mist}55`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`, borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function StatusPill({ pct }) {
  const cfg =
    pct >= 100 ? { label: "Completed", bg: "#dcfce7", fg: "#166534" }
    : pct >= 80 ? { label: "Nearly Done", bg: `${C.mist}66`, fg: C.deep }
    : pct >= 50 ? { label: "In Progress", bg: `${C.sky}22`, fg: C.slate }
    : pct > 0   ? { label: "Started", bg: "#fff3e0", fg: "#b45309" }
    :             { label: "Not Started", bg: `${C.mist}33`, fg: C.textLight };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.fg, fontSize: 10, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function Breadcrumb({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, fontFamily: "'Inter', sans-serif", flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={11} color={C.textLight} />}
          {item.onClick ? (
            <button onClick={item.onClick} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.sky, padding: 0, fontFamily: "'Inter', sans-serif" }}>
              {item.label}
            </button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BackHeader({ onBack, icon, title, subtitle, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22, padding: "14px 16px", background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 12px rgba(56,73,89,0.05)", flexWrap: "wrap" }}>
      <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <ArrowLeft size={14} color={C.slate} />
      </button>
      <div style={{ width: 1, height: 28, background: C.borderLight, alignSelf: "center" }} />
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 10px ${C.sky}44`, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.textLight, lineHeight: 1.4, wordBreak: "break-word" }}>{subtitle}</p>
      </div>
      {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════ */
export default function AdminCurriculumPage() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState({ level: 1, grade: null, subjectKey: null });

  useEffect(() => {
    fetch(`${API_URL}/api/admin/curriculum/overview`, {
      headers: { Authorization: `Bearer ${getToken()}`, "Cache-Control": "no-store" },
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setRaw)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const gradeMap = raw.reduce((acc, a) => {
    const g = a.grade;
    if (!acc[g]) acc[g] = { grade: g, sectionNames: new Set(), subjectKeys: {} };
    acc[g].sectionNames.add(a.classSection?.name);
    const sk = `${a.subjectId}_${g}`;
    if (!acc[g].subjectKeys[sk]) acc[g].subjectKeys[sk] = { subject: a.subject, grade: g, syllabus: a.syllabus, sections: [] };
    acc[g].subjectKeys[sk].sections.push(a);
    return acc;
  }, {});

  const sortedGrades = Object.keys(gradeMap).sort((a, b) => {
    const n = (s) => parseInt(s.replace(/\D/g, "")) || 0;
    return n(a) - n(b);
  });

  const avgPct = (sections, totalChapters) => {
    if (!totalChapters || !sections.length) return 0;
    return Math.round(
      (sections.reduce((s, sec) => s + (sec.progress?.completedChapters || 0), 0) /
        sections.length / totalChapters) * 100
    );
  };

  const gradeAvg = (g) => {
    const entries = Object.values(gradeMap[g]?.subjectKeys || {});
    if (!entries.length) return 0;
    const allPcts = entries.map((sg) => avgPct(sg.sections, sg.syllabus?.totalChapters || 0));
    return Math.round(allPcts.reduce((s, p) => s + p, 0) / allPcts.length);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.sky}; border-radius: 99px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.38s ease forwards; opacity:0; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .fade-in { animation: fadeIn 0.3s ease forwards; opacity:0; }
        .chapter-list::-webkit-scrollbar { width: 4px; }
        .chapter-list::-webkit-scrollbar-thumb { background: ${C.sky}88; border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "20px 16px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(circle at 10% 0%, ${C.mist}28 0%, transparent 45%)` }}>
        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
            <div style={{ width: 4, height: 32, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
              Curriculum Overview
            </h1>
          </div>
          <p style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
            Monitor syllabus completion across all grades, subjects and sections
          </p>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 12, background: "#fee8e8", border: "1px solid #f5b0b0", marginBottom: 20, fontSize: 13, color: "#8b1c1c", fontFamily: "'Inter', sans-serif" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : view.level === 1 ? (
          <Level1Grades gradeMap={gradeMap} sortedGrades={sortedGrades} gradeAvg={gradeAvg} onSelect={(g) => setView({ level: 2, grade: g, subjectKey: null })} />
        ) : view.level === 2 ? (
          <Level2Subjects grade={view.grade} subjectKeys={gradeMap[view.grade]?.subjectKeys || {}} avgPct={avgPct} onBack={() => setView({ level: 1, grade: null, subjectKey: null })} onSelect={(sk) => setView({ level: 3, grade: view.grade, subjectKey: sk })} />
        ) : (
          <Level3Sections grade={view.grade} subjectKey={view.subjectKey} subjectKeys={gradeMap[view.grade]?.subjectKeys || {}} onBack={() => setView({ level: 2, grade: view.grade, subjectKey: null })} onBackToGrades={() => setView({ level: 1, grade: null, subjectKey: null })} />
        )}
      </div>
    </>
  );
}

/* Level 1 — unchanged (no chapter data shown here) */
function Level1Grades({ gradeMap, sortedGrades, gradeAvg, onSelect }) {
  const totalSections = sortedGrades.reduce((s, g) => s + (gradeMap[g]?.sectionNames?.size || 0), 0);
  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 16px", background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 12px rgba(56,73,89,0.05)" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sky}33`, flexShrink: 0 }}>
          <GraduationCap size={16} color={C.sky} strokeWidth={2} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>All Grades</p>
          <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>
            {sortedGrades.length} grades · {totalSections} sections total
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(210px, 100%), 1fr))", gap: 14 }}>
        {sortedGrades.map((grade) => {
          const g = gradeMap[grade];
          const sections = [...(g.sectionNames || [])];
          const subjectCount = Object.keys(g.subjectKeys || {}).length;
          const pct = gradeAvg(grade);
          return (
            <div
              key={grade}
              onClick={() => onSelect(grade)}
              style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 14px rgba(56,73,89,0.06)", transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 16px 36px ${C.sky}35`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 14px rgba(56,73,89,0.06)"; }}
            >
              <div style={{ height: 5, background: pct > 0 ? `linear-gradient(90deg, ${C.slate} ${pct}%, ${C.mist}55 ${pct}%)` : `${C.mist}55` }} />
              <div style={{ padding: "18px 18px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.sky}33`, marginBottom: 14 }}>
                  <GraduationCap size={20} color={C.slate} strokeWidth={1.8} />
                </div>
                <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>{grade}</p>
                <p style={{ margin: "0 0 14px", fontSize: 11, color: C.textLight }}>
                  {sections.length} section{sections.length !== 1 ? "s" : ""} · {subjectCount} subject{subjectCount !== 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14, minHeight: 26 }}>
                  {sections.slice(0, 6).map((s, i) => (
                    <span key={i} style={{ padding: "3px 9px", borderRadius: 20, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, fontSize: 10, fontWeight: 700, color: C.deep }}>
                      {s?.split("-")[1] || s?.replace(/[a-zA-Z\s]+/g, "") || s}
                    </span>
                  ))}
                  {sections.length > 6 && <span style={{ fontSize: 10, color: C.textLight, alignSelf: "center" }}>+{sections.length - 6}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 4, borderRadius: 99, background: `${C.mist}55`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`, borderRadius: 99 }} />
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textLight }}>{pct}% avg</p>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ChevronRight size={13} color={C.slate} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Level 2 — Subjects in a Grade */
function Level2Subjects({ grade, subjectKeys, avgPct, onBack, onSelect }) {
  const subjects = Object.entries(subjectKeys);
  return (
    <div className="fade-in">
      <Breadcrumb items={[{ label: "All Grades", onClick: onBack }, { label: grade }]} />
      <BackHeader onBack={onBack} icon={<BookOpen size={17} color="#fff" strokeWidth={2} />} title={grade} subtitle={`${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(230px, 100%), 1fr))", gap: 14 }}>
        {subjects.map(([sk, group]) => {
          const total = group.syllabus?.totalChapters || 0;
          const pct = avgPct(group.sections, total);
          const sectionCount = group.sections.length;
          // chapters is now an array of { name, description }
          const hasChapters = group.syllabus?.chapters?.some((c) => c?.name?.trim());

          return (
            <div
              key={sk}
              onClick={() => onSelect(sk)}
              style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 14px rgba(56,73,89,0.06)", transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = `0 16px 36px ${C.sky}35`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 14px rgba(56,73,89,0.06)"; }}
            >
              <div style={{ height: 5, background: total > 0 ? `linear-gradient(90deg, ${C.slate} ${pct}%, ${C.mist}55 ${pct}%)` : `${C.mist}55` }} />
              <div style={{ padding: "18px 18px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: `0 4px 12px ${C.sky}44` }}>
                  <BookOpen size={20} color="#fff" strokeWidth={2} />
                </div>
                <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: C.text }}>{group.subject?.name}</p>
                <p style={{ margin: "0 0 12px", fontSize: 11, color: C.textLight }}>
                  {group.subject?.code} · {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {total ? (
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, fontSize: 10, fontWeight: 700, color: C.deep }}>
                      {total} chapters
                    </span>
                  ) : (
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: "#fff3f3", border: "1px solid #fca5a5", fontSize: 10, fontWeight: 700, color: "#991b1b" }}>
                      Syllabus not set
                    </span>
                  )}
                  {hasChapters && (
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: `${C.mist}55`, border: `1px solid ${C.sky}44`, fontSize: 10, fontWeight: 700, color: C.deep }}>
                      ✓ Named
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 5, borderRadius: 99, background: `${C.mist}55`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`, borderRadius: 99 }} />
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textLight }}>{pct}% avg across sections</p>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: 9, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ChevronRight size={13} color={C.slate} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Level 3 — Section cards with chapter breakdown */
function Level3Sections({ grade, subjectKey, subjectKeys, onBack, onBackToGrades }) {
  const group = subjectKeys[subjectKey];
  if (!group) return null;

  const total = group.syllabus?.totalChapters || 0;
  // chapters is now [{ name, description }]
  const chapters = group.syllabus?.chapters ?? [];
  const hasChapters = chapters.some((c) => c?.name?.trim());

  const sections = [...group.sections].sort((a, b) =>
    (a.classSection?.name || "").localeCompare(b.classSection?.name || "")
  );

  return (
    <div className="fade-in">
      <Breadcrumb
        items={[
          { label: "All Grades", onClick: onBackToGrades },
          { label: grade, onClick: onBack },
          { label: group.subject?.name },
        ]}
      />

      <BackHeader
        onBack={onBack}
        icon={<BookOpen size={17} color="#fff" strokeWidth={2} />}
        title={group.subject?.name}
        subtitle={`${grade} · ${group.subject?.code} · ${sections.length} section${sections.length !== 1 ? "s" : ""}`}
        badge={
          total ? (
            <span style={{ padding: "5px 12px", borderRadius: 20, background: `${C.sky}18`, border: `1px solid ${C.sky}44`, fontSize: 11, fontWeight: 700, color: C.deep, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
              {total} ch.
            </span>
          ) : (
            <span style={{ padding: "5px 12px", borderRadius: 20, background: "#fff3f3", border: "1px solid #fca5a5", fontSize: 11, fontWeight: 700, color: "#991b1b", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>
              No syllabus
            </span>
          )
        }
      />

      {/* Chapter index panel — now shows name + description */}
      {/* {hasChapters && total > 0 && (
        <div style={{ marginBottom: 20, padding: "16px 18px", background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 12px rgba(56,73,89,0.05)" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: C.deep, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={13} color={C.sky} />
            Chapter Index — {group.subject?.name}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {chapters.map((ch, idx) =>
              ch?.name?.trim() ? (
                <div
                  key={idx}
                  style={{
                    display: "flex", gap: 10, padding: "8px 12px", borderRadius: 10,
                    background: `${C.sky}08`, border: `1px solid ${C.sky}22`,
                  }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0, fontFamily: "'Inter', sans-serif", marginTop: 1 }}>
                    {idx + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.deep, fontFamily: "'Inter', sans-serif" }}>
                      {ch.name}
                    </p>
                    {ch.description?.trim() && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
                        {ch.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )} */}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(290px, 100%), 1fr))", gap: 14 }}>
        {sections.map((sec, si) => {
          const completedIndices = new Set(sec.progress?.completedChapterIndices ?? []);
          const done = completedIndices.size > 0
            ? completedIndices.size
            : (sec.progress?.completedChapters || 0);
          const pct = total ? Math.min(Math.round((done / total) * 100), 100) : 0;
          const teacher = sec.teacher;

          // Build completed/remaining chapter lists using { name, description }
          const completedChapters = hasChapters
            ? chapters
                .map((ch, idx) => ({ ...ch, idx }))
                .filter(({ name, idx }) => name?.trim() && completedIndices.has(idx))
            : [];

          const remainingChapters = hasChapters
            ? chapters
                .map((ch, idx) => ({ ...ch, idx }))
                .filter(({ name, idx }) => name?.trim() && !completedIndices.has(idx))
            : [];

          return (
            <div
              key={si}
              style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", boxShadow: "0 2px 14px rgba(56,73,89,0.06)", transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 10px 30px ${C.sky}28`; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 14px rgba(56,73,89,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ height: 5, background: total > 0 ? `linear-gradient(90deg, ${C.slate} ${pct}%, ${C.mist}55 ${pct}%)` : `${C.mist}55` }} />

              <div style={{ padding: "16px 16px" }}>
                {/* Section name + status */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, background: `${C.sky}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.sky}33`, flexShrink: 0 }}>
                      <Users size={18} color={C.slate} strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sec.classSection?.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>
                        {grade} · Section {sec.classSection?.section}
                      </p>
                    </div>
                  </div>
                  <StatusPill pct={pct} />
                </div>

                {/* Teacher card */}
                {teacher ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 12px", borderRadius: 10, background: C.bg, border: `1px solid ${C.borderLight}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>
                      {(teacher.firstName?.[0] || "") + (teacher.lastName?.[0] || "")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {teacher.firstName} {teacher.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: 9, color: C.textLight }}>Subject Teacher</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 10, background: "#fff3f3", border: "1px solid #fca5a5" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: "'Inter', sans-serif" }}>No teacher assigned</p>
                  </div>
                )}

                {/* Stat boxes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Completed", value: done, icon: CheckCircle2, color: C.deep },
                    { label: "Remaining", value: Math.max(0, total - done), icon: TrendingUp, color: C.slate },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 11, background: C.bg, border: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <s.icon size={14} color={s.color} strokeWidth={2} />
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                        <p style={{ margin: 0, fontSize: 9, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <ProgressBar completed={done} total={total} height={7} />

                {/* Chapter breakdown with descriptions */}
                {hasChapters && total > 0 && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {completedChapters.length > 0 && (
                      <div>
                        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#166534", fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={10} color="#166534" /> Done ({completedChapters.length})
                        </p>
                        <div className="chapter-list" style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                          {completedChapters.map((item) => (
                            <div key={item.idx} style={{ padding: "6px 9px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <div style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                    <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: C.slate, minWidth: 14, fontFamily: "'Inter', sans-serif" }}>{item.idx + 1}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#166534", fontFamily: "'Inter', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.name}
                                </span>
                              </div>
                              {item.description?.trim() && (
                                <p style={{ margin: "3px 0 0", paddingLeft: 23, fontSize: 10, color: "#4ade80", fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {remainingChapters.length > 0 && (
                      <div>
                        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: C.textLight, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Pending ({remainingChapters.length})
                        </p>
                        <div className="chapter-list" style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 130, overflowY: "auto", paddingRight: 2 }}>
                          {remainingChapters.map((item) => (
                            <div key={item.idx} style={{ padding: "6px 9px", borderRadius: 8, background: `${C.mist}22`, border: `1px solid ${C.borderLight}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <div style={{ width: 16, height: 16, borderRadius: 4, background: `${C.mist}55`, border: `1px solid ${C.border}`, flexShrink: 0 }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, minWidth: 14, fontFamily: "'Inter', sans-serif" }}>{item.idx + 1}</span>
                                <span style={{ fontSize: 11, fontWeight: 400, color: C.textLight, fontFamily: "'Inter', sans-serif", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.name}
                                </span>
                              </div>
                              {item.description?.trim() && (
                                <p style={{ margin: "3px 0 0", paddingLeft: 23, fontSize: 10, color: `${C.textLight}aa`, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {completedChapters.length === 0 && done === 0 && (
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: `${C.mist}22`, border: `1px solid ${C.borderLight}` }}>
                        <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
                          No chapters marked complete yet
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {sec.progress?.updatedAt ? (
                  <p style={{ margin: "10px 0 0", fontSize: 10, color: C.textLight, textAlign: "right", fontFamily: "'Inter', sans-serif" }}>
                    Updated {new Date(sec.progress.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                ) : (
                  <p style={{ margin: "10px 0 0", fontSize: 10, color: C.textLight, textAlign: "right", fontFamily: "'Inter', sans-serif" }}>No updates yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(210px,100%),1fr))", gap: 16 }}>
      {[1, 2, 3, 4, 5, 6, 8, 9, 10].map((i) => (
        <div key={i} className="animate-pulse" style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, padding: 20, height: 190 }}>
          <div style={{ height: 5, background: `${C.mist}55`, borderRadius: 99, marginBottom: 16 }} />
          <Pulse w={44} h={44} r={12} />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <Pulse w="55%" h={16} />
            <Pulse w="40%" h={11} />
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <Pulse w={26} h={20} r={20} />
              <Pulse w={26} h={20} r={20} />
            </div>
            <Pulse w="100%" h={4} r={99} />
          </div>
        </div>
      ))}
    </div>
  );
}