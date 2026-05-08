// client/src/admin/pages/exams/ExamsList.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ClipboardList, Plus, Search, Eye, Pencil, Trash2,
  Globe, Lock, Calculator, RefreshCw,
  BookOpen, AlertTriangle, X, Loader2, BarChart2,
  AlertCircle, Check,
} from "lucide-react";
import { fetchGroups, deleteGroup, publishGroup, lockGroup } from "./components/examsApi.js";
import AddExamsModal from "./components/AddExam.jsx";
import ViewExamsModal from "./components/ViewExams.jsx";
import ResultsTab from "./components/ResultsTab.jsx";
import { getToken } from "../../../auth/storage.js";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Status badge ── */
function StatusBadge({ group }) {
  if (group.isLocked)    return <span className="text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Completed</span>;
  if (group.isPublished) return <span className="text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 border border-blue-200">Pending</span>;
  return                        <span className="text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Draft</span>;
}

/* ── Confirm Delete Dialog ── */
function ConfirmDialog({ name, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#243340]/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[380px] p-7 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="text-[15px] font-extrabold text-slate-800 mb-1.5">Delete Exam?</h3>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          <strong className="text-slate-700">{name}</strong> and all its schedules &amp; marks will be permanently removed.
        </p>
        <div className="flex gap-2.5 w-full">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-[13px] font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-red-600 transition-colors disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3.5 shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + "18" }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 m-0">{label}</p>
        <p className="text-[22px] font-extrabold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/* ── Action Icon Button ── */
function ActionBtn({ icon: Icon, title, colorClass = "hover:text-slate-600 hover:border-slate-400 hover:bg-slate-50", onClick, disabled }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-[30px] h-[30px] rounded-lg border border-slate-200 bg-transparent text-slate-400 inline-flex items-center justify-center transition-all duration-150 ${colorClass} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Icon size={13} />
    </button>
  );
}

