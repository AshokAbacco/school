// client/src/busHead/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, Bus, X } from "lucide-react";

const initials = (name = "BH") =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",        to: "/busHead/dashboard" },
  { icon: MapPin,          label: "Vehicle Tracking", to: "/busHead/vehicle-tracking" },
];

export default function Sidebar({ isOpen, onClose, user }) {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  const expanded = hovered;

  const isActive = (to) => pathname === to || pathname.startsWith(to + "/");

  const displayName = user?.name || "Bus Head";
  const scopeLabel =
    user?.accessType === "ALL_SCHOOLS"
      ? `All Schools · ${user?.university?.name || ""}`
      : user?.school?.name || "";

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
          style={{ borderBottom: "1px solid rgba(136,189,242,0.12)", paddingLeft: "12px", paddingRight: "12px" }}
        >
          <div
            className="flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{
              width: "40px", height: "40px", minWidth: "40px", borderRadius: "50%",
              background: "linear-gradient(135deg, #88BDF2, #6A89A7)",
            }}
          >
            <Bus size={20} color="#fff" />
          </div>

          <div
            className="leading-tight min-w-0 ml-2"
            style={{
              opacity: expanded ? 1 : 0,
              transform: expanded ? "translateX(0)" : "translateX(-6px)",
              transition: "opacity 180ms ease, transform 180ms ease",
              whiteSpace: "nowrap", overflow: "hidden",
              pointerEvents: expanded ? "auto" : "none",
            }}
          >
            <p className="font-bold text-sm" style={{ color: "#fff" }}>SchoolHub</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgb(200,200,200)" }}>
              Bus Head Panel
            </p>
          </div>

          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1 transition-opacity hover:opacity-60 ml-auto flex-shrink-0"
            style={{ color: "#6A89A7", background: "none", border: "none", cursor: "pointer", display: expanded ? "block" : "none" }}
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
                    cursor: "pointer", padding: "10px 10px", gap: "12px", minHeight: "40px",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(136,189,242,0.07)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: "#88BDF2" }} />
                  )}

                  <Icon
                    size={17}
                    style={{
                      color: active ? "#88BDF2" : "#6A89A7", flexShrink: 0,
                      marginLeft: expanded ? "2px" : "auto", marginRight: expanded ? "0" : "auto",
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
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── User card ── */}
        <div className="px-2 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(136,189,242,0.12)" }}>
          <div className="flex items-center rounded-xl" style={{ background: "rgba(136,189,242,0.08)", padding: "10px 10px", gap: "12px" }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #6A89A7, #384959)", color: "#BDDDFC",
                marginLeft: expanded ? "0" : "auto", marginRight: expanded ? "0" : "auto",
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
              <p className="text-sm font-semibold truncate" style={{ color: "#e8f4fd", fontFamily: "'DM Sans', sans-serif" }}>
                {displayName}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#88BDF2", fontFamily: "'DM Sans', sans-serif" }}>
                {scopeLabel}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}