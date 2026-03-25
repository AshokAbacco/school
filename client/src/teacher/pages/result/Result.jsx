import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  BarChart3,
  Pencil,
} from "lucide-react";
import AddResult from "./AddResult";
import { getToken } from "../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

// ─── Shared styles ─────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#dde8f4",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    padding: "28px 24px",
  },
  wrap: { maxWidth: 1240, margin: "0 auto" },
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 1px 4px rgba(30,60,110,0.07)",
    border: "1px solid rgba(30,60,110,0.07)",
  },
  statCard: {
    background: "#fff",
    borderRadius: 16,
    padding: "16px 20px",
    boxShadow: "0 1px 4px rgba(30,60,110,0.07)",
  },
  input: {
    background: "#f0f5fb",
    border: "1.5px solid rgba(30,60,110,0.12)",
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 13,
    color: "#1a2b4a",
    outline: "none",
    fontFamily: "inherit",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(30,60,110,0.12)",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    background: "#1a2b4a",
    color: "#fff",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    boxShadow: "0 4px 14px rgba(26,43,74,0.25)",
  },
  centerMsg: {
    padding: 40,
    textAlign: "center",
    color: "#7a8fa8",
  },
  errorBox: {
    marginBottom: 14,
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7a8fa8",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
};

const GRADE_COLOR = {
  "A+": "#0d7a55",
  A: "#0a6e8a",
  B: "#2563a8",
  C: "#b45309",
  D: "#c2410c",
  F: "#b91c1c",
  AB: "#7c3aed",
};

const GRADE_BG = {
  "A+": "#e6f7f1",
  A: "#e5f4f9",
  B: "#e8f0fb",
  C: "#fef3e2",
  D: "#fef0e8",
  F: "#fdecea",
  AB: "#f3e8ff",
};

const COL = "2fr 1fr 1fr 1fr 1.5fr 0.7fr 72px";

