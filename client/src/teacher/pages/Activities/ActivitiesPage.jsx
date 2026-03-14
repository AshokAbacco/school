// client/src/teacher/pages/Activities/ActivitiesPage.jsx
// Redesigned to match Gallery.jsx design system

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, Users, Star, Plus, Trash2, Edit2, X,
  Loader2, CheckCircle, AlertCircle, Search,
  ArrowLeft, Swords, Music, BookOpen,
  ChevronRight, Dumbbell, Brain, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

/* ── Design tokens (Gallery-identical) ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const API = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/teacher/activities`;

const TEAM_COLORS = ["#88BDF2","#a855f7","#f59e0b","#22c55e","#ef4444","#ec4899","#6366f1","#14b8a6"];

const EVENT_TYPE_META = {
  COMPETITION:   { label:"Competition",   color:"#f59e0b", Icon:Swords   },
  CULTURAL:      { label:"Cultural",      color:"#a855f7", Icon:Music    },
  PARTICIPATION: { label:"Participation", color:"#22c55e", Icon:Star     },
  CEREMONY:      { label:"Ceremony",      color:"#88BDF2", Icon:Trophy   },
};

const CATEGORY_META = {
  SPORTS:   { label:"Sports",   color:"#f59e0b", Icon:Dumbbell },
  CULTURAL: { label:"Cultural", color:"#a855f7", Icon:Music    },
  ACADEMIC: { label:"Academic", color:"#22c55e", Icon:Brain    },
  OTHER:    { label:"Other",    color:"#6A89A7", Icon:Star     },
};

const RESULT_RANKS = [
  { value:"WINNER",      label:"Winner",      color:"#f59e0b", icon:"🥇" },
  { value:"RUNNER_UP",   label:"Runner Up",   color:"#94a3b8", icon:"🥈" },
  { value:"THIRD_PLACE", label:"Third Place", color:"#b45309", icon:"🥉" },
];

const apiFetch = async (url, opts = {}) => {
  const res  = await fetch(url, { headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` }, ...opts });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};

/* ── Skeleton pulse (Gallery-style) ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

/* ── Toast ── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = (msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  };
  return { toasts, push };
}
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:50, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"10px 16px", borderRadius:12, fontSize:13, fontWeight:600,
          boxShadow:"0 4px 20px rgba(56,73,89,0.18)",
          background: t.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1.5px solid ${t.type === "success" ? "#86efac" : "#fca5a5"}`,
          color: t.type === "success" ? "#166534" : "#991b1b",
        }}>
          {t.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>} {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ── Modal (Gallery-style) ── */