/* ── Tab Button ── */
function TabBtn({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all duration-150 ${
        active
          ? "border-slate-700 bg-slate-700 text-white"
          : "border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ── Terms Panel (portal-style, fixed overlay) ── */
function TermsPanel({ academicYearId, onClose }) {
  const [terms, setTerms]       = useState([]);
  const [newTerm, setNewTerm]   = useState("");
  const [editId, setEditId]     = useState(null);
  const [editVal, setEditVal]   = useState("");
  const [saving, setSaving]     = useState(false);
  const panelRef                = useRef(null);
  const inputRef                = useRef(null);

  const load = useCallback(async () => {
    if (!academicYearId) return;
    try {
      const res  = await fetch(`${API_URL}/api/exams/terms/${academicYearId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setTerms(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }, [academicYearId]);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editId && inputRef.current) inputRef.current.focus();
  }, [editId]);

  const createTerm = async () => {
    if (!newTerm.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/exams/terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newTerm, order: terms.length + 1, academicYearId }),
      });
      setNewTerm("");
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const saveTerm = async (id) => {
    if (!editVal.trim()) return;
    try {
      await fetch(`${API_URL}/api/exams/terms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: editVal }),
      });
      setEditId(null);
      setEditVal("");
      load();
    } catch (e) { console.error(e); }
  };

  const removeTerm = async (id) => {
    if (!window.confirm("Delete this term?")) return;
    try {
      await fetch(`${API_URL}/api/exams/terms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-end pt-20 pr-6 pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-slate-500" />
            <span className="text-[13px] font-bold text-slate-700">Manage Terms</span>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={13} />
          </button>
        </div>

        {/* Add new term */}
        <div className="flex gap-2 p-3 border-b border-slate-100">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTerm()}
            placeholder="Enter term name…"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-300 transition-all"
          />
          <button
            onClick={createTerm}
            disabled={saving || !newTerm.trim()}
            className="rounded-xl bg-slate-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>

        {/* Terms list */}
        <div className="max-h-72 overflow-y-auto">
          {terms.length === 0 ? (
            <div className="p-6 text-center">
              <BookOpen size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-[12px] text-slate-400 font-medium">No terms added yet</p>
            </div>
          ) : (
            terms.map((term) => (
              <div key={term.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                {editId === term.id ? (
                  /* ── Inline edit row ── */
                  <>
                    <input
                      ref={inputRef}
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTerm(term.id);
                        if (e.key === "Escape") { setEditId(null); setEditVal(""); }
                      }}
                      className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                    <button
                      onClick={() => saveTerm(term.id)}
                      className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Save"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => { setEditId(null); setEditVal(""); }}
                      className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  /* ── Normal row ── */
                  <>
                    <p className="flex-1 text-[13px] font-semibold text-slate-700 truncate">{term.name}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditId(term.id); setEditVal(term.name); }}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all"
                        title="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => removeTerm(term.id)}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function ExamsList() {
  const [academicYearId, setAcademicYearId]       = useState(null);
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [yearLoading, setYearLoading]             = useState(true);
  const [yearError, setYearError]                 = useState("");
  const [activeTab, setActiveTab]                 = useState("exams");
  const [showTerms, setShowTerms]                 = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/academic-years`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        const years  = Array.isArray(data) ? data : (data.academicYears || []);
        const active = years.find(y => y.isActive) || years[0];
        if (active) {
          setAcademicYearId(active.id);
          setAcademicYearLabel(active.name || active.year || "");
        } else {
          setYearError("No academic year found. Please create one first.");
        }
      })
      .catch(() => setYearError("Failed to load academic year."))
      .finally(() => setYearLoading(false));
  }, []);

  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [editGroup, setEditGroup]   = useState(null);
  const [viewGroup, setViewGroup]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [actionMap, setActionMap]   = useState({});

  const load = useCallback(async () => {
    if (!academicYearId) return;
    setLoading(true);
    try {
      const g = await fetchGroups(academicYearId);
      setGroups(Array.isArray(g) ? g : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [academicYearId]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    setDelLoading(true);
    try {
      await deleteGroup(confirmDel.id);
      setGroups(p => p.filter(g => g.id !== confirmDel.id));
      setConfirmDel(null);
    } catch (e) { alert(e.message); }
    finally { setDelLoading(false); }
  };

  const doAction = async (fn, id, key) => {
    setActionMap(p => ({ ...p, [key]: true }));
    try {
      const updated = await fn(id);
      setGroups(p => p.map(g => g.id === id ? { ...g, ...updated } : g));
    } catch (e) { alert(e.message); }
    finally { setActionMap(p => ({ ...p, [key]: false })); }
  };

  const filtered  = groups.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()));
  const pending   = groups.filter(g => g.isPublished && !g.isLocked).length;
  const completed = groups.filter(g => g.isLocked).length;

  if (yearLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400 gap-2.5 text-[13px]">
        <Loader2 size={18} className="animate-spin" /> Loading academic year…
      </div>
    );
  }

  if (yearError) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-red-500 text-[14px]">
        {yearError}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .ex-row:hover td { background: #f8fafc; }
      `}</style>

      <div className="p-5 min-h-screen bg-[#EDF3FA] font-['Inter',sans-serif]">

        {/* ── Header ── */}
        <div className="mb-6 fade-up">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#88BDF2] to-[#384959] flex-shrink-0" />
              <div>
                <h1 className="m-0 text-2xl font-extrabold text-slate-800 tracking-tight">Exams</h1>
                <p className="m-0 text-[12px] text-slate-400 font-medium">
                  {academicYearLabel ? `Academic Year: ${academicYearLabel}` : "Manage assessment groups & schedules"}
                </p>
              </div>
            </div>

            {activeTab === "exams" && (
              <div className="flex gap-2 items-center">
                {/* TERMS BUTTON */}
                <button
                  onClick={() => setShowTerms(v => !v)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-[13px] font-bold cursor-pointer transition-all ${
                    showTerms
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  <BookOpen size={14} />
                  Terms
                </button>

                {/* REFRESH */}
                <button
                  onClick={load}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-[13px] font-semibold hover:border-slate-400 hover:text-slate-700 transition-all"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>

                {/* ADD EXAM */}
                <button
                  onClick={() => { setEditGroup(null); setShowAdd(true); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-none bg-gradient-to-br from-[#6A89A7] to-[#384959] text-white text-[13px] font-bold cursor-pointer hover:opacity-90 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Add Exam
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-2 mb-5 flex-wrap fade-up">
          <TabBtn active={activeTab === "exams"}   icon={ClipboardList} label="Exams"   onClick={() => setActiveTab("exams")} />
          <TabBtn active={activeTab === "results"} icon={BarChart2}     label="Results" onClick={() => setActiveTab("results")} />
        </div>

        {/* ── EXAMS TAB ── */}
        {activeTab === "exams" && (
          <>
            {/* Stat Cards */}
            <div className="grid gap-3 mb-5 fade-up" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))" }}>
              <StatCard icon={BookOpen}      label="Total Exams" value={groups.length} accent="#384959" />
              <StatCard icon={ClipboardList} label="Pending"     value={pending}       accent="#3b82f6" />
              <StatCard icon={Globe}         label="Completed"   value={completed}     accent="#059669" />
            </div>

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm fade-up">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-3.5 gap-3 flex-wrap border-b border-slate-100">
                <div className="flex items-center gap-2 bg-[#EDF3FA] border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
                  <Search size={13} className="text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search exams…"
                    className="border-none outline-none bg-transparent text-[13px] text-slate-700 flex-1 placeholder:text-slate-400"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 flex">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <p className="text-[12px] font-semibold text-slate-400 m-0">
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      {["#", "Exam Name", "Student Classes", "Status", "Actions"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-widest uppercase text-slate-400 border-b border-slate-100">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-14 text-center text-slate-400 text-[13px]">
                          <Loader2 size={20} className="inline animate-spin mr-2" />
                          Loading exams…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-14 text-center">
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                              <ClipboardList size={20} className="text-slate-300" />
                            </div>
                            <p className="text-[13px] font-bold text-slate-600 m-0">No exams found</p>
                            <p className="text-[12px] text-slate-400 m-0">
                              {search ? "Try a different search term." : "Click Add Exam to create your first exam."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.map((g, i) => (
                      <TableRow
                        key={g.id} group={g} index={i}
                        actionMap={actionMap}
                        onView={() => setViewGroup(g)}
                        onEdit={() => { setEditGroup(g); setShowAdd(true); }}
                        onDelete={() => setConfirmDel(g)}
                        onPublish={() => doAction(publishGroup, g.id, `pub_${g.id}`)}
                        onLock={() => doAction(lockGroup, g.id, `lock_${g.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── RESULTS TAB ── */}
        {activeTab === "results" && (
          <ResultsTab academicYearId={academicYearId} academicYearLabel={academicYearLabel} />
        )}

        {/* ── Terms Panel (fixed overlay, above everything) ── */}
        {showTerms && (
          <TermsPanel academicYearId={academicYearId} onClose={() => setShowTerms(false)} />
        )}

        {/* Modals */}
        {showAdd && (
          <AddExamsModal
            academicYearId={academicYearId}
            academicYearLabel={academicYearLabel}
            group={editGroup}
            onClose={() => { setShowAdd(false); setEditGroup(null); }}
            onSuccess={load}
          />
        )}
        {viewGroup && (
          <ViewExamsModal
            group={viewGroup}
            onClose={() => setViewGroup(null)}
            onEdit={() => { setEditGroup(viewGroup); setViewGroup(null); setShowAdd(true); }}
          />
        )}
        {confirmDel && (
          <ConfirmDialog
            name={confirmDel.name}
            loading={delLoading}
            onConfirm={doDelete}
            onCancel={() => setConfirmDel(null)}
          />
        )}
      </div>
    </>
  );
}

