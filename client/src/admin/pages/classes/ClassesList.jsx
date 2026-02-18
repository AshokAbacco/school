// src/admin/pages/classes/ClassesList.jsx

import React, { useState } from "react";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import AddClass from "./AddClass";
import PageLayout from "../../components/PageLayout";

function ClassesList() {
  const [openModal, setOpenModal] = useState(false);

  // Dummy Data (later from backend)
  const classesData = [
    {
      id: 1,
      grade: "Class 10",
      room: "101",
      teacher: "Dr. Sarah Smith",
      students: 38,
      capacity: 40,
      status: "Active",
    },
    {
      id: 2,
      grade: "Class 9",
      room: "102",
      teacher: "John Doe",
      students: 35,
      capacity: 40,
      status: "Active",
    },
    {
      id: 3,
      grade: "Class 8",
      room: "103",
      teacher: "Emily Johnson",
      students: 40,
      capacity: 40,
      status: "Full",
    },
  ];

  return (
    <PageLayout>
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Classes & Sections
          </h1>
          <p className="text-gray-500">
            Manage class structure, capacity, and teacher assignments
          </p>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
            <Download size={18} />
            Export
          </button>

          <button
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Class
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <StatCard title="Total Classes" value="24" />
        <StatCard title="Total Sections" value="68" />
        <StatCard title="Total Capacity" value="2400" />
        <StatCard title="Available Seats" value="306" />
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 mb-6">
        <Search className="text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by grade or teacher..."
          className="w-full outline-none text-gray-600"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Class Info</th>
              <th className="p-4 text-left">Teacher</th>
              <th className="p-4 text-left">Capacity</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {classesData.map((item) => (
              <tr
                key={item.id}
                className="border-b hover:bg-gray-50"
              >
                <td className="p-4">
                  <p className="font-semibold text-gray-800">
                    {item.grade}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Room: {item.room}
                  </p>
                </td>

                <td className="p-4 text-gray-700">
                  {item.teacher}
                </td>

                <td className="p-4">
                  <p className="font-medium">
                    {item.students} / {item.capacity}
                  </p>
                  <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.students === item.capacity
                          ? "bg-red-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${
                          (item.students / item.capacity) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </td>

                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="p-4 flex justify-center gap-3 text-gray-500">
                  <Eye className="cursor-pointer hover:text-indigo-600" />
                  <Edit className="cursor-pointer hover:text-green-600" />
                  <Trash2 className="cursor-pointer hover:text-red-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {openModal && (
        <AddClass closeModal={() => setOpenModal(false)} />
      )}
    </div>
    </PageLayout>
  );
}

export default ClassesList;

/* SMALL COMPONENT */
function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-gray-800 mt-2">
        {value}
      </h2>
    </div>
  );
}
