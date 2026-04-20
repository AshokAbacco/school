// client/src/admin/pages/attendances/components/AttendanceTableRow.jsx
import React from "react";

// ── Shared palette (mirrors OnlineClassesPage) ────────────────────────────
const C = {
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  white:       "#FFFFFF",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const STATUS_STYLE = {
  PRESENT: { bg: "rgba(16,185,129,0.14)",  color: "#047857", dot: "#10b981" },
  ABSENT:  { bg: "rgba(244,63,94,0.14)",   color: "#be123c", dot: "#f43f5e" },
  LATE:    { bg: "rgba(245,158,11,0.14)",  color: "#b45309", dot: "#f59e0b" },
};

function StatusBadge({ status = "ABSENT" }) {
  const s = STATUS_STYLE[status.toUpperCase()] || STATUS_STYLE.ABSENT;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 99,
        fontSize: 10, fontWeight: 700,
        background: s.bg, color: s.color,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

export default function AttendanceTableRow({ record, isEven }) {
  const studentName = record.student?.name || "Unknown Student";
  const initials    = studentName.substring(0, 2).toUpperCase();
  const rowBg       = isEven ? C.white : `${C.mist}18`;

  return (
    <tr
      style={{ borderBottom: `1px solid ${C.borderLight}`, background: rowBg, transition: "background 0.1s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}33`)}
      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
    >
      {/* Student */}
      <td style={{ padding: "12px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* avatar — same gradient pill style as ClassCard icon */}
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: 11, fontWeight: 800,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {initials}
          </div>
          <p
            style={{
              margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {studentName}
          </p>
        </div>
      </td>

      {/* Date */}
      <td
        style={{
          padding: "12px 20px", fontSize: 12, fontWeight: 600, color: C.textLight,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {new Date(record.date).toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        })}
      </td>

      {/* Status */}
      <td style={{ padding: "12px 20px" }}>
        <StatusBadge status={record.status} />
      </td>
    </tr>
  );
}