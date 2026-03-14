// client/src/admin/pages/meeting/components/MeetingTableRow.jsx
import React from "react";
import { Eye, Pencil, Trash2, MapPin, Link2, Users } from "lucide-react";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const TYPE_STYLES = {
  STAFF:   { bg: C.mist,        color: C.deep },
  PARENT:  { bg: "#EDE9FE",     color: "#6D28D9" },
  STUDENT: { bg: "#FEF3C7",     color: "#B45309" },
  GENERAL: { bg: "#F1F5F9",     color: "#475569" },
  BOARD:   { bg: `${C.sky}33`,  color: C.deep },
  CUSTOM:  { bg: "#F3F4F6",     color: "#4B5563" },
};

const STATUS_STYLES = {
  SCHEDULED: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
  COMPLETED: { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  CANCELLED: { bg: "#FFF1F2", color: "#E11D48", border: "#FECDD3" },
  POSTPONED: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MeetingTableRow({ meeting, onView, onEdit, onDelete }) {
  const typeStyle   = TYPE_STYLES[meeting.type]     ?? { bg: "#F3F4F6", color: "#4B5563" };
  const statusStyle = STATUS_STYLES[meeting.status] ?? { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0" };
  const participantCount =
    (meeting._count?.participants ?? meeting.participants?.length ?? 0) +
    (meeting._count?.students     ?? meeting.students?.length     ?? 0);

  return (
    <tr
      style={{ borderBottom: `1px solid ${C.borderLight}`, transition: "background 0.15s", fontFamily: "'Inter', sans-serif",}}
      onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Title + location */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{meeting.title}</span>
          {meeting.location && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textLight }}>
              <MapPin size={9} /> {meeting.location}
            </span>
          )}
          {meeting.meetingLink && (
            <a href={meeting.meetingLink} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.sky, textDecoration: "none" }}>
              <Link2 size={9} /> Join Link
            </a>
          )}
        </div>
      </td>

      {/* Type */}
      <td style={{ padding: "12px 16px" }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: typeStyle.bg, color: typeStyle.color }}>
          {meeting.type?.replace(/_/g, " ")}
        </span>
      </td>

      {/* Date & time */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{fmtDate(meeting.meetingDate)}</span>
          <span style={{ fontSize: 11, color: C.textLight }}>{meeting.startTime} – {meeting.endTime}</span>
        </div>
      </td>

      {/* Participants */}
      <td style={{ padding: "12px 16px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: C.text }}>
          <Users size={13} color={C.textLight} /> {participantCount}
        </span>
      </td>

      {/* Classes */}
      <td style={{ padding: "12px 16px" }}>
        {meeting.classes?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {meeting.classes.slice(0, 3).map((mc) => (
              <span key={mc.id} style={{ fontSize: 10, fontWeight: 600, background: `${C.mist}88`, color: C.deep, padding: "2px 8px", borderRadius: 99 }}>
                {mc.classSection?.name ?? mc.classSectionId}
              </span>
            ))}
            {meeting.classes.length > 3 && (
              <span style={{ fontSize: 10, color: C.textLight, fontWeight: 500 }}>+{meeting.classes.length - 3}</span>
            )}
          </div>
        ) : <span style={{ fontSize: 12, color: C.textLight }}>—</span>}
      </td>

      {/* Status */}
      <td style={{ padding: "12px 16px" }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
          {meeting.status?.replace(/_/g, " ")}
        </span>
      </td>

      {/* Organizer */}
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{meeting.organizer?.name ?? "—"}</span>
      </td>

      {/* Actions */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { Icon: Eye,    fn: () => onView(meeting),   hoverBg: C.mist,     hoverColor: C.deep },
            { Icon: Pencil, fn: () => onEdit(meeting),   hoverBg: C.mist,     hoverColor: C.deep },
            { Icon: Trash2, fn: () => onDelete(meeting), hoverBg: "#FFF1F2",  hoverColor: "#E11D48" },
          ].map(({ Icon, fn, hoverBg, hoverColor }, i) => (
            <button key={i} onClick={fn}
              style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight, transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.textLight; }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}