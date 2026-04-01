import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  BarChart3,
  Pencil,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddResult from "./AddResult";
import { getToken } from "../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ─── Design token palette ──
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  deepDark:    "#243340",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const GRADE_COLOR = {
  "A+": "#0d7a55",
  A:   "#0a6e8a",
  B:   "#2563a8",
  C:   "#b45309",
  D:   "#c2410c",
  F:   "#b91c1c",
  AB:  "#7c3aed",
};

const GRADE_BG = {
  "A+": "#e6f7f1",
  A:   "#e5f4f9",
  B:   "#e8f0fb",
  C:   "#fef3e2",
  D:   "#fef0e8",
  F:   "#fdecea",
  AB:  "#f3e8ff",
};

const COL = "2fr 1fr 1fr 1fr 1.5fr 0.7fr 72px";
const PAGE_SIZE = 20;

// ── Skeleton pulse ─────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

export default function Result() {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [results, setResults]       = useState([]);
  const [exams, setExams]           = useState([]);
  const [classes, setClasses]       = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [search, setSearch]         = useState("");
  const [filters, setFilters]       = useState({ exam: "", cls: "", subject: "" });
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [error, setError]           = useState("");
  const [page, setPage]             = useState(1);

  // Reset to page 1 whenever filters or search change
  useEffect(() => { setPage(1); }, [search, filters]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/results/exams`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/results/teacher/classes`, { headers }).then((r) => r.json()),
    ]).then(([ej, cj]) => {
      if (ej.success) setExams(ej.data || []);
      if (cj.success) setClasses(cj.classes || []);
    });
  }, []);

  useEffect(() => {
    setSubjects([]);
    setFilters((f) => ({ ...f, subject: "" }));
    if (!filters.cls) return;
    const params = filters.exam ? `?assessmentGroupId=${filters.exam}` : "";
    fetch(`${API}/api/results/teacher/classes/${filters.cls}/subjects${params}`, { headers })
      .then((r) => r.json())
      .then((j) => { if (j.success) setSubjects(j.subjects || []); });
  }, [filters.cls, filters.exam]);

  const loadResults = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim())   params.set("search", search.trim());
      if (filters.exam)    params.set("assessmentGroupId", filters.exam);
      if (filters.cls)     params.set("classSectionId", filters.cls);
      if (filters.subject) params.set("subjectId", filters.subject);
      const j = await fetch(`${API}/api/results/list?${params}`, { headers }).then((r) => r.json());
      if (!j.success) throw new Error(j.message);
      setResults(j.data || []);
    } catch (e) {
      setError(e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadResults(); }, [search, filters]);

  // ── Pagination derived values ──
  const totalPages  = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pagedResults = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, safePage]);

  const stats = useMemo(() => {
    if (!results.length) return { avg: 0, top: 0, pass: 0 };
    return {
      avg: Math.round(results.reduce((s, r) => s + (Number(r.percentage) || 0), 0) / results.length),
      top: Math.max(...results.map((r) => Number(r.percentage) || 0)),
      pass: results.filter((r) => r.grade !== "F" && r.grade !== "AB").length,
    };
  }, [results]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this mark entry?")) return;
    try {
      const j = await fetch(`${API}/api/results/marks/${id}`, { method: "DELETE", headers }).then((r) => r.json());
      if (j.success) loadResults();
      else alert(j.message || "Delete failed");
    } catch {
      alert("Delete failed");
    }
  };

  const handleEdit = (r) => {
    setEditRecord({ markId: r.id, examId: r.examId, classSectionId: r.classSectionId, subjectId: r.subjectId });
    setShowAdd(true);
  };

  const handleCloseAdd = () => { setShowAdd(false); setEditRecord(null); };
  const handleSaved    = () => { handleCloseAdd(); loadResults(); };
  const setFilter      = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  // ── Page number chips to render ──
  const pageChips = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const chips = new Set([1, totalPages, safePage]);
    if (safePage > 1) chips.add(safePage - 1);
    if (safePage < totalPages) chips.add(safePage + 1);
    return Array.from(chips).sort((a, b) => a - b);
  }, [totalPages, safePage]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .res-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(56,73,89,0.10) !important; }
        .res-stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .res-row:hover { background: ${C.bg} !important; }
        .res-row { transition: background 0.15s; }
        .res-action-btn:hover { opacity: 0.78; }
        .page-btn { transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s; }
        .page-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .page-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={{
        padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)",
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                  Exam Results
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                  Your classes and subjects only
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={loadResults}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: C.white,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <RefreshCw size={16} color={C.deep} />
              </button>

              <button
                onClick={() => { setEditRecord(null); setShowAdd(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
                  borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Plus size={15} /> Add Result
              </button>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
            borderRadius: 12, background: "#fee8e8", border: "1px solid #f5b0b0",
            marginBottom: 16, fontSize: 13, color: "#8b1c1c",
          }}>
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }} className="fade-up">
          {[
            { label: "Total Results",  value: results.length,                                                                    sub: "Saved entries" },
            { label: "Class Average",  value: `${stats.avg}%`,                                                                   sub: "Across filters" },
            { label: "Top Score",      value: `${stats.top}%`,                                                                   sub: "Highest performer" },
            { label: "Pass Rate",      value: `${results.length ? Math.round((stats.pass / results.length) * 100) : 0}%`,        sub: `${stats.pass} passed` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="res-stat-card" style={{
              background: C.white, borderRadius: 16, padding: "16px 20px",
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, margin: "0 0 4px" }}>
                {label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: C.textLight, marginTop: 2, margin: "2px 0 0" }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
          padding: "14px 18px", display: "flex", gap: 12, flexWrap: "wrap",
          alignItems: "center", marginBottom: 16,
          boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
        }} className="fade-up">

          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textLight }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll number…"
              style={{
                width: "100%", paddingLeft: 36, padding: "10px 14px 10px 36px",
                borderRadius: 12, border: `1.5px solid ${C.border}`,
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: C.text, background: C.bg, outline: "none",
              }}
            />
          </div>

          <select
            value={filters.exam}
            onChange={(e) => setFilter("exam", e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.text,
              background: C.bg, outline: "none", cursor: "pointer", minWidth: 150,
            }}
          >
            <option value="">All Exams</option>
            {exams.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>

          <select
            value={filters.cls}
            onChange={(e) => setFilter("cls", e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.text,
              background: C.bg, outline: "none", cursor: "pointer", minWidth: 150,
            }}
          >
            <option value="">All Classes</option>
            {classes.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>

          <select
            value={filters.subject}
            onChange={(e) => setFilter("subject", e.target.value)}
            disabled={!filters.cls}
            style={{
              padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.text,
              background: C.bg, outline: "none",
              cursor: filters.cls ? "pointer" : "default",
              minWidth: 150, opacity: filters.cls ? 1 : 0.5,
            }}
          >
            <option value="">{filters.cls ? "All Subjects" : "Select class first"}</option>
            {subjects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>

          <span style={{ fontSize: 12, color: C.textLight }}>
            {loading ? "Loading…" : `${results.length} result${results.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* ── Results table ── */}
        <div style={{
          background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
          boxShadow: "0 2px 8px rgba(56,73,89,0.06)", overflowX: "auto",
        }} className="fade-up">

          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: COL, gap: 14,
            padding: "12px 20px", background: C.bg,
            borderBottom: `1px solid ${C.borderLight}`, minWidth: 900,
          }}>
            {["Student", "Class", "Subject", "Exam", "Score", "Grade", ""].map((h, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 700, color: C.textLight,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: COL, gap: 14, alignItems: "center", minWidth: 900 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Pulse w={32} h={32} r="50%" />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <Pulse w="70%" h={11} /><Pulse w="40%" h={9} />
                    </div>
                  </div>
                  <Pulse w="60%" h={11} />
                  <Pulse w="70%" h={11} />
                  <Pulse w="80%" h={20} r={8} />
                  <Pulse w="90%" h={11} />
                  <Pulse w={40} h={22} r={8} />
                  <Pulse w={60} h={28} r={8} />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "60px 20px", gap: 12,
            }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.mist}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={26} color={C.slate} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep }}>No results found</p>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>Try adjusting your filters or add a result</p>
              <button
                onClick={() => { setEditRecord(null); setShowAdd(true); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 10, border: `1.5px solid ${C.border}`,
                  background: C.bg, color: C.slate, fontFamily: "'Inter', sans-serif",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Plus size={14} /> Add first result
              </button>
            </div>
          ) : (
            pagedResults.map((r, i) => {
              const gc = GRADE_COLOR[r.grade] || "#b91c1c";
              const gb = GRADE_BG[r.grade]   || "#fdecea";
              const isLast = i === pagedResults.length - 1;

              return (
                <div
                  key={r.id}
                  className="res-row"
                  style={{
                    display: "grid", gridTemplateColumns: COL, gap: 14,
                    padding: "12px 20px", alignItems: "center",
                    borderBottom: !isLast ? `1px solid ${C.borderLight}` : "none",
                    minWidth: 900,
                  }}
                >
                  {/* Student */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: `${C.mist}55`, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 12, fontWeight: 800,
                      color: C.text, flexShrink: 0,
                    }}>
                      {r.studentName?.[0] || "S"}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{r.studentName}</p>
                      <p style={{ fontSize: 11, color: C.textLight, margin: 0 }}>{r.rollNo}</p>
                    </div>
                  </div>

                  {/* Class */}
                  <span style={{ fontSize: 13, color: C.deep }}>{r.className}</span>

                  {/* Subject */}
                  <span style={{ fontSize: 13, color: C.deep }}>{r.subject}</span>

                  {/* Exam badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: C.slate,
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "4px 10px", width: "fit-content",
                  }}>
                    {r.exam}
                  </span>

                  {/* Score + progress bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                        {r.isAbsent ? "Absent" : `${r.marks}/${r.totalMarks}`}
                      </span>
                      <span style={{ fontSize: 11, color: C.textLight }}>
                        {r.isAbsent ? "AB" : `${r.percentage}%`}
                      </span>
                    </div>
                    <div style={{ height: 4, background: C.borderLight, borderRadius: 99 }}>
                      <div style={{
                        height: "100%",
                        width: `${r.isAbsent ? 0 : r.percentage}%`,
                        background: gc, borderRadius: 99,
                      }} />
                    </div>
                  </div>

                  {/* Grade badge */}
                  <span style={{
                    fontSize: 12, fontWeight: 800, padding: "3px 8px",
                    borderRadius: 8, color: gc, background: gb,
                    border: `1px solid ${gc}33`, width: "fit-content",
                  }}>
                    {r.grade}
                  </span>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="res-action-btn"
                      onClick={() => handleEdit(r)}
                      title="Edit marks"
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: C.bg, border: `1.5px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      }}
                    >
                      <Pencil size={13} color={C.slate} />
                    </button>

                    <button
                      className="res-action-btn"
                      onClick={() => handleDelete(r.id)}
                      title="Delete entry"
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: "#fff5f5", border: "1.5px solid #f5b0b0",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} color="#c0392b" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* ── Pagination footer (inside the table card) ── */}
          {!loading && results.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px",
              borderTop: `1px solid ${C.borderLight}`,
              background: C.bg,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              flexWrap: "wrap",
              gap: 10,
            }}>

              {/* Left: showing x–y of z */}
              <span style={{ fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                Showing{" "}
                <strong style={{ color: C.deep }}>
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, results.length)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: C.deep }}>{results.length}</strong>{" "}
                result{results.length !== 1 ? "s" : ""}
              </span>

              {/* Right: prev / page chips / next */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

                {/* Previous */}
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 13px", borderRadius: 10,
                    border: `1.5px solid ${safePage === 1 ? C.borderLight : C.border}`,
                    background: safePage === 1 ? C.borderLight + "55" : C.white,
                    color: safePage === 1 ? C.textLight : C.deep,
                    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                    cursor: safePage === 1 ? "default" : "pointer",
                    opacity: safePage === 1 ? 0.55 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                {/* Page chips */}
                <div style={{ display: "flex", gap: 4 }}>
                  {pageChips.map((chip, idx, arr) => {
                    const isActive   = chip === safePage;
                    const showEllipsisBefore = idx > 0 && chip - arr[idx - 1] > 1;

                    return (
                      <span key={chip} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {showEllipsisBefore && (
                          <span style={{ fontSize: 12, color: C.textLight, padding: "0 2px" }}>…</span>
                        )}
                        <button
                          className="page-btn"
                          onClick={() => setPage(chip)}
                          style={{
                            width: 34, height: 34, borderRadius: 10,
                            border: isActive
                              ? `1.5px solid ${C.deep}`
                              : `1.5px solid ${C.border}`,
                            background: isActive
                              ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
                              : C.white,
                            color: isActive ? "#fff" : C.deep,
                            fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: isActive ? 700 : 500,
                            cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: isActive ? `0 2px 8px ${C.deep}33` : "none",
                          }}
                        >
                          {chip}
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Next */}
                <button
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 13px", borderRadius: 10,
                    border: `1.5px solid ${safePage === totalPages ? C.borderLight : C.border}`,
                    background: safePage === totalPages ? C.borderLight + "55" : C.white,
                    color: safePage === totalPages ? C.textLight : C.deep,
                    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                    cursor: safePage === totalPages ? "default" : "pointer",
                    opacity: safePage === totalPages ? 0.55 : 1,
                  }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: "center", color: C.textLight, fontSize: 11, marginTop: 24 }}>
          School Exam Management System · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showAdd && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 9999, padding: 20,
          }}
          onClick={handleCloseAdd}
        >
          <div
            style={{
              width: "100%", maxWidth: 1100, maxHeight: "92vh",
              overflowY: "auto", borderRadius: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddResult editRecord={editRecord} onBack={handleCloseAdd} onSaved={handleSaved} />
          </div>
        </div>
      )}
    </>
  );
}