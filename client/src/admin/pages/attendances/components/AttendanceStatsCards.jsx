// client/src/admin/pages/attendances/components/AttendanceStatsCards.jsx
import React, { useMemo } from "react";
import { Users, UserCheck, UserX } from "lucide-react";

// ── Shared palette (mirrors OnlineClassesPage) ────────────────────────────
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  white:       "#FFFFFF",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const STAT_CARDS_CONFIG = [
  {
    key:   "total",
    label: "Total Students",
    icon:  Users,
    bar:   C.sky,
    soft:  `${C.mist}55`,
  },
  {
    key:   "present",
    label: "Present",
    icon:  UserCheck,
    bar:   "#10b981",
    soft:  "rgba(16,185,129,0.12)",
  },
  {
    key:   "absent",
    label: "Absent",
    icon:  UserX,
    bar:   "#f43f5e",
    soft:  "rgba(244,63,94,0.12)",
  },
];

export default function AttendanceStatsCards({ attendance }) {
  const stats = useMemo(() => {
    if (!attendance || attendance.length === 0)
      return { total: 0, present: 0, absent: 0 };
    const total   = attendance.length;
    const present = attendance.filter((a) => a.status === "PRESENT").length;
    return { total, present, absent: total - present };
  }, [attendance]);

  if (!attendance || attendance.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 14,
        marginBottom: 16,
      }}
    >
      {STAT_CARDS_CONFIG.map(({ key, label, icon: Icon, bar, soft }) => (
        <div
          key={key}
          style={{
            position: "relative", overflow: "hidden",
            borderRadius: 16, background: C.white,
            border: `1.5px solid ${C.borderLight}`,
            boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
          }}
        >
          {/* colour accent bar — same top stripe pattern as grade cards */}
          <div style={{ height: 5, background: bar, width: "100%" }} />
          <div style={{ padding: "14px 16px" }}>
            {/* icon */}
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: soft,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Icon size={16} style={{ color: bar }} />
            </div>
            {/* number */}
            <p
              style={{
                margin: 0, fontSize: 24, fontWeight: 800,
                color: C.text, lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {(stats[key] || 0).toLocaleString()}
            </p>
            {/* label */}
            <p
              style={{
                margin: "4px 0 0", fontSize: 11, fontWeight: 600,
                color: C.textLight, fontFamily: "'Inter', sans-serif",
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