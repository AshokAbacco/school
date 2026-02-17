import React from "react";
import {
  Users,
  UserCheck,
  MapPin,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Video,
} from "lucide-react";

function MeetingTableRow({ meeting }) {
  // Badge for Meeting Type
  const getTypeStyle = (type) => {
    switch (type) {
      case "Staff":
        return "bg-indigo-100 text-indigo-700";
      case "PTM":
        return "bg-amber-100 text-amber-700";
      case "Board":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Badge for Status
  const getStatusStyle = (status) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-700";
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Meeting Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${meeting.type === "PTM" ? "bg-amber-100" : "bg-indigo-100"}`}
          >
            {meeting.type === "PTM" ? (
              <UserCheck className={`w-5 h-5 text-amber-600`} />
            ) : (
              <Users className={`w-5 h-5 text-indigo-600`} />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{meeting.title}</p>
            <p className="text-xs text-gray-500">
              Organized by: {meeting.organizer}
            </p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeStyle(meeting.type)}`}
        >
          {meeting.type}
        </span>
      </td>

      {/* Schedule */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{meeting.time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{meeting.date}</span>
          </div>
        </div>
      </td>

      {/* Location */}
      <td className="px-6 py-4 hidden md:table-cell">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {meeting.location === "Online" ? (
            <Video className="w-4 h-4 text-blue-500" />
          ) : (
            <MapPin className="w-4 h-4 text-gray-400" />
          )}
          <span>{meeting.location}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(meeting.status)}`}
        >
          {meeting.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition group"
            title="View Details"
          >
            <Users className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </button>
          <button
            className="p-2 hover:bg-green-50 rounded-lg transition group"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
          </button>
          <button
            className="p-2 hover:bg-red-50 rounded-lg transition group"
            title="Cancel"
          >
            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default MeetingTableRow;