function TableRow({ group, index, actionMap, onView, onEdit, onDelete, onPublish, onLock }) {
  const gradeChips = useMemo(() => {
    const schedules = group.assessmentSchedules || [];
    const gradeSet  = new Map();
    schedules.forEach(sc => {
      const grade   = sc.classSection?.grade   || "";
      const section = sc.classSection?.section || "";
      const id      = sc.classSectionId || `${grade}_${section}`;
      if (grade && !gradeSet.has(id)) gradeSet.set(id, { grade, section });
    });
    return Array.from(gradeSet.values()).sort((a, b) => (parseInt(a.grade) || 0) - (parseInt(b.grade) || 0));
  }, [group]);

  const visible = gradeChips.slice(0, 3);
  const extra   = gradeChips.length - visible.length;

  return (
    <tr className="ex-row border-b border-slate-50 last:border-0">
      <td className="px-5 py-3.5 text-[12px] text-slate-400 w-10">{index + 1}</td>

      <td className="px-5 py-3.5">
        <div className="text-[14px] font-bold text-slate-800">{group.name}</div>
        {group.term?.name && (
          <div className="text-[11px] text-slate-400 mt-0.5">{group.term.name}</div>
        )}
      </td>

      <td className="px-5 py-3.5">
        {gradeChips.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {visible.map((g, i) => (
              <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50/60 text-slate-700 border border-slate-200 whitespace-nowrap">
                Grade {g.grade}{g.section ? ` – ${g.section}` : ""}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                +{extra} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-slate-400 italic">—</span>
        )}
      </td>

      <td className="px-5 py-3.5">
        <StatusBadge group={group} />
      </td>

      <td className="px-5 py-3.5">
        <div className="flex gap-1.5 items-center">
          <ActionBtn icon={Eye}    title="View"   onClick={onView} colorClass="hover:text-[#384959] hover:border-[#88BDF2] hover:bg-blue-50" />
          <ActionBtn icon={Pencil} title="Edit"   onClick={onEdit}   colorClass="hover:text-[#384959] hover:border-slate-400 hover:bg-slate-50" />
          <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} colorClass="hover:text-red-500 hover:border-red-200 hover:bg-red-50" />
        </div>
      </td>
    </tr>
  );
}