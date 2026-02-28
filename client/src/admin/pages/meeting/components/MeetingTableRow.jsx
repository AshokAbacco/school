// client/src/admin/pages/meeting/components/MeetingTableRow.jsx
import React from "react";
import {
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Link2,
  Users,
  ChevronRight,
} from "lucide-react";

const TYPE_COLORS = {
  STAFF: "bg-[#BDDDFC] text-[#384959]",
  PARENT: "bg-purple-100 text-purple-700",
  STUDENT: "bg-amber-100 text-amber-700",
  GENERAL: "bg-slate-100 text-slate-600",
  BOARD: "bg-[#88BDF2] text-[#384959]",
  CUSTOM: "bg-gray-100 text-gray-600",
};

const STATUS_STYLES = {
  SCHEDULED: "bg-blue-50 text-blue-600 border border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-500 border border-rose-200",
  POSTPONED: "bg-amber-50 text-amber-600 border border-amber-200",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MeetingTableRow({ meeting, onView, onEdit, onDelete }) {
  const typeLabel = meeting.type?.replace(/_/g, " ");
  const statusLabel = meeting.status?.replace(/_/g, " ");
  const participantCount =
    (meeting._count?.participants ?? meeting.participants?.length ?? 0) +
    (meeting._count?.students ?? meeting.students?.length ?? 0);

  return (
    <tr className="border-b border-[#BDDDFC]/40 hover:bg-[#BDDDFC]/10 transition-colors">
      {/* Title + Location */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[#384959] leading-snug">
            {meeting.title}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1 text-xs text-[#6A89A7]">
              <MapPin size={10} /> {meeting.location}
            </span>
          )}
          {meeting.meetingLink && (
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-[#88BDF2] hover:underline"
            >
              <Link2 size={10} /> Join Link
            </a>
          )}
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            TYPE_COLORS[meeting.type] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {typeLabel}
        </span>
      </td>

      {/* Date & Time */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[#384959]">
            {formatDate(meeting.meetingDate)}
          </span>
          <span className="text-xs text-[#6A89A7]">
            {meeting.startTime} – {meeting.endTime}
          </span>
        </div>
      </td>

      {/* Participants */}
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 text-sm text-[#384959]">
          <Users size={13} className="text-[#6A89A7]" />
          {participantCount}
        </span>
      </td>

      {/* Classes */}
      <td className="px-4 py-3">
        {meeting.classes?.length ? (
          <div className="flex flex-wrap gap-1">
            {meeting.classes.slice(0, 3).map((mc) => (
              <span
                key={mc.id}
                className="text-xs bg-[#BDDDFC]/60 text-[#384959] px-2 py-0.5 rounded-full"
              >
                {mc.classSection?.name ?? mc.classSectionId}
              </span>
            ))}
            {meeting.classes.length > 3 && (
              <span className="text-xs text-[#6A89A7]">
                +{meeting.classes.length - 3}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[#6A89A7]">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
            STATUS_STYLES[meeting.status] ?? ""
          }`}
        >
          {statusLabel}
        </span>
      </td>

      {/* Organizer */}
      <td className="px-4 py-3">
        <span className="text-sm text-[#384959]">
          {meeting.organizer?.name ?? "—"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onView(meeting)}
            className="p-1.5 rounded-lg hover:bg-[#BDDDFC] text-[#6A89A7] hover:text-[#384959] transition-colors"
            title="View"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => onEdit(meeting)}
            className="p-1.5 rounded-lg hover:bg-[#BDDDFC] text-[#6A89A7] hover:text-[#384959] transition-colors"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(meeting)}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-[#6A89A7] hover:text-rose-500 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
