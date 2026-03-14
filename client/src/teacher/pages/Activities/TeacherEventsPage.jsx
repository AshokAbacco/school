// client/src/teacher/pages/Activities/TeacherEventsPage.jsx
// Redesigned to match Gallery.jsx design system

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Users, Plus, Trash2, X, Loader2,
  CheckCircle, AlertCircle, Search, ArrowLeft, Music,
  Swords, Star, UserCheck, ChevronRight, Filter, Trophy, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

/* ── Design tokens (Gallery-identical) ── */
const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  bg: "#EDF3FA", white: "#FFFFFF", border: "#C8DCF0", borderLight: "#DDE9F5",
  text: "#243340", textLight: "#6A89A7",
};

const BASE         = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const API_EVENTS   = `${BASE}/api/teacher/activities/events`;
const API_STUDENTS = `${BASE}/api/teacher/activities/students`;
const API_CLASSES  = `${BASE}/api/teacher/activities/class-sections`;

const GROUP_COLORS = ["#88BDF2","#a855f7","#f59e0b","#22c55e","#ef4444","#ec4899","#6366f1","#14b8a6"];

const EVENT_TYPE_META = {
  COMPETITION:   { label:"Competition",   color:"#f59e0b", Icon:Swords  },
  CULTURAL:      { label:"Cultural",      color:"#a855f7", Icon:Music   },
  PARTICIPATION: { label:"Participation", color:"#22c55e", Icon:Star    },
  CEREMONY:      { label:"Ceremony",      color:"#88BDF2", Icon:Trophy  },
};

const apiFetch = async (url, opts = {}) => {
  const res  = await fetch(url, {
    headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
    ...opts,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};

/* ── Skeleton ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div className="animate-pulse" style={{ width:w, height:h, borderRadius:r, background:`${C.mist}55` }}/>
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

/* ── Shared buttons ── */
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
        opacity: (loading || disabled) ? 0.65 : 1, flexShrink:0,
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

/* ── Input ── */
function TextInput({ value, onChange, placeholder, onKeyDown, small }) {
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
      style={{ width:"100%", border:`1.5px solid ${C.border}`, borderRadius:11, padding: small ? "8px 12px" : "10px 14px", fontSize: small ? 12 : 13, color:C.text, background:C.bg, outline:"none", boxSizing:"border-box" }}
      onFocus={e => (e.target.style.borderColor = C.sky)}
      onBlur={e  => (e.target.style.borderColor = C.border)}
    />
  );
}

/* ── Class Filter Chips (Gallery-style) ── */
function ClassFilterBar({ classes, selectedClassId, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:4, color:C.textLight }}>
        <Filter size={11}/>
        <span style={{ fontSize:11, fontWeight:700 }}>Class:</span>
      </div>
      {["", ...classes.map(c => c.id)].map((id, idx) => {
        const cls     = classes.find(c => c.id === id);
        const active  = (!id && !selectedClassId) || (id && selectedClassId === id);
        return (
          <button key={id || "all"} onClick={() => onChange(id === selectedClassId ? "" : id)}
            style={{
              padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
              background: active ? C.deep : C.bg,
              color: active ? C.white : C.textLight,
              border: `1.5px solid ${active ? C.deep : C.borderLight}`,
            }}>
            {id ? cls?.name : "All Classes"}
          </button>
        );
      })}
    </div>
  );
}

