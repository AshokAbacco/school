// src/pages/Fees.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Fees list page — wired to real backend /api/fees endpoints.
//  Edit passes fee data via navigate state (no localStorage).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus, Search, Edit2, Trash2, GraduationCap,
  ChevronLeft, ChevronRight, X, AlertTriangle,
  IndianRupee, BookOpen, Filter, Loader2, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage"; // adjust path if needed

const API = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 5;

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { ...opts, headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ fee, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4" style={{ border: "1.5px solid #BDDDFC" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#FEE2E2" }}>
            <AlertTriangle size={24} color="#DC2626" />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#384959" }}>Delete Fee Record</h3>
            <p className="text-sm" style={{ color: "#6A89A7" }}>This action cannot be undone.</p>
          </div>
        </div>
        <p className="mb-6 text-sm" style={{ color: "#384959" }}>
          Are you sure you want to delete the fee record for{" "}
          <span className="font-semibold">{fee?.classSection?.name ?? fee?.className}</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-5 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
            style={{ borderColor: "#BDDDFC", color: "#6A89A7" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
            style={{ background: "#DC2626" }}
          >
            {deleting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Fees() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [fees,        setFees]        = useState([]);
  const [stats,       setStats]       = useState({ totalClasses: 0, activeCount: 0, totalRevenuePotential: 0 });
  const [academicYears, setAcademicYears] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [yearFilter,  setYearFilter]  = useState("all");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState(null);

  // Show toast from navigation state (after add/edit)
  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      setTimeout(() => setToast(null), 3500);
      // Clean state so back-nav doesn't re-show it
      window.history.replaceState({}, "");
    }
  }, []);

  // ── fetch academic years once ─────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/api/fees/academic-years")
      .then(d => setAcademicYears(d.academicYears ?? []))
      .catch(() => {});
  }, []);

  // ── fetch fees ────────────────────────────────────────────────────────────
  const fetchFees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(ITEMS_PER_PAGE),
        ...(search && { search }),
        ...(yearFilter !== "all" && { academicYearId: yearFilter }),
      });

      const [feeData, statsData] = await Promise.all([
        apiFetch(`/api/fees?${params}`),
        apiFetch(`/api/fees/stats${yearFilter !== "all" ? `?academicYearId=${yearFilter}` : ""}`),
      ]);

      setFees(feeData.fees ?? []);
      setTotalPages(feeData.pagination?.totalPages ?? 1);
      setTotal(feeData.pagination?.total ?? 0);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, yearFilter]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  // Debounce search
  useEffect(() => { setPage(1); }, [search, yearFilter]);

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/fees/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      setToast("Fee record deleted successfully.");
      setTimeout(() => setToast(null), 3000);
      fetchFees();
    } catch (err) {
      setToast(`Delete failed: ${err.message}`);
      setTimeout(() => setToast(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (fee) => {
    navigate("/superAdmin/fees-add", { state: { editFee: fee } });
  };

  const statCards = [
    { label: "Total Classes", value: stats.totalClasses, icon: BookOpen, color: "#88BDF2" },
    { label: "Active Fees",   value: stats.activeCount,  icon: GraduationCap, color: "#6A89A7" },
    {
      label: "Total Revenue Potential",
      value: `₹${Number(stats.totalRevenuePotential).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "#384959",
    },
  ];

  return (
    <>
      <div className="min-h-screen" style={{ background: "#F0F7FF", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

        {/* Toast */}
        {toast && (
          <div
            className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ background: "#384959" }}
          >
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            {toast}
            <button onClick={() => setToast(null)}><X size={14} /></button>
          </div>
        )}

        {/* Delete Modal */}
        {deleteTarget && (
          <DeleteModal
            fee={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            deleting={deleting}
          />
        )}

        {/* Header */}
        <div className="px-6 pt-8 pb-4 max-w-8xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#384959" }}>
                Fees Management
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "#6A89A7" }}>
                Manage class-wise fee structures for all academic years
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchFees}
                className="w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:bg-white"
                style={{ borderColor: "#BDDDFC", color: "#6A89A7" }}
                title="Refresh"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => navigate("/superAdmin/fees-add")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all hover:opacity-90 hover:shadow-lg active:scale-95"
                style={{ background: "linear-gradient(135deg, #6A89A7, #384959)" }}
              >
                <Plus size={17} /> Add Fee
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 pb-5 max-w-8xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 flex items-center gap-4 shadow-sm"
                style={{ background: "#fff", border: "1px solid #BDDDFC" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F0F7FF" }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "#6A89A7" }}>{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: "#384959" }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table Card */}
        <div className="px-6 pb-10 max-w-8xl mx-auto">
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "#fff", border: "1px solid #BDDDFC" }}>

            {/* Toolbar */}
            <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b" style={{ borderColor: "#BDDDFC" }}>
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color="#6A89A7" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by class name..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "#F0F7FF", border: "1.5px solid #BDDDFC", color: "#384959" }}
                />
              </div>
              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <Filter size={14} color="#6A89A7" />
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="text-sm rounded-xl px-3 py-2 outline-none cursor-pointer"
                  style={{ background: "#F0F7FF", border: "1.5px solid #BDDDFC", color: "#384959" }}
                >
                  <option value="all">All Years</option>
                  {academicYears.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.name}{y.isActive ? " (Active)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-3" style={{ color: "#6A89A7" }}>
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-sm">Loading fees…</span>
                </div>
              ) : error ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium" style={{ color: "#DC2626" }}>{error}</p>
                  <button onClick={fetchFees} className="mt-3 text-xs underline" style={{ color: "#6A89A7" }}>
                    Retry
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#F0F7FF" }}>
                      {["Class Name", "Fee Amount", "Academic Year", "Status", "Actions"].map(h => (
                        <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6A89A7" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center" style={{ color: "#6A89A7" }}>
                          <GraduationCap size={36} className="mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No fee records found</p>
                          <p className="text-xs mt-1 opacity-70">Try adjusting your search or filters</p>
                        </td>
                      </tr>
                    ) : fees.map(fee => (
                      <tr key={fee.id} className="border-t transition-colors hover:bg-blue-50/40" style={{ borderColor: "#EDF5FF" }}>
                        <td className="px-6 py-4 font-semibold" style={{ color: "#384959" }}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #88BDF2, #6A89A7)" }}
                            >
                              {(fee.classSection?.name ?? "?").slice(0, 1).toUpperCase()}
                            </div>
                            {fee.classSection?.name ?? "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold" style={{ color: "#384959" }}>
                            ₹{Number(fee.feeAmount).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-6 py-4" style={{ color: "#6A89A7" }}>
                          {fee.academicYear?.name ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={
                              fee.status === "ACTIVE"
                                ? { background: "#D1FAE5", color: "#065F46" }
                                : { background: "#FEE2E2", color: "#991B1B" }
                            }
                          >
                            {fee.status === "ACTIVE" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(fee)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "#EDF5FF", color: "#6A89A7" }}
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(fee)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "#FEE2E2", color: "#DC2626" }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: "#BDDDFC" }}>
                <p className="text-xs" style={{ color: "#6A89A7" }}>
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total} records
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all hover:bg-blue-50"
                    style={{ border: "1.5px solid #BDDDFC", color: "#6A89A7" }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                      style={p === page ? { background: "#384959", color: "#fff" } : { border: "1.5px solid #BDDDFC", color: "#6A89A7" }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-all hover:bg-blue-50"
                    style={{ border: "1.5px solid #BDDDFC", color: "#6A89A7" }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}