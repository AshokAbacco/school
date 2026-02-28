// client/src/admin/pages/attendances/components/AttendanceTableRow.jsx
import React from "react";

const C = {
  primary: "#384959",
  secondary: "#6A89A7",
  border: "rgba(136,189,242,0.12)",
};

const STATUS_STYLE = {
  PRESENT: { bg: "rgba(16,185,129,0.15)", color: "#047857", dot: "#10b981" },
  ABSENT: { bg: "rgba(244,63,94,0.15)", color: "#be123c", dot: "#f43f5e" },
  LATE: { bg: "rgba(245,158,11,0.15)", color: "#b45309", dot: "#f59e0b" },
};

function StatusBadge({ status = "ABSENT" }) {
  const s = STATUS_STYLE[status.toUpperCase()] || STATUS_STYLE.ABSENT;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: s.dot }}
      />
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

export default function AttendanceTableRow({ record, isEven }) {
  const studentName = record.student?.name || "Unknown Student";
  const initials = studentName.substring(0, 2).toUpperCase();

  const rowBg = isEven ? "white" : "rgba(189,221,252,0.05)";
  const rowHover = "rgba(189,221,252,0.15)";

  return (
    <tr
      className="transition-all duration-100"
      style={{
        borderBottom: `1px solid ${C.border}`,
        background: rowBg,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #6A89A7, #384959)" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: C.primary }}>
              {studentName}
            </p>
          </div>
        </div>
      </td>
      <td
        className="px-5 py-3.5 text-sm font-medium"
        style={{ color: C.secondary }}
      >
        {new Date(record.date).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={record.status} />
      </td>
    </tr>
  );
}
