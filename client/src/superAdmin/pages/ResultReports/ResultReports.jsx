// client/src/superAdmin/pages/SuperAdminExamsPage.jsx
//
// Super Admin — Exams & Results
// Fetches across ALL schools under the university.
// Features: gender filter, pass/fail filter, exam filter, class filter,
//           search, pagination, stats cards, Excel export.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart2, Users, TrendingUp, Award, BookOpen, Search, X,
  Loader2, AlertCircle, CheckCircle2, XCircle, Minus,
  Download, ChevronLeft, ChevronRight, Filter,
  GraduationCap, UserCheck, UserX, Percent, FileSpreadsheet,
  RefreshCw, School, Calendar,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";
import { downloadSuperAdminResultsExcel } from "../../../utils/downloadSuperAdminResultsExcel";


/* ─── config ─────────────────────────────────────────────────────────────── */
const API_URL = import.meta.env.VITE_API_URL;
const font = { fontFamily: "'Inter', sans-serif" };

const C = {
  dark:    "#1C3044",
  mid:     "#6A89A7",
  border:  "#C8DCF0",
  bg:      "#EDF3FA",
  card:    "#ffffff",
  hover:   "#f0f6ff",
  success: "#059669",
  warn:    "#d97706",
  danger:  "#dc2626",
  blue:    "#384959",
  purple:  "#6A89A7",
  accent:  "#2d4a64",
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
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
  if (!grade || grade === "—") return { color: C.mid, bg: "#f1f5f9" };
  if (grade === "A+")  return { color: "#059669", bg: "#f0fdf4" };
  if (grade === "A")   return { color: "#0ea5e9", bg: "#f0f9ff" };
  if (grade === "B")   return { color: "#7c3aed", bg: "#f5f3ff" };
  if (grade === "C")   return { color: "#d97706", bg: "#fffbeb" };
  if (grade === "D")   return { color: "#ea580c", bg: "#fff7ed" };
  if (grade === "F")   return { color: "#dc2626", bg: "#fef2f2" };
  return { color: C.mid, bg: "#f1f5f9" };
}

function pctBar(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const color =
    p >= 80 ? C.success :
    p >= 60 ? C.blue :
    p >= 40 ? C.warn : C.danger;
  return { p, color };
}

/* ─── StatCard ───────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      background: C.card,
      border: `1.5px solid ${C.border}`,
      borderRadius: 16,
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: accent + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={18} color={accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ ...font, fontSize: 10, fontWeight: 600, color: C.mid, margin: 0, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</p>
        <p style={{ ...font, fontSize: 20, fontWeight: 800, color: C.dark, margin: "2px 0 0" }}>{value}</p>
        {sub && <p style={{ ...font, fontSize: 10, color: C.mid, margin: "1px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Select dropdown ────────────────────────────────────────────────────── */
function Select({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...font,
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 12px",
        borderRadius: 10,
        border: `1.5px solid ${C.border}`,
        background: C.card,
        color: C.dark,
        cursor: "pointer",
        outline: "none",
        minWidth: 140,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

/* ─── Loader / Error / Empty ─────────────────────────────────────────────── */
function Loader({ msg = "Loading…" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px", color: C.mid, ...font, fontSize: 13 }}>
      <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
      {msg}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "16px 20px", borderRadius: 12,
      background: "#fef2f2", border: `1.5px solid #fca5a5`,
      color: C.danger, ...font, fontSize: 13, fontWeight: 600,
    }}>
      <AlertCircle size={16} /> {msg}
    </div>
  );
}

function EmptyBox({ msg }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "60px 20px", gap: 12, color: C.mid,
    }}>
      <BookOpen size={36} color={C.border} />
      <p style={{ ...font, fontSize: 13, fontWeight: 600, margin: 0 }}>{msg}</p>
    </div>
  );
}

