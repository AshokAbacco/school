// admin/pages/students/StudentsList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { getToken } from "../../../auth/storage";
import PageLayout from "../../components/PageLayout";
import AddStudent from "./AddStudents";

import StudentStats from "./components/StudentStats";
import StudentFilters from "./components/StudentFilters";
import StudentTable from "./components/StudentTable";
import StudentPagination from "./components/StudentPagination";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const LIMIT = 10;

function StudentsList() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  // ✅ Filter by real FK IDs — no more grade string filter
  const [filterSectionId, setFilterSectionId] = useState("all");
  const [filterYearId, setFilterYearId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [openModal, setOpenModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // ✅ Dropdown data for filter selects
  const [classSections, setClassSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Fetch dropdown options once
  useEffect(() => {
    (async () => {
      try {
        const [csRes, ayRes] = await Promise.all([
          fetch(`${API_URL}/api/class-sections`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/academic-years`, { headers: authHeaders() }),
        ]);
        const [csData, ayData] = await Promise.all([
          csRes.json(),
          ayRes.json(),
        ]);
        setClassSections(csData.classSections || csData.data || []);
        setAcademicYears(ayData.academicYears || ayData.data || []);
      } catch {
        /* non-critical */
      }
    })();
  }, []);

  // ── Fetch students ─────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      // ✅ Pass FK IDs as query params — backend filters via enrollment relation
      if (filterSectionId !== "all")
        params.set("classSectionId", filterSectionId);
      if (filterYearId !== "all") params.set("academicYearId", filterYearId);

      const res = await fetch(`${API_URL}/api/students?${params}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch students");
      setStudents(data.students || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterSectionId, filterYearId]);

  // ── Fetch stats ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, activeRes, inactiveRes] = await Promise.all([
        fetch(`${API_URL}/api/students?page=1&limit=1`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=ACTIVE`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/students?page=1&limit=1&status=INACTIVE`, {
          headers: authHeaders(),
        }),
      ]);
      const [a, b, c] = await Promise.all([
        allRes.json(),
        activeRes.json(),
        inactiveRes.json(),
      ]);
      setStats({
        total: a.total || 0,
        active: b.total || 0,
        inactive: c.total || 0,
        newThisMonth: 0,
      });
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterSectionId, filterYearId, filterStatus]);

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message);
      }
      fetchStudents();
      fetchStats();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // ✅ Client-side status filter only (section/year filters go to server)
  const filtered =
    filterStatus === "all"
      ? students
      : students.filter((s) => {
          const status =
            s.enrollments?.[0]?.status || s.personalInfo?.status || "";
          return status.toLowerCase() === filterStatus.toLowerCase();
        });

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-1 h-6 rounded-full"
              style={{ background: "#384959" }}
            />
            <h1 className="text-2xl font-bold" style={{ color: "#384959" }}>
              Students
            </h1>
          </div>
          <p className="text-sm ml-3" style={{ color: "#6A89A7" }}>
            Manage and view all student records
          </p>
        </div>

        <StudentStats stats={stats} />

        {/* ✅ Updated filters component receives FK-based filter state + dropdown data */}
        <StudentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterSectionId={filterSectionId}
          setFilterSectionId={setFilterSectionId}
          filterYearId={filterYearId}
          setFilterYearId={setFilterYearId}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          classSections={classSections}
          academicYears={academicYears}
          loading={loading}
          onRefresh={() => {
            fetchStudents();
            fetchStats();
          }}
          onAdd={() => setOpenModal(true)}
        />

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 p-4 mb-4 rounded-xl text-sm"
            style={{
              background: "rgba(231,76,60,0.08)",
              border: "1px solid rgba(231,76,60,0.20)",
              color: "#c0392b",
            }}
          >
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        {/* Table card */}
        <div
          className="rounded-2xl overflow-hidden bg-white shadow-sm"
          style={{ border: "1px solid rgba(136,189,242,0.25)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: "1px solid rgba(136,189,242,0.20)",
              background: "rgba(189,221,252,0.08)",
            }}
          >
            <div>
              <p className="font-bold text-sm" style={{ color: "#384959" }}>
                All Students
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6A89A7" }}>
                {filtered.length} of {total} records
              </p>
            </div>
          </div>

          <StudentTable
            students={filtered}
            loading={loading}
            onDelete={handleDelete}
          />

          {!loading && filtered.length > 0 && (
            <StudentPagination
              page={page}
              totalPages={totalPages}
              total={total}
              showing={students.length}
              onPageChange={setPage}
            />
          )}
        </div>

        {openModal && (
          <AddStudent
            closeModal={() => setOpenModal(false)}
            onSuccess={() => {
              fetchStudents();
              fetchStats();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default StudentsList;
