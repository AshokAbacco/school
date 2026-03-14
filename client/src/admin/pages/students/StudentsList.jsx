// admin/pages/students/StudentsList.jsx
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

/* ── Design tokens — matches Dashboard / Curriculum / Attendance ── */
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  // bg: "#BDDDFC",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
};

const GRADE_COLORS = [
  { bar: C.sky, soft: `${C.sky}18`, text: C.deep },
  { bar: C.slate, soft: `${C.slate}18`, text: C.deep },
  { bar: C.mist, soft: `${C.mist}44`, text: C.deep },
  { bar: C.deep, soft: `${C.deep}12`, text: C.deep },
];

/* ── Pulse skeleton ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: `${C.mist}55`,
      }}
    />
  );
}

/* ── Stat cards ── */
const STAT_CARDS = [
  { key: "total", label: "Total Students", icon: Users, bar: C.slate },
  { key: "active", label: "Active", icon: UserCheck, bar: C.sky },
  { key: "inactive", label: "Inactive", icon: UserX, bar: C.deep },
  {
    key: "newThisMonth",
    label: "New This Month",
    icon: TrendingUp,
    bar: C.mist,
  },
];

function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {STAT_CARDS.map(({ key, label, icon: Icon, bar }, idx) => (
        <div
          key={key}
          className="fade-up"
          style={{
            animationDelay: `${idx * 50}ms`,
            background: C.white,
            borderRadius: 18,
            border: `1.5px solid ${C.borderLight}`,
            boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top accent stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${bar}, ${C.deep})`,
              borderRadius: "18px 18px 0 0",
            }}
          />
          <div style={{ padding: "18px 18px 14px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: `${bar}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                border: `1px solid ${bar}33`,
              }}
            >
              <Icon
                size={16}
                style={{ color: bar === C.mist ? C.slate : bar }}
              />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: C.text,
                lineHeight: 1,
               fontFamily: "'Inter', sans-serif",
                letterSpacing: "-1px",
              }}
            >
              {(stats[key] || 0).toLocaleString()}
            </p>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 11,
                fontWeight: 600,
                color: C.textLight,
               fontFamily: "'Inter', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Section header (matches Curriculum/Attendance panels) ── */
