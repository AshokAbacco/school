import React from "react";
import {
  Calendar,
  Clock,
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";

function ExamTableRow({ exam }) {
  // Determine status style
  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Ongoing":
        return "bg-orange-100 text-orange-700";
      case "Scheduled":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Exam Name & ID */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{exam.name}</p>
            <p className="text-xs text-gray-500">{exam.type}</p>
          </div>
        </div>
      </td>

      {/* Class */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm font-medium text-gray-700">{exam.class}</span>
      </td>

      {/* Schedule */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{exam.date}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>
              {exam.time} ({exam.duration})
            </span>
          </div>
        </div>
      </td>

      {/* Marks */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm text-gray-600">{exam.totalMarks} Marks</span>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(exam.status)}`}
        >
          {exam.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition group"
            title="View Results"
          >
            <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </button>
          <button
            className="p-2 hover:bg-green-50 rounded-lg transition group"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
          </button>
          <button
            className="p-2 hover:bg-red-50 rounded-lg transition group"
            title="Delete"
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

export default ExamTableRow;
