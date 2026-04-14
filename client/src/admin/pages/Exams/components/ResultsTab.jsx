// client/src/admin/pages/exams/components/ResultsTab.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart2, Users, TrendingUp, Award, ChevronRight,
  ArrowLeft, BookOpen, Search, X, Loader2, AlertCircle,
  CheckCircle2, XCircle, Minus,Download
} from "lucide-react";
import { getToken } from "../../../../auth/storage.js";

/* ─── constants ─────────────────────────────────────────────────────────── */
const API_URL = import.meta.env.VITE_API_URL;
const font    = { fontFamily: "'Inter', sans-serif" };
const C = {
  dark:    "#243340",
  mid:     "#6A89A7",
  border:  "#C8DCF0",
  bg:      "#EDF3FA",
  card:    "#ffffff",
  hover:   "#EDF3FA",
  success: "#059669",
  warn:    "#d97706",
  danger:  "#dc2626",
  blue:    "#384959",
  purple:  "#6A89A7",
};

/* ─── helpers ───────────────────────────────────────────────────────────── */
const authHdr = () => ({ Authorization: `Bearer ${getToken()}` });

const apiFetch = async (path) => {
  const r = await fetch(`${API_URL}${path}`, { headers: authHdr() });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  return j;
};

function getGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

function gradeColor(grade) {
  if (!grade || grade === "—") return { color: C.mid,     bg: "#f1f5f9" };
  if (grade === "A+")          return { color: "#059669", bg: "#f0fdf4" };
  if (grade === "A")           return { color: "#0ea5e9", bg: "#f0f9ff" };
  if (grade === "B")           return { color: "#7c3aed", bg: "#f5f3ff" };
  if (grade === "C")           return { color: "#d97706", bg: "#fffbeb" };
  if (grade === "D")           return { color: "#ea580c", bg: "#fff7ed" };
  if (grade === "F")           return { color: "#dc2626", bg: "#fef2f2" };
  if (grade === "AB")          return { color: "#6b7280", bg: "#f9fafb" };
  return                              { color: C.mid,     bg: "#f1f5f9" };
}

function pctBar(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const color =
    p >= 80 ? C.success :
    p >= 60 ? C.blue    :
    p >= 40 ? C.warn    : C.danger;
  return { p, color };
}

