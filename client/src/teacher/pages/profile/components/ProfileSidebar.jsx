// components/ProfileSidebar.jsx

import React from "react";
import { C } from "./shared.jsx";
import Avatar3D from "../../../../components/Avatar3D.jsx";

const STATUS_COLOR = {
  ACTIVE:   "#16a34a",
  ON_LEAVE: "#d97706",
  RESIGNED: "#dc2626",
};

const SIDEBAR_CSS = `
  /* Remove shared.jsx sidebar padding so avatar can touch edges on desktop */
  .pf-sidebar {
    padding: 0 !important;
    display: flex;
    flex-direction: column;
  }

  /* ── Avatar container ─────────────────────────────────────────────────── */
.pf-sb-avatar {
    order: 0;
    overflow: hidden;
    flex-shrink: 0;
    /* Mobile: bigger square */
    width: 120px;
    height: 120px;
    border-radius: 16px;
    border: 1.5px solid ${C.pale};
  }
  @media (min-width: 400px) {
    .pf-sb-avatar { width: 140px; height: 140px; }
  }
  @media (min-width: 600px) {
    .pf-sb-avatar { width: 160px; height: 160px; }
  }
  @media (min-width: 860px) {
    /* Desktop: full-width tall block, bleeds to edges */
    .pf-sb-avatar {
      width: 100%;
      height: 230px;
      border-radius: 0;
      border: none;
    }
  }
  @media (min-width: 1080px) {
    .pf-sb-avatar { height: 275px; }
  }

  /* ── Top row wrapper (avatar + name side by side on mobile) ───────────── */
.pf-sb-top {
    order: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 14px 14px 0;
    align-items: flex-start;
  }
  @media (min-width: 860px) {
    /* On desktop: stack vertically, avatar fills its own row above */
    .pf-sb-top {
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 0;
    }
    /* Hide the avatar inside pf-sb-top on desktop — it's shown standalone */
    .pf-sb-top .pf-sb-avatar {
      display: none;
    }
  }

  /* ── Standalone avatar row (desktop only) ────────────────────────────── */
.pf-sb-avatar-desktop {
    display: none;
  }
  @media (min-width: 860px) {
    .pf-sb-avatar-desktop {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 230px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(136,189,242,0.08);
    }
    .pf-sb-avatar-desktop > * {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover;
    }
  }
  @media (min-width: 1080px) {
    .pf-sb-avatar-desktop { height: 275px; }
  }

  /* ── Name block ─────────────────────────────────────────────────────── */
  .pf-sb-name {
    flex: 1;
    min-width: 0;
  }
  @media (min-width: 860px) {
    .pf-sb-name {
      width: 100%;
      padding: 12px 18px 0;
      text-align: center;
    }
  }

  /* ── Stats grid ──────────────────────────────────────────────────────── */
  .pf-sb-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 10px 14px 14px;
  }
  @media (min-width: 860px) {
    .pf-sb-stats {
      gap: 7px;
      padding: 12px 18px 18px;
    }
  }
`;

export default function TeacherSidebar({ teacher, loading }) {
  const fullName = teacher
    ? `${teacher.firstName} ${teacher.lastName || ""}`
    : "Teacher";

  const status = teacher?.status || "ACTIVE";
  const statusColor = STATUS_COLOR[status] || C.mid;

  const stats = [
    { label: "Exp",    value: teacher?.experienceYears ? `${teacher.experienceYears} Yrs` : "—", color: "#2563eb" },
    { label: "Dept",   value: teacher?.department || "—",      color: "#8b5cf6" },
    { label: "Type",   value: teacher?.employmentType || "—",  color: "#f59e0b" },
    { label: "Status", value: status,                          color: statusColor },
  ];

  return (
    <div className="pf-sidebar">
      <style>{SIDEBAR_CSS}</style>

      {/* Desktop-only full-width avatar (hidden on mobile via CSS) */}
      <div className="pf-sb-avatar-desktop">
        <Avatar3D />
      </div>

      {/* Mobile top row: small avatar + name side by side */}
      <div className="pf-sb-top">
        <div className="pf-sb-avatar">
          <Avatar3D />
        </div>

        {/* Name block — shown in top row on mobile, in body on desktop */}
        <div className="pf-sb-name">
          <div style={{ fontWeight: 800, fontSize: 13, color: C.dark, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loading ? "Loading..." : fullName}
          </div>
          <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>
            {teacher?.designation || "Teacher"}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: C.light }}>
            {teacher?.employeeCode || "--"}
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="pf-badge" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}50` }}>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats: 2×2 grid, full width, always below */}
      <div className="pf-sb-stats">
        {stats.map((item) => (
          <div key={item.label} style={{ padding: "8px 6px", borderRadius: 10, background: C.bg, border: `1px solid ${C.pale}`, textAlign: "center", minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: item.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.value}
            </div>
            <div style={{ fontSize: 9, color: C.mid, marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}