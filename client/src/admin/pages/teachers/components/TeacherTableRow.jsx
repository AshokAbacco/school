import React from "react";
import { Mail, Phone, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";

function TeacherTableRow({ teacher }) {
  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Teacher Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {teacher.avatar}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{teacher.name}</p>
            <p className="text-sm text-gray-500">{teacher.empId}</p>
          </div>
        </div>
      </td>

      {/* Qualification & Dept */}
      <td className="px-6 py-4 hidden md:table-cell">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-800">
            {teacher.qualification}
          </p>
          <p className="text-xs text-gray-500">{teacher.department}</p>
        </div>
      </td>

      {/* Classes Assigned */}
      <td className="px-6 py-4 hidden lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {teacher.classes.map((cls, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {cls}
            </span>
          ))}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            teacher.status === "Active"
              ? "bg-green-100 text-green-700"
              : teacher.status === "On Leave"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {teacher.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-blue-50 rounded-lg transition group"
            title="View Profile"
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

export default TeacherTableRow;