/* ── Member Picker ── */
function MemberPicker({ eventId, team, students, classes, onMembersChanged, pushToast }) {
  const [q,       setQ]       = useState("");
  const [classId, setClassId] = useState("");
  const [adding,  setAdding]  = useState(false);

  const members   = team?.members ?? [];
  const memberIds = members.map(m => m.student?.id ?? m.studentId);

  const filtered = students.filter(s => {
    const notMember  = !memberIds.includes(s.id);
    const matchClass = !classId || s.classSection?.id === classId;
    const matchQuery = !q      || s.name.toLowerCase().includes(q.toLowerCase());
    return notMember && matchClass && matchQuery;
  });

  const addMember = async (studentId) => {
    setAdding(true);
    try {
      await apiFetch(`${API_EVENTS}/${eventId}/teams/${team.id}/members`, {
        method:"POST", body:JSON.stringify({ studentId }),
      });
      setQ(""); setClassId("");
      onMembersChanged();
    } catch(e) { pushToast(e.message, "error"); }
    finally { setAdding(false); }
  };

  const removeMember = async (studentId) => {
    try {
      await apiFetch(`${API_EVENTS}/${eventId}/teams/${team.id}/members/${studentId}`, { method:"DELETE" });
      onMembersChanged();
    } catch(e) { pushToast(e.message, "error"); }
  };

  const selectedClassName = classes.find(c => c.id === classId)?.name;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Add student panel */}
      <div style={{ borderRadius:14, padding:14, background:C.bg, border:`1.5px solid ${C.borderLight}`, display:"flex", flexDirection:"column", gap:10 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.04em" }}>Add Student</p>
        {classes.length > 0 && <ClassFilterBar classes={classes} selectedClassId={classId} onChange={setClassId}/>}
        {classId && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:8, background:`${C.mist}55`, fontSize:12, color:C.text }}>
            <Filter size={11}/>
            Showing <strong>{selectedClassName}</strong> only —
            <button onClick={() => setClassId("")} style={{ textDecoration:"underline", fontSize:12, fontWeight:600, color:C.textLight, background:"none", border:"none", cursor:"pointer", padding:0 }}>show all</button>
          </div>
        )}
        <div style={{ position:"relative" }}>
          <Search size={12} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.textLight }}/>
          <input
            style={{ width:"100%", paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8, borderRadius:10, border:`1.5px solid ${C.border}`, background:C.white, fontSize:12, color:C.text, outline:"none", boxSizing:"border-box" }}
            placeholder={classId ? `Search in ${selectedClassName}…` : "Search all students…"}
            value={q} onChange={e => setQ(e.target.value)}
            onFocus={ev => (ev.target.style.borderColor = C.sky)}
            onBlur={ev  => (ev.target.style.borderColor = C.border)}
          />
        </div>
        {(q || classId) && filtered.length > 0 && (
          <div style={{ borderRadius:10, overflow:"hidden", maxHeight:150, overflowY:"auto", border:`1.5px solid ${C.borderLight}` }}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => addMember(s.id)}
                style={{ padding:"9px 14px", cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", background:C.white, borderBottom:`1px solid ${C.bg}`, color:C.text }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.sky}10`)}
                onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
                <span>
                  {s.name}
                  {s.classSection && <span style={{ color:C.textLight }}> · {s.classSection.name}</span>}
                </span>
                {adding ? <Loader2 size={11} className="animate-spin" color={C.textLight}/> : <Plus size={11} color={C.sky}/>}
              </div>
            ))}
          </div>
        )}
        {(q || classId) && filtered.length === 0 && (
          <p style={{ fontSize:12, color:C.textLight, margin:0 }}>
            {classId && !q ? `All students from ${selectedClassName} are already in this group.` : "No matching students found."}
          </p>
        )}
      </div>

      {/* Member list */}
      {members.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.04em" }}>
            {members.length} Member{members.length !== 1 ? "s" : ""}
          </p>
          {members.map(m => (
            <div key={m.student?.id ?? m.studentId}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:11, background:C.bg, border:`1.5px solid ${C.borderLight}` }}>
              <UserCheck size={13} color={C.sky}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.student?.name}</p>
                {m.student?.classSection && <p style={{ margin:0, fontSize:11, color:C.textLight }}>{m.student.classSection.name}</p>}
              </div>
              <button onClick={() => removeMember(m.student?.id ?? m.studentId)} style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:2 }}>
                <X size={13} color="#ef4444"/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Group Manager ── */
