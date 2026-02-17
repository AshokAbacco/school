import React from "react";
import { UserCheck, UserX, Clock, CalendarOff } from "lucide-react";

function AttendanceStatsCards() {
  const stats = [
    {
      label: "Present Today",
      value: "2,450",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
    },
    {
      label: "Absent Today",
      value: "124",
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-500",
    },
    {
      label: "Late Arrivals",
      value: "32",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-500",
    },
    {
      label: "On Leave",
      value: "45",
      icon: CalendarOff,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${stat.borderColor}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stat.value}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AttendanceStatsCards;
