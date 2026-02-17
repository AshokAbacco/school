import React from "react";
import { FileText, PlayCircle, CalendarCheck, Award } from "lucide-react";

function ExamStatsCards() {
  const stats = [
    {
      label: "Total Exams",
      value: "18",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
    },
    {
      label: "Ongoing",
      value: "2",
      icon: PlayCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-500",
    },
    {
      label: "Upcoming",
      value: "8",
      icon: CalendarCheck,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-500",
    },
    {
      label: "Completed",
      value: "8",
      icon: Award,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
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

export default ExamStatsCards;