export default function Result() {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    exam: "",
    cls: "",
    subject: "",
  });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/results/exams`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/results/teacher/classes`, { headers }).then((r) =>
        r.json()
      ),
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

    fetch(
      `${API}/api/results/teacher/classes/${filters.cls}/subjects${params}`,
      { headers }
    )
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSubjects(j.subjects || []);
      });
  }, [filters.cls, filters.exam]);

  const loadResults = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (filters.exam) params.set("assessmentGroupId", filters.exam);
      if (filters.cls) params.set("classSectionId", filters.cls);
      if (filters.subject) params.set("subjectId", filters.subject);

      const j = await fetch(`${API}/api/results/list?${params}`, {
        headers,
      }).then((r) => r.json());

      if (!j.success) throw new Error(j.message);
      setResults(j.data || []);
    } catch (e) {
      setError(e.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [search, filters]);

  const stats = useMemo(() => {
    if (!results.length) return { avg: 0, top: 0, pass: 0 };

    return {
      avg: Math.round(
        results.reduce((s, r) => s + (Number(r.percentage) || 0), 0) /
          results.length
      ),
      top: Math.max(...results.map((r) => Number(r.percentage) || 0)),
      pass: results.filter((r) => r.grade !== "F" && r.grade !== "AB").length,
    };
  }, [results]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this mark entry?")) return;

    try {
      const j = await fetch(`${API}/api/results/marks/${id}`, {
        method: "DELETE",
        headers,
      }).then((r) => r.json());

      if (j.success) loadResults();
      else alert(j.message || "Delete failed");
    } catch {
      alert("Delete failed");
    }
  };

  const handleEdit = (r) => {
    setEditRecord({
      markId: r.id,
      examId: r.examId,
      classSectionId: r.classSectionId,
      subjectId: r.subjectId,
    });
    setShowAdd(true);
  };

  const handleCloseAdd = () => {
    setShowAdd(false);
    setEditRecord(null);
  };

  const handleSaved = () => {
    handleCloseAdd();
    loadResults();
  };

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
  };

  return (
    <div style={S.page} className="">
      <div style={S.wrap}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "#c2d8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={24} color="#1a2b4a" />
            </div>

            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#1a2b4a",
                  margin: 0,
                }}
              >
                Exam Results
              </h1>
              <p style={{ fontSize: 12, color: "#7a8fa8", margin: 0 }}>
                Your classes and subjects only
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={loadResults} style={S.iconBtn}>
              <RefreshCw size={16} color="#1a2b4a" />
            </button>

            <button
              onClick={() => {
                setEditRecord(null);
                setShowAdd(true);
              }}
              style={S.primaryBtn}
            >
              <Plus size={16} /> Add Result
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total Results",
              value: results.length,
              sub: "Saved entries",
            },
            {
              label: "Class Average",
              value: `${stats.avg}%`,
              sub: "Across filters",
            },
            {
              label: "Top Score",
              value: `${stats.top}%`,
              sub: "Highest performer",
            },
            {
              label: "Pass Rate",
              value: `${
                results.length
                  ? Math.round((stats.pass / results.length) * 100)
                  : 0
              }%`,
              sub: `${stats.pass} passed`,
            },
          ].map(({ label, value, sub }) => (
            <div key={label} style={S.statCard}>
              <p style={{ ...S.label, marginBottom: 4 }}>{label}</p>
              <p
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#1a2b4a",
                  margin: 0,
                }}
              >
                {value}
              </p>
              <p style={{ fontSize: 12, color: "#9aacbf", marginTop: 2 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            ...S.card,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9aacbf",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll number…"
              style={{
                ...S.input,
                paddingLeft: 36,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={filters.exam}
            onChange={(e) => setFilter("exam", e.target.value)}
            style={{
              ...S.input,
              appearance: "none",
              cursor: "pointer",
              minWidth: 150,
            }}
          >
            <option value="">All Exams</option>
            {exams.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={filters.cls}
            onChange={(e) => setFilter("cls", e.target.value)}
            style={{
              ...S.input,
              appearance: "none",
              cursor: "pointer",
              minWidth: 150,
            }}
          >
            <option value="">All Classes</option>
            {classes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={filters.subject}
            onChange={(e) => setFilter("subject", e.target.value)}
            disabled={!filters.cls}
            style={{
              ...S.input,
              appearance: "none",
              cursor: filters.cls ? "pointer" : "default",
              minWidth: 150,
              opacity: filters.cls ? 1 : 0.5,
            }}
          >
            <option value="">
              {filters.cls ? "All Subjects" : "Select class first"}
            </option>
            {subjects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <span style={{ fontSize: 12, color: "#9aacbf" }}>
            {loading
              ? "Loading…"
              : `${results.length} result${results.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {error && <div style={S.errorBox}>{error}</div>}

        <div style={{ ...S.card, overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: COL,
              gap: 14,
              padding: "12px 20px",
              background: "#f6f9fd",
              borderBottom: "1px solid #eaf0f8",
              minWidth: 900,
            }}
          >
            {["Student", "Class", "Subject", "Exam", "Score", "Grade", ""].map(
              (h, i) => (
                <span key={i} style={S.label}>
                  {h}
                </span>
              )
            )}
          </div>

          {loading ? (
            <div style={S.centerMsg}>Loading results…</div>
          ) : results.length === 0 ? (
            <div
              style={{
                ...S.centerMsg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "60px 20px",
              }}
            >
              <BarChart3 size={36} color="#c5d4e5" />
              <p style={{ color: "#9aacbf", margin: 0 }}>No results found</p>
              <button
                onClick={() => {
                  setEditRecord(null);
                  setShowAdd(true);
                }}
                style={{
                  color: "#2563a8",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <Plus size={14} /> Add first result
              </button>
            </div>
          ) : (
            results.map((r, i) => {
              const gc = GRADE_COLOR[r.grade] || "#b91c1c";
              const gb = GRADE_BG[r.grade] || "#fdecea";

              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: COL,
                    gap: 14,
                    padding: "12px 20px",
                    alignItems: "center",
                    borderBottom:
                      i < results.length - 1 ? "1px solid #eaf0f8" : "none",
                    minWidth: 900,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#dde8f4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#1a2b4a",
                        flexShrink: 0,
                      }}
                    >
                      {r.studentName?.[0] || "S"}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1a2b4a",
                          margin: 0,
                        }}
                      >
                        {r.studentName}
                      </p>
                      <p style={{ fontSize: 11, color: "#9aacbf", margin: 0 }}>
                        {r.rollNo}
                      </p>
                    </div>
                  </div>

                  <span style={{ fontSize: 13, color: "#4a6180" }}>
                    {r.className}
                  </span>
                  <span style={{ fontSize: 13, color: "#4a6180" }}>
                    {r.subject}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#4a6180",
                      background: "#edf3fb",
                      border: "1px solid #ccdcf0",
                      borderRadius: 8,
                      padding: "4px 10px",
                      width: "fit-content",
                    }}
                  >
                    {r.exam}
                  </span>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#1a2b4a",
                        }}
                      >
                        {r.isAbsent ? "Absent" : `${r.marks}/${r.totalMarks}`}
                      </span>
                      <span style={{ fontSize: 11, color: "#9aacbf" }}>
                        {r.isAbsent ? "AB" : `${r.percentage}%`}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "#eaf0f8",
                        borderRadius: 99,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${r.isAbsent ? 0 : r.percentage}%`,
                          background: gc,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      color: gc,
                      background: gb,
                      border: `1px solid ${gc}33`,
                      width: "fit-content",
                    }}
                  >
                    {r.grade}
                  </span>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleEdit(r)}
                      title="Edit marks"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#e8f0fb",
                        border: "1px solid #b8cff0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={13} color="#2563a8" />
                    </button>

                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Delete entry"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#fdecea",
                        border: "1px solid #f6a5a5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} color="#b91c1c" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#9aacbf",
            fontSize: 11,
            marginTop: 24,
          }}
        >
          School Exam Management System · {new Date().getFullYear()}
        </p>
      </div>

      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={handleCloseAdd}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1100,
              maxHeight: "92vh",
              overflowY: "auto",
              borderRadius: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AddResult
              editRecord={editRecord}
              onBack={handleCloseAdd}
              onSaved={handleSaved}
            />
          </div>
        </div>
      )}
    </div>
  );
}