function PanelHead({ title, sub, IconComp, iconColor = C.slate, right }) {
  return (
    <div
      style={{
        padding: "14px 18px",
        background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
        borderBottom: `1.5px solid ${C.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {IconComp && (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `${C.sky}22`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1.5px solid ${C.sky}33`,
              flexShrink: 0,
            }}
          >
            <IconComp size={15} color={iconColor} strokeWidth={2} />
          </div>
        )}
        <div>
          <p
            style={{
              margin: 0,
             fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
            }}
          >
            {title}
          </p>
          {sub && (
            <p
              style={{
                margin: 0,
               fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: C.textLight,
                marginTop: 1,
              }}
            >
              {sub}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ── Generic card grid (level 1 & 2) — inner logic unchanged ── */
function CardGrid({ items, onSelect, emptyMsg = "No items found" }) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: `${C.sky}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${C.sky}33`,
          }}
        >
          <GraduationCap size={26} color={C.sky} strokeWidth={1.5} />
        </div>
        <p
          style={{
           fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            margin: 0,
          }}
        >
          {emptyMsg}
        </p>
        <p
          style={{
           fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: C.textLight,
            margin: 0,
          }}
        >
          Create class sections first in Settings
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {items.map((item, idx) => {
        const color = GRADE_COLORS[idx % GRADE_COLORS.length];
        return (
          <button
            key={item.id || item.label}
            onClick={() => onSelect(item)}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              background: C.white,
              border: `1.5px solid ${C.borderLight}`,
              textAlign: "left",
              transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: "0 2px 12px rgba(56,73,89,0.05)",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 10px 28px ${C.sky}33`;
              e.currentTarget.style.borderColor = C.sky;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 12px rgba(56,73,89,0.05)";
              e.currentTarget.style.borderColor = C.borderLight;
            }}
          >
            {/* Top color stripe */}
            <div
              style={{
                height: 4,
                background: `linear-gradient(90deg, ${color.bar}, ${C.deep})`,
                borderRadius: "18px 18px 0 0",
              }}
            />
            <div style={{ padding: "16px 16px 18px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: color.soft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  border: `1px solid ${color.bar}33`,
                }}
              >
                {item.icon ? (
                  <item.icon
                    size={20}
                    style={{
                      color: color.bar === C.mist ? C.slate : color.bar,
                    }}
                  />
                ) : (
                  <GraduationCap
                    size={20}
                    style={{
                      color: color.bar === C.mist ? C.slate : color.bar,
                    }}
                  />
                )}
              </div>
              <p
                style={{
                  margin: 0,
                 fontFamily: "'Inter', sans-serif",
                  fontSize: 16,
                  fontWeight: 800,
                  color: C.text,
                  letterSpacing: "-0.3px",
                }}
              >
                {item.label}
              </p>
              {item.sublabel && (
                <p
                  style={{
                    margin: "3px 0 0",
                   fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: C.textLight,
                  }}
                >
                  {item.sublabel}
                </p>
              )}
              {item.chips && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginTop: 10,
                  }}
                >
                  {item.chips.map((chip) => (
                    <span
                      key={chip}
                      style={{
                       fontFamily: "'Inter', sans-serif",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: color.soft,
                        color: C.textLight,
                        border: `1px solid ${C.borderLight}`,
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  right: 14,
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: color.soft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${C.borderLight}`,
                }}
              >
                <ChevronRight size={14} color={C.textLight} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Breadcrumb ── */
function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={13} color={C.textLight} />}
            {isLast ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 10,
                 fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.deep,
                  background: `${C.sky}18`,
                  border: `1.5px solid ${C.sky}33`,
                }}
              >
                {crumb.icon && <crumb.icon size={12} />}
                {crumb.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 12px",
                  borderRadius: 10,
                 fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textLight,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.deep)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = C.textLight)
                }
              >
                {crumb.icon && <crumb.icon size={12} />}
                {crumb.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Status badge ── */
const STATUS_STYLE = {
  ACTIVE: { bg: `${C.sky}22`, color: C.deep, dot: C.sky },
  INACTIVE: { bg: `${C.deep}12`, color: C.deep, dot: C.deep },
  SUSPENDED: { bg: "rgba(255,160,60,0.15)", color: "#7a4000", dot: "#f59e0b" },
  GRADUATED: { bg: `${C.slate}18`, color: C.deep, dot: C.slate },
};
function StatusBadge({ status = "" }) {
  const s = STATUS_STYLE[status.toUpperCase()] || STATUS_STYLE.INACTIVE;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
       fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

/* ── Avatar ── */
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
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
        boxShadow: `0 3px 10px ${C.sky}44`,
       fontFamily: "'Inter', sans-serif",
      }}
    >
      {initials}
    </div>
  );
}

