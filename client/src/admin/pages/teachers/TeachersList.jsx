import React, { useState } from "react";
import { Search, Filter, Download, Plus } from "lucide-react";
import PageLayout from "../../components/PageLayout"; // Assuming existing layout
import TeacherStatsCards from "./components/TeacherStatsCards";
import TeacherTableRow from "./components/TeacherTableRow";

function TeachersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  // Sample Data with specific teacher attributes
  const teachers = [
    {
      id: 1,
      name: "Dr. Sarah Smith",
      empId: "EMP-101",
      qualification: "Ph.D. Physics",
      department: "Science",
      classes: ["10-A", "11-B"],
      status: "Active",
      avatar: "SS",
      experience: "12 Years",
    },
    {
      id: 2,
      name: "John Doe",
      empId: "EMP-102",
      qualification: "M.Sc. Math",
      department: "Mathematics",
      classes: ["9-A", "9-B", "10-A"],
      status: "Active",
      avatar: "JD",
      experience: "5 Years",
    },
    {
      id: 3,
      name: "Emily Johnson",
      empId: "EMP-103",
      qualification: "M.A. English",
      department: "Languages",
      classes: ["8-A", "8-B"],
      status: "On Leave",
      avatar: "EJ",
      experience: "8 Years",
    },
    {
      id: 4,
      name: "Michael Brown",
      empId: "EMP-104",
      qualification: "B.Ed",
      department: "Sports",
      classes: ["All"],
      status: "Active",
      avatar: "MB",
      experience: "3 Years",
    },
    {
      id: 5,
      name: "Dr. Amanda Lector",
      empId: "EMP-105",
      qualification: "Ph.D. Biology",
      department: "Science",
      classes: ["12-A", "12-B"],
      status: "Active",
      avatar: "AL",
      experience: "15 Years",
    },
  ];

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.empId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      filterDept === "all" || teacher.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Teachers Directory
            </h1>
            <p className="text-gray-500 mt-1">
              Manage staff, qualifications, and workloads
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
          </div>
        </div>

        {/* Stats Cards Component */}
        <TeacherStatsCards />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or Employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Departments</option>
              <option value="Science">Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Languages">Languages</option>
              <option value="Sports">Sports</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Teacher Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Qualification / Dept
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Classes Assigned
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
                {filteredTeachers.map((teacher) => (
                  <TeacherTableRow key={teacher.id} teacher={teacher} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Placeholder */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-semibold">{filteredTeachers.length}</span>{" "}
              teachers
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
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

export default TeachersList;