function Modal({ title, subtitle, icon: Icon, onClose, children, wide }) {
  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:40, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.40)", backdropFilter:"blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{ background:C.white, borderRadius:20, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 20px 60px rgba(56,73,89,0.18)", width:"100%", maxWidth: wide ? 680 : 480, maxHeight:"90vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ padding:"18px 22px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:C.white, zIndex:10, borderRadius:"20px 20px 0 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {Icon && (
              <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={15} color={C.sky}/>
              </div>
            )}
            <div>
              <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>{title}</p>
              {subtitle && <p style={{ margin:0, fontSize:11, color:C.textLight }}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.borderLight}`, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textLight }}
          >
            <X size={14}/>
          </button>
        </div>
        <div style={{ padding:"20px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Form atoms ── */
const Label = ({ children }) => (
  <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.textLight, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.04em" }}>
    {children}
  </label>
);
const Input = (p) => (
  <input
    style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:11, padding:"10px 14px", fontSize:13, color:C.text, background:C.bg, outline:"none", boxSizing:"border-box" }}
    onFocus={e => (e.target.style.borderColor = C.sky)}
    onBlur={e  => (e.target.style.borderColor = C.border)}
    {...p}
  />
);
const Textarea = (p) => (
  <textarea
    rows={3}
    style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:11, padding:"10px 14px", fontSize:13, color:C.text, background:C.bg, outline:"none", resize:"none", boxSizing:"border-box", fontFamily:"inherit" }}
    onFocus={e => (e.target.style.borderColor = C.sky)}
    onBlur={e  => (e.target.style.borderColor = C.border)}
    {...p}
  />
);

function PrimaryBtn({ children, onClick, loading, disabled, small }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        display:"flex", alignItems:"center", gap:7,
        padding: small ? "7px 14px" : "9px 20px",
        borderRadius:10, border:"none",
        background:`linear-gradient(135deg, ${C.slate}, ${C.deep})`,
        color:"#fff", fontSize: small ? 12 : 13, fontWeight:700,
        cursor: (loading || disabled) ? "not-allowed" : "pointer",
        opacity: (loading || disabled) ? 0.65 : 1,
        flexShrink:0,
      }}
      onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.opacity = "0.88"; }}
      onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.opacity = "1"; }}
    >
      {loading ? <Loader2 size={12} className="animate-spin"/> : children}
    </button>
  );
}
function OutlineBtn({ children, onClick, small, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding: small ? "7px 14px" : "9px 18px",
        borderRadius:10,
        border: danger ? "1.5px solid #fecaca" : `1.5px solid ${C.borderLight}`,
        background: danger ? "#fef2f2" : C.white,
        color: danger ? "#991b1b" : C.text,
        fontSize: small ? 12 : 13, fontWeight:600,
        cursor:"pointer",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? "#fee2e2" : C.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = danger ? "#fef2f2" : C.white)}
    >
      {children}
    </button>
  );
}

/* ── Student Picker ── */
function StudentPicker({ students, selected, onToggle, infoText }) {
  const [q, setQ] = useState("");
  const list = students.filter(s => s?.name?.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div style={{ position:"relative", marginBottom:8 }}>
        <Search size={13} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.textLight }}/>
        <input
          style={{ width:"100%", paddingLeft:34, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" }}
          placeholder="Search student…"
          value={q} onChange={e => setQ(e.target.value)}
          onFocus={e => (e.target.style.borderColor = C.sky)}
          onBlur={e  => (e.target.style.borderColor = C.border)}
        />
      </div>
      {infoText && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 14px", borderRadius:10, background:`${C.sky}12`, border:`1px solid ${C.borderLight}`, marginBottom:8 }}>
          <Users size={13} color={C.sky} style={{ marginTop:1, flexShrink:0 }}/>
          <p style={{ margin:0, fontSize:12, color:C.textLight }}>{infoText}</p>
        </div>
      )}
      <div style={{ borderRadius:10, overflow:"hidden", maxHeight:220, overflowY:"auto", border:`1.5px solid ${C.borderLight}` }}>
        {list.length === 0
          ? <p style={{ textAlign:"center", padding:"24px 0", fontSize:12, color:C.textLight }}>No students found</p>
          : list.map(s => {
              const sel = selected.includes(s.id);
              return (
                <div
                  key={s.id} onClick={() => onToggle(s.id)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.bg}`, background: sel ? `${C.sky}12` : C.white, transition:"background 0.15s" }}
                >
                  <div style={{ width:20, height:20, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: sel ? C.deep : C.mist, transition:"background 0.15s" }}>
                    {sel && <CheckCircle size={12} color={C.white}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</p>
                    {s.classSection && <p style={{ margin:0, fontSize:11, color:C.textLight }}>{s.classSection.name}</p>}
                  </div>
                </div>
              );
            })}
      </div>
      <p style={{ fontSize:11, color:C.textLight, marginTop:6 }}>{selected.length} selected</p>
    </div>
  );
}