/* ── Students table — inner logic unchanged, outer styling updated ── */
function StudentsTable({ students, loading, onDelete, sectionName }) {
  const navigate = useNavigate();
  const displayName = (s) =>
    s.personalInfo
      ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}`
      : s.name;

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          gap: 12,
        }}
      >
        <Loader2 size={30} className="animate-spin" style={{ color: C.sky }} />
        <p
          style={{
           fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: C.textLight,
            margin: 0,
          }}
        >
          Loading students…
        </p>
      </div>
    );

  if (!students.length)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: `${C.sky}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${C.sky}33`,
          }}
        >
          <Search size={24} color={C.sky} strokeWidth={1.5} />
        </div>
        <p
          style={{
           fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            margin: 0,
          }}
        >
          No students found
        </p>
        <p
          style={{
           fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: C.textLight,
            margin: 0,
          }}
        >
          No students enrolled in {sectionName || "this section"} yet
        </p>
      </div>
    );

  return (
    <>
      {/* Mobile card list */}
      <div
        className="md:hidden"
        style={{ borderTop: `1px solid ${C.borderLight}` }}
      >
        {students.map((student) => {
          const name = displayName(student);
          const enroll = student.enrollments?.[0] || null;
          const status = enroll?.status || student.personalInfo?.status || "";
          return (
            <div
              key={student.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: `1px solid ${C.borderLight}`,
                background: C.white,
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onClick={() => navigate(`/students/${student.id}`)}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
            >
              <Avatar student={student} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                   fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </p>
                <p
                  style={{
                   fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: C.textLight,
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {student.email}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  {enroll?.rollNumber && (
                    <span
                      style={{
                       fontFamily: "'Inter', sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        color: C.textLight,
                      }}
                    >
                      Roll: {enroll.rollNumber}
                    </span>
                  )}
                  <StatusBadge status={status} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/students/${student.id}`);
                  }}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: `1px solid ${C.borderLight}`,
                    background: C.bg,
                    color: C.textLight,
                    cursor: "pointer",
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e, student.id, name);
                  }}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    color: "#c0392b",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
           fontFamily: "'Inter', sans-serif",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: `${C.bg}88`,
                borderBottom: `1.5px solid ${C.borderLight}`,
              }}
            >
              {[
                "Student",
                "Contact",
                "Roll No.",
                "Academic Year",
                "Status",
                "Actions",
              ].map((h, i) => (
                <th
                  key={h}
                  className={
                    i === 1
                      ? "hidden md:table-cell"
                      : i === 3
                        ? "hidden lg:table-cell"
                        : ""
                  }
                  style={{
                    padding: "11px 18px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: C.textLight,
                    borderBottom: `1.5px solid ${C.borderLight}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const name = displayName(student);
              const enroll = student.enrollments?.[0] || null;
              const acYear = enroll?.academicYear;
              const status =
                enroll?.status || student.personalInfo?.status || "";
              const rowBg = idx % 2 === 0 ? C.white : `${C.mist}18`;
              return (
                <tr
                  key={student.id}
                  style={{
                    borderBottom: `1px solid ${C.borderLight}`,
                    background: rowBg,
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onClick={() => navigate(`/students/${student.id}`)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = `${C.sky}12`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = rowBg)
                  }
                >
                  <td style={{ padding: "12px 18px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Avatar student={student} />
                      <div>
                        <p
                          style={{ margin: 0, fontWeight: 700, color: C.text }}
                        >
                          {name}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: C.textLight,
                          }}
                        >
                          {student.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td
                    className="hidden md:table-cell"
                    style={{ padding: "12px 18px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          color: C.textLight,
                        }}
                      >
                        <Mail size={10} /> {student.email}
                      </div>
                      {student.personalInfo?.phone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            color: C.textLight,
                          }}
                        >
                          <Phone size={10} /> {student.personalInfo.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 18px" }}>
                    {enroll?.rollNumber ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          background: `${C.sky}18`,
                          color: C.deep,
                          border: `1px solid ${C.sky}33`,
                        }}
                      >
                        {enroll.rollNumber}
                      </span>
                    ) : (
                      <span style={{ color: C.textLight }}>—</span>
                    )}
                  </td>
                  <td
                    className="hidden lg:table-cell"
                    style={{ padding: "12px 18px" }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 10px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${C.mist}55`,
                        color: C.deep,
                        border: `1px solid ${C.borderLight}`,
                      }}
                    >
                      {acYear?.name || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 18px" }}>
                    <StatusBadge status={status} />
                  </td>
                  <td style={{ padding: "12px 18px" }}>
                    <div
                      style={{ display: "flex", gap: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        {
                          action: "view",
                          Icon: Eye,
                          onClick: () => navigate(`/students/${student.id}`),
                          hoverBg: `${C.sky}22`,
                          hoverC: C.deep,
                        },
                        {
                          action: "edit",
                          Icon: Edit,
                          onClick: () =>
                            navigate(`/students/${student.id}/edit`),
                          hoverBg: `${C.sky}22`,
                          hoverC: C.deep,
                        },
                        {
                          action: "delete",
                          Icon: Trash2,
                          onClick: (e) => onDelete(e, student.id, name),
                          hoverBg: "rgba(255,80,80,0.10)",
                          hoverC: "#c0392b",
                        },
                      ].map(({ action, Icon, onClick, hoverBg, hoverC }) => (
                        <button
                          key={action}
                          onClick={onClick}
                          style={{
                            padding: 7,
                            borderRadius: 9,
                            border: `1px solid ${C.borderLight}`,
                            background: "transparent",
                            color: C.textLight,
                            cursor: "pointer",
                            transition: "all 0.12s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = hoverBg;
                            e.currentTarget.style.color = hoverC;
                            e.currentTarget.style.borderColor = hoverBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = C.textLight;
                            e.currentTarget.style.borderColor = C.borderLight;
                          }}
                        >
                          <Icon size={14} />
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
    </>
  );
}

/* ── Pagination ── */
function Pagination({ page, totalPages, total, showing, onPageChange }) {
  const pages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => i + 1,
  );
  const Btn = ({ children, onClick, disabled, active }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 14px",
        borderRadius: 11,
       fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        fontWeight: 700,
        background: active
          ? `linear-gradient(135deg, ${C.slate}, ${C.deep})`
          : C.white,
        color: active ? "#fff" : C.textLight,
        border: `1.5px solid ${active ? C.deep : C.borderLight}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active)
          e.currentTarget.style.background = `${C.mist}55`;
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) e.currentTarget.style.background = C.white;
      }}
    >
      {children}
    </button>
  );
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "14px 18px",
        borderTop: `1.5px solid ${C.borderLight}`,
      }}
    >
      <p
        style={{
         fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          color: C.textLight,
          margin: 0,
        }}
      >
        Showing{" "}
        <span style={{ fontWeight: 700, color: C.text }}>{showing}</span> of{" "}
        <span style={{ fontWeight: 700, color: C.text }}>{total}</span> students
      </p>
      <div style={{ display: "flex", gap: 6 }}>
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

/* ════════════════════════════════════════
   MAIN
════════════════════════════════════════ */
function StudentsList() {
  const navigate = useNavigate();
  const { schoolType, showStream, showCourse } = useInstitutionConfig();

  const [navStack, setNavStack] = useState([]);
  const [level1Items, setLevel1Items] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
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
  const [selectedYearId, setSelectedYearId] = useState("active");
  const [refreshKey, setRefreshKey] = useState(0);
  const invalidate = useCallback(() => setRefreshKey((k) => k + 1), []);

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

  const level0Items = useMemo(() => {
    if (!classSections.length) return [];
    if (schoolType === "SCHOOL") {
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
          children: gradeMap[num],
          isLeafGroup: true,
        }));
    }
    if (schoolType === "PUC") {
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
    return classSections.map((cs) => ({
      id: cs.id,
      label: cs.name,
      sublabel: cs.grade,
      icon: GraduationCap,
      sectionObj: cs,
      isLeaf: true,
    }));
  }, [classSections, schoolType, showCourse]);

  const buildLevel1Items = useCallback(
    (children) => {
      if (schoolType === "SCHOOL")
        return children.map((cs) => ({
          id: cs.id,
          label: `Section ${cs.section}`,
          sublabel: cs.name,
          icon: Users,
          sectionObj: cs,
          isLeaf: true,
        }));
      if (schoolType === "PUC") {
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

  const buildLevel2Items = useCallback(
    (children) =>
      children.map((cs) => ({
        id: cs.id,
        label: cs.name,
        sublabel: cs.grade + (cs.section ? ` · Section ${cs.section}` : ""),
        icon: Users,
        sectionObj: cs,
        isLeaf: true,
      })),
    [],
  );

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
      const l1 = buildLevel1Items(item.children);
      setLevel1Items(l1);
      setNavStack([{ label: item.label, icon: item.icon }]);
      setSelectedSection(null);
    }
  };
  const handleLevel1Select = (item) => {
    if (item.isLeaf) {
      setNavStack((p) => [
        ...p.slice(0, -0 || p.length),
        { label: item.label, icon: item.icon },
      ]);
      setSelectedSection(item.sectionObj);
      setStudents([]);
      setPage(1);
    } else {
      const l2 = buildLevel2Items(item.children);
      setLevel1Items(l2);
      // Push onto the navStack so viewLevel increases and back-nav works
      setNavStack((p) => [
        ...p,
        { label: item.label, icon: item.icon },
      ]);
      setSelectedSection(null);
    }
  };
  const handleNavCrumb = (idx) => {
    if (idx === 0) {
      setNavStack([]);
      setLevel1Items([]);
      setSelectedSection(null);
      setStudents([]);
    } else {
      // Navigate back to any intermediate level
      setSelectedSection(null);
      setStudents([]);
      setNavStack((p) => p.slice(0, idx));
      // Rebuild level1Items for the parent at idx-1
      const parentItem = level0Items.find(
        (item) => item.label === navStack[0]?.label,
      );
      if (idx === 1 && parentItem?.children) {
        setLevel1Items(buildLevel1Items(parentItem.children));
      }
    }
  };

  const crumbs = [
    { label: "All", icon: LayoutGrid },
    ...navStack,
    ...(selectedSection ? [{ label: selectedSection.name, icon: Users }] : []),
  ];

  return (
    <PageLayout>
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "28px 30px",
         fontFamily: "'Inter', sans-serif",
          backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)`,
        }}
      >
        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 5,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 28,
                    borderRadius: 99,
                    background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                    flexShrink: 0,
                  }}
                />
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(20px,4vw,28px)",
                    fontWeight: 900,
                    color: C.text,
                    letterSpacing: "-0.6px",
                  }}
                >
                  Students
                </h1>
              </div>
              <p
                style={{
                  margin: 0,
                  paddingLeft: 14,
                  fontSize: 12,
                  color: C.textLight,
                  fontWeight: 500,
                }}
              >
                {viewLevel === 0 && "Select to browse students"}
                {viewLevel === 1 && `${navStack[0]?.label} — Select section`}
                {viewLevel >= 2 && !selectedSection && `${navStack[navStack.length - 1]?.label} — Select section`}
                {viewLevel >= 2 && selectedSection && selectedSection.name}
              </p>
            </div>
            <button
              onClick={() => setOpenModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 20px",
                borderRadius: 13,
                border: "none",
                background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
               fontFamily: "'Inter', sans-serif",
                boxShadow: `0 4px 14px ${C.deep}44`,
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Plus size={15} /> Add Student
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <StatCards stats={stats} />

        {/* ── Breadcrumb ── */}
        {navStack.length > 0 && (
          <Breadcrumb crumbs={crumbs} onNavigate={handleNavCrumb} />
        )}

        {/* ── LEVEL 0: Root cards ── */}
        {viewLevel === 0 && (
          <div
            className="fade-up"
            style={{
              background: C.white,
              borderRadius: 20,
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
              overflow: "hidden",
            }}
          >
            <PanelHead
              title={
                schoolType === "SCHOOL"
                  ? "All Grades"
                  : schoolType === "PUC"
                    ? "All Streams"
                    : "All Courses"
              }
              sub={`${level0Items.length} ${schoolType === "SCHOOL" ? "grades" : schoolType === "PUC" ? "streams" : "courses"} · ${classSections.length} sections total`}
              IconComp={GraduationCap}
              iconColor={C.sky}
              right={
                <button
                  onClick={invalidate}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1.5px solid ${C.borderLight}`,
                    background: C.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: C.textLight,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = `${C.mist}55`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = C.bg)
                  }
                >
                  <RefreshCw size={13} />
                </button>
              }
            />
            <div style={{ padding: "18px 18px" }}>
              <CardGrid
                items={level0Items}
                onSelect={handleLevel0Select}
                emptyMsg={`No ${schoolType === "SCHOOL" ? "grades" : schoolType === "PUC" ? "streams" : "courses"} found`}
              />
            </div>
          </div>
        )}

        {/* ── LEVEL 1+: Sub-items (handles BE→course, PUC→stream→combo, etc.) ── */}
        {viewLevel >= 1 && !selectedSection && (
          <div
            className="fade-up"
            style={{
              background: C.white,
              borderRadius: 20,
              border: `1.5px solid ${C.borderLight}`,
              boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
              overflow: "hidden",
            }}
          >
            <PanelHead
              title={navStack[navStack.length - 1]?.label}
              sub={`${level1Items.length} items`}
              IconComp={navStack[navStack.length - 1]?.icon || GraduationCap}
              iconColor={C.sky}
              right={
                <button
                  onClick={() => handleNavCrumb(0)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${C.borderLight}`,
                    background: C.bg,
                    color: C.textLight,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                   fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = `${C.mist}55`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = C.bg)
                  }
                >
                  <ArrowLeft size={12} /> Back
                </button>
              }
            />
            <div style={{ padding: "18px 18px" }}>
              <CardGrid
                items={level1Items}
                onSelect={handleLevel1Select}
                emptyMsg="No sections found"
              />
            </div>
          </div>
        )}

        {/* ── LEVEL 2: Students table ── */}
        {selectedSection && (
          <>
            {/* Search / filter bar */}
            <div
              className="fade-up"
              style={{
                background: C.white,
                borderRadius: 18,
                border: `1.5px solid ${C.borderLight}`,
                boxShadow: "0 2px 16px rgba(56,73,89,0.06)",
                padding: "14px 16px",
                marginBottom: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textLight,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder={`Search students in ${selectedSection?.name}…`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "9px 14px 9px 34px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: C.text,
                    background: C.bg,
                    outline: "none",
                   fontFamily: "'Inter', sans-serif",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </div>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value);
                  setPage(1);
                }}
                style={{
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.text,
                  background: C.bg,
                  outline: "none",
                 fontFamily: "'Inter', sans-serif",
                  minWidth: 140,
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 14px",
                  borderRadius: 12,
                  border: `1.5px solid ${C.borderLight}`,
                  background: C.bg,
                  color: C.textLight,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                 fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = `${C.mist}55`)
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = C.bg)}
              >
                <RefreshCw
                  size={13}
                  className={loading ? "animate-spin" : ""}
                />{" "}
                Refresh
              </button>
            </div>

            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 16px",
                  borderRadius: 13,
                  background: "#fee8e8",
                  border: "1px solid #f5b0b0",
                  color: "#8b1c1c",
                  fontSize: 13,
                  marginBottom: 14,
                 fontFamily: "'Inter', sans-serif",
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            {/* Students panel */}
            <div
              className="fade-up"
              style={{
                background: C.white,
                borderRadius: 20,
                border: `1.5px solid ${C.borderLight}`,
                boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
                overflow: "hidden",
              }}
            >
              <PanelHead
                title={selectedSection.name}
                sub={`${total} student${total !== 1 ? "s" : ""} enrolled${selectedYearId === "all" ? " · All Years" : activeYear && selectedYearId === "active" ? ` · ${activeYear.name}` : ""}`}
                IconComp={Users}
                iconColor={C.sky}
                right={
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        background: `${C.sky}18`,
                        color: C.deep,
                        border: `1px solid ${C.sky}33`,
                       fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <BookOpen size={11} /> {selectedSection.name}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSection(null);
                        setStudents([]);
                        setNavStack((p) => p.slice(0, -1));
                        // If going back to level 1, restore the correct level1Items
                        if (navStack.length >= 2) {
                          const parentItem = level0Items.find(
                            (item) => item.label === navStack[0]?.label,
                          );
                          if (parentItem?.children) {
                            const l1 = buildLevel1Items(parentItem.children);
                            // Find the level-1 item that matches navStack[1]
                            const l1Item = l1.find(
                              (i) => i.label === navStack[1]?.label,
                            );
                            if (l1Item?.children) {
                              setLevel1Items(buildLevel2Items(l1Item.children));
                            } else {
                              setLevel1Items(l1);
                            }
                          }
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 10,
                        border: `1.5px solid ${C.borderLight}`,
                        background: C.bg,
                        color: C.textLight,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                       fontFamily: "'Inter', sans-serif",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = `${C.mist}55`)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = C.bg)
                      }
                    >
                      <ArrowLeft size={12} /> Back
                    </button>
                  </div>
                }
              />

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