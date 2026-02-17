import React from "react";
import { MoreVertical, Eye, Edit, Trash2, UserCircle } from "lucide-react";

function ClassTableRow({ classItem }) {
  // Calculate capacity percentage for the progress bar
  const capacityPercentage = Math.round(
    (classItem.students / classItem.capacity) * 100,
  );
  const isFull = capacityPercentage >= 100;

  return (
    <tr className="hover:bg-gray-50 transition">
      {/* Class Info */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {classItem.grade.split(" ")[1]}{" "}
            {/* Extracts "10" from "Grade 10" */}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {classItem.grade} - {classItem.section}
            </p>
            <p className="text-xs text-gray-500">Room: {classItem.room}</p>
          </div>
        </div>
      </td>

      {/* Class Teacher */}
      <td className="px-6 py-4 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <img
            src={`https://ui-avatars.com/api/?name=${classItem.teacherName.replace(" ", "+")}&background=6366f1&color=fff`}
            alt={classItem.teacherName}
            className="w-7 h-7 rounded-full"
          />
          <span className="text-sm font-medium text-gray-700">
            {classItem.teacherName}
          </span>
        </div>
      </td>

      {/* Students & Capacity */}
      <td className="px-6 py-4">
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">
              {classItem.students} Students
            </span>
            <span
              className={`font-medium ${isFull ? "text-red-600" : "text-gray-500"}`}
            >
              {capacityPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${isFull ? "bg-red-500" : capacityPercentage > 80 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${capacityPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Cap: {classItem.capacity}
          </p>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            classItem.status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {classItem.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-indigo-50 rounded-lg transition group"
            title="View Timeline"
          >
            <Eye className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
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

export default ClassTableRow;
