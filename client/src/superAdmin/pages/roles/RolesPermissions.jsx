// client/src/superAdmin/pages/roles/RolesPermissions.jsx
import React, { useState, useEffect } from "react";
import {
  ShieldCheck, UserCog, BookOpen,
  GraduationCap, Users2, Crown,
  Check, X, Building2, Globe,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { getAllUsers } from "../UsersManagement/api/usersApi";

const font = { fontFamily: "'DM Sans', sans-serif" };

// ─── Role definitions ─────────────────────────────────────────

const ROLES = [
  {
    key:         "SUPER_ADMIN",
    label:       "Super Admin",
    icon:        Crown,
    color:       "from-[#384959] to-[#6A89A7]",
    bg:          "#BDDDFC",
    text:        "#384959",
    checkActive: "#384959",
    scope:       "University-wide",
    scopeIcon:   Globe,
    description: "Full control over the entire university platform. Can create and manage schools, assign school admins, and view all users across every school.",
  },
  {
    key:         "ADMIN",
    label:       "School Admin",
    icon:        UserCog,
    color:       "from-[#88BDF2] to-[#6A89A7]",
    bg:          "#BDDDFC",
    text:        "#6A89A7",
    checkActive: "#6A89A7",
    scope:       "School-scoped",
    scopeIcon:   Building2,
    description: "Manages a single school. Can add and manage teachers, students, and parents within their assigned school only.",
  },
  {
    key:         "TEACHER",
    label:       "Teacher",
    icon:        BookOpen,
    color:       "from-[#384959] to-[#6A89A7]",
    bg:          "#BDDDFC",
    text:        "#6A89A7",
    checkActive: "#6A89A7",
    scope:       "School-scoped",
    scopeIcon:   Building2,
    description: "Belongs to a school. Can view and manage students in their assigned classes and subjects. Cannot manage other staff.",
  },
  {
    key:         "STUDENT",
    label:       "Student",
    icon:        GraduationCap,
    color:       "from-[#88BDF2] to-[#6A89A7]",
    bg:          "#BDDDFC",
    text:        "#384959",
    checkActive: "#384959",
    scope:       "School-scoped",
    scopeIcon:   Building2,
    description: "Belongs to a single school. Can view their own profile, academic info, documents, and grades. Cannot access any admin features.",
  },
  {
    key:         "PARENT",
    label:       "Parent",
    icon:        Users2,
    color:       "from-[#384959] to-[#6A89A7]",
    bg:          "#BDDDFC",
    text:        "#6A89A7",
    checkActive: "#6A89A7",
    scope:       "School-scoped",
    scopeIcon:   Building2,
    description: "Linked to a school. Can view their child's academic progress, attendance, and school communications. Read-only access.",
  },
];

// ─── Permissions matrix ───────────────────────────────────────

const MATRIX = [
  { category: "Platform",    action: "Manage Universities",        SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Platform",    action: "Create Schools",             SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Platform",    action: "View All Schools",           SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Platform",    action: "View All Users",             SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Admins",      action: "Create School Admins",       SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Admins",      action: "Deactivate School Admins",   SUPER_ADMIN: true,  ADMIN: false, TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Teachers",    action: "Add Teachers",               SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Teachers",    action: "Edit Teacher Profiles",      SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Teachers",    action: "View Teacher List",          SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Students",    action: "Add Students",               SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Students",    action: "View All Students",          SUPER_ADMIN: false, ADMIN: true,  TEACHER: true,  STUDENT: false, PARENT: false },
  { category: "Students",    action: "Edit Student Profiles",      SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Students",    action: "View Own Profile",           SUPER_ADMIN: false, ADMIN: false, TEACHER: false, STUDENT: true,  PARENT: false },
  { category: "Parents",     action: "Add Parents",                SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Parents",     action: "View Child Info",            SUPER_ADMIN: false, ADMIN: false, TEACHER: false, STUDENT: false, PARENT: true  },
  { category: "Documents",   action: "Upload Student Documents",   SUPER_ADMIN: false, ADMIN: true,  TEACHER: false, STUDENT: false, PARENT: false },
  { category: "Documents",   action: "View Own Documents",         SUPER_ADMIN: false, ADMIN: false, TEACHER: false, STUDENT: true,  PARENT: false },
  { category: "Assignments", action: "Manage Class Assignments",   SUPER_ADMIN: false, ADMIN: true,  TEACHER: true,  STUDENT: false, PARENT: false },
  { category: "Assignments", action: "View Assignments",           SUPER_ADMIN: false, ADMIN: false, TEACHER: true,  STUDENT: true,  PARENT: true  },
];

const ROLE_KEYS = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"];

const groupByCategory = (rows) =>
  rows.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {});

// ─── Category icon map ────────────────────────────────────────
const CATEGORY_ICONS = {
  Platform:    Globe,
  Admins:      Crown,
  Teachers:    BookOpen,
  Students:    GraduationCap,
  Parents:     Users2,
  Documents:   ShieldCheck,
  Assignments: UserCog,
};

// ─── Main Component ───────────────────────────────────────────

export default function RolesPermissions() {
  const [counts, setCounts]     = useState({});
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    getAllUsers({ role: "ALL", status: "ALL", search: "", page: 1, limit: 1 })
      .then((data) => setCounts(data.counts || {}))
      .catch(() => {});
  }, []);

  const countFor = {
    SUPER_ADMIN: counts.superAdmin ?? "—",
    ADMIN:       counts.admin      ?? "—",
    TEACHER:     counts.teacher    ?? "—",
    STUDENT:     counts.student    ?? "—",
    PARENT:      counts.parent     ?? "—",
  };

  const grouped = groupByCategory(MATRIX);

  return (
    <PageLayout>
      <div className="p-4 sm:p-6 min-h-screen bg-[#EFF6FD]" style={font}>

        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-[#384959] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow shadow-[#88BDF2]/40 flex-shrink-0">
              <ShieldCheck size={15} color="#fff" />
            </div>
            Roles & Permissions
          </h1>
          <p className="text-xs text-[#6A89A7] mt-1 ml-10">
            Overview of what each role can access and manage across the platform
          </p>
        </div>

        {/* ── Role Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {ROLES.map(({ key, label, icon: Icon, color, bg, text, scope, scopeIcon: ScopeIcon, description }) => {
            const isActive = activeRole === key;
            const count = countFor[key];
            return (
              <button
                key={key}
                onClick={() => setActiveRole(isActive ? null : key)}
                className="text-left bg-white rounded-2xl p-4 border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer w-full"
                style={{
                  borderColor:  isActive ? text : "#BDDDFC50",
                  boxShadow:    isActive ? `0 0 0 3px ${text}22, 0 4px 16px ${text}18` : undefined,
                }}
              >
                {/* Icon row + count */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} shadow-md flex-shrink-0`}>
                    <Icon size={19} color="#fff" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold block" style={{ color: text }}>
                      {count}
                    </span>
                    <span className="text-[9px] font-semibold text-[#6A89A7] uppercase tracking-wide">users</span>
                  </div>
                </div>

                {/* Label */}
                <p className="font-bold text-[13px] text-[#384959] mb-1.5">{label}</p>

                {/* Scope badge */}
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
                  style={{ background: bg, color: text }}
                >
                  <ScopeIcon size={9} /> {scope}
                </span>

                {/* Description */}
                <p className="text-[11px] text-[#6A89A7] leading-relaxed line-clamp-3">
                  {description}
                </p>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="mt-3 text-[10px] font-bold uppercase tracking-wider text-center py-1 rounded-lg"
                    style={{ background: bg, color: text }}
                  >
                    ● Column Highlighted
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Matrix Table ── */}
        <div className="bg-white rounded-2xl border border-[#BDDDFC]/50 shadow-sm overflow-hidden">

          {/* Table sub-header */}
          <div className="px-5 py-4 border-b border-[#EFF6FD] flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-[#384959] text-sm">Permissions Matrix</h2>
              <p className="text-[11px] text-[#6A89A7] mt-0.5">Click a role card above to highlight its column</p>
            </div>
            {activeRole && (
              <button
                onClick={() => setActiveRole(null)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#EFF6FD] text-[#6A89A7] hover:bg-[#BDDDFC] transition-all border-0 cursor-pointer"
              >
                Clear highlight
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#384959]">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#BDDDFC] uppercase tracking-wider w-52">
                    Action
                  </th>
                  {ROLES.map(({ key, label, icon: Icon, bg, text }) => {
                    const isActive = activeRole === key;
                    return (
                      <th
                        key={key}
                        className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider transition-all"
                        style={{
                          color:      isActive ? text      : "#BDDDFC",
                          background: isActive ? bg        : undefined,
                          minWidth:   110,
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Icon size={13} />
                          {label}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([category, rows]) => {
                  const CatIcon = CATEGORY_ICONS[category] || ShieldCheck;
                  return (
                    <React.Fragment key={category}>
                      {/* Category separator */}
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-2"
                          style={{ background: "#EFF6FD" }}
                        >
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#6A89A7]">
                            <CatIcon size={11} className="text-[#88BDF2]" />
                            {category}
                          </span>
                        </td>
                      </tr>

                      {rows.map((row) => (
                        <tr
                          key={row.action}
                          className="border-b border-[#EFF6FD] hover:bg-[#BDDDFC]/10 transition-colors"
                        >
                          <td className="px-5 py-2.5 text-[13px] text-[#384959] font-medium">
                            {row.action}
                          </td>
                          {ROLE_KEYS.map((rk) => {
                            const allowed  = row[rk];
                            const isActive = activeRole === rk;
                            const role     = ROLES.find((r) => r.key === rk);
                            return (
                              <td
                                key={rk}
                                className="px-3 py-2.5 text-center transition-all"
                                style={{
                                  background: isActive
                                    ? allowed ? `${role.bg}` : "#fff0f0"
                                    : undefined,
                                }}
                              >
                                {allowed ? (
                                  <span
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                                    style={{ background: isActive ? role.checkActive : "#BDDDFC" }}
                                  >
                                    <Check
                                      size={11}
                                      color={isActive ? "#fff" : "#384959"}
                                      strokeWidth={2.5}
                                    />
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EFF6FD]">
                                    <X size={11} color="#BDDDFC" strokeWidth={2.5} />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 justify-end">
          <div className="flex items-center gap-2 text-xs text-[#6A89A7]" style={font}>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#BDDDFC]">
              <Check size={10} color="#384959" strokeWidth={2.5} />
            </span>
            Permitted
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6A89A7]" style={font}>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#EFF6FD]">
              <X size={10} color="#BDDDFC" strokeWidth={2.5} />
            </span>
            Not permitted
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6A89A7]" style={font}>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#88BDF2]">
              <Check size={10} color="#fff" strokeWidth={2.5} />
            </span>
            Highlighted (click role card)
          </div>
        </div>

      </div>
    </PageLayout>
  );
}