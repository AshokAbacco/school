// client/src/admin/pages/meeting/MeetingsList.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  CalendarDays,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import MeetingStatsCards from "./components/MeetingStatsCards";
import MeetingTableRow from "./components/MeetingTableRow";
import MeetingFormModal from "./components/MeetingFormModal";
import MeetingViewModal from "./components/MeetingViewModal";
import {
  fetchMeetings,
  fetchMeetingStats,
  fetchAcademicYears,
  deleteMeeting,
} from "./api/meetingsApi";

const MEETING_TYPES = [
  "STAFF",
  "PARENT",
  "STUDENT",
  "GENERAL",
  "BOARD",
  "CUSTOM",
];
const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];
const PAGE_SIZE = 15;

const safeArray = (r, ...keys) => {
  if (Array.isArray(r)) return r;
  for (const k of ["data", "meetings", "academicYears", ...keys]) {
    if (Array.isArray(r?.[k])) return r[k];
  }
  return [];
};

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function DeleteConfirm({ meeting, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#384959]/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-[#BDDDFC] p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#384959]">
            Delete Meeting
          </h3>
          <p className="text-sm text-[#6A89A7] mt-1">
            Are you sure you want to delete{" "}
            <strong className="text-[#384959]">"{meeting?.title}"</strong>? This
            action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#6A89A7] hover:text-[#384959] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onSchedule }) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#BDDDFC]/50 flex items-center justify-center mb-4">
            <CalendarDays size={26} className="text-[#6A89A7]" />
          </div>
          <p className="text-base font-semibold text-[#384959] mb-1">
            No meetings found
          </p>
          <p className="text-sm text-[#6A89A7] mb-5">
            Schedule your first meeting to get started.
          </p>
          <button
            onClick={onSchedule}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#384959] text-white text-sm font-semibold rounded-xl hover:bg-[#6A89A7] transition-colors"
          >
            <Plus size={16} /> Schedule Meeting
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function MeetingsList() {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [viewMeeting, setViewMeeting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load academic years ──────────────────────────────────────────────────
  useEffect(() => {
    fetchAcademicYears()
      .then((res) => {
        const years = safeArray(res, "academicYears");
        setAcademicYears(years);
        const active = years.find((y) => y.isActive);
        if (active) setFilterYear(active.id);
      })
      .catch(() => {});
  }, []);

  // ── Load meetings ────────────────────────────────────────────────────────
  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMeetings({
        ...(search ? { search } : {}),
        ...(filterType ? { type: filterType } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterYear ? { academicYearId: filterYear } : {}),
        page,
        limit: PAGE_SIZE,
      });
      setMeetings(safeArray(res, "meetings"));
      setTotal(res.total ?? res.count ?? 0);
    } catch (_) {}
    setLoading(false);
  }, [search, filterType, filterStatus, filterYear, page]);

  // ── Load stats ───────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchMeetingStats(
        filterYear ? { academicYearId: filterYear } : {},
      );
      setStats(res.data ?? res);
    } catch (_) {}
    setStatsLoading(false);
  }, [filterYear]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeeting(deleteTarget.id);
      setDeleteTarget(null);
      loadMeetings();
      loadStats();
    } catch (_) {}
    setDeleting(false);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditMeeting(null);
    loadMeetings();
    loadStats();
  };

  const openEdit = (meeting) => {
    setEditMeeting(meeting);
    setShowForm(true);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selectCls =
    "border border-[#BDDDFC] rounded-lg px-3 py-2 text-sm text-[#384959] bg-white focus:outline-none focus:ring-2 focus:ring-[#88BDF2]";

  return (
    <PageLayout>
      <div className="flex flex-col min-h-full bg-gray-50">
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-[#BDDDFC] px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#384959]">Meetings</h1>
            <p className="text-sm text-[#6A89A7]">
              Schedule and manage all school meetings
            </p>
          </div>
          <button
            onClick={() => {
              setEditMeeting(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#384959] text-white text-sm font-semibold rounded-xl hover:bg-[#6A89A7] transition-colors shadow-sm"
          >
            <Plus size={16} /> Schedule Meeting
          </button>
        </div>

        <div className="flex-1 px-6 py-5 flex flex-col gap-4">
          {/* ── Stats ────────────────────────────────────────────────────── */}
          <MeetingStatsCards stats={stats} loading={statsLoading} />

          {/* ── Filters Bar ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#BDDDFC] px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A89A7]"
              />
              <input
                className="w-full pl-9 pr-3 py-2 border border-[#BDDDFC] rounded-lg text-sm text-[#384959] bg-white focus:outline-none focus:ring-2 focus:ring-[#88BDF2] placeholder-[#6A89A7]/50"
                placeholder="Search meetings..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select
              className={selectCls}
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {MEETING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                loadMeetings();
                loadStats();
              }}
              className="p-2 rounded-lg border border-[#BDDDFC] text-[#6A89A7] hover:bg-[#BDDDFC]/30 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            <span className="text-xs text-[#6A89A7] ml-auto">
              {total} meeting{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Table ────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-[#BDDDFC] shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#BDDDFC]/30 border-b border-[#BDDDFC]">
                    {[
                      "Title",
                      "Type",
                      "Date & Time",
                      "Participants",
                      "Classes",
                      "Status",
                      "Organizer",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-[#384959] uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex items-center justify-center gap-2 text-[#6A89A7]">
                          <Loader2 size={18} className="animate-spin" />
                          <span className="text-sm">Loading meetings...</span>
                        </div>
                      </td>
                    </tr>
                  ) : meetings.length === 0 ? (
                    <EmptyState onSchedule={() => setShowForm(true)} />
                  ) : (
                    meetings.map((m) => (
                      <MeetingTableRow
                        key={m.id}
                        meeting={m}
                        onView={setViewMeeting}
                        onEdit={openEdit}
                        onDelete={setDeleteTarget}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#BDDDFC] bg-white">
                <span className="text-xs text-[#6A89A7]">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-[#BDDDFC] text-[#6A89A7] hover:bg-[#BDDDFC]/30 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                          page === p
                            ? "bg-[#384959] text-white"
                            : "border border-[#BDDDFC] text-[#6A89A7] hover:bg-[#BDDDFC]/30"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-[#BDDDFC] text-[#6A89A7] hover:bg-[#BDDDFC]/30 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ───────────────────────────────────────────────────────── */}
        {showForm && (
          <MeetingFormModal
            meeting={editMeeting}
            onClose={() => {
              setShowForm(false);
              setEditMeeting(null);
            }}
            onSaved={handleSaved}
          />
        )}

        {viewMeeting && (
          <MeetingViewModal
            meeting={viewMeeting}
            onClose={() => setViewMeeting(null)}
            onStatusChange={() => {
              loadMeetings();
              loadStats();
            }}
          />
        )}

        {deleteTarget && (
          <DeleteConfirm
            meeting={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </div>
    </PageLayout>
  );
}
