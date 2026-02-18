import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  ClipboardCheck,
  BarChart2,
  Calendar,
  Zap,
  Award,
  Users,
  LogOut,
  GraduationCap,
  X,
} from "lucide-react";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: ClipboardCheck, label: "Attendance", href: "/attendance" },
    { icon: BarChart2, label: "Marks & Results", href: "/marks" },
    { icon: Calendar, label: "Timetable", href: "/timetable" },
    { icon: Zap, label: "Activities", href: "/activities" },
    { icon: Award, label: "Certificates", href: "/certificates" },
    { icon: Users, label: "Meeting", href: "/meeting" },
  ];


  const isActive = (href) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 fixed md:static inset-y-0 left-0 z-50
        flex flex-col bg-[#3f5870] border-r border-[#3f5870]

          transition-transform duration-300
        `}
        style={{ width: "250px", minWidth: "250px" }}

      >
        {/* Mobile close btn */}
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* ── Logo ── */}
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-blue-400 bg-blue-50">
            <GraduationCap className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-lg font-bold text-gray-800">Parents CRM</span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-full
                  text-lg font-semibold transition-all duration-150
                  ${active
                    ? "bg-white text-[#3f5870]"
                    : "text-gray-200 hover:bg-[#4e6b85] hover:text-white"


                  }
                `}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <div className="px-3 pb-5">
          <button
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-xs font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#f87171 0%,#dc2626 100%)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;