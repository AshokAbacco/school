// client/src/parent/components/Sidebar.jsx
// UI: Stormy Morning palette matching student Sidebar.jsx
// Change from original: logout button replaced with user card (avatar + name + role)
//                       reading parent name from getAuth()
// Everything else: menuItems, routes, isActive — 100% unchanged

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  ClipboardCheck,
  BarChart2,
  Calendar,
  Award,
  GraduationCap,
  X,
  CreditCard,
} from "lucide-react";
import { getAuth } from "../../auth/storage";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const base = "/parent";

  // Read logged-in parent name from auth storage
  const auth = getAuth();
  const parentName = auth?.user?.name || "Parent";

  const initials = (name = "PA") =>
    name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: `${base}/dashboard` },
    { icon: User, label: "My Child Profile", href: `${base}/profile` },
    { icon: ClipboardCheck, label: "Attendance", href: `${base}/attendance` },
    { icon: BarChart2, label: "Results", href: `${base}/marks` },
    { icon: Calendar, label: "Time Table", href: `${base}/timetable` },
    { icon: CreditCard, label: "Activities", href: `${base}/fees-payments` },
    { icon: Award, label: "Certificates", href: `${base}/certificates` },
  ];

  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(106,137,167,0.35)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col h-screen
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ background: "#3f556b", fontFamily: "'Inter', sans-serif", width: "250px", minWidth: "250px" }}
      >
        {/* Mobile close btn */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 p-1 rounded-lg transition-opacity hover:opacity-60"
          style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={18} />
        </button>

        {/* ── Logo ── */}
        <div
          className="flex items-center justify-between px-5 h-16 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(136,189,242,0.12)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)" }}
            >
              <GraduationCap size={18} color="#fff" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm" style={{ color: "#fff" }}>SchoolHub</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgba(200,220,240,0.85)" }}
              >
                Parent Portal
              </p>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {menuItems.map(({ icon: Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={label}
                to={href}
                onClick={onClose}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative"
                  style={{
                    background: active ? "rgba(136,189,242,0.15)" : "transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(136,189,242,0.07)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Active left bar */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: "#88BDF2" }}
                    />
                  )}

                  <Icon size={17} style={{ color: active ? "#88BDF2" : "#6A89A7", flexShrink: 0 }} />

                  <span
                    className="text-sm"
                    style={{
                      color: active ? "#e8f4fd" : "#8fafc4",
                      fontWeight: active ? 600 : 400,
                      fontFamily: "'Inter', sans-serif",
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

        {/* ── User card — replaces logout button, matches student sidebar ── */}
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
              style={{ background: "linear-gradient(135deg, #6A89A7, #384959)", color: "#BDDDFC" }}
            >
              {initials(parentName)}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "#e8f4fd", fontFamily: "'Inter', sans-serif" }}
              >
                {parentName}
              </p>
              <p
                className="text-[11px] truncate"
                style={{ color: "#6A89A7", fontFamily: "'Inter', sans-serif" }}
              >
                PARENT
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;