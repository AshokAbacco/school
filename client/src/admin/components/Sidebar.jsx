// src/admin/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSchoolLogo } from "../../hooks/useSchoolLogo";  // ← ADD
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
  Images,
  CalendarDays,
  Trophy,
  Medal,
  Bus,
  MessageCircle,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",  to: "/admin/dashboard" },
  { icon: BookOpen,         label: "Classes",     to: "/admin/classes" },
  { icon: Users,           label: "Students",    to: "/admin/students" },
  { icon: GraduationCap,   label: "Teachers",    to: "/admin/teachers" },
  { icon: Users,           label: "Staff",       to: "/admin/staff" },
  { icon: ClipboardCheck,  label: "Attendance",  to: "/admin/attendance" },
  { icon: FileText,        label: "Exams",       to: "/admin/exams" },
  { icon: Library,         label: "Curriculum",  to: "/admin/curriculum" },
  { icon: CalendarDays,    label: "Holidays",    to: "/admin/holidays" },
  { icon: Medal,          label: "Activities",  to: "/admin/activities" },
  { icon: Trophy,          label: "Awards",      to: "/admin/awards" },
  { icon: CalendarCheck,   label: "Meetings",    to: "/admin/meetings" },
  { icon: Images,          label: "Gallery",     to: "/admin/gallery" },
  { icon: Bus,             label: "Transport", to: "/admin/transport" },
  { icon: MessageCircle,        label: "Chat",    to: "/admin/chat" },
];

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const PANEL_LABEL = {
  ADMIN:       "Admin Panel",
  TEACHER:     "Teacher Panel",
  FINANCE:     "Finance Panel",
  SUPER_ADMIN: "Super Admin",
};

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  const logoUrl = useSchoolLogo();   // ← ADD

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  const displayName = user?.name || "Admin User";
  const displayRole = user?.role || "Administrator";
  const panelLabel  = PANEL_LABEL[user?.role] ?? "Admin Panel";

  const expanded = hovered;

  return (
    <>
      <style>{`
        .sidebar-nav::-webkit-scrollbar { width: 5px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(136,189,242,0.2); border-radius: 10px; }
        .sidebar-nav:hover::-webkit-scrollbar-thumb { background: rgba(136,189,242,0.4); }
        .sidebar-nav { scrollbar-width: thin; scrollbar-color: rgba(136,189,242,0.2) transparent; }
      `}</style>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(106,137,167,0.35)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col h-screen flex-shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          background: "#3f556b",
          fontFamily: "'DM Sans', sans-serif",
          width: expanded ? "256px" : "64px",
          transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {/* ── Logo row ── */}
        <div
          className="flex items-center h-16 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(136,189,242,0.12)",
            paddingLeft: "12px",
            paddingRight: "12px",
          }}
        >
          {/* Logo circle — always 40px so it stays centred when collapsed */}
          <div
            className="flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              width: "40px",
              height: "40px",
              minWidth: "40px",
              borderRadius: "50%",
              background: logoUrl
                ? "transparent"
                : "linear-gradient(135deg, #88BDF2, #6A89A7)",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="School Logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <GraduationCap size={20} color="#fff" />
            )}
          </div>

          {/* Text — fades in when expanded */}
          <div
            className="leading-tight min-w-0 ml-2"
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateX(0)" : "translateX(-6px)",
              transition: "opacity 200ms ease, transform 200ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              pointerEvents: expanded ? "auto" : "none",
            }}
          >
            <p className="font-bold text-sm" style={{ color: "#fff" }}>
              SchoolHub
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "rgb(200,200,200)" }}
            >
              {panelLabel}
            </p>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1 transition-opacity hover:opacity-60 ml-auto flex-shrink-0"
            style={{
              color: "#6A89A7",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: expanded ? "block" : "none",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} onClick={onClose} style={{ textDecoration: "none" }}>
                <div
                  className="flex items-center rounded-xl transition-all duration-150 relative"
                  style={{
                    background: active ? "rgba(136,189,242,0.18)" : "transparent",
                    cursor: "pointer",
                    padding: "10px 10px",
                    gap: "12px",
                    minHeight: "40px",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(136,189,242,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {active && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: "#88BDF2", width: "3px", height: "20px", left: 0 }}
                    />
                  )}

                  <Icon
                    size={17}
                    style={{
                      color: active ? "#88BDF2" : "#6A89A7",
                      flexShrink: 0,
                      marginLeft: expanded ? "2px" : "auto",
                      marginRight: expanded ? "0" : "auto",
                      transition: "margin 280ms cubic-bezier(0.4,0,0.2,1)",
                      filter: active ? "drop-shadow(0 0 4px rgba(136,189,242,0.45))" : "none",
                    }}
                  />

                  <span
                    className="text-sm"
                    style={{
                      color: active ? "#e8f4fd" : "#8fafc4",
                      fontWeight: active ? 600 : 400,
                      fontFamily: "'DM Sans', sans-serif",
                      whiteSpace: "nowrap",
                      opacity: expanded ? 1 : 0,
                      transform: expanded ? "translateX(0)" : "translateX(-8px)",
                      transition: "opacity 180ms ease, transform 180ms ease",
                      pointerEvents: "none",
                    }}
                  >
                    {label}
                  </span>

                  {active && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: "#88BDF2",
                        opacity: expanded ? 1 : 0,
                        transition: "opacity 180ms ease",
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── User card ── */}
        <div
          className="px-2 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(136,189,242,0.12)" }}
        >
          <div
            className="flex items-center rounded-xl"
            style={{
              background: "rgba(136,189,242,0.08)",
              padding: "10px 10px",
              gap: "12px",
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #6A89A7, #384959)",
                color: "#BDDDFC",
                marginLeft: expanded ? "0" : "auto",
                marginRight: expanded ? "0" : "auto",
                transition: "margin 280ms cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {initials(displayName)}
            </div>

            <div
              className="flex-1 min-w-0"
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded ? "translateX(0)" : "translateX(-8px)",
                transition: "opacity 180ms ease, transform 180ms ease",
                pointerEvents: "none",
              }}
            >
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "#e8f4fd", fontFamily: "'DM Sans', sans-serif" }}
              >
                {displayName}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: "#6A89A7", fontFamily: "'DM Sans', sans-serif" }}
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