/* ─── sub-components ────────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      background: C.card, border: `1.5px solid ${C.border}`,
      borderRadius: 16, padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: accent + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} color={accent} />
      </div>
      <div>
        <p style={{ ...font, fontSize: 11, fontWeight: 600, color: C.mid, margin: 0 }}>{label}</p>
        <p style={{ ...font, fontSize: 22, fontWeight: 800, color: C.dark, margin: "2px 0 0" }}>{value}</p>
        {sub && <p style={{ ...font, fontSize: 11, color: C.mid, margin: "1px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ClassCard({ cs, onClick }) {
  const [hov, setHov] = useState(false);
  const pct  = cs.avgPct || 0;
  const bar  = pctBar(pct);
  const gc   = gradeColor(cs.topGrade);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.hover : C.card,
        border: `1.5px solid ${hov ? C.blue + "55" : C.border}`,
        borderRadius: 16, padding: "18px 20px",
        cursor: "pointer", transition: "all .18s",
        boxShadow: hov ? "0 4px 20px rgba(59,130,246,0.1)" : "none",
        display: "flex", flexDirection: "column", gap: 12,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, #384959, #6A89A7)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <BookOpen size={15} color="#fff" />
            </div>
            <div>
              <p style={{ ...font, fontSize: 14, fontWeight: 700, color: C.dark, margin: 0 }}>
                Grade {cs.grade}{cs.section ? ` – ${cs.section}` : ""}
              </p>
              <p style={{ ...font, fontSize: 11, color: C.mid, margin: "1px 0 0" }}>
                {cs.studentCount || 0} students
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {cs.topGrade && (
            <span style={{
              ...font, fontSize: 11, fontWeight: 700,
              padding: "3px 10px", borderRadius: 20,
              background: gc.bg, color: gc.color,
              border: `1px solid ${gc.color}33`,
            }}>
              Top: {cs.topGrade}
            </span>
          )}
          <ChevronRight size={16} color={hov ? C.blue : C.mid} style={{ transition: "color .18s" }} />
        </div>
      </div>

      {/* stats row */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Avg %",   val: pct ? pct.toFixed(1) + "%" : "—" },
          { label: "Passed",  val: cs.passed  ?? "—" },
          { label: "Failed",  val: cs.failed  ?? "—" },
          { label: "Exams",   val: cs.examCount ?? "—" },
        ].map(({ label, val }) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <p style={{ ...font, fontSize: 16, fontWeight: 800, color: C.dark, margin: 0 }}>{val}</p>
            <p style={{ ...font, fontSize: 10, color: C.mid, margin: "2px 0 0", fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* progress bar */}
      {pct > 0 && (
        <div>
          <div style={{ height: 5, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${bar.p}%`, borderRadius: 99,
              background: bar.color, transition: "width .4s ease",
            }} />
          </div>
          <p style={{ ...font, fontSize: 10, color: C.mid, marginTop: 4, textAlign: "right" }}>
            Class average
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Student Results Table ─────────────────────────────────────────────── */
function StudentResultsTable({ rows, subjectMode = false }) {
  const marksHeader = subjectMode ? "Marks" : "Total Marks";
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fbff" }}>
            {["#", "Student", "Roll No", marksHeader, "Percentage", "Grade", "Status"].map(h => (
              <th key={h} style={{
                ...font, padding: "10px 14px", textAlign: "left",
                fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                textTransform: "uppercase", color: C.mid,
                borderBottom: `1.5px solid ${C.border}`,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isAbsent = r.isAbsent;
            // ✅ FIX: resultSummary fields — totalMarks (obtained), maxMarks (out of)
            const pct  = Number(r.percentage ?? 0);
            const bar  = pctBar(pct);
            const gc   = gradeColor(r.grade);
            return (
              <tr key={r.studentId || i}
                style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ ...font, padding: "11px 14px", fontSize: 12, color: C.mid }}>{i + 1}</td>
                <td style={{ ...font, padding: "11px 14px", fontSize: 13, fontWeight: 600, color: C.dark }}>
                  {r.studentName}
                </td>
                <td style={{ ...font, padding: "11px 14px", fontSize: 12, color: C.mid }}>
                  {r.rollNo || "—"}
                </td>
                <td style={{ ...font, padding: "11px 14px", fontSize: 13, color: C.dark }}>
                  {isAbsent ? (
                    <span style={{ color: C.mid, fontStyle: "italic" }}>Absent</span>
                  ) : (
                    <span>
                      {/* ✅ FIX: totalMarks = marks obtained, maxMarks = out of */}
                      <strong>{r.totalMarks ?? "—"}</strong>
                      <span style={{ color: C.mid }}> / {r.maxMarks ?? "—"}</span>
                    </span>
                  )}
                </td>
                <td style={{ padding: "11px 14px", minWidth: 120 }}>
                  {!isAbsent && pct > 0 ? (
                    <div>
                      <div style={{ height: 5, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginBottom: 3 }}>
                        <div style={{ height: "100%", width: `${bar.p}%`, borderRadius: 99, background: bar.color }} />
                      </div>
                      <span style={{ ...font, fontSize: 12, color: C.dark, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                    </div>
                  ) : <span style={{ ...font, fontSize: 12, color: C.mid }}>—</span>}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                    ...font, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                    background: gc.bg, color: gc.color,
                    border: `1px solid ${gc.color}33`,
                  }}>
                    {r.grade || "—"}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  {isAbsent ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...font, fontSize: 12, color: C.mid }}>
                      <Minus size={13} /> Absent
                    </span>
                  ) : (r.grade === "F" || pct < 50) ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...font, fontSize: 12, color: C.danger }}>
                      <XCircle size={13} /> Failed
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...font, fontSize: 12, color: C.success }}>
                      <CheckCircle2 size={13} /> Passed
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Class Detail View ──────────────────────────────────────────────────── */
function ClassDetailView({ cs, academicYearId, onBack }) {
  const [exams,        setExams]        = useState([]);
  const [selExam,      setSelExam]      = useState(null);
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [resLoading,   setResLoading]   = useState(false);
  const [error,        setError]        = useState("");
  // Subject filter
  const [subjects,     setSubjects]     = useState([]);   // subjects that have results for selected exam+class
  const [selSubjectId, setSelSubjectId] = useState("all"); // "all" or a subjectId string

  // fetch exam groups that have schedules for this class
  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch(`/api/exams/groups/${academicYearId}`)
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        // ✅ Filter only groups that have a schedule for this specific class
        const relevant = all.filter(g =>
          (g.assessmentSchedules || []).some(sc => sc.classSectionId === cs.id)
        );
        setExams(relevant);
        if (relevant.length) setSelExam(relevant[0]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [cs.id, academicYearId]);

  // When exam changes, reset subject selection
  useEffect(() => {
    setSelSubjectId("all");
    setSubjects([]);
  }, [selExam]);

  // Fetch results — either per-subject (from /list) or aggregated (from /summary)
  useEffect(() => {
    if (!selExam) return;
    setResLoading(true);
    setResults([]);
    setError("");

    if (selSubjectId === "all") {
      // Aggregated totals across all subjects
      apiFetch(
        `/api/results/summary?classSectionId=${cs.id}&assessmentGroupId=${selExam.id}`
      )
        .then(d => {
          const rows = d.data || [];
          const sorted = [...rows].sort((a, b) => b.percentage - a.percentage);
          setResults(sorted);

          // Build subject list from the raw marks list for the dropdown
          // We fetch /api/results/list just to discover available subjects
          return apiFetch(
            `/api/results/list?classSectionId=${cs.id}&assessmentGroupId=${selExam.id}`
          );
        })
        .then(d => {
          const rows = d?.data || [];
          const subMap = new Map();
          rows.forEach(r => {
            if (r.subjectId && r.subject) subMap.set(r.subjectId, r.subject);
          });
          setSubjects([...subMap.entries()].map(([id, name]) => ({ id, name })));
        })
        .catch(e => setError(e.message))
        .finally(() => setResLoading(false));
    } else {
      // Per-subject marks from /api/results/list
      apiFetch(
        `/api/results/list?classSectionId=${cs.id}&assessmentGroupId=${selExam.id}&subjectId=${selSubjectId}`
      )
        .then(d => {
          const rows = d.data || [];
          // Normalize fields: list returns marks/totalMarks, summary returns totalMarks/maxMarks
          const normalized = rows.map(r => ({
            ...r,
            totalMarks:  r.marks,
            maxMarks:    r.totalMarks,
            percentage:  r.percentage,
            grade:       r.grade,
            isAbsent:    r.isAbsent,
          }));
          const sorted = [...normalized].sort((a, b) => b.percentage - a.percentage);
          setResults(sorted);
        })
        .catch(e => setError(e.message))
        .finally(() => setResLoading(false));
    }
  }, [selExam, cs.id, selSubjectId]);

  const passed  = results.filter(r => !r.isAbsent && r.percentage >= 50).length;
  const failed  = results.filter(r => !r.isAbsent && r.percentage < 50).length;
  const absent  = results.filter(r => r.isAbsent).length;
  const avgPct  = results.length
    ? results.filter(r => !r.isAbsent).reduce((a, r) => a + r.percentage, 0) /
      Math.max(results.filter(r => !r.isAbsent).length, 1)
    : 0;



    const handleExportResults = async () => {
  try {
    if (!cs || !selExam) {
      alert("Select class & exam");
      return;
    }

    let url = `${API_URL}/api/results/export/excel?classSectionId=${cs.id}&assessmentGroupId=${selExam.id}`;

    if (selSubjectId !== "all") {
      url += `&subjectId=${selSubjectId}`;
    }

    const res = await fetch(url, {
      headers: authHdr(),
    });

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `results-${cs.name}-${selExam.name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error("Export failed", err);
  }
};

  return (
    <div>
      {/* back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.card, border: `1.5px solid ${C.border}`,
            borderRadius: 10, padding: "7px 14px",
            cursor: "pointer", ...font, fontSize: 13, fontWeight: 600, color: C.mid,
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h2 style={{ ...font, fontSize: 17, fontWeight: 800, color: C.dark, margin: 0 }}>
            Grade {cs.grade}{cs.section ? ` – ${cs.section}` : ""} — Results
          </h2>
          <p style={{ ...font, fontSize: 12, color: C.mid, margin: "2px 0 0" }}>
            {cs.studentCount || 0} students enrolled
          </p>
        </div>
      </div>

      {loading ? (
        <Loader state="Loading exams…" />
      ) : error ? (
        <ErrorBox msg={error} />
      ) : exams.length === 0 ? (
        <EmptyBox msg="No exam schedules found for this class." />
      ) : (
        <>
          {/* exam selector tabs */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20,
          }}>
            {exams.map(e => (
              <button key={e.id}
                onClick={() => setSelExam(e)}
                style={{
                  ...font, fontSize: 12, fontWeight: 700, padding: "6px 16px",
                  borderRadius: 20, border: `1.5px solid ${selExam?.id === e.id ? C.dark : C.border}`,
                  background: selExam?.id === e.id ? C.dark : C.card,
                  color: selExam?.id === e.id ? "#fff" : C.mid,
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                {e.name}
                {e.term?.name && (
                  <span style={{ fontWeight: 400, opacity: 0.75 }}> · {e.term.name}</span>
                )}
              </button>
            ))}
          </div>

          {/* mini stat row */}
          {!resLoading && results.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10, marginBottom: 20,
            }}>
              {[
                { label: "Total Students", val: results.length,          accent: C.dark    },
                { label: "Passed",         val: passed,                  accent: C.success  },
                { label: "Failed",         val: failed,                  accent: C.danger   },
                { label: "Absent",         val: absent,                  accent: C.mid      },
                { label: "Class Avg",      val: avgPct.toFixed(1) + "%", accent: C.blue     },
              ].map(({ label, val, accent }) => (
                <div key={label} style={{
                  background: C.card, border: `1.5px solid ${C.border}`,
                  borderRadius: 12, padding: "12px 14px", textAlign: "center",
                }}>
                  <p style={{ ...font, fontSize: 18, fontWeight: 800, color: accent, margin: 0 }}>{val}</p>
                  <p style={{ ...font, fontSize: 10, fontWeight: 600, color: C.mid, margin: "3px 0 0" }}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* subject filter dropdown */}
          {subjects.length > 0 && (
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ ...font, fontSize: 12, fontWeight: 600, color: C.mid, whiteSpace: "nowrap" }}>
                Filter by Subject:
              </span>
              <div style={{ position: "relative" }}>
                <select
                  value={selSubjectId}
                  onChange={e => setSelSubjectId(e.target.value)}
                  style={{
                    ...font, fontSize: 13, fontWeight: 600,
                    color: selSubjectId === "all" ? C.mid : C.dark,
                    background: C.card,
                    border: `1.5px solid ${selSubjectId === "all" ? C.border : C.blue + "88"}`,
                    borderRadius: 10, padding: "7px 32px 7px 12px",
                    cursor: "pointer", outline: "none",
                    appearance: "none", WebkitAppearance: "none",
                    boxShadow: selSubjectId !== "all" ? `0 0 0 3px ${C.blue}18` : "none",
                    transition: "all .15s",
                    minWidth: 190,
                  }}
                >
                  <option value="all">Show All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  pointerEvents: "none", color: C.mid, fontSize: 11,
                }}>▾</span>
              </div>
              {selSubjectId !== "all" && (
                <button
                  onClick={() => setSelSubjectId("all")}
                  style={{
                    ...font, fontSize: 11, fontWeight: 600,
                    color: C.mid, background: "#f1f5f9",
                    border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: "5px 10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          )}

          {/* results table */}
          <div style={{
            background: C.card, border: `1.5px solid ${C.border}`,
            borderRadius: 16, overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px", borderBottom: `1.5px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <p style={{ ...font, fontSize: 13, fontWeight: 700, color: C.dark, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {selExam?.name} — Student Results
                {selSubjectId !== "all" && subjects.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: C.blue, background: C.blue + "15",
                    border: `1px solid ${C.blue}33`,
                    borderRadius: 20, padding: "2px 10px",
                  }}>
                    {subjects.find(s => s.id === selSubjectId)?.name}
                  </span>
                )}
              </p>
              {resLoading && (
                <Loader2 size={15} color={C.mid}
                  style={{ animation: "spin 1s linear infinite" }} />
              )}
              <button
                onClick={handleExportResults}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#e0f2fe",
                  color: "#0369a1",
                  border: "1px solid #7dd3fc",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Download size={14} />
                Export {selExam?.name}
              </button>
            </div>

            {resLoading ? (
              <Loader state="Loading results…" />
            ) : results.length === 0 ? (
              <EmptyBox msg="No results entered for this exam yet." />
            ) : (
              <StudentResultsTable rows={results} subjectMode={selSubjectId !== "all"} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── small utility components ──────────────────────────────────────────── */
function Loader({ state = "Loading…" }) {
  return (
    <div style={{
      padding: "52px 0", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <Loader2 size={22} color={C.mid}
        style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ ...font, fontSize: 13, color: C.mid, margin: 0 }}>{state}</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "14px 18px", borderRadius: 12,
      background: "#fef2f2", border: `1.5px solid #fca5a5`,
      ...font, fontSize: 13, color: C.danger,
    }}>
      <AlertCircle size={16} /> {msg}
    </div>
  );
}

function EmptyBox({ msg }) {
  return (
    <div style={{
      padding: "48px 0", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <BarChart2 size={20} color={C.mid} />
      </div>
      <p style={{ ...font, fontSize: 13, fontWeight: 600, color: C.dark, margin: 0 }}>No data</p>
      <p style={{ ...font, fontSize: 12, color: C.mid, margin: 0 }}>{msg}</p>
    </div>
  );
}

/* ─── Main ResultsTab ────────────────────────────────────────────────────── */
export default function ResultsTab({ academicYearId, academicYearLabel }) {
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [search,   setSearch]   = useState("");
  const [selClass, setSelClass] = useState(null);

  // ✅ FIX: load class sections + enrich with data from /api/results/summary
  const loadClasses = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    try {
      // 1. All class sections
      const cs = await apiFetch("/api/class-sections");
        const sections =
        Array.isArray(cs) ? cs :
        cs.classSections || cs.data || [];
      // 2. ✅ Use /api/results/summary — returns resultSummary rows with correct fields
      //    (totalMarks=obtained, maxMarks=outOf, percentage, grade per student per exam)
      const summaryRes = await apiFetch(`/api/results/summary`);
      const summaries  = summaryRes.data || [];

      // 3. Exam groups to count per class
      const grps   = await apiFetch(`/api/exams/groups/${academicYearId}`);
      const groups = Array.isArray(grps) ? grps : [];

      // Group summaries by classSectionId
    //   const byClass = {};
    //   summaries.forEach(s => {
    //     const cid = s.classSectionId;
    //     if (!cid) return;
    //     if (!byClass[cid]) byClass[cid] = [];
    //     byClass[cid].push(s);
    //   });

    const enriched = sections.map(sec => {
    // ✅ FIX: direct filter (no map dependency)
    const rows = summaries.filter(s => s.classSectionId === sec.id);

    const studentMap = {};

    rows.forEach(r => {
        if (!studentMap[r.studentId]) {
        studentMap[r.studentId] = { totalPct: 0, count: 0 };
        }
        studentMap[r.studentId].totalPct += r.percentage || 0;
        studentMap[r.studentId].count += 1;
    });

    const studentList = Object.values(studentMap);

    const avgPct = studentList.length
        ? studentList.reduce((a, s) => a + (s.totalPct / s.count), 0) / studentList.length
        : 0;

    const passed = rows.filter(r => r.percentage >= 50).length;
    const failed = rows.filter(r => r.percentage < 50).length;

    return {
        ...sec,
        avgPct,
        studentCount: studentList.length,
        passed,
        failed,
        examCount: new Set(rows.map(r => r.assessmentGroupId)).size,
    };
    });

      setClasses(enriched);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // Overall stats
  const totalStudents = useMemo(
    () => classes.reduce((a, c) => a + (c.studentCount || 0), 0),
    [classes]
  );
  const totalPassed = useMemo(
    () => classes.reduce((a, c) => a + (c.passed || 0), 0),
    [classes]
  );
  const totalFailed = useMemo(
    () => classes.reduce((a, c) => a + (c.failed || 0), 0),
    [classes]
  );
  const overallAvg = useMemo(() => {
    const active = classes.filter(c => c.avgPct > 0);
    if (!active.length) return 0;
    return active.reduce((a, c) => a + c.avgPct, 0) / active.length;
  }, [classes]);

  const filtered = useMemo(() =>
    classes.filter(c => {
      const q = search.toLowerCase();
      return (
        String(c.grade).toLowerCase().includes(q) ||
        String(c.section || "").toLowerCase().includes(q) ||
        String(c.name || "").toLowerCase().includes(q)
      );
    }),
    [classes, search]
  );

  /* ── drill-down view ── */
  if (selClass) {
    return (
      <ClassDetailView
        cs={selClass}
        academicYearId={academicYearId}
        onBack={() => setSelClass(null)}
      />
    );
  }

 
  /* ── class grid ── */
  return (
    <div>
      {/* stat cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))",
        gap: 12, marginBottom: 22,
      }}>
        <StatCard icon={Users}      label="Total Students" value={totalStudents}                                   accent={C.dark}    />
        <StatCard icon={CheckCircle2} label="Passed"       value={totalPassed}                                    accent={C.success}  />
        <StatCard icon={XCircle}    label="Failed"         value={totalFailed}                                    accent={C.danger}   />
        <StatCard icon={TrendingUp} label="School Avg"     value={overallAvg > 0 ? overallAvg.toFixed(1) + "%" : "—"} accent={C.blue} />
      </div>

      {/* search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: C.card, border: `1.5px solid ${C.border}`,
        borderRadius: 12, padding: "8px 14px", marginBottom: 18,
        maxWidth: 360,
      }}>
        <Search size={13} color={C.mid} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search classes…"
          style={{
            border: "none", outline: "none", background: "transparent",
            ...font, fontSize: 13, color: C.dark, flex: 1,
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", cursor: "pointer",
              display: "flex", color: C.mid }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* content */}
      {loading ? (
        <Loader state="Loading classes…" />
      ) : error ? (
        <ErrorBox msg={error} />
      ) : filtered.length === 0 ? (
        <EmptyBox msg={search ? "No classes match your search." : "No classes found."} />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}>
          {filtered
            .sort((a, b) =>
              (parseInt(a.grade) || 0) - (parseInt(b.grade) || 0) ||
              String(a.section || "").localeCompare(String(b.section || ""))
            )
            .map(cs => (
              <ClassCard
                key={cs.id}
                cs={cs}
                onClick={() => setSelClass(cs)}
              />
            ))
          }
        </div>
      )}
    </div>
  );
}