/* ─── Results Table ──────────────────────────────────────────────────────── */
function ResultsTable({ rows }) {
  if (!rows.length) return <EmptyBox msg="No results match the selected filters." />;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
        <thead>
          <tr style={{ background: "#f8fbff" }}>
            {["#", "Student", "Gender", "Admission No", "Roll No", "Class", "Marks", "Percentage", "Grade", "Status"].map(h => (
              <th key={h} style={{
                ...font, padding: "10px 12px", textAlign: "left",
                fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                textTransform: "uppercase", color: C.mid,
                borderBottom: `1.5px solid ${C.border}`,
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const pct = Number(r.percentage ?? 0);
            const bar = pctBar(pct);
            const gc = gradeColor(r.grade || getGrade(pct));
            const isPassed = r.isPassed;
            const className = r.classSection
              ? `${r.classSection.grade}${r.classSection.section ? ` – ${r.classSection.section}` : ""}`
              : "—";

            return (
              <tr key={r.resultId || i} style={{ borderBottom: `1px solid ${C.border}`, transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <td style={{ ...font, padding: "11px 12px", fontSize: 12, color: C.mid }}>{i + 1}</td>
                <td style={{ ...font, padding: "11px 12px", fontSize: 13, fontWeight: 700, color: C.dark, whiteSpace: "nowrap" }}>
                  {r.studentName}
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <span style={{
                    ...font, fontSize: 10, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 20,
                    background: r.gender === "MALE" ? "#eff6ff" : r.gender === "FEMALE" ? "#fdf2f8" : "#f1f5f9",
                    color: r.gender === "MALE" ? "#1d4ed8" : r.gender === "FEMALE" ? "#9333ea" : C.mid,
                  }}>
                    {r.gender === "MALE" ? "Boy" : r.gender === "FEMALE" ? "Girl" : "—"}
                  </span>
                </td>
                <td style={{ ...font, padding: "11px 12px", fontSize: 12, color: C.mid }}>{r.admissionNumber}</td>
                <td style={{ ...font, padding: "11px 12px", fontSize: 12, color: C.mid }}>{r.rollNumber}</td>
                <td style={{ ...font, padding: "11px 12px", fontSize: 12, color: C.dark, fontWeight: 600, whiteSpace: "nowrap" }}>{className}</td>
                <td style={{ ...font, padding: "11px 12px", fontSize: 13, color: C.dark }}>
                  <strong>{r.totalMarks}</strong>
                  <span style={{ color: C.mid }}> / {r.maxMarks}</span>
                </td>
                <td style={{ padding: "11px 12px", minWidth: 120 }}>
                  {pct > 0 ? (
                    <div>
                      <div style={{ height: 5, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginBottom: 3 }}>
                        <div style={{ height: "100%", width: `${bar.p}%`, borderRadius: 99, background: bar.color }} />
                      </div>
                      <span style={{ ...font, fontSize: 12, color: C.dark, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                    </div>
                  ) : <span style={{ ...font, fontSize: 12, color: C.mid }}>—</span>}
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <span style={{
                    ...font, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                    background: gc.bg, color: gc.color,
                    border: `1px solid ${gc.color}33`,
                  }}>
                    {r.grade || getGrade(pct)}
                  </span>
                </td>
                <td style={{ padding: "11px 12px" }}>
                  {isPassed ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...font, fontSize: 12, color: C.success, fontWeight: 600 }}>
                      <CheckCircle2 size={13} /> Pass
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...font, fontSize: 12, color: C.danger, fontWeight: 600 }}>
                      <XCircle size={13} /> Fail
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

/* ─── Pagination ─────────────────────────────────────────────────────────── */
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (page <= 4) return i + 1;
    if (page >= totalPages - 3) return totalPages - 6 + i;
    return page - 3 + i;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "16px 0", flexWrap: "wrap" }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{
          ...font, padding: "6px 10px", borderRadius: 8,
          border: `1.5px solid ${C.border}`, background: C.card,
          color: page <= 1 ? C.border : C.mid, cursor: page <= 1 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
        }}
      >
        <ChevronLeft size={14} /> Prev
      </button>

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            ...font, padding: "6px 12px", borderRadius: 8,
            border: `1.5px solid ${p === page ? C.dark : C.border}`,
            background: p === page ? C.dark : C.card,
            color: p === page ? "#fff" : C.mid,
            cursor: "pointer", fontSize: 12, fontWeight: 700,
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{
          ...font, padding: "6px 10px", borderRadius: 8,
          border: `1.5px solid ${C.border}`, background: C.card,
          color: page >= totalPages ? C.border : C.mid,
          cursor: page >= totalPages ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
        }}
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ─── Charts Section ─────────────────────────────────────────────────────── */
function DonutChart({ slices, size = 120, strokeWidth = 18 }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8f0f8" strokeWidth={strokeWidth} />
      {slices.map((sl, i) => {
        const dash = (sl.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={sl.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

function BarChartSimple({ bars, maxVal }) {
  const max = maxVal || Math.max(...bars.map(b => b.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90, padding: "0 4px" }}>
      {bars.map((b, i) => {
        const h = Math.round((b.value / max) * 90);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ ...font, fontSize: 11, fontWeight: 700, color: b.color }}>{b.value}</span>
            <div style={{
              width: "100%", height: h, borderRadius: "6px 6px 0 0",
              background: `linear-gradient(180deg, ${b.color}ee 0%, ${b.color}88 100%)`,
              transition: "height .4s ease",
              minHeight: b.value > 0 ? 4 : 0,
            }} />
            <span style={{ ...font, fontSize: 10, color: C.mid, fontWeight: 600, textAlign: "center" }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChartsSection({ stats }) {
  const [genderFilter, setGenderFilter] = useState("all");
  const [passFilter,   setPassFilter]   = useState("all");

  if (!stats) return null;

  const boys   = stats.totalBoys   || 0;
  const girls  = stats.totalGirls  || 0;
  const passed = stats.totalPassed || 0;
  const failed = stats.totalFailed || 0;
  const absent = stats.totalAbsent || 0;
  const total  = stats.totalStudents || 1;

  // Gender chart data
  const genderSlices = genderFilter === "girls"
    ? [{ value: girls,      color: "#9333ea", label: "Girls" }]
    : genderFilter === "boys"
    ? [{ value: boys,       color: "#1d4ed8", label: "Boys" }]
    : [
        { value: boys,      color: "#1d4ed8", label: "Boys" },
        { value: girls,     color: "#9333ea", label: "Girls" },
      ];

  const genderBars = genderFilter === "girls"
    ? [{ value: girls,  color: "#9333ea", label: "Girls" }]
    : genderFilter === "boys"
    ? [{ value: boys,   color: "#1d4ed8", label: "Boys" }]
    : [
        { value: boys,  color: "#1d4ed8", label: "Boys" },
        { value: girls, color: "#9333ea", label: "Girls" },
      ];

  // Pass/Fail chart data
  const passSlices = passFilter === "pass"
    ? [{ value: passed, color: "#059669", label: "Pass" }]
    : passFilter === "fail"
    ? [{ value: failed, color: "#dc2626", label: "Fail" }]
    : [
        { value: passed, color: "#059669", label: "Pass" },
        { value: failed, color: "#dc2626", label: "Fail" },
        ...(absent > 0 ? [{ value: absent, color: "#94a3b8", label: "Absent" }] : []),
      ];

  const passBars = passFilter === "pass"
    ? [{ value: passed, color: "#059669", label: "Passed" }]
    : passFilter === "fail"
    ? [{ value: failed, color: "#dc2626", label: "Failed" }]
    : [
        { value: passed, color: "#059669", label: "Passed" },
        { value: failed, color: "#dc2626", label: "Failed" },
        ...(absent > 0 ? [{ value: absent, color: "#94a3b8", label: "Absent" }] : []),
      ];

  const genderTotal = genderFilter === "all" ? (boys + girls) || 1 : genderFilter === "boys" ? boys || 1 : girls || 1;
  const passTotal   = passFilter   === "all" ? (passed + failed + absent) || 1 : passFilter === "pass" ? passed || 1 : failed || 1;

  const ChartCard = ({ title, subtitle, filter, setFilter, filterOptions, slices, bars, centerTotal, legend }) => (
    <div style={{
      flex: 1, minWidth: 0,
      background: C.card,
      border: `1.5px solid ${C.border}`,
      borderRadius: 18,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...font, fontSize: 13, fontWeight: 800, color: C.dark, margin: 0 }}>{title}</p>
          <p style={{ ...font, fontSize: 10, color: C.mid, margin: "2px 0 0" }}>{subtitle}</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            ...font, fontSize: 11, fontWeight: 700,
            padding: "5px 10px", borderRadius: 8,
            border: `1.5px solid ${C.border}`,
            background: C.bg, color: C.dark,
            cursor: "pointer", outline: "none",
          }}
        >
          {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Charts row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {/* Donut */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <DonutChart slices={slices} size={110} strokeWidth={20} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}>
            <p style={{ ...font, fontSize: 16, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1 }}>{centerTotal}</p>
            <p style={{ ...font, fontSize: 9, color: C.mid, margin: "2px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Total</p>
          </div>
        </div>

        {/* Bar */}
        <div style={{ flex: 1, minWidth: 100 }}>
          <BarChartSimple bars={bars} />
          {/* Baseline */}
          <div style={{ height: 1.5, background: C.border, borderRadius: 99, marginTop: 2 }} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {legend.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            <span style={{ ...font, fontSize: 10, fontWeight: 700, color: C.mid }}>{l.label}</span>
            <span style={{ ...font, fontSize: 11, fontWeight: 800, color: C.dark }}>{l.value}</span>
            <span style={{ ...font, fontSize: 10, color: C.mid }}>
              ({((l.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
      <ChartCard
        title="Gender Distribution"
        subtitle="Students by gender"
        filter={genderFilter}
        setFilter={setGenderFilter}
        filterOptions={[
          { value: "all",   label: "All Students" },
          { value: "boys",  label: "Boys Only" },
          { value: "girls", label: "Girls Only" },
        ]}
        slices={genderSlices}
        bars={genderBars}
        centerTotal={genderFilter === "all" ? boys + girls : genderFilter === "boys" ? boys : girls}
        legend={
          genderFilter === "all"
            ? [{ label: "Boys",  value: boys,  color: "#1d4ed8" }, { label: "Girls", value: girls, color: "#9333ea" }]
            : genderFilter === "boys"
            ? [{ label: "Boys",  value: boys,  color: "#1d4ed8" }]
            : [{ label: "Girls", value: girls, color: "#9333ea" }]
        }
      />

      <ChartCard
        title="Pass / Fail Breakdown"
        subtitle="Result status distribution"
        filter={passFilter}
        setFilter={setPassFilter}
        filterOptions={[
          { value: "all",  label: "All Results" },
          { value: "pass", label: "Passed Only" },
          { value: "fail", label: "Failed Only" },
        ]}
        slices={passSlices}
        bars={passBars}
        centerTotal={passFilter === "all" ? passed + failed + absent : passFilter === "pass" ? passed : failed}
        legend={
          passFilter === "all"
            ? [
                { label: "Passed", value: passed, color: "#059669" },
                { label: "Failed", value: failed, color: "#dc2626" },
                ...(absent > 0 ? [{ label: "Absent", value: absent, color: "#94a3b8" }] : []),
              ]
            : passFilter === "pass"
            ? [{ label: "Passed", value: passed, color: "#059669" }]
            : [{ label: "Failed", value: failed, color: "#dc2626" }]
        }
      />
    </div>
  );
}

/* ─── Excel Export helpers ───────────────────────────────────────────────── */
async function fetchAllRows(baseParams) {
  const params = new URLSearchParams(baseParams);
  const res = await fetch(`${API_URL}/api/superadmin-exams/results/export?${params}`, {
    headers: authHdr(),
  });
  const j = await res.json();
  return j.data || [];
}



/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminExamsPage() {
  // ── Data state ────────────────────────────────────────────────────────
  const [academicYears,  setAcademicYears]  = useState([]);
  const [classSections,  setClassSections]  = useState([]);
  const [examGroups,     setExamGroups]     = useState([]);
  const [results,        setResults]        = useState([]);
  const [stats,          setStats]          = useState(null);
  const [total,          setTotal]          = useState(0);
  const [totalPages,     setTotalPages]     = useState(1);

  // ── Filter state ─────────────────────────────────────────────────────
  const [selYear,        setSelYear]        = useState("");
  const [selClass,       setSelClass]       = useState("all");
  const [selExam,        setSelExam]        = useState("");
  const [selGender,      setSelGender]      = useState("ALL");
  const [selStatus,      setSelStatus]      = useState("all");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const PAGE_SIZE = 50;

  // ── Loading state ─────────────────────────────────────────────────────
  const [loadingMeta,    setLoadingMeta]    = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [error,          setError]          = useState("");

  // ── Load academic years + class sections ──────────────────────────────
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      apiFetch("/api/superadmin-exams/academic-years"),
      apiFetch("/api/superadmin-exams/class-sections"),
    ])
      .then(([yearsRes, sectionsRes]) => {
        const years = yearsRes.data || [];
        setAcademicYears(years);
        const active = years.find(y => y.isActive) || years[0];
        if (active) setSelYear(active.id);
        setClassSections(sectionsRes.data || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingMeta(false));
  }, []);

  // ── Load exam groups when academic year changes ───────────────────────
  useEffect(() => {
    if (!selYear) return;
    apiFetch(`/api/superadmin-exams/groups?academicYearId=${selYear}`)
      .then(res => {
        const groups = res.data || [];
        setExamGroups(groups);
        setSelExam(groups[0]?.id || "");
      })
      .catch(e => setError(e.message));
  }, [selYear]);

  // ── Load results when any filter changes ─────────────────────────────
  const fetchResults = useCallback(() => {
    if (!selExam) return;
    setLoadingResults(true);
    setError("");

    const params = new URLSearchParams({
      assessmentGroupId: selExam,
      gender: selGender,
      status: selStatus,
      search,
      page,
      pageSize: PAGE_SIZE,
    });
    if (selClass !== "all") params.set("classSectionId", selClass);

    apiFetch(`/api/superadmin-exams/results/detail?${params}`)
      .then(res => {
        setResults(res.data || []);
        setStats(res.stats || null);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingResults(false));
  }, [selExam, selClass, selGender, selStatus, search, page]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [selExam, selClass, selGender, selStatus, search]);

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = async (type) => {
    if (!selExam) { alert("Select an exam first."); return; }
    setExportLoading(true);
  
    const baseParams = { assessmentGroupId: selExam, search };
    if (selClass !== "all") baseParams.classSectionId = selClass;
  
    const examObj   = examGroups.find((g) => g.id === selExam);
    const examName  = examObj?.name   || "Exam";
    const termName  = examObj?.term?.name || "";
    const classLabel =
      selClass === "all"
        ? "All Classes"
        : yearSections.find((s) => s.id === selClass)?.name || "Class";
  
    try {
      let rows;
      if (type === "all") {
        rows = await fetchAllRows(baseParams);
      } else if (type === "pass") {
        rows = await fetchAllRows({ ...baseParams, status: "pass" });
      } else if (type === "fail") {
        rows = await fetchAllRows({ ...baseParams, status: "fail" });
      } else if (type === "boys") {
        rows = await fetchAllRows({ ...baseParams, gender: "MALE" });
      } else if (type === "girls") {
        rows = await fetchAllRows({ ...baseParams, gender: "FEMALE" });
      }
  
      downloadSuperAdminResultsExcel(rows, {
        schoolName: "Your University Name",   // replace with your actual university name variable
        examName,
        termName,
        className: classLabel,
      });
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Filtered class sections for the active year's schools ─────────────
  const yearSections = useMemo(() => {
    if (!selYear) return classSections;
    // Get school IDs that have this academic year
    const yearSchoolIds = new Set(
      academicYears.filter(y => y.id === selYear).map(y => y.schoolId)
    );
    return classSections.filter(cs => yearSchoolIds.has(cs.schoolId));
  }, [classSections, selYear, academicYears]);

  /* ─── render ─────────────────────────────────────────────────────────── */
  if (loadingMeta) return <Loader msg="Loading exams data…" />;

  const selExamObj = examGroups.find(g => g.id === selExam);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...font }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, #1C3044 0%, #2d4a64 100%)`,
        padding: "20px 20px 24px",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <GraduationCap size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ ...font, fontSize: 17, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                  Exams & Results
                </h1>
                <p style={{ ...font, fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "3px 0 0" }}>
                  University-wide performance overview · All schools
                </p>
              </div>
            </div>

            {/* Year selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={13} color="rgba(255,255,255,0.5)" />
              <select
                value={selYear}
                onChange={e => { setSelYear(e.target.value); setSelClass("all"); }}
                style={{
                  ...font, fontSize: 12, fontWeight: 600,
                  padding: "7px 12px", borderRadius: 10,
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff", cursor: "pointer", outline: "none",
                }}
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id} style={{ color: C.dark, background: "#fff" }}>{y.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* ── Filters row ──────────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 16, border: `1.5px solid ${C.border}`,
          padding: "14px 16px", marginBottom: 20,
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
        }}>
          <Filter size={14} color={C.mid} />
          <span style={{ ...font, fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: ".06em" }}>Filters</span>

          {/* Exam */}
          <Select value={selExam} onChange={v => { setSelExam(v); setPage(1); }} style={{ maxWidth: 200 }}>
            {examGroups.length === 0 && <option value="">No exams found</option>}
            {examGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>

          {/* Class */}
          <Select value={selClass} onChange={v => { setSelClass(v); setPage(1); }}>
            <option value="all">All Classes</option>
            {yearSections.map(cs => (
              <option key={cs.id} value={cs.id}>
                Grade {cs.grade}{cs.section ? ` – ${cs.section}` : ""}
                {cs.school ? ` (${cs.school.code})` : ""}
              </option>
            ))}
          </Select>

          {/* Gender */}
          <Select value={selGender} onChange={v => { setSelGender(v); setPage(1); }}>
            <option value="ALL">All Students</option>
            <option value="MALE">Boys Only</option>
            <option value="FEMALE">Girls Only</option>
          </Select>

          {/* Status */}
          <Select value={selStatus} onChange={v => { setSelStatus(v); setPage(1); }}>
            <option value="all">All Results</option>
            <option value="pass">Passed Only</option>
            <option value="fail">Failed Only</option>
          </Select>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.bg, border: `1.5px solid ${C.border}`,
            borderRadius: 10, padding: "7px 12px", flex: 1, minWidth: 200, maxWidth: 280,
          }}>
            <Search size={13} color={C.mid} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, admission no, roll no…"
              style={{
                ...font, fontSize: 12, border: "none", background: "transparent",
                outline: "none", color: C.dark, width: "100%",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                <X size={12} color={C.mid} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchResults}
            style={{
              ...font, fontSize: 12, fontWeight: 600,
              padding: "8px 12px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: C.card,
              color: C.mid, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* ── Stats Cards ───────────────────────────────────────────────── */}
        {stats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}>
            <StatCard icon={Users}      label="Total Students"  value={stats.totalStudents}  accent="#384959" />
            <StatCard icon={UserCheck}  label="Total Boys"      value={stats.totalBoys}      accent="#1d4ed8" />
            <StatCard icon={UserCheck}  label="Total Girls"     value={stats.totalGirls}     accent="#9333ea" />
            <StatCard icon={CheckCircle2} label="Total Passed"  value={stats.totalPassed}    accent={C.success} />
            <StatCard icon={XCircle}    label="Total Failed"    value={stats.totalFailed}    accent={C.danger} />
            <StatCard icon={Minus}      label="Total Absent"    value={stats.totalAbsent ?? 0} accent={C.mid} />
            <StatCard icon={Percent}    label="Pass %"          value={`${stats.passPercentage}%`} accent={C.success}
              sub={`${stats.failPercentage}% failed`}
            />
          </div>
        )}

        {/* ── Charts ───────────────────────────────────────────────────── */}
        {stats && <ChartsSection stats={stats} />}

        {/* ── Export Buttons ────────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`,
          padding: "12px 16px", marginBottom: 20,
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        }}>
          <FileSpreadsheet size={15} color={C.mid} />
          <span style={{ ...font, fontSize: 11, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: ".06em", marginRight: 4 }}>
            Export Excel
          </span>

          {[
            { label: "All Students",   type: "all",   color: "#059669", bg: "#f0fdf4" },
            { label: "Passed Only",    type: "pass",  color: "#0ea5e9", bg: "#f0f9ff" },
            { label: "Failed Only",    type: "fail",  color: "#dc2626", bg: "#fef2f2" },
            { label: "Boys Only",      type: "boys",  color: "#1d4ed8", bg: "#eff6ff" },
            { label: "Girls Only",     type: "girls", color: "#9333ea", bg: "#f5f3ff" },
          ].map(({ label, type, color, bg }) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              disabled={exportLoading || !selExam}
              style={{
                ...font, fontSize: 11, fontWeight: 700,
                padding: "7px 14px", borderRadius: 20,
                border: `1.5px solid ${color}40`,
                background: bg, color,
                cursor: exportLoading || !selExam ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
                opacity: exportLoading ? 0.7 : 1,
                transition: "opacity .2s",
              }}
            >
              <Download size={12} />
              {label}
            </button>
          ))}

          {exportLoading && (
            <Loader2 size={14} color={C.mid} style={{ animation: "spin 1s linear infinite" }} />
          )}
        </div>

        {/* ── Results Table Card ────────────────────────────────────────── */}
        <div style={{
          background: C.card, borderRadius: 18,
          border: `1.5px solid ${C.border}`,
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            justifyContent: "space-between", gap: 10,
            padding: "14px 16px 12px",
            borderBottom: `1.5px solid ${C.border}`,
          }}>
            <div>
              <h2 style={{ ...font, fontSize: 14, fontWeight: 800, color: C.dark, margin: 0 }}>
                {selExamObj?.name || "Select an Exam"} — Student Results
              </h2>
              <p style={{ ...font, fontSize: 11, color: C.mid, margin: "2px 0 0" }}>
                {total} students
                {selClass !== "all" && ` · ${yearSections.find(s => s.id === selClass)?.name || ""}`}
                {selGender !== "ALL" && ` · ${selGender === "MALE" ? "Boys" : "Girls"}`}
                {selStatus !== "all" && ` · ${selStatus === "pass" ? "Passed" : "Failed"}`}
                {search && ` · Search: "${search}"`}
              </p>
            </div>
            {loadingResults && (
              <Loader2 size={15} color={C.mid} style={{ animation: "spin 1s linear infinite" }} />
            )}
          </div>

          {/* Error */}
          {error && <div style={{ padding: 16 }}><ErrorBox msg={error} /></div>}

          {/* Content */}
          {loadingResults ? (
            <Loader msg="Loading results…" />
          ) : !selExam ? (
            <EmptyBox msg="Select an exam to view results." />
          ) : (
            <>
              <ResultsTable rows={results} />
              {total > PAGE_SIZE && (
                <div style={{ borderTop: `1px solid ${C.border}` }}>
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  <p style={{ ...font, fontSize: 11, color: C.mid, textAlign: "center", paddingBottom: 12 }}>
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} results
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { color: #1C3044; background: white; }
      `}</style>
    </div>
  );
}