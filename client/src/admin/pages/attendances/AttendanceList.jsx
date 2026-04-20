// client/src/admin/pages/attendances/AttendanceList.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Palmtree,
  X,
  Building2,
  AlertCircle,
} from "lucide-react";
import AttendanceStatsCards from "./components/AttendanceStatsCards";
import AttendanceTableRow from "./components/AttendanceTableRow";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

// ── Shared palette (mirrors OnlineClassesPage) ─────────────────────────────
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

const GRADE_COLORS = [
  { bar: "#88BDF2", soft: "rgba(136,189,242,0.12)" },
  { bar: "#6A89A7", soft: "rgba(106,137,167,0.12)" },
  { bar: "#BDDDFC", soft: "rgba(189,221,252,0.20)" },
  { bar: "#384959", soft: "rgba(56,73,89,0.08)"   },
];

// ── Skeleton pulse (mirrors OnlineClassesPage Pulse) ──────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

// ── Tiny stat pill ─────────────────────────────────────────────────────────
function Pill({ icon: Icon, value, color, bg, label }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 2, padding: "6px 12px", borderRadius: 12, background: bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon size={11} style={{ color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'Inter', sans-serif" }}>
          {value ?? "—"}
        </span>
      </div>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 600, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── Thin progress bar ──────────────────────────────────────────────────────
function RateBar({ rate, barColor }) {
  if (rate === null || rate === undefined)
    return (
      <p style={{ fontSize: 11, color: C.textLight, marginTop: 8, fontFamily: "'Inter', sans-serif" }}>
        No attendance yet
      </p>
    );
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>Attendance</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{rate}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: `${C.mist}44` }}>
        <div
          style={{
            width: `${rate}%`, height: "100%", borderRadius: 99,
            background: barColor, transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────
function Breadcrumb({ grade, section, onGradeClick, onSectionClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      <button
        onClick={onGradeClick}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
          color: grade ? C.textLight : C.text,
          background: grade ? "transparent" : `${C.mist}44`,
          border: grade ? "none" : `1px solid ${C.border}`,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
        }}
      >
        <LayoutGrid size={13} /> All Grades
      </button>
      {grade && (
        <>
          <ChevronRight size={14} style={{ color: C.textLight }} />
          <button
            onClick={onSectionClick}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: section ? C.textLight : C.text,
              background: section ? "transparent" : `${C.mist}44`,
              border: section ? "none" : `1px solid ${C.border}`,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
            }}
          >
            <BookOpen size={13} /> Grade {grade}
          </button>
        </>
      )}
      {section && (
        <>
          <ChevronRight size={14} style={{ color: C.textLight }} />
          <span
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              color: C.text, background: `${C.mist}44`, border: `1px solid ${C.border}`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Users size={13} /> Section {section}
          </span>
        </>
      )}
    </div>
  );
}

