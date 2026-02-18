import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Plus, Edit, Trash2, Eye,
  Mail, Phone, Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import AddStudent from "./AddStudents";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const statusColor = (s = "") => {
  switch (s.toUpperCase()) {
    case "ACTIVE":    return "bg-green-100 text-green-700";
    case "INACTIVE":  return "bg-red-100 text-red-700";
    case "SUSPENDED": return "bg-orange-100 text-orange-700";
    case "GRADUATED": return "bg-purple-100 text-purple-700";
    default:          return "bg-gray-100 text-gray-600";
  }
};

function StudentsList() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm]     = useState("");
  const [filterGrade, setFilterGrade]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openModal, setOpenModal]       = useState(false);

  const [students, setStudents]     = useState([]);
  const [stats, setStats]           = useState({ total:0, active:0, inactive:0, newThisMonth:0 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const LIMIT = 10;

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const res  = await fetch(`${API_URL}/api/students?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch students");
      setStudents(data.students || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, searchTerm]);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, activeRes, inactiveRes] = await Promise.all([
        fetch(`${API_URL}/api/students?page=1&limit=1`,               { headers: authHeaders() }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=ACTIVE`,  { headers: authHeaders() }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=INACTIVE`,{ headers: authHeaders() }),
      ]);
      const [allData, activeData, inactiveData] = await Promise.all([
        allRes.json(), activeRes.json(), inactiveRes.json(),
      ]);
      setStats({
        total:        allData.total    || 0,
        active:       activeData.total || 0,
        inactive:     inactiveData.total || 0,
        newThisMonth: 0,
      });
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { setPage(1); }, [searchTerm, filterGrade, filterStatus]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/students/${id}`, { method:"DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      fetchStudents(); fetchStats();
    } catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  // ── Client-side grade/status filter ───────────────────────────────────────
  const filteredStudents = students.filter((s) => {
    const grade  = s.personalInfo?.grade  || "";
    const status = s.personalInfo?.status || "";
    return (filterGrade  === "all" || grade  === filterGrade) &&
           (filterStatus === "all" || status.toLowerCase() === filterStatus.toLowerCase());
  });

  const avatarInitials = (s) => {
    const first = s.personalInfo?.firstName || s.name || "";
    const last  = s.personalInfo?.lastName  || "";
    return `${first[0]||""}${last[0]||""}`.toUpperCase() || "?";
  };
  const displayName = (s) =>
    s.personalInfo ? `${s.personalInfo.firstName} ${s.personalInfo.lastName}` : s.name;

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Students List</h1>
            <p className="text-gray-500 mt-1">Manage and view all student records</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchStudents} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setOpenModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label:"Total Students", value:stats.total,        color:"blue"   },
            { label:"Active",         value:stats.active,       color:"green"  },
            { label:"Inactive",       value:stats.inactive,     color:"yellow" },
            { label:"New This Month", value:stats.newThisMonth, color:"purple" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 border-${color}-500`}>
              <p className="text-gray-500 text-sm">{label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Grades</option>
              {["Pre-K","Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="GRADUATED">Graduated</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[["Student",""],["Contact","hidden md:table-cell"],["Grade",""],["Class","hidden lg:table-cell"],["Status",""],["Actions",""]].map(([h,cls])=>(
                    <th key={h} className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${cls}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
                      <p className="text-sm">Loading students…</p>
                    </div>
                  </td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Search className="w-8 h-8"/>
                      <p className="text-sm font-medium">No students found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td></tr>
                ) : filteredStudents.map((student) => {
                  const status = student.personalInfo?.status || "";
                  const name   = displayName(student);
                  return (
                    <tr key={student.id}
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="hover:bg-gray-50 transition cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600">
                            {student.personalInfo?.profileImage
                              ? <img src={student.personalInfo.profileImage} alt="" className="w-full h-full object-cover"/>
                              : avatarInitials(student)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{name}</p>
                            <p className="text-sm text-gray-500 md:hidden">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400"/>{student.email}</div>
                          {student.personalInfo?.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400"/>{student.personalInfo.phone}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="text-sm font-medium text-gray-800">{student.personalInfo?.grade || "—"}</span></td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">{student.personalInfo?.className || "—"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(status)}`}>
                          {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* View */}
                          <button
                            onClick={() => navigate(`/students/${student.id}`)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition group" title="View Details">
                            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600"/>
                          </button>
                          {/* Edit — navigates to /students/:id/edit */}
                          <button
                            onClick={() => navigate(`/students/${student.id}/edit`)}
                            className="p-2 hover:bg-green-50 rounded-lg transition group" title="Edit">
                            <Edit className="w-4 h-4 text-gray-400 group-hover:text-green-600"/>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => handleDelete(e, student.id, name)}
                            className="p-2 hover:bg-red-50 rounded-lg transition group" title="Delete">
                            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{students.length}</span> of{" "}
              <span className="font-semibold">{total}</span> students
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i+1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg transition text-sm ${page===p?"bg-blue-600 text-white":"border border-gray-300 hover:bg-gray-50"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        </div>

        {/* Add Student Modal */}
        {openModal && (
          <AddStudent
            closeModal={() => setOpenModal(false)}
            onSuccess={() => { fetchStudents(); fetchStats(); }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default StudentsList;