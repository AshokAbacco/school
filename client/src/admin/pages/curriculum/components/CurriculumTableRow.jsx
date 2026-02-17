import React from "react";
import {
  User,
  BookMarked,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

function CurriculumTableRow({ subject }) {
  // Determine progress bar color
  const getProgressColor = (progress) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress < 30) return "bg-red-500";
    return "bg-yellow-500";
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Active":
        return "bg-blue-100 text-blue-700";
      case "Planning":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Subject Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center text-white">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{subject.name}</p>
            <p className="text-xs text-gray-500">Code: {subject.code}</p>
          </div>
        </div>
      </td>

      {/* Class */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span className="text-sm font-medium text-gray-700">
          {subject.class}
        </span>
      </td>

      {/* Teacher */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <img
            src={`https://ui-avatars.com/api/?name=${subject.teacher.replace(" ", "+")}&background=random`}
            alt={subject.teacher}
            className="w-7 h-7 rounded-full"
          />
          <span className="text-sm text-gray-600">{subject.teacher}</span>
        </div>
      </td>

      {/* Progress */}
      <td className="px-6 py-4">
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">
              {subject.chapters} Chapters
            </span>
            <span className="font-semibold text-gray-500">
              {subject.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressColor(subject.progress)}`}
              style={{ width: `${subject.progress}%` }}
            ></div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 hidden md:table-cell">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(subject.status)}`}
        >
          {subject.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition group"
            title="View Topics"
          >
            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
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

export default CurriculumTableRow;
