import React, { useState } from "react";
import { Search, Filter, Download, Plus, Calendar, Clock } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import AttendanceStatsCards from "./components/AttendanceStatsCards";
import AttendanceTableRow from "./components/AttendanceTableRow";

function AttendanceList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterStatus, setFilterStatus] = useState("all");

  // Sample Data
  const attendanceRecords = [
    {
      id: 1,
      name: "Emma Wilson",
      rollNo: "10A-01",
      class: "10-A",
      checkIn: "08:15 AM",
      status: "Present",
      remarks: "",
    },
    {
      id: 2,
      name: "Liam Brown",
      rollNo: "10A-02",
      class: "10-A",
      checkIn: "08:45 AM",
      status: "Late",
      remarks: "Traffic Delay",
    },
    {
      id: 3,
      name: "Olivia Davis",
      rollNo: "9B-05",
      class: "9-B",
      checkIn: null,
      status: "Absent",
      remarks: "Fever",
    },
    {
      id: 4,
      name: "Noah Martinez",
      rollNo: "11C-12",
      class: "11-C",
      checkIn: "08:10 AM",
      status: "Present",
      remarks: "",
    },
    {
      id: 5,
      name: "Ava Johnson",
      rollNo: "8A-09",
      class: "8-A",
      checkIn: null,
      status: "Leave",
      remarks: "Doctor Appointment",
    },
    {
      id: 6,
      name: "Sophia Miller",
      rollNo: "10A-15",
      class: "10-A",
      checkIn: "08:20 AM",
      status: "Present",
      remarks: "",
    },
  ];

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      record.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Attendance Overview
            </h1>
            <p className="text-gray-500 mt-1">
              Track daily student attendance and reports
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition">
              <Plus className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <AttendanceStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Date Picker */}
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">Leave</option>
            </select>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Class
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Check-in
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <AttendanceTableRow key={record.id} record={record} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">{filteredRecords.length}</span>{" "}
              records for {filterDate}
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default AttendanceList;
