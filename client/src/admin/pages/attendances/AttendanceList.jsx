// client/src/admin/pages/attendances/AttendanceList.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import PageLayout from "../../components/PageLayout";
import {
  fetchAdminAttendance,
  fetchAttendanceSummary,
} from "./api/adminAttendanceApi";
import { getToken } from "../../../auth/storage";
import {
  Loader2,
  ChevronRight,
  LayoutGrid,
  Users,
  BookOpen,
  GraduationCap,
  Search,
  RefreshCw,
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
} from "lucide-react";
import AttendanceStatsCards from "./components/AttendanceStatsCards";
import AttendanceTableRow from "./components/AttendanceTableRow";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

const C = {
  primary: "#384959",
  secondary: "#6A89A7",
  accent: "#88BDF2",
  light: "#BDDDFC",
  border: "rgba(136,189,242,0.30)",
  bg: "#F4F8FC",
  cardBg: "white",
  softBg: "rgba(189,221,252,0.08)",
};

const GRADE_COLORS = [
  { bar: "#88BDF2", soft: "rgba(136,189,242,0.12)" },
  { bar: "#6A89A7", soft: "rgba(106,137,167,0.12)" },
  { bar: "#BDDDFC", soft: "rgba(189,221,252,0.20)" },
  { bar: "#384959", soft: "rgba(56,73,89,0.08)" },
];