/* ══ INLINE TEAM MANAGER ══ */
function InlineTeamManager({ event, enrolledStudents, pushToast, onRefresh }) {
  const [teams,      setTeams]      = useState([]);
  const [meta,       setMeta]       = useState({ maxTeamsPerClass: null });
  const [loading,    setLoading]    = useState(true);
  const [mode,       setMode]       = useState("list");
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState({ name:"", studentIds:[] });
  const [saving,     setSaving]     = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API}/events/${event.id}/teams`);
      setTeams(r.data);
      if (r.meta) setMeta(r.meta);
    } catch(e) { pushToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [event.id]);

  useEffect(() => { load(); setMode("list"); }, [load]);

  const maxTeams         = meta.maxTeamsPerClass ?? null;
  const assignedIds      = teams.flatMap(t => t.members.map(m => m.student.id));
  const editingMemberIds = editing ? (teams.find(t => t.id === editing.id)?.members.map(m => m.student.id) ?? []) : [];
  const available        = enrolledStudents.filter(s => s && (!assignedIds.includes(s.id) || editingMemberIds.includes(s.id)));
  const unassigned       = enrolledStudents.filter(s => s && !assignedIds.includes(s.id)).length;

  const openCreate = () => { setEditing(null); setForm({ name:"", studentIds:[] }); setMode("create"); };
  const openEdit   = t  => { setEditing(t); setForm({ name:t.name, studentIds:t.members.map(m => m.student.id) }); setMode("edit"); };

  const setResult = async (teamId, result) => {
    try {
      await apiFetch(`${API}/events/${event.id}/teams/${teamId}/result`, { method:"PUT", body:JSON.stringify({ result }) });
      pushToast(result ? `Marked as ${result.replace(/_/g," ")}!` : "Result cleared");
      load();
    } catch(e) { pushToast(e.message, "error"); }
  };

  const markRemainingParticipated = async () => {
    const unresolved = teams.filter(t => !getTeamResult(t));
    if (unresolved.length === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        unresolved.map(t =>
          apiFetch(`${API}/events/${event.id}/teams/${t.id}/result`, {
            method: "PUT",
            body: JSON.stringify({ result: "PARTICIPATED" }),
          })
        )
      );
      pushToast(`${unresolved.length} team${unresolved.length !== 1 ? "s" : ""} marked as Participated!`, "success");
      load();
    } catch(e) { pushToast(e.message, "error"); }
    finally { setBulkSaving(false); }
  };

  const getTeamResult = (team) => team.results?.[0]?.resultType ?? null;

  const save = async () => {
    if (!form.name.trim()) return pushToast("Team name required", "error");
    setSaving(true);
    try {
      mode === "create"
        ? await apiFetch(`${API}/events/${event.id}/teams`, { method:"POST", body:JSON.stringify({ name:form.name, studentIds:form.studentIds }) })
        : await apiFetch(`${API}/events/${event.id}/teams/${editing.id}`, { method:"PUT", body:JSON.stringify({ name:form.name, studentIds:form.studentIds }) });
      pushToast(mode === "create" ? "Team created!" : "Team updated!");
      await load(); onRefresh(); setMode("list");
    } catch(e) { pushToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this team?")) return;
    try { await apiFetch(`${API}/events/${event.id}/teams/${id}`, { method:"DELETE" }); pushToast("Team deleted"); load(); onRefresh(); }
    catch(e) { pushToast(e.message, "error"); }
  };

  return (
    <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)" }}>
      {/* Header */}
      <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Users size={15} color={C.sky}/>
          </div>
          <div>
            {mode === "list" ? (
              <>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>
                  Teams — {event.name}
                </p>
                <p style={{ margin:0, fontSize:11, color:C.textLight }}>
                  {teams.length} team{teams.length !== 1 ? "s" : ""} · {unassigned} unassigned
                  {maxTeams && <span style={{ color:"#f59e0b" }}> · max {maxTeams}/class</span>}
                </p>
              </>
            ) : (
              <button
                onClick={() => setMode("list")}
                style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:C.textLight, cursor:"pointer", background:"none", border:"none", padding:0 }}
              >
                <ArrowLeft size={14}/> {mode === "create" ? "New Team" : "Edit Team"}
              </button>
            )}
          </div>
        </div>
        {mode === "list" && (
          <PrimaryBtn small onClick={openCreate} disabled={enrolledStudents.length === 0}>
            <Plus size={12}/> New Team
          </PrimaryBtn>
        )}
      </div>

      <div style={{ padding:18 }}>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
            <Loader2 size={24} color={C.sky} className="animate-spin"/>
          </div>
        ) : mode === "list" ? (
          <>
            {/* Alerts */}
            {enrolledStudents.length === 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, background:"#fff7ed", border:"1.5px solid #fed7aa", marginBottom:12 }}>
                <AlertCircle size={13} color="#f97316"/>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#9a3412" }}>No students enrolled in this activity yet.</p>
              </div>
            )}
            {enrolledStudents.length > 0 && unassigned > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, background:"#fffbeb", border:"1.5px solid #fde68a", marginBottom:12 }}>
                <AlertCircle size={13} color="#f59e0b"/>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>
                  {unassigned} student{unassigned !== 1 ? "s" : ""} not yet assigned to a team
                </p>
              </div>
            )}

            {teams.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ width:50, height:50, borderRadius:16, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                  <Users size={22} color={C.sky} strokeWidth={1.5}/>
                </div>
                <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>No teams yet</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:C.textLight }}>Click New Team to start organising</p>
              </div>
            ) : (() => {
              const anyRanked     = teams.some(t => getTeamResult(t) && getTeamResult(t) !== "PARTICIPATED");
              const unresolvedCnt = teams.filter(t => !getTeamResult(t)).length;
              const allDone       = unresolvedCnt === 0;

              return (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {teams.map((team, ti) => {
                    const currentResult = getTeamResult(team);
                    const isParticipated = currentResult === "PARTICIPATED";
                    const isRanked       = currentResult && !isParticipated;

                    return (
                      <div key={team.id} style={{ borderRadius:14, padding:14, border:`1.5px solid ${isRanked ? "#fde68a" : isParticipated ? `${C.sky}55` : C.borderLight}`, background: isRanked ? "#fffbeb" : isParticipated ? `${C.sky}08` : `${C.bg}88`, transition:"all 0.2s" }}>
                        {/* Team header */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:10, height:10, borderRadius:"50%", background:TEAM_COLORS[ti % TEAM_COLORS.length] }}/>
                            <p style={{ margin:0, fontWeight:700, fontSize:13, color:C.text }}>{team.name}</p>
                            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:C.mist, color:C.textLight, fontWeight:600 }}>{team.members.length} members</span>
                            {/* Result badge */}
                            {isParticipated && (
                              <span style={{ fontSize:11, padding:"2px 9px", borderRadius:20, background:`${C.sky}20`, color:C.sky, fontWeight:700, border:`1px solid ${C.sky}44` }}>
                                🎖️ Participated
                              </span>
                            )}
                            {isRanked && (() => {
                              const r = RESULT_RANKS.find(x => x.value === currentResult);
                              return r ? (
                                <span style={{ fontSize:11, padding:"2px 9px", borderRadius:20, background: r.color + "22", color:r.color, fontWeight:700, border:`1px solid ${r.color}55` }}>
                                  {r.icon} {r.label}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <OutlineBtn small onClick={() => openEdit(team)}><Edit2 size={11}/> Edit</OutlineBtn>
                            <OutlineBtn small danger onClick={() => del(team.id)}><Trash2 size={11}/></OutlineBtn>
                          </div>
                        </div>

                        {/* Member chips */}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                          {team.members.map(m => (
                            <span key={m.student.id} style={{ fontSize:12, padding:"4px 10px", borderRadius:8, background:TEAM_COLORS[ti % TEAM_COLORS.length] + "22", color:C.text, fontWeight:500 }}>
                              {m.student.name}
                            </span>
                          ))}
                          {team.members.length === 0 && <span style={{ fontSize:12, fontStyle:"italic", color:C.textLight }}>No members yet</span>}
                        </div>

                        {/* Result controls */}
                        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, paddingTop:10, borderTop:`1px solid ${C.borderLight}` }}>
                          <p style={{ fontSize:11, fontWeight:700, color:C.textLight, margin:"0 4px 0 0" }}>Quick Result:</p>

                          {/* Top 3 rank buttons — always shown */}
                          {RESULT_RANKS.map(r => {
                            const active = currentResult === r.value;
                            return (
                              <button key={r.value}
                                onClick={() => setResult(team.id, active ? null : r.value)}
                                style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, padding:"5px 12px", borderRadius:20, cursor:"pointer", border:`1.5px solid ${r.color}`, background: active ? r.color : r.color + "18", color: active ? "#fff" : r.color, transition:"all 0.15s" }}>
                                {r.icon} {r.label} {active && "✓"}
                              </button>
                            );
                          })}

                          {/* Participated button — individual toggle */}
                          <button
                            onClick={() => setResult(team.id, isParticipated ? null : "PARTICIPATED")}
                            style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, padding:"5px 12px", borderRadius:20, cursor:"pointer", border:`1.5px solid ${C.sky}`, background: isParticipated ? C.sky : `${C.sky}18`, color: isParticipated ? "#fff" : C.sky, transition:"all 0.15s" }}>
                            🎖️ Participated {isParticipated && "✓"}
                          </button>

                          {/* Clear — only if a result is set */}
                          {currentResult && (
                            <button onClick={() => setResult(team.id, null)}
                              style={{ fontSize:12, fontWeight:600, padding:"5px 12px", borderRadius:20, cursor:"pointer", background:"#fef2f2", color:"#991b1b", border:"1.5px solid #fecaca" }}>
                              ✕ Clear
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* ── Bulk "Mark remaining as Participated" ── */}
                  {anyRanked && !allDone && (
                    <div style={{ borderRadius:14, padding:"14px 16px", border:`1.5px dashed ${C.sky}`, background:`${C.sky}08`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:C.text }}>
                          {unresolvedCnt} team{unresolvedCnt !== 1 ? "s" : ""} without a result
                        </p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:C.textLight }}>
                          Mark them all as Participated in one click
                        </p>
                      </div>
                      <button
                        onClick={markRemainingParticipated}
                        disabled={bulkSaving}
                        style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:700, padding:"9px 18px", borderRadius:10, cursor: bulkSaving ? "not-allowed" : "pointer", border:`1.5px solid ${C.sky}`, background: C.sky, color:"#fff", opacity: bulkSaving ? 0.65 : 1, transition:"opacity 0.15s", whiteSpace:"nowrap" }}>
                        {bulkSaving
                          ? <><Loader2 size={13} className="animate-spin"/> Saving…</>
                          : <>🎖️ Mark {unresolvedCnt} as Participated</>
                        }
                      </button>
                    </div>
                  )}

                  {/* All done banner */}
                  {allDone && teams.length > 0 && (
                    <div style={{ borderRadius:14, padding:"12px 16px", border:`1.5px solid #bbf7d0`, background:"#f0fdf4", display:"flex", alignItems:"center", gap:10 }}>
                      <CheckCircle size={16} color="#16a34a"/>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#166534" }}>All {teams.length} teams have results recorded.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <Label>Team Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} placeholder="e.g. Team Alpha"/>
            </div>
            <div>
              <Label>Select Students</Label>
              <StudentPicker
                students={available}
                selected={form.studentIds}
                onToggle={id => setForm(p => ({ ...p, studentIds: p.studentIds.includes(id) ? p.studentIds.filter(x => x !== id) : [...p.studentIds, id] }))}
                infoText={`Only enrolled students. ${available.length} available.`}
              />
            </div>
            <div style={{ display:"flex", gap:10, paddingTop:4, borderTop:`1.5px solid ${C.borderLight}` }}>
              <PrimaryBtn onClick={save} loading={saving}>
                <CheckCircle size={13}/> {mode === "create" ? "Create Team" : "Save Changes"}
              </PrimaryBtn>
              <OutlineBtn onClick={() => setMode("list")}>Cancel</OutlineBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ TEAMS TAB ══ */
