import React, { useState } from "react";
import { Search, Filter, Download, Plus, Calendar, List } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import MeetingStatsCards from "./components/MeetingStatsCards";
import MeetingTableRow from "./components/MeetingTableRow";

function MeetingsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sample Data
  const meetings = [
    {
      id: 1,
      title: "Q1 Staff Performance Review",
      type: "Staff",
      organizer: "Principal",
      date: "Mar 20, 2026",
      time: "10:00 AM",
      location: "Conference Room A",
      status: "Scheduled",
    },
    {
      id: 2,
      title: "Parent-Teacher Meeting (10-A)",
      type: "PTM",
      organizer: "Ms. Sarah Smith",
      date: "Mar 22, 2026",
      time: "02:00 PM",
      location: "Room 104",
      status: "Scheduled",
    },
    {
      id: 3,
      title: "Curriculum Planning",
      type: "Staff",
      organizer: "Vice Principal",
      date: "Mar 18, 2026",
      time: "09:00 AM",
      location: "Online",
      status: "Completed",
    },
    {
      id: 4,
      title: "Board of Directors Meet",
      type: "Board",
      organizer: "Admin Dept",
      date: "Mar 25, 2026",
      time: "11:00 AM",
      location: "Board Room",
      status: "Scheduled",
    },
    {
      id: 5,
      title: "PTM - Grade 8 Science",
      type: "PTM",
      organizer: "Mr. John Doe",
      date: "Mar 15, 2026",
      time: "03:00 PM",
      location: "Science Lab",
      status: "Completed",
    },
    {
      id: 6,
      title: "Annual Day Planning",
      type: "Staff",
      organizer: "Cultural Committee",
      date: "Mar 28, 2026",
      time: "04:00 PM",
      location: "Auditorium",
      status: "Scheduled",
    },
  ];

  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || meeting.type === filterType;
    const matchesStatus =
      filterStatus === "all" || meeting.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Meetings & Events
            </h1>
            <p className="text-gray-500 mt-1">
              Schedule and manage staff & parent meetings
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar View</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition">
              <Plus className="w-4 h-4" />
              <span>Schedule Meeting</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <MeetingStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Types</option>
              <option value="Staff">Staff Meeting</option>
              <option value="PTM">Parent Meeting</option>
              <option value="Board">Board Meeting</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Calendar className="w-4 h-4" />
              <span>Date</span>
            </button>
          </div>
        </div>

        {/* Meetings Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Meeting Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Location
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMeetings.map((meeting) => (
                  <MeetingTableRow key={meeting.id} meeting={meeting} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">{filteredMeetings.length}</span>{" "}
              meetings
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default MeetingsList;
