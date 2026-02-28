// client/src/admin/pages/attendances/AttendanceList.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import PageLayout from "../../components/PageLayout";
import { fetchAdminAttendance } from "./api/adminAttendanceApi";
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
} from "lucide-react";

// Components
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
  { bar: "#88BDF2", soft: "rgba(136,189,242,0.12)", text: "#384959" },
  { bar: "#6A89A7", soft: "rgba(106,137,167,0.12)", text: "#384959" },
  { bar: "#BDDDFC", soft: "rgba(189,221,252,0.20)", text: "#384959" },
  { bar: "#384959", soft: "rgba(56,73,89,0.08)", text: "#384959" },
];

function Breadcrumb({ grade, section, onGradeClick, onSectionClick }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
      <button
        onClick={onGradeClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all"
        style={{
          color: grade ? C.secondary : C.primary,
          background: grade ? "transparent" : C.softBg,
          border: grade ? "none" : `1px solid ${C.border}`,
        }}
      >
        <LayoutGrid size={13} />
        All Grades
      </button>

      {grade && (
        <>
          <ChevronRight size={14} style={{ color: C.secondary }} />
          <button
            onClick={onSectionClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{
              color: section ? C.secondary : C.primary,
              background: section ? "transparent" : C.softBg,
              border: section ? "none" : `1px solid ${C.border}`,
            }}
          >
            <BookOpen size={13} />
            Grade {grade}
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
            <Users size={13} />
            Section {section}
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Fetch Class Sections
  useEffect(() => {
    const loadSections = async () => {
      try {
        const res = await fetch(`${BASE}/class-sections`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setSections(data.classSections || []);
      } catch (err) {
        console.error("Failed to load class sections", err);
      }
    };
    loadSections();
  }, []);

  // Group By Grade
  const grades = useMemo(() => {
    const grouped = {};
    sections.forEach((sec) => {
      if (!grouped[sec.grade]) grouped[sec.grade] = [];
      grouped[sec.grade].push(sec);
    });

    return Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .reduce((acc, key) => {
        acc[key] = grouped[key].sort((a, b) =>
          a.section.localeCompare(b.section),
        );
        return acc;
      }, {});
  }, [sections]);

  // Fetch Attendance When Section Clicked
  const fetchAttendance = useCallback(async () => {
    if (!selectedSection) return;
    try {
      setLoading(true);
      const data = await fetchAdminAttendance({
        classSectionId: selectedSection.id,
        date: selectedDate, // Optional API enhancement
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

  // Navigation Handlers
  const handleSelectGrade = (grade, gradeSectionsData) => {
    setSelectedGrade(grade);
    setGradeSections(gradeSectionsData);
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

  // Filter Attendance by Search Term
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
        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: C.primary }}
              />
              <h1 className="text-2xl font-bold" style={{ color: C.primary }}>
                Attendance
              </h1>
            </div>
            <p className="text-sm ml-3" style={{ color: C.secondary }}>
              {viewLevel === "grades" && "Select a grade to view attendance"}
              {viewLevel === "sections" &&
                `Grade ${selectedGrade} — Select a section`}
              {viewLevel === "attendance" &&
                `Grade ${selectedGrade} · Section ${selectedSection?.section}`}
            </p>
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

        {/* LEVEL 1: Grades */}
        {viewLevel === "grades" && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: `1px solid rgba(136,189,242,0.20)`,
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: C.primary }}>
                  All Grades
                </p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.keys(grades).map((grade, idx) => {
                const color = GRADE_COLORS[idx % GRADE_COLORS.length];
                return (
                  <button
                    key={grade}
                    onClick={() => handleSelectGrade(grade, grades[grade])}
                    className="group relative overflow-hidden rounded-2xl bg-white text-left transition-all duration-200 shadow-sm"
                    style={{ border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = `0 8px 24px rgba(136,189,242,0.20)`;
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
                    <div className="p-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: color.soft }}
                      >
                        <GraduationCap
                          size={22}
                          style={{
                            color:
                              color.bar === "#BDDDFC" ? C.secondary : color.bar,
                          }}
                        />
                      </div>
                      <p
                        className="text-xl font-bold mb-0.5"
                        style={{ color: C.primary }}
                      >
                        Grade {grade}
                      </p>
                      <p
                        className="text-xs font-medium"
                        style={{ color: C.secondary }}
                      >
                        {grades[grade].length} Section
                        {grades[grade].length !== 1 ? "s" : ""}
                      </p>
                      <div
                        className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5"
                        style={{ background: color.soft }}
                      >
                        <ChevronRight
                          size={14}
                          style={{ color: C.secondary }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 2: Sections */}
        {viewLevel === "sections" && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{
                borderBottom: `1px solid rgba(136,189,242,0.20)`,
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: C.primary }}>
                  Grade {selectedGrade}
                </p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {gradeSections.map((sec, idx) => {
                const color = GRADE_COLORS[idx % GRADE_COLORS.length];
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
                    <div className="p-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: color.soft }}
                      >
                        <BookOpen
                          size={22}
                          style={{
                            color:
                              color.bar === "#BDDDFC" ? C.secondary : color.bar,
                          }}
                        />
                      </div>
                      <p
                        className="text-xl font-bold mb-0.5"
                        style={{ color: C.primary }}
                      >
                        Section {sec.section}
                      </p>
                      <div
                        className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5"
                        style={{ background: color.soft }}
                      >
                        <ChevronRight
                          size={14}
                          style={{ color: C.secondary }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3: Attendance Table View */}
        {viewLevel === "attendance" && (
          <div className="animate-in fade-in duration-300">
            {/* Search and Filter Top Bar */}
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
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl bg-white focus:outline-none transition-all"
                  style={{ border: `1px solid ${C.border}`, color: C.primary }}
                  onFocus={(e) => (e.target.style.borderColor = C.accent)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>

              <div className="relative w-full sm:w-auto">
                <CalendarIcon
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: C.secondary }}
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl bg-white focus:outline-none transition-all"
                  style={{ border: `1px solid ${C.border}`, color: C.primary }}
                  onFocus={(e) => (e.target.style.borderColor = C.accent)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>

              <button
                onClick={fetchAttendance}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
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