// ── Tiny stat pill ─────────────────────────────────────────────────────────────
function Pill({ icon: Icon, value, color, bg, label }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"
      style={{ background: bg }}
    >
      <div className="flex items-center gap-1">
        <Icon size={11} style={{ color }} />
        <span className="text-sm font-bold" style={{ color }}>
          {value ?? "—"}
        </span>
      </div>
      {label && (
        <span className="text-xs font-medium" style={{ color: C.secondary }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── Thin progress bar ──────────────────────────────────────────────────────────
function RateBar({ rate, barColor }) {
  if (rate === null || rate === undefined)
    return (
      <p className="text-xs mt-2" style={{ color: C.secondary }}>
        No attendance yet
      </p>
    );
  return (
    <div className="mt-2">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: C.secondary }}>
          Attendance
        </span>
        <span className="text-xs font-bold" style={{ color: C.primary }}>
          {rate}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(136,189,242,0.18)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${rate}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────────
function Breadcrumb({ grade, section, onGradeClick, onSectionClick }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
      <button
        onClick={onGradeClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold"
        style={{
          color: grade ? C.secondary : C.primary,
          background: grade ? "transparent" : C.softBg,
          border: grade ? "none" : `1px solid ${C.border}`,
        }}
      >
        <LayoutGrid size={13} /> All Grades
      </button>
      {grade && (
        <>
          <ChevronRight size={14} style={{ color: C.secondary }} />
          <button
            onClick={onSectionClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold"
            style={{
              color: section ? C.secondary : C.primary,
              background: section ? "transparent" : C.softBg,
              border: section ? "none" : `1px solid ${C.border}`,
            }}
          >
            <BookOpen size={13} /> Grade {grade}
          </button>
        </>
      )}
      {section && (
        <>
          <ChevronRight size={14} style={{ color: C.secondary }} />
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold"
            style={{
              color: C.primary,
              background: C.softBg,
              border: `1px solid ${C.border}`,
            }}
          >
            <Users size={13} /> Section {section}
          </span>
        </>
      )}
    </div>
  );
}

const TH = ({ children }) => (
  <th
    className="px-5 py-3.5 text-left"
    style={{
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: C.secondary,
      borderBottom: `1px solid rgba(136,189,242,0.20)`,
      background: "rgba(189,221,252,0.12)",
    }}
  >
    {children}
  </th>
);

export default function AttendanceList() {
  const [sections, setSections] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [gradeSections, setGradeSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [summaryMap, setSummaryMap] = useState({}); // classSectionId → stats
  const [activeYearName, setActiveYearName] = useState("");

  // ── Load sections filtered to active year + summary stats ─────────────────
  const loadSummary = useCallback(async (date) => {
    setSummaryLoading(true);
    try {
      const [sectionsRes, summaryRes] = await Promise.all([
        fetch(`${BASE}/class-sections`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetchAttendanceSummary({ date }),
      ]);
      const sectionsData = await sectionsRes.json();

      // Only show sections active in current year
      const activeIds = new Set(
        summaryRes.summaries.map((s) => s.classSectionId),
      );
      setSections(
        (sectionsData.classSections || []).filter((s) => activeIds.has(s.id)),
      );

      // Build lookup map
      const map = {};
      summaryRes.summaries.forEach((s) => {
        map[s.classSectionId] = s;
      });
      setSummaryMap(map);
      setActiveYearName(summaryRes.academicYear?.name || "");
    } catch (err) {
      console.error("Failed to load sections/summary", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(selectedDate);
  }, [selectedDate, loadSummary]);

  // ── Group by grade ─────────────────────────────────────────────────────────
  const grades = useMemo(() => {
    const g = {};
    sections.forEach((sec) => {
      if (!g[sec.grade]) g[sec.grade] = [];
      g[sec.grade].push(sec);
    });
    return Object.keys(g)
      .sort(
        (a, b) =>
          parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")),
      )
      .reduce((acc, k) => {
        acc[k] = g[k].sort((a, b) =>
          (a.section || "").localeCompare(b.section || ""),
        );
        return acc;
      }, {});
  }, [sections]);

  // ── Grade-level aggregated stats ──────────────────────────────────────────
  const gradeSummary = useMemo(() => {
    const res = {};
    Object.entries(grades).forEach(([grade, secs]) => {
      let total = 0,
        present = 0,
        absent = 0,
        marked = 0;
      secs.forEach((sec) => {
        const s = summaryMap[sec.id] || {};
        total += s.totalStudents || 0;
        present += s.present || 0;
        absent += s.absent || 0;
        marked += s.marked || 0;
      });
      res[grade] = {
        total,
        present,
        absent,
        marked,
        rate: marked > 0 ? Math.round((present / marked) * 100) : null,
      };
    });
    return res;
  }, [grades, summaryMap]);

  // ── Fetch attendance records for selected section ─────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const data = await fetchAdminAttendance({
        classSectionId: selectedSection.id,
        date: selectedDate,
      });
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load attendance", err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleSelectGrade = (grade, secs) => {
    setSelectedGrade(grade);
    setGradeSections(secs);
    setSelectedSection(null);
    setAttendance([]);
  };
  const handleBackToGrades = () => {
    setSelectedGrade(null);
    setGradeSections([]);
    setSelectedSection(null);
    setAttendance([]);
  };
  const handleBackToSections = () => {
    setSelectedSection(null);
    setAttendance([]);
  };

  const viewLevel = !selectedGrade
    ? "grades"
    : !selectedSection
      ? "sections"
      : "attendance";

  const filteredAttendance = useMemo(() => {
    if (!searchTerm) return attendance;
    return attendance.filter((a) =>
      a.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [attendance, searchTerm]);

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: C.primary }}
              />
              <h1 className="text-2xl font-bold" style={{ color: C.primary }}>
                Attendance
              </h1>
              {/* ✅ Active year badge */}
              {activeYearName && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(136,189,242,0.18)",
                    color: C.primary,
                  }}
                >
                  {activeYearName}
                </span>
              )}
            </div>
            <p className="text-sm ml-3" style={{ color: C.secondary }}>
              {viewLevel === "grades" && "Select a grade to view attendance"}
              {viewLevel === "sections" &&
                `Grade ${selectedGrade} — Select a section`}
              {viewLevel === "attendance" &&
                `Grade ${selectedGrade} · Section ${selectedSection?.section}`}
            </p>
          </div>
          {/* ✅ Date picker — changing date refreshes all stats */}
          <div className="relative">
            <CalendarIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.secondary }}
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm pl-9 pr-4 py-2 rounded-xl bg-white focus:outline-none"
              style={{ border: `1px solid ${C.border}`, color: C.primary }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
          </div>
        </div>

        {/* Breadcrumb */}
        {(selectedGrade || selectedSection) && (
          <Breadcrumb
            grade={selectedGrade}
            section={selectedSection?.section}
            onGradeClick={handleBackToGrades}
            onSectionClick={handleBackToSections}
          />
        )}

        {/* ══ LEVEL 1: Grade Cards ══════════════════════════════════════════ */}
        {viewLevel === "grades" && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: `1px solid rgba(136,189,242,0.20)`,
                background: C.softBg,
              }}
            >
              <p className="font-bold text-sm" style={{ color: C.primary }}>
                All Grades
              </p>
              {activeYearName && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(136,189,242,0.15)",
                    color: C.secondary,
                  }}
                >
                  {activeYearName} · {selectedDate}
                </span>
              )}
            </div>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2
                  size={22}
                  className="animate-spin"
                  style={{ color: C.accent }}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: C.secondary }}
                >
                  Loading...
                </p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.keys(grades).map((grade, idx) => {
                  const color = GRADE_COLORS[idx % GRADE_COLORS.length];
                  const gs = gradeSummary[grade] || {};
                  return (
                    <button
                      key={grade}
                      onClick={() => handleSelectGrade(grade, grades[grade])}
                      className="group relative overflow-hidden rounded-2xl bg-white text-left transition-all duration-200 shadow-sm"
                      style={{ border: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(136,189,242,0.20)";
                        e.currentTarget.style.borderColor = C.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "";
                        e.currentTarget.style.borderColor = C.border;
                      }}
                    >
                      <div
                        className="h-1.5 w-full"
                        style={{ background: color.bar }}
                      />
                      <div className="p-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: color.soft }}
                        >
                          <GraduationCap
                            size={20}
                            style={{
                              color:
                                color.bar === "#BDDDFC"
                                  ? C.secondary
                                  : color.bar,
                            }}
                          />
                        </div>
                        <p
                          className="text-lg font-bold mb-0.5"
                          style={{ color: C.primary }}
                        >
                          Grade {grade}
                        </p>
                        <p
                          className="text-xs font-medium mb-3"
                          style={{ color: C.secondary }}
                        >
                          {grades[grade].length} Section
                          {grades[grade].length !== 1 ? "s" : ""}
                        </p>

                        {/* ✅ Stats pills */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <Pill
                            icon={Users}
                            value={gs.total}
                            color={C.primary}
                            bg="rgba(189,221,252,0.25)"
                            label="Total"
                          />
                          <Pill
                            icon={UserCheck}
                            value={gs.present}
                            color="#047857"
                            bg="rgba(16,185,129,0.12)"
                            label="Present"
                          />
                          <Pill
                            icon={UserX}
                            value={gs.absent}
                            color="#be123c"
                            bg="rgba(244,63,94,0.12)"
                            label="Absent"
                          />
                        </div>

                        {/* ✅ Rate bar */}
                        <RateBar rate={gs.rate} barColor={color.bar} />
                      </div>
                      <div
                        className="absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center group-hover:translate-x-0.5 transition-all"
                        style={{ background: color.soft }}
                      >
                        <ChevronRight
                          size={14}
                          style={{ color: C.secondary }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LEVEL 2: Section Cards ════════════════════════════════════════ */}
        {viewLevel === "sections" && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            {/* Header with grade-level totals */}
            <div
              className="flex items-center gap-3 px-5 py-4 flex-wrap"
              style={{
                borderBottom: `1px solid rgba(136,189,242,0.20)`,
                background: C.softBg,
              }}
            >
              <p className="font-bold text-sm" style={{ color: C.primary }}>
                Grade {selectedGrade}
              </p>
              {gradeSummary[selectedGrade] && (
                <div className="flex items-center gap-2 ml-1">
                  <Pill
                    icon={Users}
                    value={gradeSummary[selectedGrade].total}
                    color={C.primary}
                    bg="rgba(189,221,252,0.25)"
                  />
                  <Pill
                    icon={UserCheck}
                    value={gradeSummary[selectedGrade].present}
                    color="#047857"
                    bg="rgba(16,185,129,0.12)"
                  />
                  <Pill
                    icon={UserX}
                    value={gradeSummary[selectedGrade].absent}
                    color="#be123c"
                    bg="rgba(244,63,94,0.12)"
                  />
                </div>
              )}
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gradeSections.map((sec, idx) => {
                const color = GRADE_COLORS[idx % GRADE_COLORS.length];
                const ss = summaryMap[sec.id] || {};
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSection(sec)}
                    className="group relative overflow-hidden rounded-2xl bg-white text-left transition-all duration-200 shadow-sm"
                    style={{ border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(136,189,242,0.20)";
                      e.currentTarget.style.borderColor = C.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "";
                      e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ background: color.bar }}
                    />
                    <div className="p-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: color.soft }}
                      >
                        <BookOpen
                          size={20}
                          style={{
                            color:
                              color.bar === "#BDDDFC" ? C.secondary : color.bar,
                          }}
                        />
                      </div>
                      <p
                        className="text-lg font-bold mb-3"
                        style={{ color: C.primary }}
                      >
                        Section {sec.section}
                      </p>

                      {/* ✅ Per-section stats */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Pill
                          icon={Users}
                          value={ss.totalStudents}
                          color={C.primary}
                          bg="rgba(189,221,252,0.25)"
                          label="Total"
                        />
                        <Pill
                          icon={UserCheck}
                          value={ss.present}
                          color="#047857"
                          bg="rgba(16,185,129,0.12)"
                          label="Present"
                        />
                        <Pill
                          icon={UserX}
                          value={ss.absent}
                          color="#be123c"
                          bg="rgba(244,63,94,0.12)"
                          label="Absent"
                        />
                      </div>
                      <RateBar rate={ss.attendanceRate} barColor={color.bar} />
                    </div>
                    <div
                      className="absolute bottom-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center group-hover:translate-x-0.5 transition-all"
                      style={{ background: color.soft }}
                    >
                      <ChevronRight size={14} style={{ color: C.secondary }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ LEVEL 3: Attendance Table ══════════════════════════════════════ */}
        {viewLevel === "attendance" && (
          <div className="animate-in fade-in duration-300">
            {/* ✅ Section summary header */}
            {selectedSection &&
              summaryMap[selectedSection.id] &&
              (() => {
                const ss = summaryMap[selectedSection.id];
                return (
                  <div
                    className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-6"
                    style={{ border: `1px solid ${C.border}` }}
                  >
                    <div>
                      <p
                        className="font-bold text-sm"
                        style={{ color: C.primary }}
                      >
                        {selectedSection.name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: C.secondary }}
                      >
                        {selectedDate} · {activeYearName}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-auto flex-wrap">
                      {[
                        {
                          label: "Total",
                          value: ss.totalStudents,
                          color: C.primary,
                        },
                        {
                          label: "Present",
                          value: ss.present,
                          color: "#047857",
                        },
                        { label: "Absent", value: ss.absent, color: "#be123c" },
                        ...(ss.attendanceRate !== null
                          ? [
                              {
                                label: "Rate",
                                value: `${ss.attendanceRate}%`,
                                color: C.accent,
                              },
                            ]
                          : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <p className="text-xl font-bold" style={{ color }}>
                            {value}
                          </p>
                          <p className="text-xs" style={{ color: C.secondary }}>
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            {/* Search + Refresh */}
            <div
              className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex flex-col sm:flex-row items-center gap-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex-1 relative w-full">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: C.secondary }}
                />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl bg-white focus:outline-none"
                  style={{ border: `1px solid ${C.border}`, color: C.primary }}
                  onFocus={(e) => (e.target.style.borderColor = C.accent)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
              <button
                onClick={fetchAttendance}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  border: `1px solid ${C.border}`,
                  background: "white",
                  color: C.secondary,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            <AttendanceStatsCards attendance={filteredAttendance} />

            <div
              className="bg-white rounded-2xl border shadow-sm overflow-hidden"
              style={{ borderColor: C.border }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <TH>Student Name</TH>
                      <TH>Date</TH>
                      <TH>Status</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-12 text-center"
                          style={{ color: C.secondary }}
                        >
                          <Loader2
                            size={24}
                            className="animate-spin inline-block mb-2"
                            style={{ color: C.accent }}
                          />
                          <p className="text-sm font-medium">
                            Loading attendance records...
                          </p>
                        </td>
                      </tr>
                    ) : filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-16 text-center">
                          <p
                            className="text-base font-medium"
                            style={{ color: C.primary }}
                          >
                            No records found
                          </p>
                          <p
                            className="text-sm font-medium mt-1"
                            style={{ color: C.secondary }}
                          >
                            Attendance has not been logged for this section/date
                            yet.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((a, idx) => (
                        <AttendanceTableRow
                          key={a.id}
                          record={a}
                          isEven={idx % 2 === 0}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
