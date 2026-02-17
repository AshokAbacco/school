import React, { useState } from "react";
import { Search, Filter, Download, Plus, Calendar } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import ExamStatsCards from "./components/ExamStatsCards";
import ExamTableRow from "./components/ExamTableRow";

function ExamsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sample Data
  const exams = [
    {
      id: 1,
      name: "Mid-Term Mathematics",
      class: "10-A",
      type: "Mid-Term",
      date: "Mar 15, 2026",
      time: "09:00 AM",
      duration: "3 Hrs",
      totalMarks: 100,
      status: "Scheduled",
    },
    {
      id: 2,
      name: "Final Science",
      class: "9-B",
      type: "Final",
      date: "Mar 12, 2026",
      time: "10:00 AM",
      duration: "3 Hrs",
      totalMarks: 100,
      status: "Ongoing",
    },
    {
      id: 3,
      name: "Unit Test English",
      class: "8-A",
      type: "Unit Test",
      date: "Mar 05, 2026",
      time: "11:00 AM",
      duration: "1.5 Hrs",
      totalMarks: 50,
      status: "Completed",
    },
    {
      id: 4,
      name: "Practical Physics",
      class: "11-C",
      type: "Practical",
      date: "Mar 18, 2026",
      time: "01:00 PM",
      duration: "2 Hrs",
      totalMarks: 30,
      status: "Scheduled",
    },
    {
      id: 5,
      name: "History Final",
      class: "12-A",
      type: "Final",
      date: "Feb 28, 2026",
      time: "09:00 AM",
      duration: "3 Hrs",
      totalMarks: 100,
      status: "Completed",
    },
  ];

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" ||
      exam.type.toLowerCase() === filterType.toLowerCase();
    const matchesStatus =
      filterStatus === "all" ||
      exam.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Exams Schedule
            </h1>
            <p className="text-gray-500 mt-1">
              Manage exam timetables and results
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" />
              <span>Schedule Exam</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <ExamStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by exam name or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Exam Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="mid-term">Mid-Term</option>
              <option value="final">Final</option>
              <option value="unit test">Unit Test</option>
              <option value="practical">Practical</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Calendar className="w-4 h-4" />
              <span>Calendar View</span>
            </button>
          </div>
        </div>

        {/* Exams Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Exam Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Class
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Total Marks
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
                {filteredExams.map((exam) => (
                  <ExamTableRow key={exam.id} exam={exam} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">{filteredExams.length}</span>{" "}
              exams
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                2
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

export default ExamsList;
