import React from "react";
import { BookOpen, Target, PlayCircle, FileStack } from "lucide-react";

function CurriculumStatsCards() {
  const stats = [
    {
      label: "Total Subjects",
      value: "42",
      icon: BookOpen,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-500",
    },
    {
      label: "Avg. Completion",
      value: "72%",
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
    },
    {
      label: "Active Lessons",
      value: "18",
      icon: PlayCircle,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-500",
    },
    {
      label: "Resources",
      value: "156",
      icon: FileStack,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-500",
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

export default CurriculumStatsCards;
