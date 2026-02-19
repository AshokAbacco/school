// client/src/admin/pages/classes/ClassesList.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import {
  fetchClassSections,
  deleteClassSection,
  fetchAcademicYears,
} from "./api/classesApi";

function StatCard({ title, value, sub }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-4"
      style={{ border: "1px solid rgba(136,189,242,0.22)" }}
    >
      <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
        {title}
      </p>
      <h2 className="text-xl font-semibold mt-1" style={{ color: "#384959" }}>
        {value}
      </h2>
      {sub && (
        <p className="text-sm font-normal mt-0.5" style={{ color: "#88BDF2" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function ClassesList() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cd, yd] = await Promise.all([
        fetchClassSections(yearId ? { academicYearId: yearId } : {}),
        fetchAcademicYears(),
      ]);
      setClasses(cd.classSections || []);
      const yr = yd.academicYears || [];
      setYears(yr);
      if (!yearId) {
        const active = yr.find((y) => y.isActive);
        if (active) setYearId(active.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [yearId]);

  useEffect(() => {
    load();
  }, [load]);

  // â”€â”€ Delete inline â€” stays on this page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteClassSection(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = classes.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.academicYearLinks?.[0]?.classTeacher?.firstName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      c.academicYearLinks?.[0]?.classTeacher?.lastName
        ?.toLowerCase()
        .includes(search.toLowerCase()),
  );

  const totalStudents = classes.reduce(
    (sum, c) => sum + (c._count?.studentEnrollments || 0),
    0,
  );
  const activeYear = years.find((y) => y.id === yearId);

  return (
    <PageLayout>
      <div
        className="p-4 md:p-6"
        style={{ background: "#F4F8FC", minHeight: "100%" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1 h-6 rounded-full"
                style={{ background: "#384959" }}
              />
              <h1
                className="text-xl font-semibold"
                style={{ color: "#384959" }}
              >
                Classes & Sections
              </h1>
            </div>
            <p
              className="text-sm font-normal ml-3"
              style={{ color: "#6A89A7" }}
            >
              Manage class structure and teacher assignments
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              className="rounded-xl text-sm font-medium outline-none"
              style={{
                padding: "8px 12px",
                border: "1.5px solid rgba(136,189,242,0.35)",
                color: "#384959",
                fontFamily: "Inter, sans-serif",
                background: "#fff",
              }}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isActive ? " âœ“" : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => navigate("/classes/setup")}
              className="flex items-center gap-2 rounded-xl text-sm font-medium"
              style={{
                padding: "9px 14px",
                background: "rgba(189,221,252,0.25)",
                border: "1.5px solid rgba(136,189,242,0.35)",
                color: "#384959",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Settings size={14} /> Setup & Timetable
            </button>

            <button
              onClick={() => navigate("/classes/setup")}
              className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
              style={{
                padding: "9px 16px",
                background: "#384959",
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Plus size={15} /> Add Class
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <StatCard title="Total Sections" value={classes.length} />
          <StatCard
            title="Total Students"
            value={totalStudents}
            sub="across all sections"
          />
          <StatCard
            title="Academic Year"
            value={activeYear?.name || "All"}
            sub={activeYear?.isActive ? "Active" : ""}
          />
          <StatCard
            title="Not Activated"
            value={classes.filter((c) => !c.academicYearLinks?.length).length}
            sub="need activation"
          />
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-3 bg-white rounded-2xl shadow-sm mb-4 px-4 py-3"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <Search size={16} style={{ color: "#88BDF2", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by class name or teacherâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm font-normal"
            style={{ color: "#384959", fontFamily: "Inter, sans-serif" }}
          />
          <button
            onClick={load}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <RefreshCw size={15} style={{ color: "#88BDF2" }} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 p-4 mb-4 rounded-xl text-sm font-medium"
            style={{
              background: "rgba(231,76,60,0.08)",
              border: "1px solid rgba(231,76,60,0.2)",
              color: "#c0392b",
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: "1px solid rgba(136,189,242,0.22)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: "1px solid rgba(136,189,242,0.18)",
              background: "rgba(189,221,252,0.08)",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "#384959" }}>
                All Classes
              </p>
              <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                {filtered.length} of {classes.length} sections
              </p>
            </div>
          </div>

          {loading ? (
            <div
              className="flex items-center justify-center"
              style={{ height: 180 }}
            >
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "#88BDF2" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3"
              style={{ height: 180 }}
            >
              <p className="text-sm font-normal" style={{ color: "#6A89A7" }}>
                {search ? "No classes match your search." : "No classes yet."}
              </p>
              {!search && (
                <button
                  onClick={() => navigate("/classes/setup")}
                  className="flex items-center gap-2 rounded-xl text-sm font-semibold text-white"
                  style={{
                    padding: "8px 16px",
                    background: "#384959",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Plus size={14} /> Create First Class
                </button>
              )}
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(189,221,252,0.08)" }}>
                <tr>
                  {[
                    "Class",
                    "Class Teacher",
                    "Students",
                    "Year",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-sm font-medium uppercase"
                      style={{
                        padding: "10px 20px",
                        color: "#6A89A7",
                        letterSpacing: "0.4px",
                        borderBottom: "1px solid rgba(136,189,242,0.18)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls) => {
                  const link = cls.academicYearLinks?.[0];
                  const teacher = link?.classTeacher;
                  const students = cls._count?.studentEnrollments || 0;
                  const isActivated = !!link;

                  return (
                    <tr
                      key={cls.id}
                      style={{
                        borderBottom: "1px solid rgba(136,189,242,0.1)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(189,221,252,0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {/* Class */}
                      <td style={{ padding: "12px 20px" }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0"
                            style={{
                              background: "rgba(189,221,252,0.3)",
                              color: "#384959",
                            }}
                          >
                            {cls.grade}
                            {cls.section}
                          </div>
                          <div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: "#384959" }}
                            >
                              {cls.name}
                            </p>
                            <p
                              className="text-sm font-normal"
                              style={{ color: "#6A89A7" }}
                            >
                              Grade {cls.grade} Â· Section {cls.section}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td style={{ padding: "12px 20px" }}>
                        {teacher ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                              style={{
                                background: "rgba(106,137,167,0.15)",
                                color: "#384959",
                              }}
                            >
                              {teacher.firstName?.[0]}
                              {teacher.lastName?.[0]}
                            </div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#384959" }}
                            >
                              {teacher.firstName} {teacher.lastName}
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-sm font-normal"
                            style={{ color: "#88BDF2" }}
                          >
                            Not assigned
                          </span>
                        )}
                      </td>

                      {/* Students */}
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#384959" }}
                        >
                          {students}
                        </span>
                        <span
                          className="text-sm font-normal ml-1"
                          style={{ color: "#6A89A7" }}
                        >
                          enrolled
                        </span>
                      </td>

                      {/* Year */}
                      <td style={{ padding: "12px 20px" }}>
                        {link?.academicYear ? (
                          <span
                            className="text-sm font-medium px-2.5 py-1 rounded-lg"
                            style={{
                              background: "rgba(189,221,252,0.25)",
                              color: "#384959",
                            }}
                          >
                            {link.academicYear.name}
                          </span>
                        ) : (
                          <span
                            className="text-sm font-normal"
                            style={{ color: "#88BDF2" }}
                          >
                            â€”
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full"
                          style={{
                            background: isActivated
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(136,189,242,0.15)",
                            color: isActivated ? "#065f46" : "#6A89A7",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: isActivated ? "#10b981" : "#88BDF2",
                            }}
                          />
                          {isActivated ? "Active" : "Not activated"}
                        </span>
                      </td>

                      {/* Actions â€” e.stopPropagation() on every button */}
                      <td style={{ padding: "12px 20px" }}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/classes/${cls.id}/timetable`);
                            }}
                            title="View Timetable"
                            style={{
                              padding: "6px 7px",
                              background: "rgba(189,221,252,0.25)",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                            }}
                          >
                            <Eye size={13} style={{ color: "#6A89A7" }} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/classes/setup");
                            }}
                            title="Edit in Setup"
                            style={{
                              padding: "6px 7px",
                              background: "rgba(189,221,252,0.25)",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                            }}
                          >
                            <Edit size={13} style={{ color: "#6A89A7" }} />
                          </button>

                          <button
                            onClick={(e) => handleDelete(e, cls.id, cls.name)}
                            disabled={deleting === cls.id}
                            title="Delete"
                            style={{
                              padding: "6px 7px",
                              background: "rgba(239,68,68,0.08)",
                              border: "none",
                              borderRadius: 8,
                              cursor:
                                deleting === cls.id ? "not-allowed" : "pointer",
                              display: "flex",
                            }}
                          >
                            {deleting === cls.id ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                                color="#ef4444"
                              />
                            ) : (
                              <Trash2 size={13} color="#ef4444" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
