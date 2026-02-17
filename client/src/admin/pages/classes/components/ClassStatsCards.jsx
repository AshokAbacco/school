import React from "react";
import { Grid, Users, UserCheck, DoorOpen } from "lucide-react";

function ClassStatsCards() {
  const stats = [
    {
      label: "Total Classes",
      value: "24",
      icon: Grid,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-500",
    },
    {
      label: "Total Sections",
      value: "68",
      icon: DoorOpen,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-500",
    },
    {
      label: "Total Capacity",
      value: "2,400",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
    },
    {
      label: "Available Seats",
      value: "306",
      icon: UserCheck,
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

export default ClassStatsCards;
