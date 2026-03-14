// client/src/admin/pages/exams/ExamsList.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList, Plus, Search, Eye, Pencil, Trash2,
  Globe, Lock, Calculator, RefreshCw,
  BookOpen, AlertTriangle, X, Loader2,
} from "lucide-react";
import { fetchGroups, deleteGroup, publishGroup, lockGroup } from "./components/examsApi.js";
import AddExamsModal from "./components/AddExam.jsx";
import ViewExamsModal from "./components/ViewExams.jsx";
import PageLayout from "../../components/PageLayout.jsx";
import { getToken } from "../../../auth/storage.js";

const API_URL = import.meta.env.VITE_API_URL;
const font = { fontFamily: "Inter, sans-serif" };
const C = {
  dark: "#384959", mid: "#6A89A7", border: "#BDDDFC",
  bg: "#F4F9FF", card: "#ffffff", hover: "#EFF6FD",
  success: "#059669", warn: "#d97706", danger: "#dc2626",
};

/* ── Status badge ── */
function StatusBadge({ group }) {
  if (group.isLocked)    return <Pill label="Completed" color="#059669" bg="#f0fdf4" />;
  if (group.isPublished) return <Pill label="Pending"   color="#3b82f6" bg="#eff6ff" />;
  return                        <Pill label="Draft"     color="#d97706" bg="#fffbeb" />;
}
function Pill({ label, color, bg }) {
  return (
    <span style={{ ...font, fontSize: 11, fontWeight: 700, letterSpacing: ".04em", padding: "3px 10px", borderRadius: 20, background: bg, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

/* ── Confirm Delete Dialog ── */
function ConfirmDialog({ name, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(56,73,89,0.35)", backdropFilter: "blur(3px)" }}>
      <div className="flex flex-col items-center text-center rounded-2xl p-8"
        style={{ background: "#fff", width: 380, boxShadow: "0 20px 60px rgba(56,73,89,0.18)", ...font }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "#fef2f2" }}>
          <AlertTriangle size={22} color={C.danger} />
        </div>
        <h3 className="font-bold text-base mb-1" style={{ color: C.dark }}>Delete Exam?</h3>
        <p className="text-sm mb-6" style={{ color: C.mid }}>
          <strong style={{ color: C.dark }}>{name}</strong> and all its schedules &amp; marks will be permanently removed.
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#f3f8fd", color: C.mid, border: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: C.danger, color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
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
    <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
      style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent + "18" }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <p className="text-xs font-semibold mb-0.5" style={{ ...font, color: C.mid }}>{label}</p>
        <p className="text-xl font-bold" style={{ ...font, color: C.dark }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Action Icon Button ── */
function ActionBtn({ icon: Icon, title, color = C.mid, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        border: `1.5px solid ${hov ? color : C.border}`,
        background: hov ? color + "12" : "transparent",
        color: hov ? color : C.mid,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s", opacity: disabled ? 0.5 : 1,
      }}>
      <Icon size={13} />
    </button>
  );
}

/* ── Main Component ── */
export default function ExamsList() {
  // ── Academic Year (fetched internally) ──
  const [academicYearId, setAcademicYearId]       = useState(null);
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [yearLoading, setYearLoading]             = useState(true);
  const [yearError, setYearError]                 = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/academic-years`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        const years = Array.isArray(data) ? data : (data.academicYears || []);
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

  // ── Exam Groups ──
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

  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  const pending   = groups.filter(g => g.isPublished && !g.isLocked).length;
  const completed = groups.filter(g => g.isLocked).length;
  const drafts    = groups.filter(g => !g.isPublished && !g.isLocked).length;

  // ── Academic year loading/error states ──
  if (yearLoading) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", ...font, color: C.mid, gap: 10 }}>
          <Loader2 size={18} className="animate-spin" /> Loading academic year…
        </div>
      </PageLayout>
    );
  }

  if (yearError) {
    return (
      <PageLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", ...font, color: C.danger, fontSize: 14 }}>
          {yearError}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen p-7" style={{ background: C.bg, ...font }}>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.mid})` }}>
              <ClipboardList size={18} color="#fff" />
            </div>
            <div>
              <h1 className="text-xl font-bold m-0" style={{ color: C.dark }}>Exams</h1>
              <p className="text-xs mt-0.5 m-0" style={{ color: C.mid }}>
                {academicYearLabel ? `Academic Year: ${academicYearLabel}` : "Manage assessment groups & schedules"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: C.card, border: `1.5px solid ${C.border}`, color: C.mid, cursor: "pointer" }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => { setEditGroup(null); setShowAdd(true); }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: C.dark, color: "#fff", border: "none", cursor: "pointer" }}>
              <Plus size={14} /> Add Exam
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))" }}>
          <StatCard icon={BookOpen}      label="Total Exams" value={groups.length} accent={C.dark} />
          <StatCard icon={ClipboardList} label="Pending"     value={pending}       accent="#3b82f6" />
          <StatCard icon={Globe}         label="Completed"   value={completed}     accent={C.success} />
        </div>

        {/* Table card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1.5px solid ${C.border}` }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap"
            style={{ borderBottom: `1.5px solid ${C.border}` }}>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1"
              style={{ background: C.bg, border: `1.5px solid ${C.border}`, maxWidth: 320 }}>
              <Search size={13} color={C.mid} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search exams…"
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: C.dark, flex: 1, ...font }} />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.mid, display: "flex" }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <p className="text-xs font-semibold" style={{ color: C.mid }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fbff" }}>
                  {["#", "Exam Name", "Student Classes", "Status", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
                      textTransform: "uppercase", color: C.mid,
                      borderBottom: `1.5px solid ${C.border}`, ...font,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "52px 16px", textAlign: "center", color: C.mid, ...font }}>
                      <Loader2 size={20} className="animate-spin" style={{ display: "inline" }} />
                      <span className="ml-2 text-sm">Loading exams…</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "52px 16px", textAlign: "center", ...font }}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.bg }}>
                          <ClipboardList size={20} color={C.mid} />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: C.dark }}>No exams found</p>
                        <p className="text-xs" style={{ color: C.mid }}>
                          {search ? "Try a different search term." : "Click Add Exam to create your first exam."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((g, i) => (
                  <TableRow key={g.id} group={g} index={i}
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
    </PageLayout>
  );
}

function TableRow({ group, index, actionMap, onView, onEdit, onDelete, onPublish, onLock }) {
  const [hov, setHov] = useState(false);

  // ✅ Read from assessmentSchedules (attached by getGroups backend)
  const gradeChips = useMemo(() => {
    const schedules = group.assessmentSchedules || [];
    const gradeSet = new Map();
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
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderBottom: `1px solid ${C.border}`, background: hov ? C.hover : "transparent", transition: "background .12s" }}>

      {/* # */}
      <td style={{ padding: "13px 16px", fontSize: 12, color: C.mid,  fontFamily: "'Inter', sans-serif", width: 40 }}>{index + 1}</td>

      {/* Exam Name */}
      <td style={{ padding: "13px 16px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{group.name}</div>
        {group.term?.name && (
          <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>{group.term.name}</div>
        )}
      </td>

      {/* Student Classes */}
      <td style={{ padding: "13px 16px", fontFamily: "Inter, sans-serif" }}>
        {gradeChips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {visible.map((g, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
                background: "#EFF6FD", color: C.dark, border: `1px solid ${C.border}`,
                 fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
              }}>
                Grade {g.grade}{g.section ? ` – ${g.section}` : ""}
              </span>
            ))}
            {extra > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "#f1f5f9", color: C.mid, fontFamily: "Inter, sans-serif" }}>
                +{extra} more
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: C.mid, fontStyle: "italic" }}>—</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: "13px 16px" }}>
        <StatusBadge group={group} />
      </td>

      {/* Actions */}
      <td style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <ActionBtn icon={Eye}    title="View"   onClick={onView} />
          <ActionBtn icon={Pencil} title="Edit"   onClick={onEdit}   color={C.dark} />
          <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} color={C.danger} />
        </div>
      </td>
    </tr>
  );
}