function TeamsTab({ activity, events: initialEvents, enrolledStudents, selEvent, setSelEvent, pushToast, onRefresh }) {
  const [events,       setEvents]       = useState(initialEvents);
  const [initializing, setInitializing] = useState(false);
  const [initialized,  setInitialized]  = useState(initialEvents.length > 0);

  useEffect(() => {
    if (initialized) return;
    const init = async () => {
      setInitializing(true);
      try {
        const res = await apiFetch(`${API}/${activity.id}/ensure-event`, { method:"POST" });
        const ev  = res.data;
        setEvents([ev]);
        setSelEvent(ev);
        if (res.created) pushToast("Default event created for team management", "success");
      } catch(e) { pushToast(e.message, "error"); }
      finally { setInitializing(false); setInitialized(true); }
    };
    init();
  }, []);

  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents);
      if (!selEvent) setSelEvent(initialEvents[0]);
      setInitialized(true);
    }
  }, [initialEvents]);

  if (initializing) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12 }}>
      <Loader2 size={28} color={C.sky} className="animate-spin"/>
      <p style={{ fontSize:13, fontWeight:500, color:C.textLight }}>Setting up team management…</p>
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:20 }} className="lg-grid-3">
      <style>{`@media(min-width:1024px){.lg-grid-3{grid-template-columns:1fr 2fr !important;}}`}</style>

      {/* Event list sidebar */}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:10 }}>Event / Session</p>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 14px", borderRadius:10, background:`${C.sky}10`, border:`1px solid ${C.borderLight}`, marginBottom:12 }}>
          <AlertCircle size={13} color={C.sky} style={{ marginTop:1, flexShrink:0 }}/>
          <p style={{ margin:0, fontSize:12, color:C.textLight }}>
            Teams are organised per event. A <strong style={{ color:C.text }}>General</strong> event is auto-created for everyday practice teams.
          </p>
        </div>
        {events.map(ev => {
          const et     = EVENT_TYPE_META[ev.eventType] ?? EVENT_TYPE_META.PARTICIPATION;
          const active = selEvent?.id === ev.id;
          return (
            <div key={ev.id} onClick={() => setSelEvent(ev)}
              style={{ borderRadius:14, padding:14, marginBottom:8, cursor:"pointer", transition:"all 0.18s", background: active ? C.deep : C.white, border:`1.5px solid ${active ? C.deep : C.borderLight}`, boxShadow: active ? "0 4px 12px rgba(56,73,89,0.15)" : "none" }}>
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:6, display:"inline-block", marginBottom:6, background: active ? "rgba(255,255,255,0.15)" : et.color + "18", color: active ? C.mist : et.color }}>
                {et.label}
              </span>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color: active ? C.white : C.text }}>{ev.name}</p>
              {ev.eventDate && (
                <p style={{ margin:"3px 0 0", fontSize:11, color: active ? C.mist : C.textLight }}>
                  {new Date(ev.eventDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                </p>
              )}
              <p style={{ margin:"6px 0 0", fontSize:11, fontWeight:600, color: active ? C.mist : C.textLight }}>
                {ev._count?.teams ?? 0} team{ev._count?.teams !== 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Team manager */}
      <div>
        {selEvent ? (
          <InlineTeamManager event={selEvent} enrolledStudents={enrolledStudents} pushToast={pushToast} onRefresh={onRefresh}/>
        ) : (
          <div style={{ borderRadius:20, padding:40, textAlign:"center", background:C.white, border:`1.5px dashed ${C.borderLight}` }}>
            <div style={{ width:50, height:50, borderRadius:16, background:`${C.sky}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <Users size={22} color={C.sky} strokeWidth={1.5}/>
            </div>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.textLight }}>Select an event to manage teams</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ ACTIVITY DETAIL VIEW ══ */
function ActivityDetailView({ activity, onBack, pushToast }) {
  const [subTab,   setSubTab]   = useState(activity.participationType === "TEAM" ? "teams" : "students");
  const [enrolled, setEnrolled] = useState([]);
  const [events,   setEvents]   = useState([]);
  const [selEvent, setSelEvent] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const isTeam = activity.participationType === "TEAM";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enr, evts] = await Promise.all([
        apiFetch(`${API}/${activity.id}/enrollments`),
        apiFetch(`${API}/events?activityId=${activity.id}`),
      ]);
      setEnrolled(enr.data);
      setEvents(evts.data);
      if (evts.data.length > 0 && !selEvent) setSelEvent(evts.data[0]);
    } catch(e) { pushToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [activity.id]);

  useEffect(() => { load(); }, [load]);

  const enrolledStudents = enrolled.map(e => e.student).filter(Boolean);
  const catMeta = CATEGORY_META[activity.category] ?? CATEGORY_META.OTHER;

  const tabs = [
    { key:"students", label:"Enrolled Students", count:enrolled.length },
    ...(isTeam ? [{ key:"teams", label:"Teams by Event", count:events.length }] : []),
  ];

  return (
    <div>
      {/* Back link — matches image 2 screenshot text style */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:C.textLight, cursor:"pointer", background:"none", border:"none", padding:0, marginBottom:16 }}>
        <ArrowLeft size={15}/> Back to Activities
      </button>

      {/* Activity info card — light, matches images 1 & 3 style */}
      <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)", marginBottom:20 }}>
        {/* Card header strip */}
        <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`${catMeta.color}18`, border:`1.5px solid ${catMeta.color}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <catMeta.Icon size={15} color={catMeta.color}/>
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:C.text }}>{activity.name}</p>
                <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:`${catMeta.color}18`, color:catMeta.color }}>{catMeta.label}</span>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background: isTeam ? "#dbeafe" : "#f0fdf4", color: isTeam ? "#1d4ed8" : "#166534" }}>
                  {isTeam ? "Team Activity" : "Individual Activity"}
                </span>
                <span style={{ fontSize:11, color:C.textLight }}>{activity.academicYear?.name}</span>
              </div>
              <p style={{ margin:"3px 0 0", fontSize:12, color:C.textLight }}>
                {enrolled.length} enrolled · {events.length} event{events.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Stat counters */}
          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:"Enrolled", value:enrolled.length, color:C.sky    },
              { label:"Events",   value:events.length,   color:"#a855f7" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign:"center", background:C.bg, borderRadius:12, padding:"10px 16px", border:`1.5px solid ${C.borderLight}` }}>
                <p style={{ margin:0, fontSize:20, fontWeight:900, color }}>{value}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:C.textLight }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tabs (Gallery pill style) */}
      <div style={{ display:"inline-flex", padding:4, borderRadius:14, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)", marginBottom:24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all 0.18s", background: subTab === t.key ? C.deep : "transparent", color: subTab === t.key ? "#fff" : C.textLight }}>
            {t.label}
            <span style={{ fontSize:11, padding:"1px 7px", borderRadius:20, fontWeight:700, background: subTab === t.key ? "rgba(255,255,255,0.2)" : C.mist, color: subTab === t.key ? "#fff" : C.textLight }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
          <Loader2 size={28} color={C.sky} className="animate-spin"/>
        </div>
      ) : subTab === "students" ? (
        enrolled.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", borderRadius:20, background:C.white, border:`1.5px solid ${C.borderLight}` }}>
            <div style={{ width:56, height:56, borderRadius:18, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <Users size={24} color={C.sky} strokeWidth={1.5}/>
            </div>
            <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>No students enrolled yet</p>
          </div>
        ) : (
          <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Users size={15} color={C.sky}/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>{enrolled.length} Enrolled Students</p>
                  {isTeam && <p style={{ margin:0, fontSize:11, color:C.textLight }}>Switch to Teams by Event to assign teams</p>}
                </div>
              </div>
            </div>
            {enrolled.map((e, i) => (
              <div key={e.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 18px", borderBottom: i < enrolled.length - 1 ? `1px solid ${C.bg}` : "none", transition:"background 0.15s" }}
                onMouseEnter={ev => (ev.currentTarget.style.background = `${C.sky}08`)}
                onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
                <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, background:C.mist, color:C.deep, flexShrink:0 }}>
                  {e.student?.name?.[0] ?? "-"}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:600, fontSize:13, color:C.text }}>{e.student?.name}</p>
                  <p style={{ margin:0, fontSize:11, color:C.textLight }}>{e.academicYear?.name}</p>
                </div>
                <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"#f0fdf4", color:"#166534", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                  <CheckCircle size={10}/> Enrolled
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        <TeamsTab
          activity={activity}
          events={events}
          enrolledStudents={enrolledStudents}
          selEvent={selEvent}
          setSelEvent={setSelEvent}
          pushToast={pushToast}
          onRefresh={load}
        />
      )}
    </div>
  );
}