// ── Table Header cell ──────────────────────────────────────────────────────
const TH = ({ children }) => (
  <th
    style={{
      padding: "12px 20px", textAlign: "left",
      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: C.textLight,
      borderBottom: `1px solid ${C.borderLight}`,
      background: `${C.mist}22`,
      fontFamily: "'Inter', sans-serif",
    }}
  >
    {children}
  </th>
);

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AttendanceList() {
  const [sections,        setSections]        = useState([]);
  const [selectedGrade,   setSelectedGrade]   = useState(null);
  const [gradeSections,   setGradeSections]   = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [attendance,      setAttendance]      = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [summaryLoading,  setSummaryLoading]  = useState(true);
  const [searchTerm,      setSearchTerm]      = useState("");
  const [selectedDate,    setSelectedDate]    = useState(new Date().toISOString().split("T")[0]);
  const [summaryMap,      setSummaryMap]      = useState({});
  const [activeYearName,  setActiveYearName]  = useState("");
  const [holidayInfo,     setHolidayInfo]     = useState(null);
  const [holidayPanelOpen,setHolidayPanelOpen]= useState(false);

  // ── Load sections + summary ─────────────────────────────────────────────
  const loadSummary = useCallback(async (date) => {
    setSummaryLoading(true);
    try {
      const [sectionsRes, summaryRes] = await Promise.all([
        fetch(`${BASE}/class-sections`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetchAttendanceSummary({ date }),
      ]);
      const sectionsData = await sectionsRes.json();
      const activeIds = new Set(summaryRes.summaries.map((s) => s.classSectionId));
      setSections((sectionsData.classSections || []).filter((s) => activeIds.has(s.id)));

      const map = {};
      summaryRes.summaries.forEach((s) => { map[s.classSectionId] = s; });
      setSummaryMap(map);
      setActiveYearName(summaryRes.academicYear?.name || "");

      try {
        const hRes  = await fetch(`${BASE}/admin/holidays/check?date=${date}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const hData = await hRes.json();
        setHolidayInfo(hData.holiday || null);
      } catch { setHolidayInfo(null); }
    } catch (err) {
      console.error("Failed to load sections/summary", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(selectedDate); }, [selectedDate, loadSummary]);

  // ── Grade grouping ─────────────────────────────────────────────────────
  const grades = useMemo(() => {
    const g = {};
    sections.forEach((sec) => { if (!g[sec.grade]) g[sec.grade] = []; g[sec.grade].push(sec); });
    return Object.keys(g)
      .sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
      .reduce((acc, k) => {
        acc[k] = g[k].sort((a, b) => (a.section || "").localeCompare(b.section || ""));
        return acc;
      }, {});
  }, [sections]);

  const gradeSummary = useMemo(() => {
    const res = {};
    Object.entries(grades).forEach(([grade, secs]) => {
      let total = 0, present = 0, absent = 0, marked = 0;
      secs.forEach((sec) => {
        const s = summaryMap[sec.id] || {};
        total   += s.totalStudents || 0;
        present += s.present       || 0;
        absent  += s.absent        || 0;
        marked  += s.marked        || 0;
      });
      res[grade] = { total, present, absent, marked, rate: marked > 0 ? Math.round((present / marked) * 100) : null };
    });
    return res;
  }, [grades, summaryMap]);

  // ── Fetch attendance for selected section ──────────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const data = await fetchAdminAttendance({ classSectionId: selectedSection.id, date: selectedDate });
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load attendance", err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSection, selectedDate]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const handleSelectGrade    = (grade, secs) => { setSelectedGrade(grade); setGradeSections(secs); setSelectedSection(null); setAttendance([]); };
  const handleBackToGrades   = ()            => { setSelectedGrade(null); setGradeSections([]); setSelectedSection(null); setAttendance([]); };
  const handleBackToSections = ()            => { setSelectedSection(null); setAttendance([]); };

  const viewLevel = !selectedGrade ? "grades" : !selectedSection ? "sections" : "attendance";

  const filteredAttendance = useMemo(() => {
    if (!searchTerm) return attendance;
    return attendance.filter((a) => a.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [attendance, searchTerm]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .att-card { transition: transform 0.2s, box-shadow 0.2s; }
        .att-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important; }
      `}</style>

      <div style={{ padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                  Attendance
                </h1>
                {activeYearName && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: `${C.mist}99`, color: C.deep,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {activeYearName}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                {viewLevel === "grades"     && "Select a grade to view attendance"}
                {viewLevel === "sections"   && `Grade ${selectedGrade} — Select a section`}
                {viewLevel === "attendance" && `Grade ${selectedGrade} · Section ${selectedSection?.section}`}
              </p>
            </div>
          </div>

          {/* Date picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <CalendarIcon
                size={14}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: holidayInfo ? "#b45309" : C.textLight, pointerEvents: "none" }}
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  fontSize: 13, paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                  borderRadius: 12, background: C.white, outline: "none",
                  border: `1.5px solid ${holidayInfo ? "rgba(245,158,11,0.60)" : C.border}`,
                  color: C.text, fontFamily: "'Inter', sans-serif",
                }}
              />
              {holidayInfo && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#f59e0b", border: "2px solid white",
                }} />
              )}
            </div>
            {holidayInfo && (
              <button
                onClick={() => setHolidayPanelOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: "rgba(245,158,11,0.12)", color: "#b45309",
                  border: "1px solid rgba(245,158,11,0.30)", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Palmtree size={13} /> Holiday
              </button>
            )}
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

        {/* ── Holiday Banner ────────────────────────────────────────────────── */}
        {holidayInfo && (
          <div
            className="fade-up"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 16, marginBottom: 20,
              background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.18)" }}>
              <Palmtree size={16} style={{ color: "#b45309" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                {holidayInfo.title}
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,0.20)", color: "#b45309" }}>
                  {holidayInfo.type === "GOVERNMENT" ? "Government" : "School"} Holiday
                </span>
              </p>
              {holidayInfo.description && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#b45309" }}>{holidayInfo.description}</p>
              )}
            </div>
            <button
              onClick={() => setHolidayPanelOpen(true)}
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.18)", color: "#b45309", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}
            >
              Details
            </button>
          </div>
        )}

        {/* ══ LEVEL 1: Grade Cards ════════════════════════════════════════════ */}
        {viewLevel === "grades" && (
          <div
            className="fade-up"
            style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}
          >
            {/* panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.borderLight}`, background: `${C.mist}22` }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>All Grades</p>
              {activeYearName && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: `${C.mist}55`, color: C.textLight }}>
                  {activeYearName} · {selectedDate}
                </span>
              )}
            </div>

            {summaryLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, padding: 20 }}>
                {[1,2,3,4].map((i) => (
                  <div key={i} style={{ borderRadius: 16, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Pulse w={40} h={40} r={12} />
                    <Pulse w="60%" h={13} />
                    <Pulse w="40%" h={10} />
                    <Pulse w="100%" h={8} r={99} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, padding: 20 }}>
                {Object.keys(grades).map((grade, idx) => {
                  const color = GRADE_COLORS[idx % GRADE_COLORS.length];
                  const gs    = gradeSummary[grade] || {};
                  return (
                    <button
                      key={grade}
                      className="att-card"
                      onClick={() => handleSelectGrade(grade, grades[grade])}
                      style={{
                        position: "relative", overflow: "hidden", borderRadius: 16,
                        background: C.white, textAlign: "left", cursor: "pointer",
                        border: `1.5px solid ${C.borderLight}`,
                        boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
                        padding: 0,
                      }}
                    >
                      <div style={{ height: 6, background: color.bar, width: "100%" }} />
                      <div style={{ padding: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: color.soft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                          <GraduationCap size={20} style={{ color: color.bar === "#BDDDFC" ? C.textLight : color.bar }} />
                        </div>
                        <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, color: C.text }}>Grade {grade}</p>
                        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 600, color: C.textLight }}>{grades[grade].length} Section{grades[grade].length !== 1 ? "s" : ""}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          <Pill icon={Users}     value={gs.total}   color={C.deep}    bg={`${C.mist}55`}              label="Total"   />
                          <Pill icon={UserCheck} value={gs.present} color="#047857"   bg="rgba(16,185,129,0.12)"      label="Present" />
                          <Pill icon={UserX}     value={gs.absent}  color="#be123c"   bg="rgba(244,63,94,0.12)"       label="Absent"  />
                        </div>
                        <RateBar rate={gs.rate} barColor={color.bar} />
                      </div>
                      <div style={{ position: "absolute", bottom: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: color.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ChevronRight size={14} style={{ color: C.textLight }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ LEVEL 2: Section Cards ══════════════════════════════════════════ */}
        {viewLevel === "sections" && (
          <div
            className="fade-up"
            style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}
          >
            {/* panel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: `1px solid ${C.borderLight}`, background: `${C.mist}22`, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Grade {selectedGrade}</p>
              {gradeSummary[selectedGrade] && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill icon={Users}     value={gradeSummary[selectedGrade].total}   color={C.deep}  bg={`${C.mist}55`}         />
                  <Pill icon={UserCheck} value={gradeSummary[selectedGrade].present} color="#047857" bg="rgba(16,185,129,0.12)" />
                  <Pill icon={UserX}     value={gradeSummary[selectedGrade].absent}  color="#be123c" bg="rgba(244,63,94,0.12)"  />
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, padding: 20 }}>
              {gradeSections.map((sec, idx) => {
                const color = GRADE_COLORS[idx % GRADE_COLORS.length];
                const ss    = summaryMap[sec.id] || {};
                return (
                  <button
                    key={sec.id}
                    className="att-card"
                    onClick={() => setSelectedSection(sec)}
                    style={{
                      position: "relative", overflow: "hidden", borderRadius: 16,
                      background: C.white, textAlign: "left", cursor: "pointer",
                      border: `1.5px solid ${C.borderLight}`,
                      boxShadow: "0 2px 8px rgba(56,73,89,0.06)", padding: 0,
                    }}
                  >
                    <div style={{ height: 6, background: color.bar }} />
                    <div style={{ padding: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: color.soft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <BookOpen size={20} style={{ color: color.bar === "#BDDDFC" ? C.textLight : color.bar }} />
                      </div>
                      <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 800, color: C.text }}>Section {sec.section}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        <Pill icon={Users}     value={ss.totalStudents} color={C.deep}  bg={`${C.mist}55`}         label="Total"   />
                        <Pill icon={UserCheck} value={ss.present}       color="#047857" bg="rgba(16,185,129,0.12)" label="Present" />
                        <Pill icon={UserX}     value={ss.absent}        color="#be123c" bg="rgba(244,63,94,0.12)"  label="Absent"  />
                      </div>
                      <RateBar rate={ss.attendanceRate} barColor={color.bar} />
                    </div>
                    <div style={{ position: "absolute", bottom: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: color.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ChevronRight size={14} style={{ color: C.textLight }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ LEVEL 3: Attendance Table ════════════════════════════════════════ */}
        {viewLevel === "attendance" && (
          <div className="fade-up">

            {/* Section summary card */}
            {selectedSection && summaryMap[selectedSection.id] && (() => {
              const ss = summaryMap[selectedSection.id];
              return (
                <div
                  style={{
                    background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
                    padding: "14px 20px", marginBottom: 16,
                    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24,
                    boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{selectedSection.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight }}>{selectedDate} · {activeYearName}</p>
                  </div>
                  <div style={{ display: "flex", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
                    {[
                      { label: "Total",   value: ss.totalStudents,                                 color: C.text    },
                      { label: "Present", value: ss.present,                                       color: "#047857" },
                      { label: "Absent",  value: ss.absent,                                        color: "#be123c" },
                      ...(ss.attendanceRate != null ? [{ label: "Rate", value: `${ss.attendanceRate}%`, color: C.sky }] : []),
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{value}</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Search + refresh */}
            <div
              style={{
                background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
                padding: "12px 16px", marginBottom: 16,
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
                boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
              }}
            >
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textLight }} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", paddingLeft: 38, paddingRight: 16, paddingTop: 9, paddingBottom: 9,
                    borderRadius: 10, fontSize: 13, border: `1.5px solid ${C.border}`,
                    background: C.white, color: C.text, outline: "none",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
              <button
                onClick={fetchAttendance}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Stats cards */}
            <AttendanceStatsCards attendance={filteredAttendance} />

            {/* Table */}
            <div style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
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
                        <td colSpan={3} style={{ padding: "48px 24px", textAlign: "center" }}>
                          <Loader2 size={24} className="animate-spin" style={{ color: C.sky, display: "block", margin: "0 auto 8px" }} />
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.textLight }}>Loading attendance records…</p>
                        </td>
                      </tr>
                    ) : filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "64px 24px", textAlign: "center" }}>
                          <div style={{ width: 52, height: 52, borderRadius: 14, background: `${C.mist}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                            <Users size={22} style={{ color: C.textLight }} />
                          </div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>No records found</p>
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textLight }}>Attendance has not been logged for this section/date yet.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((a, idx) => (
                        <AttendanceTableRow key={a.id} record={a} isEven={idx % 2 === 0} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Holiday Detail Panel ───────────────────────────────────────────── */}
      {holidayPanelOpen && holidayInfo && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(56,73,89,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setHolidayPanelOpen(false)}
        >
          <div style={{ width: "100%", maxWidth: 380, borderRadius: 24, overflow: "hidden", background: C.white, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 20px 60px rgba(56,73,89,0.20)" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.20)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(245,158,11,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Palmtree size={18} style={{ color: "#b45309" }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e" }}>Holiday Details</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#b45309" }}>{selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setHolidayPanelOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(245,158,11,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={15} style={{ color: "#b45309" }} />
              </button>
            </div>

            {/* body */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: C.textLight }}>Holiday Name</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{holidayInfo.title}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: C.textLight }}>Type</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {holidayInfo.type === "GOVERNMENT" ? <Building2 size={14} style={{ color: "#b45309" }} /> : <GraduationCap size={14} style={{ color: "#b45309" }} />}
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>
                    {holidayInfo.type === "GOVERNMENT" ? "Government Holiday" : "School Holiday"}
                  </p>
                </div>
                {holidayInfo.type === "GOVERNMENT" && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textLight }}>Repeats every year on this date</p>
                )}
                {holidayInfo.type === "SCHOOL" && holidayInfo.academicYear?.name && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textLight }}>Applies to academic year: {holidayInfo.academicYear.name}</p>
                )}
              </div>
              {holidayInfo.description && (
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: C.textLight }}>Note</p>
                  <p style={{ margin: 0, fontSize: 13, color: C.text }}>{holidayInfo.description}</p>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 11, fontWeight: 600, color: "#b45309" }}>
                <Palmtree size={13} /> Attendance may not be marked on this date
              </div>
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              <button
                onClick={() => setHolidayPanelOpen(false)}
                style={{
                  width: "100%", padding: "10px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: `${C.mist}44`, color: C.textLight, border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}