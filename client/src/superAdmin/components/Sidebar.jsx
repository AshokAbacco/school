import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, UserCog, Users, ShieldCheck,
  CreditCard, ReceiptText, BarChart3, Settings, X, GraduationCap
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",           to: "/superadmin/dashboard" },
  { icon: Building2,       label: "Schools",             to: "/schools" },
  { icon: UserCog,         label: "School Admins",       to: "/schools-admins" },
  { icon: Users,           label: "Users Management",    to: "/users-management" },
  { icon: ShieldCheck,     label: "Roles & Permissions", to: "/roles-permissions" },
  { icon: Building2,       label: "Fees",                to: "/fees" },
  { icon: Building2,       label: "Meetings",                to: "/mettings" },
  { icon: BarChart3,       label: "Analytics",           to: "/analytics" },
  { icon: CreditCard,      label: "Subscription Plans",  to: "/subscription-Plans" },
  { icon: Settings,        label: "Global Settings",     to: "/superadmin/settings" },
];

const initials = (n = "SA") =>
  n.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");
  const name = user?.name || "Super Admin";
  const role = user?.role || "Platform Owner";

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#384959]/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-60 h-screen
          bg-[#384959] transition-transform duration-300 shadow-2xl
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-[#BDDDFC]/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center shadow-lg shadow-[#88BDF2]/30">
              <GraduationCap size={17} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">School Hub</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#88BDF2]">
                Super Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-[#88BDF2] hover:bg-[#BDDDFC]/10 p-1.5 rounded-lg transition-colors border-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-6 space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }, i) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="block no-underline"
                style={{ animation: `slideIn .3s ${i * 0.04}s both` }}
              >
                <div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group cursor-pointer
                    ${active
                      ? "bg-[#BDDDFC]/15"
                      : "hover:bg-[#BDDDFC]/8 hover:translate-x-0.5"
                    }`}
                >
                  {/* Active left bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[#88BDF2] shadow-[0_0_8px_#88BDF2]" />
                  )}

                  {/* Icon */}
                  <Icon
                    size={16}
                    className={`flex-shrink-0 transition-transform group-hover:scale-110
                      ${active ? "text-[#ffff]" : "text-[#fff] group-hover:text-[#BDDDFC]"}`}
                  />

                  {/* Label */}
                  <span
                    className={`text-[13px] ${
                      active
                        ? "font-semibold text-[#BDDDFC]"
                        : "text-[#ffff] group-hover:text-[#BDDDFC]"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Active dot */}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#88BDF2] animate-pulse shadow-[0_0_6px_#88BDF2]" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── User ─────────────────────────────────────────────────────────── */}
        <div className="px-2.5 py-3 border-t border-[#BDDDFC]/10 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#BDDDFC]/10 border border-[#BDDDFC]/15 hover:bg-[#BDDDFC]/15 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#88BDF2] to-[#6A89A7] flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{name}</p>
              <p className="text-[10px] text-[#88BDF2] truncate">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}