/* ══ ROOT PAGE ══ */
export default function ActivitiesPage() {
  const [view,          setView]          = useState("list");
  const [selActivity,   setSelActivity]   = useState(null);
  const [activities,    setActivities]    = useState([]);
  const [students,      setStudents]      = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filterYear,    setFilterYear]    = useState("");
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [refreshKey,    setRefreshKey]    = useState(0);
  const didInitYear = React.useRef(false);
  const { toasts, push } = useToast();

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterYear ? `?academicYearId=${filterYear}` : "";
      const [a, s, y] = await Promise.all([
        apiFetch(API + qs),
        apiFetch(`${API}/students`),
        apiFetch(`${API}/academic-years`),
      ]);
      setActivities(a.data);
      setStudents(s.data);
      setAcademicYears(y.data);
      // Auto-select the active academic year on first load only
      if (!didInitYear.current && y.data?.length > 0) {
        didInitYear.current = true;
        const active = y.data.find(yr => yr.isActive);
        if (active) setFilterYear(active.id);
      }
    } catch(e) { push(e.message, "error"); }
    finally { setLoading(false); }
  }, [filterYear, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const filtActs = activities.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label:"Activities",      value:activities.length,                                                Icon:BookOpen, color:C.sky    },
    { label:"My Students",     value:students.length,                                                  Icon:Users,    color:"#22c55e"},
    { label:"Team Activities", value:activities.filter(a => a.participationType === "TEAM").length,    Icon:Trophy,   color:"#a855f7"},
    { label:"Individual",      value:activities.filter(a => a.participationType === "INDIVIDUAL").length, Icon:Star,  color:"#f59e0b"},
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .act-card:hover { transform:translateY(-3px) !important; box-shadow:0 8px 24px rgba(56,73,89,0.13) !important; }
      `}</style>
      <Toast toasts={toasts}/>

      <div style={{ minHeight:"100vh", background:C.bg, padding:"28px 30px", fontFamily:"'Inter', sans-serif", backgroundImage:`radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>

        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                <div style={{ width:4, height:28, borderRadius:99, background:`linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink:0 }}/>
                <h1 style={{ margin:0, fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color:C.text, letterSpacing:"-0.6px" }}>
                  {view === "detail" && selActivity ? selActivity.name : "Activities"}
                </h1>
              </div>
              <p style={{ margin:0, paddingLeft:14, fontSize:12, color:C.textLight, fontWeight:500 }}>
                {view === "detail" && selActivity
                  ? selActivity.description || "Activity detail"
                  : `${activities.length} activit${activities.length !== 1 ? "ies" : "y"}`}
              </p>
            </div>
            {view === "list" && (
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={refresh}
                  style={{ width:40, height:40, borderRadius:12, border:`1.5px solid ${C.borderLight}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textLight }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${C.mist}55`)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
                </button>
              </div>
            )}
          </div>
        </div>

        {view === "detail" && selActivity ? (
          <div className="fade-up">
            <ActivityDetailView
              activity={selActivity}
              onBack={() => { setView("list"); setSelActivity(null); load(); }}
              pushToast={push}
            />
          </div>
        ) : (
          <>
            {/* ── Stats ── */}
            <div className="fade-up" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:14, marginBottom:24 }}>
              {stats.map(({ label, value, Icon, color }) => (
                <div key={label} style={{ borderRadius:16, padding:"18px 20px", background:C.white, borderLeft:`4px solid ${color}`, boxShadow:"0 2px 12px rgba(56,73,89,0.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
                      <p style={{ margin:"6px 0 0", fontSize:28, fontWeight:900, color }}>{loading ? "—" : value}</p>
                    </div>
                    <Icon size={34} color={color} style={{ opacity:0.15 }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filter bar ── */}
            <div className="fade-up" style={{ borderRadius:20, padding:"14px 18px", marginBottom:20, background:C.white, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 2px 12px rgba(56,73,89,0.06)", display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
              <div style={{ position:"relative", flex:1, minWidth:200 }}>
                <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.textLight }}/>
                <input
                  style={{ width:"100%", paddingLeft:36, paddingRight:12, paddingTop:9, paddingBottom:9, borderRadius:11, border:`1.5px solid ${C.border}`, background:C.bg, fontSize:13, color:C.text, outline:"none", boxSizing:"border-box" }}
                  placeholder="Search activities…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  onFocus={ev => (ev.target.style.borderColor = C.sky)}
                  onBlur={ev  => (ev.target.style.borderColor = C.border)}
                />
              </div>
              <select
                style={{ padding:"9px 14px", borderRadius:11, border:`1.5px solid ${C.border}`, background:C.bg, fontSize:13, color:C.text, outline:"none" }}
                value={filterYear} onChange={e => setFilterYear(e.target.value)}
                onFocus={ev => (ev.target.style.borderColor = C.sky)}
                onBlur={ev  => (ev.target.style.borderColor = C.border)}
              >
                <option value="">All Years</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}{y.isActive ? " (Active)" : ""}</option>)}
              </select>
            </div>

            {/* ── Activity grid ── */}
            <div className="fade-up" style={{ background:C.white, borderRadius:20, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 2px 20px rgba(56,73,89,0.07)", overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <BookOpen size={15} color={C.sky}/>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>All Activities</p>
                    <p style={{ margin:0, fontSize:11, color:C.textLight }}>{filtActs.length} activit{filtActs.length !== 1 ? "ies" : "y"} total</p>
                  </div>
                </div>
              </div>

              <div style={{ padding:18 }}>
                {loading ? (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ borderRadius:16, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, padding:18, display:"flex", flexDirection:"column", gap:10 }}>
                        <Pulse h={16} w="65%"/> <Pulse h={11} w="45%"/> <Pulse h={11} w="80%"/>
                        <div style={{ marginTop:4, paddingTop:14, borderTop:`1px solid ${C.borderLight}`, display:"flex", gap:10 }}>
                          <Pulse h={14} w="35%"/> <Pulse h={14} w="35%"/>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtActs.length === 0 ? (
                  <div style={{ padding:"60px 20px", textAlign:"center" }}>
                    <div style={{ width:60, height:60, borderRadius:18, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                      <BookOpen size={26} color={C.sky} strokeWidth={1.5}/>
                    </div>
                    <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>No activities found</p>
                    <p style={{ margin:"5px 0 0", fontSize:12, color:C.textLight }}>Try adjusting your search or year filter</p>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
                    {filtActs.map(act => {
                      const catMeta = CATEGORY_META[act.category] ?? CATEGORY_META.OTHER;
                      return (
                        <div key={act.id}
                          className="act-card"
                          onClick={() => { setSelActivity(act); setView("detail"); }}
                          style={{ borderRadius:16, padding:18, cursor:"pointer", transition:"all 0.2s", background:C.white, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 2px 8px rgba(56,73,89,0.06)" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{act.name}</h3>
                              <p style={{ margin:"3px 0 0", fontSize:11, color:C.textLight }}>{act.academicYear?.name}</p>
                            </div>
                            <ChevronRight size={16} color={C.textLight} style={{ flexShrink:0, marginTop:2 }}/>
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                            <span style={{ fontSize:11, padding:"3px 9px", borderRadius:8, fontWeight:600, display:"inline-flex", alignItems:"center", gap:4, background:catMeta.color + "18", color:catMeta.color }}>
                              <catMeta.Icon size={10}/>{catMeta.label}
                            </span>
                            <span style={{ fontSize:11, padding:"3px 9px", borderRadius:8, fontWeight:600, background: act.participationType === "TEAM" ? "#dbeafe" : "#f0fdf4", color: act.participationType === "TEAM" ? "#1d4ed8" : "#166534" }}>
                              {act.participationType === "TEAM" ? "Team" : "Individual"}
                            </span>
                            {act.activityClasses?.map(ac => (
                              <span key={ac.classSection.id} style={{ fontSize:11, padding:"3px 7px", borderRadius:6, background:`${C.sky}15`, color:C.sky, fontWeight:500 }}>
                                {ac.classSection.name}
                              </span>
                            ))}
                          </div>
                          <div style={{ display:"flex", gap:16, paddingTop:12, borderTop:`1px solid ${C.borderLight}` }}>
                            <div>
                              <p style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>{act._count?.enrollments ?? 0}</p>
                              <p style={{ margin:0, fontSize:11, color:C.textLight }}>Enrolled</p>
                            </div>
                            <div>
                              <p style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>{act._count?.events ?? 0}</p>
                              <p style={{ margin:0, fontSize:11, color:C.textLight }}>Events</p>
                            </div>
                            {act.participationType === "TEAM" && (
                              <div style={{ marginLeft:"auto", display:"flex", alignItems:"flex-end" }}>
                                <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:8, background:C.mist, color:C.deep, display:"flex", alignItems:"center", gap:4 }}>
                                  <Users size={10}/> Manage Teams →
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}