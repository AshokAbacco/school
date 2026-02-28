// admin/pages/students/StudentsList.jsx
// Institution-aware 3-level drill-down:
//   SCHOOL:  Grades → Sections → Students
//   PUC:     Streams → Combinations/Sections → Students
//   DEGREE:  Courses → Branches/Semesters → Students
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronRight,
  GraduationCap,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  ArrowLeft,
  BookOpen,
  Search,
  RefreshCw,
  Plus,
  Loader2,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { getToken } from "../../../auth/storage";
import PageLayout from "../../components/PageLayout";
import AddStudent from "./AddStudents";
import SignedProfileImage from "./components/SignedProfileImage";
import { useInstitutionConfig } from "../classes/hooks/useInstitutionConfig";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  "Cache-Control": "no-store",
});
const LIMIT = 10;

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

// ── Stat cards ─────────────────────────────────────────────────────────────────
const STAT_CARDS = [
  { key: "total", label: "Total Students", icon: Users, bar: "#6A89A7" },
  { key: "active", label: "Active", icon: UserCheck, bar: "#88BDF2" },
  { key: "inactive", label: "Inactive", icon: UserX, bar: "#384959" },
  {
    key: "newThisMonth",
    label: "New This Month",
    icon: TrendingUp,
    bar: "#BDDDFC",
  },
];

