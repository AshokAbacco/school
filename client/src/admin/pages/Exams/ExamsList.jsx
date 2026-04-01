// client/src/admin/pages/exams/ExamsList.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ClipboardList, Plus, Search, Eye, Pencil, Trash2,
  Globe, Lock, Calculator, RefreshCw,
  BookOpen, AlertTriangle, X, Loader2, BarChart2,
  AlertCircle,
} from "lucide-react";
import { fetchGroups, deleteGroup, publishGroup, lockGroup } from "./components/examsApi.js";
import AddExamsModal from "./components/AddExam.jsx";
import ViewExamsModal from "./components/ViewExams.jsx";
import ResultsTab from "./components/ResultsTab.jsx";
import { getToken } from "../../../auth/storage.js";

const API_URL = import.meta.env.VITE_API_URL;

/* ── Design tokens (matches OnlineClassesPage) ── */
const C = {
  slate: "#6A89A7",
  mist: "#BDDDFC",
  sky: "#88BDF2",
  deep: "#384959",
  deepDark: "#243340",
  bg: "#EDF3FA",
  white: "#FFFFFF",
  border: "#C8DCF0",
  borderLight: "#DDE9F5",
  text: "#243340",
  textLight: "#6A89A7",
  success: "#059669",
  danger: "#dc2626",
  warn: "#d97706",
};
const F = { fontFamily: "'Inter', sans-serif" };