function GroupManager({ event, pushToast }) {
  const [groups,   setGroups]   = useState([]);
  const [students, setStudents] = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selGroup, setSelGroup] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [saving,   setSaving]   = useState(false);

  const loadGroups = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await apiFetch(`${API_EVENTS}/${event.id}/teams`);
      setGroups(r.data);
      setSelGroup(prev => prev ? (r.data.find(g => g.id === prev.id) ?? prev) : null);
    } catch(e) { pushToast(e.message, "error"); }
    finally { if (!silent) setLoading(false); }
  }, [event.id]);

  const loadStudents = useCallback(async () => {
    try {
      const eligibleClassIds = event.eligibleClasses?.map(ec => ec.classSection?.id).filter(Boolean) ?? [];
      if (eligibleClassIds.length > 0) {
        const results = await Promise.all(eligibleClassIds.map(csId => apiFetch(`${API_STUDENTS}?classSectionId=${csId}`)));
        const seen = new Set();
        const merged = results.flatMap(r => r.data).filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
        setStudents(merged);
      } else {
        const r = await apiFetch(API_STUDENTS);
        setStudents(r.data);
      }
    } catch(e) { pushToast(e.message, "error"); }
  }, [event.id]);

  const loadClasses = useCallback(async () => {
    try {
      const eligible = event.eligibleClasses?.map(ec => ec.classSection).filter(Boolean) ?? [];
      if (eligible.length > 0) { setClasses(eligible); }
      else { const r = await apiFetch(API_CLASSES); setClasses(r.data ?? []); }
    } catch(_) {}
  }, [event.id]);

  useEffect(() => { loadGroups(); loadStudents(); loadClasses(); }, [loadGroups, loadStudents, loadClasses]);

  const createGroup = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`${API_EVENTS}/${event.id}/teams`, { method:"POST", body:JSON.stringify({ name:newName.trim() }) });
      pushToast("Group created!"); setNewName(""); setCreating(false); loadGroups();
    } catch(e) { pushToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const deleteGroup = async (id) => {
    if (!window.confirm("Delete this group and all its members?")) return;
    try {
      await apiFetch(`${API_EVENTS}/${event.id}/teams/${id}`, { method:"DELETE" });
      pushToast("Group deleted");
      if (selGroup?.id === id) setSelGroup(null);
      loadGroups();
    } catch(e) { pushToast(e.message, "error"); }
  };

  const hasEligibleClasses = (event.eligibleClasses?.length ?? 0) > 0;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:20 }} className="lg-grid-3">
      <style>{`@media(min-width:1024px){.lg-grid-3{grid-template-columns:1fr 2fr !important;}}`}</style>

      {/* Groups sidebar */}
      <div>
        <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Users size={15} color={C.sky}/>
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>Groups</p>
                <p style={{ margin:0, fontSize:11, color:C.textLight }}>{groups.length} group{groups.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <PrimaryBtn small onClick={() => setCreating(true)}>
              <Plus size={12}/> New
            </PrimaryBtn>
          </div>

          <div style={{ padding:14, display:"flex", flexDirection:"column", gap:8 }}>
            {hasEligibleClasses && (
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"10px 14px", borderRadius:10, background:`${C.sky}10`, border:`1px solid ${C.borderLight}` }}>
                <Filter size={12} color={C.sky} style={{ marginTop:1, flexShrink:0 }}/>
                <p style={{ margin:0, fontSize:12, color:C.textLight }}>
                  Students filtered to:
                  <strong style={{ color:C.text }}> {event.eligibleClasses.map(ec => ec.classSection?.name).join(", ")}</strong>
                </p>
              </div>
            )}

            {creating && (
              <div style={{ borderRadius:12, padding:14, background:C.bg, border:`1.5px solid ${C.borderLight}`, display:"flex", flexDirection:"column", gap:10 }}>
                <TextInput value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Dance Group A, Choir…"
                  onKeyDown={e => e.key === "Enter" && createGroup()} small/>
                <div style={{ display:"flex", gap:8 }}>
                  <PrimaryBtn small onClick={createGroup} loading={saving}><Plus size={11}/> Create</PrimaryBtn>
                  <OutlineBtn small onClick={() => { setCreating(false); setNewName(""); }}>Cancel</OutlineBtn>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ display:"flex", justifyContent:"center", padding:"28px 0" }}>
                <Loader2 size={20} color={C.sky} className="animate-spin"/>
              </div>
            ) : groups.length === 0 && !creating ? (
              <div style={{ textAlign:"center", padding:"28px 0" }}>
                <div style={{ width:44, height:44, borderRadius:14, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                  <Users size={20} color={C.sky} strokeWidth={1.5}/>
                </div>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.text }}>No groups yet</p>
                <p style={{ margin:"4px 0 0", fontSize:11, color:C.textLight }}>Create groups for this event</p>
              </div>
            ) : (
              groups.map((g, gi) => (
                <div key={g.id} onClick={() => setSelGroup(g)}
                  style={{ borderRadius:12, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s", border:`1.5px solid ${selGroup?.id === g.id ? C.sky : C.borderLight}`, background: selGroup?.id === g.id ? `${C.sky}10` : C.white }}
                  onMouseEnter={e => { if (selGroup?.id !== g.id) e.currentTarget.style.background = C.bg; }}
                  onMouseLeave={e => { if (selGroup?.id !== g.id) e.currentTarget.style.background = C.white; }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:GROUP_COLORS[gi % GROUP_COLORS.length] }}/>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.name}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteGroup(g.id); }} style={{ background:"none", border:"none", cursor:"pointer", flexShrink:0, padding:2 }}>
                      <Trash2 size={12} color="#ef4444"/>
                    </button>
                  </div>
                  <p style={{ margin:"4px 0 0 18px", fontSize:11, color:C.textLight }}>
                    {g.members?.length ?? 0} member{(g.members?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Member editor */}
      <div>
        {selGroup ? (
          <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <UserCheck size={15} color={C.sky}/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>Members — {selGroup.name}</p>
                  <p style={{ margin:0, fontSize:11, color:C.textLight }}>
                    {hasEligibleClasses ? "Students filtered to eligible classes" : "Pick a class to filter, or search all students"}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding:18 }}>
              <MemberPicker
                eventId={event.id}
                team={selGroup}
                students={students}
                classes={classes}
                onMembersChanged={() => loadGroups(true)}
                pushToast={pushToast}
              />
            </div>
          </div>
        ) : (
          <div style={{ borderRadius:20, padding:40, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:240, background:C.white, border:`1.5px dashed ${C.borderLight}` }}>
            <div style={{ width:50, height:50, borderRadius:16, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <Users size={22} color={C.sky} strokeWidth={1.5}/>
            </div>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:C.textLight }}>Select a group to manage members</p>
            <p style={{ margin:"4px 0 0", fontSize:12, color:C.sky }}>Click any group on the left to add students</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Event Detail ── */
function EventDetail({ event, onBack }) {
  const { toasts, push } = useToast();
  const et = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.PARTICIPATION;
  const Et = et.Icon;

  return (
    <div style={{ fontFamily:"'Inter', sans-serif" }}>
      <Toast toasts={toasts}/>

      {/* Back link */}
      <button onClick={onBack} style={{ display:"flex", alignItems:"center",marginTop:14, gap:8, fontSize:13, fontWeight:600, color:C.textLight, cursor:"pointer", background:"none", border:"none", padding:0, marginBottom:16 }}
        onMouseEnter={e => (e.currentTarget.style.color = C.text)}
        onMouseLeave={e => (e.currentTarget.style.color = C.textLight)}>
        <ArrowLeft size={14}/> Back to Events
      </button>

      {/* Event info card — light, matches images 1 & 3 */}
      <div style={{ borderRadius:20, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, background:C.white, boxShadow:"0 2px 12px rgba(56,73,89,0.07)", marginBottom:20 }}>
        <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`${et.color}18`, border:`1.5px solid ${et.color}33`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Et size={15} color={et.color}/>
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:C.text }}>{event.name}</p>
                <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, background:`${et.color}18`, color:et.color }}>{et.label}</span>
                <span style={{ fontSize:11, color:C.textLight }}>{event.academicYear?.name}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:3, flexWrap:"wrap" }}>
                {event.eventDate && (
                  <span style={{ fontSize:12, color:C.textLight, display:"flex", alignItems:"center", gap:4 }}>
                    📅 {new Date(event.eventDate).toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" })}
                  </span>
                )}
                {event.description && <span style={{ fontSize:12, color:C.textLight }}>{event.description}</span>}
              </div>
              {event.eligibleClasses?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:5 }}>
                  {event.eligibleClasses.map(ec => (
                    <span key={ec.classSection?.id} style={{ fontSize:11, padding:"2px 7px", borderRadius:6, background:`${C.sky}15`, color:C.sky, fontWeight:600 }}>
                      {ec.classSection?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GroupManager event={event} pushToast={push}/>
    </div>
  );
}

/* ══ EVENTS LIST PAGE ══ */
export default function TeacherEventsPage() {
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selEvent, setSelEvent] = useState(null);
  const [q,        setQ]        = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { toasts, push } = useToast();

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`${API_EVENTS}?includeAutoGenerated=false`);
      setEvents(r.data);
    } catch(e) { push(e.message, "error"); }
    finally { setLoading(false); }
  }, [refreshKey]);

  useEffect(() => { load(); }, [load]);

  if (selEvent) return <EventDetail event={selEvent} onBack={() => setSelEvent(null)}/>;

  const filtered = events.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .ev-card:hover { transform:translateY(-3px) !important; box-shadow:0 8px 24px rgba(56,73,89,0.13) !important; }
      `}</style>
      <Toast toasts={toasts}/>

      <div style={{ minHeight:"100vh", background:C.bg, padding:"28px 30px", fontFamily:"'Inter', sans-serif", backgroundImage:`radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%)` }}>

        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                <div style={{ width:4, height:28, borderRadius:99, background:`linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink:0 }}/>
                <h1 style={{ margin:0, fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color:C.text, letterSpacing:"-0.6px" }}>Events</h1>
              </div>
              <p style={{ margin:0, paddingLeft:14, fontSize:12, color:C.textLight, fontWeight:500 }}>
                {events.length} event{events.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={refresh}
              style={{ width:40, height:40, borderRadius:12, border:`1.5px solid ${C.borderLight}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textLight }}
              onMouseEnter={e => (e.currentTarget.style.background = `${C.mist}55`)}
              onMouseLeave={e => (e.currentTarget.style.background = C.white)}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""}/>
            </button>
          </div>
        </div>

        {/* ── Search + list ── */}
        <div className="fade-up" style={{ background:C.white, borderRadius:20, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 2px 20px rgba(56,73,89,0.07)", overflow:"hidden" }}>
          {/* Section header */}
          <div style={{ padding:"14px 18px", borderBottom:`1.5px solid ${C.borderLight}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${C.sky}22`, border:`1.5px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Calendar size={15} color={C.sky}/>
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>All Events</p>
                <p style={{ margin:0, fontSize:11, color:C.textLight }}>{filtered.length} event{filtered.length !== 1 ? "s" : ""} total</p>
              </div>
            </div>
            {/* Search */}
            <div style={{ position:"relative" }}>
              <Search size={13} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.textLight }}/>
              <input
                style={{ paddingLeft:34, paddingRight:14, paddingTop:8, paddingBottom:8, borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, fontSize:13, color:C.text, outline:"none", minWidth:220 }}
                placeholder="Search events…"
                value={q} onChange={e => setQ(e.target.value)}
                onFocus={ev => (ev.target.style.borderColor = C.sky)}
                onBlur={ev  => (ev.target.style.borderColor = C.border)}
              />
            </div>
          </div>

          <div style={{ padding:18 }}>
            {loading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ borderRadius:16, overflow:"hidden", border:`1.5px solid ${C.borderLight}`, padding:18, display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:`${C.mist}55` }} className="animate-pulse"/>
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                        <Pulse h={14} w="70%"/> <Pulse h={10} w="45%"/>
                      </div>
                    </div>
                    <Pulse h={11} w="55%"/>
                    <div style={{ marginTop:4, paddingTop:12, borderTop:`1px solid ${C.borderLight}`, display:"flex", gap:10 }}>
                      <Pulse h={12} w="40%"/> <Pulse h={12} w="40%"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:"60px 20px", textAlign:"center" }}>
                <div style={{ width:60, height:60, borderRadius:18, background:`${C.sky}18`, border:`1px solid ${C.sky}33`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <Calendar size={26} color={C.sky} strokeWidth={1.5}/>
                </div>
                <p style={{ margin:0, fontWeight:700, fontSize:14, color:C.text }}>No events found</p>
                <p style={{ margin:"5px 0 0", fontSize:12, color:C.textLight }}>Admin creates events — they will appear here once created.</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:16 }}>
                {filtered.map(event => {
                  const et          = EVENT_TYPE_META[event.eventType] ?? EVENT_TYPE_META.PARTICIPATION;
                  const Et          = et.Icon;
                  const groupCount  = event._count?.teams ?? 0;
                  const partCount   = event._count?.participants ?? 0;
                  return (
                    <div key={event.id}
                      className="ev-card"
                      onClick={() => setSelEvent(event)}
                      style={{ borderRadius:16, padding:18, cursor:"pointer", transition:"all 0.2s", background:C.white, border:`1.5px solid ${C.borderLight}`, boxShadow:"0 2px 8px rgba(56,73,89,0.06)" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                        <div style={{ width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:et.color + "18" }}>
                          <Et size={18} color={et.color}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <h3 style={{ margin:0, fontWeight:700, fontSize:14, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event.name}</h3>
                          <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20, display:"inline-block", marginTop:4, background:et.color + "18", color:et.color }}>
                            {et.label}
                          </span>
                        </div>
                        <ChevronRight size={15} color={C.textLight} style={{ flexShrink:0, marginTop:2 }}/>
                      </div>

                      {event.eventDate && (
                        <p style={{ fontSize:12, color:C.textLight, marginBottom:6 }}>
                          📅 {new Date(event.eventDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                        </p>
                      )}
                      {event.activity && (
                        <p style={{ fontSize:12, color:C.textLight, marginBottom:6 }}>
                          <span style={{ padding:"2px 8px", borderRadius:6, background:C.bg, color:C.textLight }}>
                            🔗 {event.activity.name}
                          </span>
                        </p>
                      )}
                      {event.eligibleClasses?.length > 0 && (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                          {event.eligibleClasses.slice(0, 3).map(ec => (
                            <span key={ec.classSection?.id} style={{ fontSize:11, padding:"2px 7px", borderRadius:6, background:`${C.sky}15`, color:C.sky, fontWeight:500 }}>
                              {ec.classSection?.name}
                            </span>
                          ))}
                          {event.eligibleClasses.length > 3 && (
                            <span style={{ fontSize:11, padding:"2px 7px", borderRadius:6, background:`${C.sky}15`, color:C.sky, fontWeight:500 }}>
                              +{event.eligibleClasses.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:12, borderTop:`1px solid ${C.borderLight}` }}>
                        <span style={{ fontSize:12, color:C.textLight }}>
                          <strong style={{ color:C.text }}>{groupCount}</strong> group{groupCount !== 1 ? "s" : ""}
                        </span>
                        <span style={{ fontSize:12, color:C.textLight }}>
                          <strong style={{ color:C.text }}>{partCount}</strong> participant{partCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}