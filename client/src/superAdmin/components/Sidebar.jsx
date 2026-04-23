// client/src/superAdmin/components/Sidebar.jsx
import React, {useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken } from "../../auth/storage";
import {
  LayoutDashboard, Building2, UserCog, Users, ShieldCheck,
  CreditCard, BarChart3, X, GraduationCap, Wallet,
  MessageCircle,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",           to: "/superadmin/dashboard" },
  { icon: Building2,       label: "Schools",             to: "/superadmin/schools" },
  { icon: UserCog,         label: "School Admins",       to: "/superadmin/schools-admins" },
  { icon: Wallet,          label: "Finance Account",     to: "/superadmin/finance" },
  { icon: Users,           label: "Users Management",    to: "/superadmin/users-management" },
  { icon: ShieldCheck,     label: "Roles & Permissions", to: "/superadmin/roles-permissions" },
  { icon: Building2,       label: "Fees",                to: "/superadmin/fees" },
  { icon: BarChart3,       label: "Analytics",           to: "/superadmin/analytics" },
  { icon: CreditCard,      label: "Subscription Plans",  to: "/superadmin/subscription-Plans" },
  { icon: MessageCircle,   label: "Chat",                to: "/superadmin/chat" },
];

const initials = (name = "SA") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const [logoUrl, setLogoUrl] = useState(null);
  const [hovered, setHovered] = useState(false);

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  const displayName  = user?.name || "Super Admin";
  const displayRole  = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Platform Owner";
  const displayEmail = user?.email || "";

  const expanded = hovered;

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/superadmin/profile/logo`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json();
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
      } catch (err) {
        console.error("Logo fetch error:", err);
      }
    };
    fetchLogo();
  }, []);

  return (
    <>
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
            // Always 12px padding so the circle stays centred inside 64px
            paddingLeft: "12px",
            paddingRight: "12px",
          }}
        >
          {/*
            The circle is always 40px wide.
            Collapsed sidebar = 64px wide, padding 12+12 = 24px, leaving 40px → perfect fit.
            We let the text label grow into the remaining space when expanded.
          */}
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
                className="w-full h-full object-cover"
              />
            ) : (
              <GraduationCap size={20} color="#fff" />
            )}
          </div>

          {/* Text fades in alongside the sidebar expansion */}
          <div
            className="leading-tight min-w-0 ml-2"
            style={{
              opacity: expanded ? 1 : 0,
              // Slide the text in from the left; when collapsed it sits behind the circle
              transform: expanded ? "translateX(0)" : "translateX(-6px)",
              transition: "opacity 180ms ease, transform 180ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              // Prevent collapsed text from pushing layout — visibility:hidden would also work
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
              Super Admin Panel
            </p>
          </div>

          {/* Mobile close button — only shown when drawer is open */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1 transition-opacity hover:opacity-60 ml-auto flex-shrink-0"
            style={{
              color: "#6A89A7",
              background: "none",
              border: "none",
              cursor: "pointer",
              // Keep it in flow so it doesn't interfere with centering on desktop
              display: expanded ? "block" : "none",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, to }) => {
            const active = isActive(to);
            return (
              <Link key={to} to={to} onClick={onClose} style={{ textDecoration: "none" }}>
                <div
                  className="flex items-center rounded-xl transition-all duration-150 relative"
                  style={{
                    background: active ? "rgba(136,189,242,0.15)" : "transparent",
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
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: "#88BDF2" }}
                    />
                  )}

                  <Icon
                    size={17}
                    style={{
                      color: active ? "#88BDF2" : "#6A89A7",
                      flexShrink: 0,
                      // Keep icon centred in the 40px icon zone (64px - 2×12px padding)
                      marginLeft: expanded ? "2px" : "auto",
                      marginRight: expanded ? "0" : "auto",
                      transition: "margin 280ms cubic-bezier(0.4,0,0.2,1)",
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
                style={{ color: "#88BDF2", fontFamily: "'DM Sans', sans-serif" }}
              >
                {displayRole}
              </p>
              {displayEmail && (
                <p
                  className="text-[10px] truncate"
                  style={{ color: "#6A89A7", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {displayEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}