/* ── Skeleton pulse ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55`, animation: "pulse 1.5s ease-in-out infinite" }} />
  );
}

/* ── Status badge ── */
function StatusBadge({ group }) {
  if (group.isLocked)    return <Pill label="Completed" color={C.success} bg="#f0fdf4" />;
  if (group.isPublished) return <Pill label="Pending"   color="#3b82f6"   bg="#eff6ff" />;
  return                        <Pill label="Draft"     color={C.warn}    bg="#fffbeb" />;
}
function Pill({ label, color, bg }) {
  return (
    <span style={{ ...F, fontSize: 10, fontWeight: 700, letterSpacing: ".04em", padding: "3px 10px", borderRadius: 99, background: bg, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

/* ── Confirm Delete Dialog ── */
function ConfirmDialog({ name, onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.22)", width: 380, padding: "28px 28px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", ...F }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <AlertTriangle size={22} color={C.danger} />
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: C.text }}>Delete Exam?</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: C.textLight, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>{name}</strong> and all its schedules &amp; marks will be permanently removed.
        </p>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer", ...F }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: C.danger, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: loading ? 0.7 : 1, ...F }}>
            {loading ? <Loader2 size={14} style={{ animation: "spin .8s linear infinite" }} /> : <Trash2 size={14} />}
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
    <div style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <p style={{ ...F, fontSize: 11, fontWeight: 600, color: C.textLight, margin: 0 }}>{label}</p>
        <p style={{ ...F, fontSize: 22, fontWeight: 800, color: C.text, margin: "2px 0 0" }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Action Icon Button ── */
function ActionBtn({ icon: Icon, title, color = C.textLight, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        border: `1.5px solid ${hov ? color : C.border}`,
        background: hov ? color + "12" : "transparent",
        color: hov ? color : C.textLight,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s", opacity: disabled ? 0.5 : 1,
      }}>
      <Icon size={13} />
    </button>
  );
}

/* ── Tab Button ── */
function TabBtn({ active, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...F, display: "flex", alignItems: "center", gap: 7,
      padding: "7px 18px", borderRadius: 99,
      fontSize: 12, fontWeight: 700, cursor: "pointer",
      border: `1.5px solid ${active ? C.deep : C.border}`,
      background: active ? C.deep : C.white,
      color: active ? "#fff" : C.textLight,
      transition: "all .15s",
    }}>
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ── Main Component ── */
export default function ExamsList() {
  const [academicYearId, setAcademicYearId]       = useState(null);
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [yearLoading, setYearLoading]             = useState(true);
  const [yearError, setYearError]                 = useState("");
  const [activeTab, setActiveTab]                 = useState("exams");

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", ...F, color: C.textLight, gap: 10 }}>
        <Loader2 size={18} style={{ animation: "spin .8s linear infinite" }} /> Loading academic year…
      </div>
    );
  }

  if (yearError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", ...F, color: C.danger, fontSize: 14 }}>
        {yearError}
      </div>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { to { transform:rotate(360deg) } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .ex-row:hover { background: #EDF3FA !important; }
        .ex-row { transition: background .12s; }
      `}</style>

      <div style={{ padding: "clamp(16px,3vw,28px) clamp(16px,3vw,32px)", minHeight: "100vh", background: C.bg, ...F }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(18px,5vw,26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                  Exams
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                  {academicYearLabel ? `Academic Year: ${academicYearLabel}` : "Manage assessment groups & schedules"}
                </p>
              </div>
            </div>
            {activeTab === "exams" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer", ...F }}>
                  <RefreshCw size={13} /> Refresh
                </button>
                <button onClick={() => { setEditGroup(null); setShowAdd(true); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", ...F }}>
                  <Plus size={15} /> Add Exam
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }} className="fade-up">
          <TabBtn active={activeTab === "exams"}   icon={ClipboardList} label="Exams"   onClick={() => setActiveTab("exams")} />
          <TabBtn active={activeTab === "results"} icon={BarChart2}     label="Results" onClick={() => setActiveTab("results")} />
        </div>

        {/* ── EXAMS TAB ── */}
        {activeTab === "exams" && (
          <>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 22 }} className="fade-up">
              <StatCard icon={BookOpen}      label="Total Exams" value={groups.length} accent={C.deep} />
              <StatCard icon={ClipboardList} label="Pending"     value={pending}       accent="#3b82f6" />
              <StatCard icon={Globe}         label="Completed"   value={completed}     accent={C.success} />
            </div>

            {/* Table card */}
            <div style={{ background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(56,73,89,0.06)" }} className="fade-up">
              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", gap: 12, flexWrap: "wrap", borderBottom: `1.5px solid ${C.borderLight}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "8px 14px", flex: 1, maxWidth: 320 }}>
                  <Search size={13} color={C.textLight} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exams…"
                    style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: C.text, flex: 1, ...F }} />
                  {search && (
                    <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.textLight, display: "flex" }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <p style={{ ...F, fontSize: 12, fontWeight: 600, color: C.textLight, margin: 0 }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fbff" }}>
                      {["#", "Exam Name", "Student Classes", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.textLight, borderBottom: `1.5px solid ${C.borderLight}`, ...F }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "52px 18px", textAlign: "center", color: C.textLight, ...F }}>
                          <Loader2 size={20} style={{ display: "inline", animation: "spin .8s linear infinite" }} />
                          <span style={{ marginLeft: 8, fontSize: 13 }}>Loading exams…</span>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "52px 18px", textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <ClipboardList size={20} color={C.textLight} />
                            </div>
                            <p style={{ ...F, fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>No exams found</p>
                            <p style={{ ...F, fontSize: 12, color: C.textLight, margin: 0 }}>
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
          </>
        )}

        {/* ── RESULTS TAB ── */}
        {activeTab === "results" && (
          <ResultsTab
            academicYearId={academicYearId}
            academicYearLabel={academicYearLabel}
          />
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
  const [hov, setHov] = useState(false);

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
    <tr className="ex-row" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderBottom: `1px solid ${C.borderLight}` }}>

      <td style={{ padding: "14px 18px", fontSize: 12, color: C.textLight, ...F, width: 40 }}>{index + 1}</td>

      <td style={{ padding: "14px 18px", ...F }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{group.name}</div>
        {group.term?.name && (
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{group.term.name}</div>
        )}
      </td>

      <td style={{ padding: "14px 18px", ...F }}>
        {gradeChips.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {visible.map((g, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${C.mist}55`, color: C.deep, border: `1px solid ${C.border}`, ...F, whiteSpace: "nowrap" }}>
                Grade {g.grade}{g.section ? ` – ${g.section}` : ""}
              </span>
            ))}
            {extra > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: C.bg, color: C.textLight, ...F }}>
                +{extra} more
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: C.textLight, fontStyle: "italic" }}>—</span>
        )}
      </td>

      <td style={{ padding: "14px 18px" }}>
        <StatusBadge group={group} />
      </td>

      <td style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <ActionBtn icon={Eye}    title="View"   onClick={onView} />
          <ActionBtn icon={Pencil} title="Edit"   onClick={onEdit}   color={C.deep} />
          <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} color={C.danger} />
        </div>
      </td>
    </tr>
  );
}