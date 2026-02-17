import React from "react";
import {
  Users,
  BookOpen,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ArrowUpRight,
} from "lucide-react";
import PageLayout from "../components/PageLayout";

function Dashboard() {
  const stats = [
    {
      label: "Total Students",
      value: "2,847",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "Total Teachers",
      value: "142",
      change: "+3%",
      trend: "up",
      icon: BookOpen,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      label: "Events Today",
      value: "8",
      change: "-2",
      trend: "down",
      icon: Calendar,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      label: "Revenue",
      value: "$54,239",
      change: "+18%",
      trend: "up",
      icon: DollarSign,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
  ];

  const recentStudents = [
    {
      name: "Emma Wilson",
      grade: "10th Grade",
      status: "Present",
      avatar: "EW",
      id: "#2847",
    },
    {
      name: "Liam Brown",
      grade: "9th Grade",
      status: "Absent",
      avatar: "LB",
      id: "#2846",
    },
    {
      name: "Olivia Davis",
      grade: "11th Grade",
      status: "Present",
      avatar: "OD",
      id: "#2845",
    },
    {
      name: "Noah Martinez",
      grade: "8th Grade",
      status: "Late",
      avatar: "NM",
      id: "#2844",
    },
    {
      name: "Ava Johnson",
      grade: "10th Grade",
      status: "Present",
      avatar: "AJ",
      id: "#2843",
    },
  ];

  const upcomingEvents = [
    {
      title: "Parent-Teacher Meeting",
      date: "Feb 20, 2026",
      time: "2:00 PM",
      color: "bg-blue-500",
    },
    {
      title: "Science Fair",
      date: "Feb 25, 2026",
      time: "10:00 AM",
      color: "bg-purple-500",
    },
    {
      title: "Sports Day",
      date: "Mar 1, 2026",
      time: "9:00 AM",
      color: "bg-green-500",
    },
    {
      title: "Annual Day Celebration",
      date: "Mar 5, 2026",
      time: "6:00 PM",
      color: "bg-orange-500",
    },
  ];

  const classPerformance = [
    { class: "Grade 10-A", students: 45, avgScore: 87, status: "excellent" },
    { class: "Grade 9-B", students: 42, avgScore: 78, status: "good" },
    { class: "Grade 11-C", students: 38, avgScore: 92, status: "excellent" },
    { class: "Grade 8-A", students: 40, avgScore: 72, status: "average" },
  ];

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back, Admin! Here's what's happening today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`${stat.bgColor} w-12 h-12 rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <span
                  className={`flex items-center gap-1 text-sm font-semibold ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-medium">
                {stat.label}
              </h3>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Students */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                Recent Student Activity
              </h3>
              <button className="text-blue-600 text-sm font-medium hover:underline">
                View All
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentStudents.map((student, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {student.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {student.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {student.grade} • {student.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.status === "Present"
                            ? "bg-green-100 text-green-700"
                            : student.status === "Absent"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {student.status}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 transition">
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-bold text-gray-800">
                Upcoming Events
              </h3>
              <button className="text-blue-600 text-sm font-medium hover:underline">
                View All
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingEvents.map((event, idx) => (
                  <div key={idx} className="flex gap-3 group cursor-pointer">
                    <div className={`w-1 ${event.color} rounded-full`}></div>
                    <div className="flex-1 pb-4 border-b last:border-0 group-hover:bg-gray-50 -m-2 p-2 rounded transition">
                      <h4 className="font-semibold text-sm text-gray-800">
                        {event.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                      <p className="text-xs text-gray-400">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Class Performance */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-bold text-gray-800">
              Class Performance
            </h3>
            <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
              Full Report <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classPerformance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {item.class}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.students}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${item.avgScore >= 85 ? "bg-green-500" : item.avgScore >= 75 ? "bg-blue-500" : "bg-yellow-500"}`}
                            style={{ width: `${item.avgScore}%` }}
                          ></div>
                        </div>
                        <span className="font-medium text-gray-800">
                          {item.avgScore}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.status === "excellent"
                            ? "bg-green-100 text-green-700"
                            : item.status === "good"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default Dashboard;
