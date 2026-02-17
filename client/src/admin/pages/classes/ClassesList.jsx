import React, { useState } from "react";
import { Search, Filter, Download, Plus, LayoutGrid } from "lucide-react";
import PageLayout from "../../components/PageLayout";
import ClassStatsCards from "./components/ClassStatsCards";
import ClassTableRow from "./components/ClassTableRow";

function ClassesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");

  const classes = [
    {
      id: 1,
      grade: "Grade 10",
      section: "A",
      teacherName: "Dr. Sarah Smith",
      students: 38,
      capacity: 40,
      room: "101",
      status: "Active",
    },
    {
      id: 2,
      grade: "Grade 10",
      section: "B",
      teacherName: "John Doe",
      students: 35,
      capacity: 40,
      room: "102",
      status: "Active",
    },
    {
      id: 3,
      grade: "Grade 9",
      section: "A",
      teacherName: "Emily Johnson",
      students: 40,
      capacity: 40,
      room: "103",
      status: "Full",
    },
    {
      id: 4,
      grade: "Grade 9",
      section: "B",
      teacherName: "Michael Brown",
      students: 32,
      capacity: 35,
      room: "104",
      status: "Active",
    },
    {
      id: 5,
      grade: "Grade 8",
      section: "A",
      teacherName: "Amanda Lector",
      students: 28,
      capacity: 35,
      room: "105",
      status: "Active",
    },
    {
      id: 6,
      grade: "Grade 12",
      section: "Science",
      teacherName: "Prof. Alan Grant",
      students: 25,
      capacity: 30,
      room: "201",
      status: "Active",
    },
  ];

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade =
      filterGrade === "all" || cls.grade.includes(filterGrade);
    return matchesSearch && matchesGrade;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Classes & Sections
            </h1>
            <p className="text-gray-500 mt-1">
              Manage class structure, capacity, and subject assignments
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <ClassStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by grade or teacher name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Grades</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="12">Grade 12</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <LayoutGrid className="w-4 h-4" />
              <span>View Grid</span>
            </button>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Class Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Class Teacher
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Capacity
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
                {filteredClasses.map((classItem) => (
                  <ClassTableRow key={classItem.id} classItem={classItem} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">{filteredClasses.length}</span>{" "}
              classes
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

export default ClassesList;
