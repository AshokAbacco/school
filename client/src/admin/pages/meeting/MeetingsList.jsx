// client/src/admin/pages/meeting/MeetingsList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, CalendarDays, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import MeetingStatsCards from "../../../admin/pages/meeting/components/MeetingStatsCards";
import MeetingTableRow from "../../../admin/pages/meeting/components/MeetingTableRow";
import MeetingFormModal from "../../../admin/pages/meeting/components/MeetingFormModal";
import MeetingViewModal from "../../../admin/pages/meeting/components/MeetingViewModal";
import { fetchMeetings, fetchMeetingStats, fetchAcademicYears, deleteMeeting } from "../../../admin/pages/meeting/api/meetingsApi";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2",
  deep: "#384959", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340", textLight: "#6A89A7",
};

const MEETING_TYPES    = ["STAFF", "PARENT", "STUDENT", "GENERAL", "BOARD", "CUSTOM"];
const MEETING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "POSTPONED"];
const PAGE_SIZE        = 15;

// ── FIX: prioritise "meetings" key before generic "data" key ──────────────
const safeArray = (r, preferKey) => {
  if (Array.isArray(r)) return r;
  // Check the preferred key first (e.g. "meetings", "academicYears")
  if (preferKey && Array.isArray(r?.[preferKey])) return r[preferKey];
  // Then fall through common wrapper keys
  for (const k of ["meetings", "data", "academicYears", "results", "items"])
    if (Array.isArray(r?.[k])) return r[k];
  return [];
};

const inputStyle = {
  border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "7px 11px",
  fontSize: 12, color: C.text, background: C.white, outline: "none",
  fontFamily: "'Inter', sans-serif", fontWeight: 400,
};

