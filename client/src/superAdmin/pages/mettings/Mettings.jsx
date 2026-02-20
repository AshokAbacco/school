import React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Video,
  FileText,
  ChevronRight,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";

export default function Meetings() {
  const C = {
    dark: "#1e293b",
    slate: "#64748b",
    blue: "#2563eb",
    lightBlue: "#eff6ff",
    border: "#e2e8f0",
  };

  const meetings = [
    {
      id: 1,
      title: "Staff Meeting",
      date: "April 15, Monday",
      time: "10:00 AM – 11:00 AM",
      type: "Scheduled",
    },
    {
      id: 2,
      title: "Parent-Teacher Conference",
      date: "April 15, Monday",
      time: "2:00 PM – 3:30 PM",
      type: "Scheduled",
    },
    {
      id: 3,
      title: "Weekly Admin Meeting",
      date: "April 16, Tuesday",
      time: "9:30 AM – 10:30 AM",
      type: "Scheduled",
    },
    {
      id: 4,
      title: "Budget Planning Session",
      date: "April 17, Wednesday",
      time: "1:00 PM – 2:00 PM",
      type: "Scheduled",
    },
  ];

  return (
    <PageLayout>
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-1">Super Admin</p>
        <h1 className="text-2xl font-bold" style={{ color: C.dark }}>
          Meetings
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        
        <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border"
          style={{ borderColor: C.border }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: C.blue + "20" }}>
            <CalendarDays size={18} color={C.blue} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Today's Meetings</p>
            <p className="text-xl font-bold" style={{ color: C.dark }}>3</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border"
          style={{ borderColor: C.border }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#16a34a20" }}>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-xl font-bold" style={{ color: C.dark }}>8</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border"
          style={{ borderColor: C.border }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#f59e0b20" }}>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Upcoming</p>
            <p className="text-xl font-bold" style={{ color: C.dark }}>5</p>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition">
          <Plus size={16} />
          Schedule Meeting
        </button>

        <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
          style={{ borderColor: C.border }}>
          <Video size={16} />
          Join Meeting
        </button>

        <button className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition"
          style={{ borderColor: C.border }}>
          <FileText size={16} />
          View Notes
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Meetings */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            Upcoming Meetings
          </h2>

          {meetings.map((meeting) => (
            <div key={meeting.id}
              className="bg-white border rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all"
              style={{ borderColor: C.border }}>

              <div>
                <p className="font-semibold text-sm" style={{ color: C.dark }}>
                  {meeting.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {meeting.date} • {meeting.time}
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium mt-2 inline-block">
                  {meeting.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                  <Video size={14} />
                  Join
                </button>
                <ChevronRight size={16} className="text-gray-400" />
              </div>

            </div>
          ))}
        </div>

        {/* Calendar Panel */}
        <div className="bg-white rounded-xl border p-4 shadow-sm"
          style={{ borderColor: C.border }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: C.dark }}>
            Calendar
          </h2>

          <div className="text-center text-gray-400 text-sm py-10">
            (Calendar UI Placeholder)
          </div>
        </div>

      </div>
    </div>
    </PageLayout>
  );
}
