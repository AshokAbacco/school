// client/src/finance/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Wallet, X,MessageCircle } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/finance/dashboard" },
  { icon: GraduationCap, label: "Student", to: "/finance/studentfinance" },
  { icon: Wallet, label: "Staff", to: "/finance/teachersfinance" },
  { icon: Wallet, label: "Expenses", to: "/finance/expenses" },
  { icon: MessageCircle, label: "Chat", to: "/finance/chat" },
];

const initials = (name = "AU") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  const displayName = user?.name || "Finance Admin";
  const displayRole = user?.role || "Finance";
  const displayEmail = user?.email || "";

  // On mobile (isOpen), always show expanded labels.
  // On desktop, expand on hover.
  const expanded = isOpen || hovered;

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
          // On mobile (isOpen) use full width up to 240px; on desktop use collapse/expand
          width: isOpen ? "min(240px, 85vw)" : expanded ? "256px" : "64px",
          transition: "width 280ms cubic-bezier(0.4, 0, 0.2, 1), transform 280ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-3.5 h-16 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(136,189,242,0.12)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)" }}
            >
              <GraduationCap size={18} color="#fff" />
            </div>

            <div
              className="leading-tight min-w-0"
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded ? "translateX(0)" : "translateX(-6px)",
                transition: "opacity 200ms ease, transform 200ms ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <p className="font-bold text-sm" style={{ color: "#fff" }}>
                SchoolHub
              </p>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgb(200,200,200)" }}
              >
                Finance Panel
              </p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 transition-colors"
            style={{
              color: "#8fafc4",
              background: "rgba(136,189,242,0.08)",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(136,189,242,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(136,189,242,0.08)")
            }
          >
            <X size={17} />
          </button>
        </div>

        {/* Nav items */}
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
                    minHeight: "44px",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "rgba(136,189,242,0.07)";
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
                      transform: expanded
                        ? "translateX(0)"
                        : "translateX(-8px)",
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

        {/* User card */}
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
              {displayEmail && (
                <p
                  className="text-[10px] truncate"
                  style={{
                    color: "#88BDF2",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
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