// client/src/admin/components/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileText,
  DollarSign,
  CalendarCheck,
  Library,
  Settings,
  X,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Users, label: "Students", to: "/students" },
  { icon: GraduationCap, label: "Teachers", to: "/teachers" },
  { icon: BookOpen, label: "Classes", to: "/classes" },
  { icon: ClipboardCheck, label: "Attendance", to: "/attendance" },
  { icon: FileText, label: "Exams", to: "/exams" },
  { icon: DollarSign, label: "Finance", to: "/finance" },
  { icon: CalendarCheck, label: "Meetings", to: "/meetings" },
  { icon: Library, label: "Curriculum", to: "/curriculum" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

const initials = (name = "AU") =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  const displayName = user?.name || "Admin User";
  const displayRole = user?.role || "Administrator";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{
            background: "rgba(106,137,167,0.35)",
            backdropFilter: "blur(2px)",
          }}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-64 h-screen
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ background: "#3f556b", fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center justify-between px-5 h-16 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(136,189,242,0.12)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
              }}
            >
              <GraduationCap size={18} color="#fff" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm" style={{ color: "#fff" }}>
                SchoolHub
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#6A89A7" }}
              >
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1 transition-opacity hover:opacity-60"
            style={{
              color: "#6A89A7",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative"
                  style={{
                    background: active
                      ? "rgba(136,189,242,0.15)"
                      : "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "rgba(136,189,242,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Active left bar */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: "#88BDF2" }}
                    />
                  )}

                  <Icon
                    size={17}
                    style={{
                      color: active ? "#88BDF2" : "#6A89A7",
                      flexShrink: 0,
                    }}
                  />

                  <span
                    className="text-sm"
                    style={{
                      color: active ? "#e8f4fd" : "#8fafc4",
                      fontWeight: active ? 600 : 400,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {label}
                  </span>

                  {/* Active dot */}
                  {active && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#88BDF2" }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── User card ── */}
        <div
          className="px-3 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(136,189,242,0.12)" }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(136,189,242,0.08)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #6A89A7, #384959)",
                color: "#BDDDFC",
              }}
            >
              {initials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{
                  color: "#e8f4fd",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px] truncate"
                style={{
                  color: "#6A89A7",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {displayRole}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
