import React from "react";
import { Clock, FileText } from "lucide-react";

function AttendanceTableRow({ record }) {
  // Function to determine badge color based on status
  const getStatusStyle = (status) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-700";
      case "Absent":
        return "bg-red-100 text-red-700";
      case "Late":
        return "bg-yellow-100 text-yellow-700";
      case "Leave":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Student Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={`https://ui-avatars.com/api/?name=${record.name.replace(" ", "+")}&background=random`}
            alt={record.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-semibold text-gray-800">{record.name}</p>
            <p className="text-xs text-gray-500">Roll No: {record.rollNo}</p>
          </div>
        </div>
      </td>

      {/* Class */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm font-medium text-gray-700">
          {record.class}
        </span>
      </td>

      {/* Check-in Time */}
      <td className="px-6 py-4 hidden lg:table-cell">
        {record.checkIn ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>{record.checkIn}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">--:--</span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}
        >
          {record.status}
        </span>
      </td>

      {/* Remarks */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="flex items-center gap-2 text-sm text-gray-500 italic">
          <FileText className="w-4 h-4" />
          {record.remarks || "No remarks"}
        </div>
      </td>
    </tr>
  );
}

export default AttendanceTableRow;