function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {STAT_CARDS.map(({ key, label, icon: Icon, bar }) => (
        <div
          key={key}
          className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
          style={{ border: `1px solid ${C.border}` }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ background: bar }}
          />
          <div className="px-5 pt-5 pb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${bar}22` }}
            >
              <Icon
                size={16}
                style={{ color: bar === "#BDDDFC" ? "#6A89A7" : bar }}
              />
            </div>
            <p className="text-2xl font-bold" style={{ color: C.primary }}>
              {(stats[key] || 0).toLocaleString()}
            </p>
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: C.secondary }}
            >
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Generic card grid (level 1 & 2) ───────────────────────────────────────────
function CardGrid({ items, onSelect, emptyMsg = "No items found" }) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(189,221,252,0.25)" }}
        >
          <GraduationCap size={28} style={{ color: C.secondary }} />
        </div>
        <p className="font-semibold" style={{ color: C.primary }}>
          {emptyMsg}
        </p>
        <p className="text-sm" style={{ color: C.secondary }}>
          Create class sections first in Settings
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item, idx) => {
        const color = GRADE_COLORS[idx % GRADE_COLORS.length];
        return (
          <button
            key={item.id || item.label}
            onClick={() => onSelect(item)}
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
            <div className="h-1.5 w-full" style={{ background: color.bar }} />
            <div className="p-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: color.soft }}
              >
                {item.icon ? (
                  <item.icon
                    size={22}
                    style={{
                      color: color.bar === "#BDDDFC" ? C.secondary : color.bar,
                    }}
                  />
                ) : (
                  <GraduationCap
                    size={22}
                    style={{
                      color: color.bar === "#BDDDFC" ? C.secondary : color.bar,
                    }}
                  />
                )}
              </div>
              <p
                className="text-xl font-bold mb-0.5"
                style={{ color: C.primary }}
              >
                {item.label}
              </p>
              {item.sublabel && (
                <p
                  className="text-xs font-medium"
                  style={{ color: C.secondary }}
                >
                  {item.sublabel}
                </p>
              )}
              {item.chips && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.chips.map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: color.soft,
                        color: C.secondary,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <div
                className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5"
                style={{ background: color.soft }}
              >
                <ChevronRight size={14} style={{ color: C.secondary }} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────────
function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={14} style={{ color: C.secondary }} />}
            {isLast ? (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold"
                style={{
                  color: C.primary,
                  background: C.softBg,
                  border: `1px solid ${C.border}`,
                }}
              >
                {crumb.icon && <crumb.icon size={13} />}
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{ color: C.secondary }}
              >
                {crumb.icon && <crumb.icon size={13} />}
                {crumb.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  ACTIVE: { bg: "rgba(136,189,242,0.18)", color: "#384959", dot: "#88BDF2" },
  INACTIVE: { bg: "rgba(56,73,89,0.12)", color: "#384959", dot: "#384959" },
  SUSPENDED: { bg: "rgba(255,160,60,0.15)", color: "#7a4000", dot: "#f59e0b" },
  GRADUATED: { bg: "rgba(106,137,167,0.18)", color: "#384959", dot: "#6A89A7" },
};
function StatusBadge({ status = "" }) {
  const s = STATUS_STYLE[status.toUpperCase()] || STATUS_STYLE.INACTIVE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: s.dot }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ student }) {
  const pi = student.personalInfo;
  const initials =
    `${pi?.firstName?.[0] || ""}${pi?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  if (pi?.profileImage)
    return (
      <SignedProfileImage
        studentId={student.id}
        className="w-10 h-10 rounded-xl object-cover"
      />
    );
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ background: "linear-gradient(135deg, #6A89A7, #384959)" }}
    >
      {initials}
    </div>
  );
}

// ── Students table ─────────────────────────────────────────────────────────────
function StudentsTable({ students, loading, onDelete, sectionName }) {
  const navigate = useNavigate();
  const btnHover = {
    view: { bg: "rgba(136,189,242,0.20)", color: "#384959" },
    edit: { bg: "rgba(136,189,242,0.20)", color: "#384959" },
    delete: { bg: "rgba(255,80,80,0.10)", color: "#c0392b" },
  };
  const displayName = (s) =>
    s.personalInfo
      ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`
      : s.name;

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: C.accent }}
        />
        <p className="text-sm font-medium" style={{ color: C.secondary }}>
          Loading students…
        </p>
      </div>
    );

  if (!students.length)
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(189,221,252,0.25)" }}
        >
          <Search size={22} style={{ color: C.secondary }} />
        </div>
        <p className="font-semibold text-sm" style={{ color: C.primary }}>
          No students found
        </p>
        <p className="text-xs" style={{ color: C.secondary }}>
          No students enrolled in {sectionName || "this section"} yet
        </p>
      </div>
    );

  const TH = ({ children, hidden = "" }) => (
    <th
      className={`px-5 py-3.5 text-left ${hidden}`}
      style={{
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: C.secondary,
        borderBottom: "1px solid rgba(136,189,242,0.20)",
        background: "rgba(189,221,252,0.12)",
      }}
    >
      {children}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <TH>Student</TH>
            <TH hidden="hidden md:table-cell">Contact</TH>
            <TH>Roll No.</TH>
            <TH hidden="hidden lg:table-cell">Academic Year</TH>
            <TH>Status</TH>
            <TH>Actions</TH>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const name = displayName(student);
            const enroll = student.enrollments?.[0] || null;
            const acYear = enroll?.academicYear;
            const status = enroll?.status || student.personalInfo?.status || "";
            const isEven = idx % 2 === 0;
            const rowBg = isEven ? "white" : "rgba(189,221,252,0.05)";
            const rowHover = "rgba(189,221,252,0.15)";
            return (
              <tr
                key={student.id}
                onClick={() => navigate(`/students/${student.id}`)}
                className="cursor-pointer transition-all duration-100"
                style={{
                  borderBottom: "1px solid rgba(136,189,242,0.12)",
                  background: rowBg,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = rowHover)
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar student={student} />
                    <div>
                      <p
                        className="font-semibold text-sm"
                        style={{ color: C.primary }}
                      >
                        {name}
                      </p>
                      <p
                        className="text-xs md:hidden"
                        style={{ color: C.secondary }}
                      >
                        {student.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <div className="space-y-1">
                    <div
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: C.secondary }}
                    >
                      <Mail size={11} /> {student.email}
                    </div>
                    {student.personalInfo?.phone && (
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: C.secondary }}
                      >
                        <Phone size={11} /> {student.personalInfo.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {enroll?.rollNumber ? (
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: "rgba(136,189,242,0.15)",
                        color: C.primary,
                      }}
                    >
                      {enroll.rollNumber}
                    </span>
                  ) : (
                    <span style={{ color: C.secondary }}>—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      background: "rgba(189,221,252,0.25)",
                      color: C.primary,
                    }}
                  >
                    {acYear?.name || "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={status} />
                </td>
                <td className="px-5 py-3.5">
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      {
                        action: "view",
                        icon: Eye,
                        onClick: () => navigate(`/students/${student.id}`),
                        title: "View",
                      },
                      {
                        action: "edit",
                        icon: Edit,
                        onClick: () => navigate(`/students/${student.id}/edit`),
                        title: "Edit",
                      },
                      {
                        action: "delete",
                        icon: Trash2,
                        onClick: (e) => onDelete(e, student.id, name),
                        title: "Delete",
                      },
                    ].map(({ action, icon: Icon, onClick, title }) => (
                      <button
                        key={action}
                        onClick={onClick}
                        title={title}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: C.secondary }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            btnHover[action].bg;
                          e.currentTarget.style.color = btnHover[action].color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = C.secondary;
                        }}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, showing, onPageChange }) {
  const pages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => i + 1,
  );
  const Btn = ({ children, onClick, disabled, active }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: active ? C.primary : "white",
        color: active ? "white" : C.secondary,
        border: `1px solid ${active ? C.primary : C.border}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active)
          e.currentTarget.style.background = "rgba(189,221,252,0.25)";
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = "white";
      }}
    >
      {children}
    </button>
  );
  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4"
      style={{ borderTop: "1px solid rgba(136,189,242,0.20)" }}
    >
      <p className="text-sm" style={{ color: C.secondary }}>
        Showing{" "}
        <span className="font-bold" style={{ color: C.primary }}>
          {showing}
        </span>{" "}
        of{" "}
        <span className="font-bold" style={{ color: C.primary }}>
          {total}
        </span>{" "}
        students
      </p>
      <div className="flex items-center gap-1.5">
        <Btn onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          ← Prev
        </Btn>
        {pages.map((p) => (
          <Btn key={p} onClick={() => onPageChange(p)} active={page === p}>
            {p}
          </Btn>
        ))}
        <Btn
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next →
        </Btn>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
function StudentsList() {
  const navigate = useNavigate();
  const { schoolType, showStream, showCourse } = useInstitutionConfig();

  // Navigation stack — each entry is { label, sublabel, sectionId (if leaf) }
  // level 0 = root (grades/streams/courses)
  // level 1 = sub-items (sections/combinations/branches)
  // level 2 = students table
  const [navStack, setNavStack] = useState([]); // array of breadcrumb items
  const [level1Items, setLevel1Items] = useState([]); // sub-items at level 1
  const [selectedSection, setSelectedSection] = useState(null); // final leaf: ClassSection object

  const [openModal, setOpenModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [classSections, setClassSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const activeYear =
    academicYears.find((y) => y.isActive) || academicYears[0] || null;

  // Selected academic year for filtering students (defaults to active year)
  const [selectedYearId, setSelectedYearId] = useState("active");

  const [refreshKey, setRefreshKey] = useState(0);
  const invalidate = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Fetch dropdowns ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [csRes, ayRes] = await Promise.all([
          fetch(`${API_URL}/api/class-sections`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/academic-years`, { headers: authHeaders() }),
        ]);
        const [csData, ayData] = await Promise.all([
          csRes.json(),
          ayRes.json(),
        ]);
        setClassSections(csData.classSections || csData.data || []);
        setAcademicYears(ayData.academicYears || ayData.data || []);
      } catch {
        /* non-critical */
      }
    })();
  }, []);

  // ── Build level-0 items based on school type ───────────────────────────────
  const level0Items = useMemo(() => {
    if (!classSections.length) return [];

    if (schoolType === "SCHOOL") {
      // Group by grade number
      const gradeMap = {};
      classSections.forEach((cs) => {
        const num = cs.grade?.match(/\d+/)?.[0];
        if (!num) return;
        if (!gradeMap[num]) gradeMap[num] = [];
        gradeMap[num].push(cs);
      });
      return Object.keys(gradeMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((num) => ({
          id: `grade-${num}`,
          label: `Grade ${num}`,
          sublabel: `${gradeMap[num].length} section${gradeMap[num].length !== 1 ? "s" : ""}`,
          chips: gradeMap[num].map((s) => s.section).filter(Boolean),
          icon: GraduationCap,
          children: gradeMap[num], // ClassSection objects for level 1
          isLeafGroup: true,
        }));
    }

    if (schoolType === "PUC") {
      // Group by stream
      const streamMap = {};
      classSections.forEach((cs) => {
        if (!cs.stream) return;
        if (!streamMap[cs.stream.id])
          streamMap[cs.stream.id] = { stream: cs.stream, sections: [] };
        streamMap[cs.stream.id].sections.push(cs);
      });
      return Object.values(streamMap).map(({ stream, sections }) => ({
        id: stream.id,
        label: stream.name,
        sublabel: `${sections.length} section${sections.length !== 1 ? "s" : ""}`,
        chips: [
          ...new Set(sections.map((s) => s.combination?.name).filter(Boolean)),
        ],
        icon: BookOpen,
        children: sections,
        isLeafGroup: true,
      }));
    }

    if (showCourse) {
      // Group by course
      const courseMap = {};
      classSections.forEach((cs) => {
        if (!cs.course) return;
        if (!courseMap[cs.course.id])
          courseMap[cs.course.id] = { course: cs.course, sections: [] };
        courseMap[cs.course.id].sections.push(cs);
      });
      return Object.values(courseMap).map(({ course, sections }) => ({
        id: course.id,
        label: course.name,
        sublabel: `${sections.length} section${sections.length !== 1 ? "s" : ""}`,
        chips: [
          ...new Set(
            sections.map((s) => s.branch?.code || s.grade).filter(Boolean),
          ),
        ].slice(0, 5),
        icon: Layers,
        children: sections,
        isLeafGroup: true,
      }));
    }

    // OTHER / fallback — flat sections as cards
    return classSections.map((cs) => ({
      id: cs.id,
      label: cs.name,
      sublabel: cs.grade,
      icon: GraduationCap,
      sectionObj: cs,
      isLeaf: true,
    }));
  }, [classSections, schoolType, showCourse]);

  // ── Build level-1 items from a level-0 item's children ────────────────────
  const buildLevel1Items = useCallback(
    (children) => {
      if (schoolType === "SCHOOL") {
        // children = ClassSection[] for one grade → show sections directly as leaves
        return children.map((cs) => ({
          id: cs.id,
          label: `Section ${cs.section}`,
          sublabel: cs.name,
          icon: Users,
          sectionObj: cs,
          isLeaf: true,
        }));
      }

      if (schoolType === "PUC") {
        // children = ClassSection[] for one stream → group by combination or show directly
        const hasCombinations = children.some((cs) => cs.combination);
        if (hasCombinations) {
          const comboMap = {};
          children.forEach((cs) => {
            const key = cs.combination?.id || "none";
            const label = cs.combination
              ? `${cs.combination.name} (${cs.combination.code})`
              : "No Combination";
            if (!comboMap[key]) comboMap[key] = { label, sections: [] };
            comboMap[key].sections.push(cs);
          });
          return Object.values(comboMap).map(({ label, sections }) => ({
            id: sections[0].combination?.id || "none",
            label,
            sublabel: `${sections.length} section${sections.length !== 1 ? "s" : ""}`,
            icon: BookOpen,
            children: sections,
            isLeafGroup: true,
          }));
        }
        // No combinations — show sections directly
        return children.map((cs) => ({
          id: cs.id,
          label: cs.name,
          sublabel: cs.grade,
          icon: Users,
          sectionObj: cs,
          isLeaf: true,
        }));
      }

      if (showCourse) {
        // children = ClassSection[] for one course → group by branch, then semester, then section
        const hasBranches = children.some((cs) => cs.branch);
        if (hasBranches) {
          const branchMap = {};
          children.forEach((cs) => {
            const key = cs.branch?.id || "none";
            const label = cs.branch
              ? `${cs.branch.name} (${cs.branch.code})`
              : "No Branch";
            if (!branchMap[key]) branchMap[key] = { label, sections: [] };
            branchMap[key].sections.push(cs);
          });
          return Object.values(branchMap).map(({ label, sections }) => ({
            id: sections[0].branch?.id || "none",
            label,
            sublabel: `${sections.length} section${sections.length !== 1 ? "s" : ""}`,
            chips: [...new Set(sections.map((s) => s.grade))].slice(0, 6),
            icon: Layers,
            children: sections,
            isLeafGroup: true,
          }));
        }
        // No branches — show semesters
        const semMap = {};
        children.forEach((cs) => {
          if (!semMap[cs.grade]) semMap[cs.grade] = [];
          semMap[cs.grade].push(cs);
        });
        return Object.keys(semMap)
          .sort((a, b) => {
            const na = parseInt(a),
              nb = parseInt(b);
            return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
          })
          .map((sem) => ({
            id: sem,
            label: sem,
            sublabel: `${semMap[sem].length} section${semMap[sem].length !== 1 ? "s" : ""}`,
            chips: semMap[sem].map((s) => s.section).filter(Boolean),
            icon: GraduationCap,
            children: semMap[sem],
            isLeafGroup: true,
          }));
      }

      return children.map((cs) => ({
        id: cs.id,
        label: cs.name,
        sublabel: cs.grade,
        icon: GraduationCap,
        sectionObj: cs,
        isLeaf: true,
      }));
    },
    [schoolType, showCourse],
  );

  // ── Build level-2 (sections) from level-1 leaf group ──────────────────────
  const buildLevel2Items = useCallback((children) => {
    // At this point children are ClassSection[] — show as leaf section cards
    return children.map((cs) => ({
      id: cs.id,
      label: cs.name,
      sublabel: cs.grade + (cs.section ? ` · Section ${cs.section}` : ""),
      icon: Users,
      sectionObj: cs,
      isLeaf: true,
    }));
  }, []);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, activeRes, inactiveRes] = await Promise.all([
        fetch(`${API_URL}/api/students?page=1&limit=1`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=ACTIVE`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=INACTIVE`, {
          headers: authHeaders(),
        }),
      ]);
      const [a, b, c] = await Promise.all([
        allRes.json(),
        activeRes.json(),
        inactiveRes.json(),
      ]);
      setStats({
        total: a.total || 0,
        active: b.total || 0,
        inactive: c.total || 0,
        newThisMonth: 0,
      });
    } catch {
      /* non-critical */
    }
  }, [refreshKey]); // eslint-disable-line

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Fetch students when section selected ──────────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!selectedSection) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      params.set("classSectionId", selectedSection.id);
      const resolvedYearId =
        selectedYearId === "active"
          ? activeYear?.id
          : selectedYearId === "all"
            ? null
            : selectedYearId;
      if (resolvedYearId) params.set("academicYearId", resolvedYearId);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const res = await fetch(`${API_URL}/api/students?${params}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch students");
      setStudents(data.students || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedSection,
    page,
    searchTerm,
    activeYear,
    selectedYearId,
    refreshKey,
  ]); // eslint-disable-line

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedSection]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      invalidate();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ── Navigation handlers ────────────────────────────────────────────────────
  const viewLevel = !navStack.length
    ? 0
    : !selectedSection
      ? navStack.length
      : navStack.length + 1;

  const handleLevel0Select = (item) => {
    if (item.isLeaf) {
      setNavStack([{ label: item.label, icon: item.icon }]);
      setSelectedSection(item.sectionObj);
      setStudents([]);
      setPage(1);
    } else {
      // has children — go to level 1
      const l1 = buildLevel1Items(item.children);
      setLevel1Items(l1);
      setNavStack([{ label: item.label, icon: item.icon }]);
      setSelectedSection(null);
    }
  };

  const handleLevel1Select = (item) => {
    if (item.isLeaf) {
      setNavStack((p) => [
        ...p.slice(0, 1),
        { label: item.label, icon: item.icon },
      ]);
      setSelectedSection(item.sectionObj);
      setStudents([]);
      setPage(1);
    } else {
      // has children — go to level 2 (section leaves)
      const l2 = buildLevel2Items(item.children);
      setLevel1Items(l2);
      setNavStack((p) => [
        ...p.slice(0, 1),
        { label: item.label, icon: item.icon },
      ]);
      setSelectedSection(null);
    }
  };

  const handleNavCrumb = (idx) => {
    if (idx === 0) {
      // Back to root
      setNavStack([]);
      setLevel1Items([]);
      setSelectedSection(null);
      setStudents([]);
    } else if (idx === 1) {
      // Back to level 1 (student view → section list)
      setSelectedSection(null);
      setStudents([]);
      setNavStack((p) => p.slice(0, 1));
    }
  };

  const crumbs = [
    { label: "All", icon: LayoutGrid },
    ...navStack,
    ...(selectedSection ? [{ label: selectedSection.name, icon: Users }] : []),
  ];

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: C.bg, minHeight: "100%" }}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: C.primary }}
              />
              <h1 className="text-2xl font-bold" style={{ color: C.primary }}>
                Students
              </h1>
            </div>
            <p className="text-sm ml-3" style={{ color: C.secondary }}>
              {viewLevel === 0 && "Select to browse students"}
              {viewLevel === 1 && `${navStack[0]?.label} — Select section`}
              {viewLevel >= 2 && selectedSection && `${selectedSection.name}`}
            </p>
          </div>
          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all"
            style={{ background: C.primary }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = C.secondary)
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = C.primary)}
          >
            <Plus size={14} /> Add Student
          </button>
        </div>

        {/* Stats */}
        <StatCards stats={stats} />

        {/* Breadcrumb */}
        {navStack.length > 0 && (
          <Breadcrumb crumbs={crumbs} onNavigate={handleNavCrumb} />
        )}

        {/* ── LEVEL 0: Root cards ─────────────────────────────────────────── */}
        {viewLevel === 0 && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: "1px solid rgba(136,189,242,0.20)",
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: C.primary }}>
                  {schoolType === "SCHOOL"
                    ? "All Grades"
                    : schoolType === "PUC"
                      ? "All Streams"
                      : "All Courses"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: C.secondary }}>
                  {level0Items.length}{" "}
                  {schoolType === "SCHOOL"
                    ? "grades"
                    : schoolType === "PUC"
                      ? "streams"
                      : "courses"}{" "}
                  · {classSections.length} sections total
                </p>
              </div>
              <button
                onClick={invalidate}
                className="p-2 rounded-lg transition-all"
                style={{ border: `1px solid ${C.border}`, background: "white" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <RefreshCw size={14} style={{ color: C.secondary }} />
              </button>
            </div>
            <div className="p-5">
              <CardGrid
                items={level0Items}
                onSelect={handleLevel0Select}
                emptyMsg={`No ${schoolType === "SCHOOL" ? "grades" : schoolType === "PUC" ? "streams" : "courses"} found`}
              />
            </div>
          </div>
        )}

        {/* ── LEVEL 1: Sub-items (sections / combinations / branches) ──────── */}
        {viewLevel === 1 && !selectedSection && (
          <div
            className="rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ border: `1px solid ${C.border}` }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{
                borderBottom: "1px solid rgba(136,189,242,0.20)",
                background: "rgba(189,221,252,0.08)",
              }}
            >
              <button
                onClick={() => handleNavCrumb(0)}
                className="p-2 rounded-lg transition-all"
                style={{ border: `1px solid ${C.border}`, background: "white" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(189,221,252,0.25)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "white")
                }
              >
                <ArrowLeft size={14} style={{ color: C.secondary }} />
              </button>
              <div>
                <p className="font-bold text-sm" style={{ color: C.primary }}>
                  {navStack[0]?.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: C.secondary }}>
                  {level1Items.length} items
                </p>
              </div>
            </div>
            <div className="p-5">
              <CardGrid
                items={level1Items}
                onSelect={handleLevel1Select}
                emptyMsg="No sections found"
              />
            </div>
          </div>
        )}

        {/* ── LEVEL 2: Students table ───────────────────────────────────────── */}
        {selectedSection && (
          <>
            {/* Search */}
            <div
              className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div className="flex-1 relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: C.secondary }}
                />
                <input
                  type="text"
                  placeholder={`Search students in ${selectedSection?.name}…`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl bg-white focus:outline-none transition-all"
                  style={{ border: `1px solid ${C.border}`, color: C.primary }}
                  onFocus={(e) => (e.target.style.borderColor = C.accent)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
              {/* Academic Year Dropdown */}
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value);
                  setPage(1);
                }}
                className="text-sm px-3 py-2.5 rounded-xl bg-white focus:outline-none transition-all shrink-0"
                style={{
                  border: `1px solid ${C.border}`,
                  color: C.primary,
                  minWidth: "130px",
                }}
              >
                <option value="active">
                  {activeYear ? `${activeYear.name} (Active)` : "Active Year"}
                </option>
                <option value="all">All Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                    {y.isActive ? " ✓" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={invalidate}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
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

            {error && (
              <div
                className="flex items-center gap-2 p-4 mb-4 rounded-xl text-sm"
                style={{
                  background: "rgba(231,76,60,0.08)",
                  border: "1px solid rgba(231,76,60,0.20)",
                  color: "#c0392b",
                }}
              >
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}

            <div
              className="rounded-2xl overflow-hidden bg-white shadow-sm"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: "1px solid rgba(136,189,242,0.20)",
                  background: "rgba(189,221,252,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedSection(null);
                      setStudents([]);
                      setNavStack((p) => p.slice(0, -1));
                    }}
                    className="p-1.5 rounded-lg transition-all"
                    style={{
                      border: `1px solid ${C.border}`,
                      background: "white",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(189,221,252,0.25)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "white")
                    }
                  >
                    <ArrowLeft size={13} style={{ color: C.secondary }} />
                  </button>
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
                      {total} student{total !== 1 ? "s" : ""} enrolled
                      {selectedYearId === "all"
                        ? " · All Years"
                        : selectedYearId === "active"
                          ? activeYear
                            ? ` · ${activeYear.name}`
                            : ""
                          : (() => {
                              const y = academicYears.find(
                                (ay) => ay.id === selectedYearId,
                              );
                              return y ? ` · ${y.name}` : "";
                            })()}
                    </p>
                  </div>
                </div>
                <span
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{
                    background: "rgba(136,189,242,0.15)",
                    color: C.primary,
                  }}
                >
                  <BookOpen size={11} /> {selectedSection.name}
                </span>
              </div>

              <StudentsTable
                students={students}
                loading={loading}
                onDelete={handleDelete}
                sectionName={selectedSection?.name}
              />

              {!loading && students.length > 0 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  showing={students.length}
                  onPageChange={setPage}
                />
              )}
            </div>
          </>
        )}

        {/* Add Student Modal */}
        {openModal && (
          <AddStudent
            closeModal={() => setOpenModal(false)}
            onSuccess={() => {
              invalidate();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default StudentsList;
