import React, { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";

function StudentsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const students = [
    {
      id: 1,
      name: "Emma Wilson",
      email: "emma.wilson@school.com",
      phone: "+1 234-567-8901",
      grade: "10th",
      class: "10-A",
      status: "Active",
      avatar: "EW",
      admissionDate: "2023-08-15",
    },
    {
      id: 2,
      name: "Liam Brown",
      email: "liam.brown@school.com",
      phone: "+1 234-567-8902",
      grade: "9th",
      class: "9-B",
      status: "Active",
      avatar: "LB",
      admissionDate: "2024-01-10",
    },
    {
      id: 3,
      name: "Olivia Davis",
      email: "olivia.davis@school.com",
      phone: "+1 234-567-8903",
      grade: "11th",
      class: "11-C",
      status: "Active",
      avatar: "OD",
      admissionDate: "2022-08-20",
    },
    {
      id: 4,
      name: "Noah Martinez",
      email: "noah.martinez@school.com",
      phone: "+1 234-567-8904",
      grade: "8th",
      class: "8-A",
      status: "Inactive",
      avatar: "NM",
      admissionDate: "2024-08-05",
    },
    {
      id: 5,
      name: "Ava Johnson",
      email: "ava.johnson@school.com",
      phone: "+1 234-567-8905",
      grade: "10th",
      class: "10-B",
      status: "Active",
      avatar: "AJ",
      admissionDate: "2023-09-01",
    },
    {
      id: 6,
      name: "Ethan Garcia",
      email: "ethan.garcia@school.com",
      phone: "+1 234-567-8906",
      grade: "9th",
      class: "9-A",
      status: "Active",
      avatar: "EG",
      admissionDate: "2024-01-15",
    },
    {
      id: 7,
      name: "Sophia Miller",
      email: "sophia.miller@school.com",
      phone: "+1 234-567-8907",
      grade: "11th",
      class: "11-A",
      status: "Active",
      avatar: "SM",
      admissionDate: "2022-08-25",
    },
    {
      id: 8,
      name: "Mason Rodriguez",
      email: "mason.rod@school.com",
      phone: "+1 234-567-8908",
      grade: "8th",
      class: "8-B",
      status: "Active",
      avatar: "MR",
      admissionDate: "2024-08-10",
    },
  ];

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === "all" || student.grade === filterGrade;
    const matchesStatus =
      filterStatus === "all" ||
      student.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Students List
            </h1>
            <p className="text-gray-500 mt-1">
              Manage and view all student records
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Students</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">2,847</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Active</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">2,654</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Inactive</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">193</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">New This Month</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">124</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Grade Filter */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Grades</option>
              <option value="8th">8th Grade</option>
              <option value="9th">9th Grade</option>
              <option value="10th">10th Grade</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Filter className="w-4 h-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Class
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
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {student.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {student.name}
                          </p>
                          <p className="text-sm text-gray-500 md:hidden">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {student.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {student.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-800">
                        {student.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {student.class}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 hover:bg-blue-50 rounded-lg transition group"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-green-50 rounded-lg transition group"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-400 group-hover:text-green-600" />
                        </button>
                        <button
                          className="p-2 hover:bg-red-50 rounded-lg transition group"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">1-8</span> of{" "}
              <span className="font-semibold">{students.length}</span> students
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                Previous
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                1
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                2
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm">
                3
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

export default StudentsList;