/* ── Delete Confirm ─────────────────────────────────────────── */
function DeleteConfirm({ meeting, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(56,73,89,0.4)", backdropFilter: "blur(6px)", padding: 16 }}>
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 20px 60px rgba(56,73,89,0.18)", width: "100%", maxWidth: 400, padding: 24, display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Inter', sans-serif" }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text }}>Delete Meeting</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textLight, lineHeight: 1.5 }}>
            Are you sure you want to delete <strong style={{ color: C.text }}>"{meeting?.title}"</strong>? This cannot be undone.
          </p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.bg, color: C.textLight, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "#F43F5E", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
            {loading && <Loader2 size={13} className="animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyState({ onSchedule }) {
  return (
    <tr><td colSpan={8}>
      <div style={{ padding: "60px 20px", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <CalendarDays size={24} color={C.sky} strokeWidth={1.5} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>No meetings found</p>
        <p style={{ margin: "5px 0 16px", fontSize: 12, color: C.textLight }}>Schedule your first meeting to get started</p>
        <button onClick={onSchedule} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} /> Schedule Meeting
        </button>
      </div>
    </td></tr>
  );
}

/* ── Error State ─────────────────────────────────────────────── */
function ErrorState({ message, onRetry }) {
  return (
    <tr><td colSpan={8}>
      <div style={{ padding: "50px 20px", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "#FFF1F2", border: "1px solid #FFD1D7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <AlertCircle size={22} color="#F43F5E" strokeWidth={1.8} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Failed to load meetings</p>
        <p style={{ margin: "5px 0 16px", fontSize: 12, color: "#F43F5E" }}>{message}</p>
        <button onClick={onRetry} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.bg, color: C.textLight, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    </td></tr>
  );
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function MeetingsList() {
  const [meetings,      setMeetings]      = useState([]);
  const [stats,         setStats]         = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [fetchError,    setFetchError]    = useState(null);   // ← NEW
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterYear,    setFilterYear]    = useState("");
  const [showForm,      setShowForm]      = useState(false);
  const [editMeeting,   setEditMeeting]   = useState(null);
  const [viewMeeting,   setViewMeeting]   = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [yearsReady,    setYearsReady]    = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Load academic years, then mark ready ────────────────────
  useEffect(() => {
    fetchAcademicYears()
      .then((res) => {
        const years = safeArray(res, "academicYears");
        setAcademicYears(years);
        const active = years.find((y) => y.isActive);
        if (active) setFilterYear(active.id);
      })
      .catch((err) => {
        // Years failed — still mark ready so meetings load without year filter
        console.warn("[MeetingsList] fetchAcademicYears failed:", err.message);
      })
      .finally(() => setYearsReady(true));
  }, []);

  // ── FIX: loadMeetings with visible error state ───────────────
  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetchMeetings({
        ...(search       ? { search }                     : {}),
        ...(filterType   ? { type: filterType }           : {}),
        ...(filterStatus ? { status: filterStatus }       : {}),
        ...(filterYear   ? { academicYearId: filterYear } : {}),
        page, limit: PAGE_SIZE,
      });

      // Log raw response in dev so you can see the exact shape
      console.log("[MeetingsList] fetchMeetings →", res);

      // Prefer res.meetings directly, then fall back via safeArray
      const list = Array.isArray(res?.meetings)
        ? res.meetings
        : safeArray(res, "meetings");

      setMeetings(list);
      setTotal(res?.total ?? res?.count ?? 0);
    } catch (err) {
      // ── FIX: surface the error instead of silently eating it ──
      console.error("[MeetingsList] fetchMeetings failed:", err.message);
      setFetchError(err.message || "Something went wrong. Please try again.");
      setMeetings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, filterYear, page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchMeetingStats({
        ...(filterYear ? { academicYearId: filterYear } : {}),
      });
      console.log("[MeetingsList] fetchMeetingStats →", res);
      // Backend returns { data: { total, scheduled, ... } }
      setStats(res?.data ?? res?.stats ?? {});
    } catch (err) {
      console.warn("[MeetingsList] fetchMeetingStats failed:", err.message);
    } finally {
      setStatsLoading(false);
    }
  }, [filterYear]);

  // Only fire once academic years have resolved
  useEffect(() => { if (yearsReady) loadMeetings(); }, [loadMeetings, yearsReady]);
  useEffect(() => { if (yearsReady) loadStats();    }, [loadStats,    yearsReady]);

  const openEdit    = (m) => { setEditMeeting(m); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditMeeting(null); loadMeetings(); loadStats(); };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMeeting(deleteTarget.id);
      setDeleteTarget(null);
      loadMeetings();
      loadStats();
    } catch (err) {
      console.error("[MeetingsList] deleteMeeting failed:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 30px", fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 26, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
              <h1 style={{ margin: 0, fontSize: "clamp(20px,4vw,26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.4px" }}>
                Meetings
              </h1>
            </div>
            <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight }}>
              {total} meeting{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { loadMeetings(); loadStats(); }}
              style={{ width: 38, height: 38, borderRadius: 11, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.mist}55`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${C.deep}44` }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Plus size={15} /> Schedule Meeting
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <MeetingStatsCards stats={stats} loading={statsLoading} />

        {/* ── Main card ── */}
        <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden" }}>

          {/* Panel head + filters */}
          <div style={{ padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`, background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${C.sky}22`, border: `1.5px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarDays size={15} color={C.sky} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>All Meetings</p>
                <p style={{ margin: 0, fontSize: 11, color: C.textLight }}>{total} total</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textLight, pointerEvents: "none" }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 28, width: 180 }}
                  placeholder="Search meetings…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e)  => (e.target.style.borderColor = C.border)}
                />
              </div>
              {[
                { value: filterYear,   set: setFilterYear,   label: "All Years",    opts: academicYears.map((y) => ({ v: y.id, l: y.name })) },
                { value: filterType,   set: setFilterType,   label: "All Types",    opts: MEETING_TYPES.map((t) => ({ v: t, l: t })) },
                { value: filterStatus, set: setFilterStatus, label: "All Statuses", opts: MEETING_STATUSES.map((s) => ({ v: s, l: s })) },
              ].map(({ value, set, label, opts }, i) => (
                <select key={i} style={{ ...inputStyle, cursor: "pointer" }}
                  value={value}
                  onChange={(e) => { set(e.target.value); setPage(1); }}
                  onFocus={(e) => (e.target.style.borderColor = C.sky)}
                  onBlur={(e)  => (e.target.style.borderColor = C.border)}
                >
                  <option value="">{label}</option>
                  {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${C.borderLight}`, background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
                  {["Title", "Type", "Date & Time", "Participants", "Classes", "Status", "Organizer", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", fontSize: 10, fontWeight: 600, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.textLight }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span style={{ fontSize: 13 }}>Loading meetings…</span>
                    </div>
                  </td></tr>
                ) : fetchError ? (
                  // ── FIX: show real error instead of empty state ──
                  <ErrorState message={fetchError} onRetry={loadMeetings} />
                ) : meetings.length === 0 ? (
                  <EmptyState onSchedule={() => setShowForm(true)} />
                ) : (
                  meetings.map((m) => (
                    <MeetingTableRow key={m.id} meeting={m} onView={setViewMeeting} onEdit={openEdit} onDelete={setDeleteTarget} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!fetchError && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: `1.5px solid ${C.borderLight}` }}>
              <span style={{ fontSize: 11, color: C.textLight }}>Page {page} of {totalPages}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", color: C.textLight, opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${page === p ? C.deep : C.borderLight}`, background: page === p ? C.deep : C.white, color: page === p ? "#fff" : C.textLight, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", color: C.textLight, opacity: page === totalPages ? 0.4 : 1 }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm    && <MeetingFormModal meeting={editMeeting} onClose={() => { setShowForm(false); setEditMeeting(null); }} onSaved={handleSaved} />}
      {viewMeeting && <MeetingViewModal meeting={viewMeeting} onClose={() => setViewMeeting(null)} onStatusChange={() => { loadMeetings(); loadStats(); }} />}
      {deleteTarget && <DeleteConfirm meeting={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}
    </>
  );
}