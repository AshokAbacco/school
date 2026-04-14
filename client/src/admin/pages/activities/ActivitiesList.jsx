// ActivitiesList.jsx (Fully Responsive)
import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, Plus, X, Edit2, Loader2, CheckCircle, AlertCircle, Search, Star, Swords,
  Music, BookOpen, Dumbbell, Brain, Calendar, MapPin, Archive, RefreshCw, Clock,
  ChevronDown, LayoutGrid, CalendarDays, Users, Sparkles
} from "lucide-react";
import { getToken } from "../../../auth/storage.js";

/* ── DESIGN TOKENS ── */
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
  textMid: "#4A6880",
  textLight: "#6A89A7",
  success: "#3DA882",
  danger: "#D95C5C",
  warn: "#D4944A",
};

const API = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000"}/api/admin/activities`;

const CATEGORY_META = {
  SPORTS:   { label: "Sports",   color: "#f59e0b", Icon: Dumbbell },
  CULTURAL: { label: "Cultural", color: "#a855f7", Icon: Music    },
  ACADEMIC: { label: "Academic", color: "#22c55e", Icon: Brain    },
  OTHER:    { label: "Other",    color: "#6A89A7", Icon: Star     },
};

const EVENT_TYPE_META = {
  COMPETITION:   { label: "Competition",   color: "#f59e0b", Icon: Swords  },
  CULTURAL:      { label: "Cultural",      color: "#a855f7", Icon: Music   },
  PARTICIPATION: { label: "Participation", color: "#22c55e", Icon: Star    },
  CEREMONY:      { label: "Ceremony",      color: "#88BDF2", Icon: Trophy  },
};

const EVENT_STATUS_META = {
  DRAFT:     { label: "Draft",     color: "#94a3b8" },
  PUBLISHED: { label: "Published", color: "#22c55e" },
  COMPLETED: { label: "Completed", color: "#6366f1" },
  CANCELLED: { label: "Cancelled", color: "#ef4444" },
};

/* ── HELPERS ── */
const apiFetch = async (url, opts = {}) => {
  const res = await fetch(url, { 
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, 
    ...opts 
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

/* ── BREAKPOINTS ── */
// xs: <480, sm: 480–767, md: 768–1023, lg: 1024+
const bp = {
  xs: (w) => w < 480,
  sm: (w) => w >= 480 && w < 768,
  md: (w) => w >= 768 && w < 1024,
  lg: (w) => w >= 1024,
  mobile: (w) => w < 768,
  tablet: (w) => w >= 768 && w < 1024,
  desktop: (w) => w >= 1024,
};

/* ── UI ATOMS ── */
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: `${C.mist}88`, flexShrink: 0, animation: "skelPulse 1.6s ease-in-out infinite" }} />;
}

function SkeletonCards({ vw }) {
  const cols = bp.mobile(vw) ? "1fr" : bp.tablet(vw) ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(280px, 1fr))";
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: bp.mobile(vw) ? 14 : 20 }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ padding: bp.mobile(vw) ? 16 : 20, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, background: C.white }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Pulse w={36} h={36} r={10} />
            <div style={{ display: "flex", gap: 8 }}><Pulse w={14} h={14} /><Pulse w={14} h={14} /></div>
          </div>
          <Pulse w="70%" h={18} r={4} />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <Pulse w="90%" h={10} />
            <Pulse w="40%" h={10} />
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between" }}>
            <Pulse w={60} h={18} r={8} />
            <Pulse w={30} h={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

const Label = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.textLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
    {children}{required && <span style={{ color: C.danger, marginLeft: 2 }}>*</span>}
  </label>
);

const inputBase = { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.text, background: C.bg, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const Input = (p) => <input style={inputBase} onFocus={e => (e.target.style.borderColor = C.sky)} onBlur={e => (e.target.style.borderColor = C.border)} {...p} />;
const Textarea = (p) => <textarea rows={3} style={{ ...inputBase, resize: "none" }} onFocus={e => (e.target.style.borderColor = C.sky)} onBlur={e => (e.target.style.borderColor = C.border)} {...p} />;
const Sel = ({ children, style: s, ...p }) => (
  <select style={{ ...inputBase, ...s }} onFocus={e => (e.target.style.borderColor = C.sky)} onBlur={e => (e.target.style.borderColor = C.border)} {...p}>{children}</select>
);

function PrimaryBtn({ children, onClick, loading, disabled, compact }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: compact ? "8px 14px" : "9px 18px", borderRadius: 9, border: "none", background: C.deep, color: "#fff", fontSize: compact ? 12 : 13, fontWeight: 700, cursor: (loading || disabled) ? "not-allowed" : "pointer", opacity: (loading || disabled) ? 0.6 : 1, whiteSpace: "nowrap", transition: "all 0.14s", width: "auto" }}
      onMouseEnter={e => { if (!loading && !disabled) e.currentTarget.style.background = C.deepDark; }}
      onMouseLeave={e => { if (!loading && !disabled) e.currentTarget.style.background = C.deep; }}>
      {loading ? <Loader2 size={12} className="spin" /> : children}
    </button>
  );
}

function OutlineBtn({ children, onClick, danger, compact }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: compact ? "8px 14px" : "9px 16px", borderRadius: 9, border: danger ? `1.5px solid ${C.danger}44` : `1.5px solid ${C.borderLight}`, background: danger ? `${C.danger}08` : C.white, color: danger ? C.danger : C.text, fontSize: compact ? 12 : 13, fontWeight: 600, cursor: "pointer", transition: "background 0.14s", whiteSpace: "nowrap", width: "auto" }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? `${C.danger}12` : C.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = danger ? `${C.danger}08` : C.white)}>
      {children}
    </button>
  );
}

/* ── MODALS ── */
function Modal({ title, subtitle, icon: Icon, onClose, children, wide, vw }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const isMobile = bp.mobile(vw || 1200);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? "0" : "12px", background: "rgba(36,51,64,0.52)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: isMobile ? "22px 22px 0 0" : 22, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.25)", width: "100%", maxWidth: isMobile ? "100%" : (wide ? 640 : 440), maxHeight: isMobile ? "92dvh" : "calc(100dvh - 24px)", display: "flex", flexDirection: "column", animation: isMobile ? "slideUp 0.3s ease" : "modalIn 0.25s ease" }}>
        {/* Drag handle for mobile */}
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 99, background: C.border, margin: "12px auto 0" }} />}
        <div style={{ padding: isMobile ? "14px 20px" : "18px 24px", borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: isMobile ? "22px 22px 0 0" : "22px 22px 0 0", background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C.sky}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color={C.deep} /></div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: C.text }}>{title}</p>
              {subtitle && <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontWeight: 500 }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}><X size={14} /></button>
        </div>
        <div style={{ overflowY: "auto", padding: isMobile ? "16px 20px 24px" : "24px", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function PillGroup({ options, value, onChange, wrap }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map(o => {
        const active = value === o.value;
        return <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.14s", background: active ? o.color : `${o.color}15`, color: active ? "#fff" : o.color, border: `1.5px solid ${o.color}` }}>{o.label}</button>;
      })}
    </div>
  );
}

function ClassPicker({ classSections, selected, onToggle }) {
  const byGrade = classSections.reduce((acc, cs) => {
    const g = cs.class?.name ?? "Other"; (acc[g] = acc[g] || []).push(cs); return acc;
  }, {});
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", maxHeight: 200, overflowY: "auto", border: `1.5px solid ${C.borderLight}`, background: C.bg }}>
      {Object.entries(byGrade).map(([grade, sections]) => (
        <div key={grade} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.borderLight}` }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: C.textLight, textTransform: "uppercase" }}>{grade}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sections.map(cs => {
              const sel = selected.includes(cs.id);
              return <button key={cs.id} type="button" onClick={() => onToggle(cs.id)} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, fontWeight: 700, cursor: "pointer", background: sel ? C.deep : C.white, color: sel ? C.white : C.text, border: `1.5px solid ${sel ? C.deep : C.borderLight}` }}>{cs.name}</button>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── FORM MODALS ── */
function ActivityFormModal({ editing, academicYears, classSections, onClose, onSaved, pushToast, vw }) {
  const isEdit = !!editing;
  const isMobile = bp.mobile(vw || 1200);
  const [form, setForm] = useState({ name: editing?.name ?? "", description: editing?.description ?? "", category: editing?.category ?? "SPORTS", participationType: editing?.participationType ?? "TEAM", academicYearId: editing?.academicYearId ?? (academicYears.find(y => y.isActive)?.id ?? ""), classIds: editing?.activityClasses?.map(ac => ac.classSection.id) ?? [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  
  const save = async () => {
    if (!form.name.trim()) return pushToast("Activity name is required", "error");
    setSaving(true);
    try {
      isEdit ? await apiFetch(`${API}/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...form, classSectionIds: form.classIds }) }) 
             : await apiFetch(API, { method: "POST", body: JSON.stringify({ ...form, classSectionIds: form.classIds }) });
      pushToast(isEdit ? "Activity updated!" : "Activity created!"); onSaved();
    } catch (e) { pushToast(e.message, "error"); } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Activity" : "New Activity"} icon={BookOpen} onClose={onClose} wide vw={vw}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><Label required>Activity Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div><Label required>Category</Label><PillGroup options={Object.entries(CATEGORY_META).map(([v, m]) => ({ value: v, label: m.label, color: m.color }))} value={form.category} onChange={v => set("category", v)} /></div>
          <div><Label required>Participation</Label><PillGroup options={[{ value: "TEAM", label: "Team", color: C.deep }, { value: "INDIVIDUAL", label: "Individual", color: C.success }]} value={form.participationType} onChange={v => set("participationType", v)} /></div>
        </div>
        <div><Label required>Academic Year</Label><Sel value={form.academicYearId} onChange={e => set("academicYearId", e.target.value)}>{academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</Sel></div>
        <div><Label>Eligible Classes</Label><ClassPicker classSections={classSections} selected={form.classIds} onToggle={id => set("classIds", form.classIds.includes(id) ? form.classIds.filter(x => x !== id) : [...form.classIds, id])} /></div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, paddingTop: 10, borderTop: `1.5px solid ${C.borderLight}` }}>
          <PrimaryBtn onClick={save} loading={saving}>{isEdit ? "Save Changes" : "Create Activity"}</PrimaryBtn>
          <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        </div>
      </div>
    </Modal>
  );
}

function EventFormModal({ editing, academicYears, classSections, onClose, onSaved, pushToast, vw }) {
  const isEdit = !!editing;
  const isMobile = bp.mobile(vw || 1200);
  const toLocal = iso => { if (!iso) return ""; const d = new Date(iso), p = n => String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [form, setForm] = useState({ name: editing?.name ?? "", description: editing?.description ?? "", eventType: editing?.eventType ?? "COMPETITION", participationMode: editing?.participationMode ?? "TEAM", status: editing?.status ?? "DRAFT", eventDate: toLocal(editing?.eventDate), venue: editing?.venue ?? "", academicYearId: editing?.academicYearId ?? (academicYears.find(y => y.isActive)?.id ?? ""), maxTeamsPerClass: editing?.maxTeamsPerClass ?? "", maxStudentsPerClass: editing?.maxStudentsPerClass ?? "", classIds: editing?.eligibleClasses?.map(ec => ec.classSection.id) ?? [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return pushToast("Event name is required", "error");
    setSaving(true);
    try {
      const body = { ...form, eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null, classSectionIds: form.classIds };
      isEdit ? await apiFetch(`${API}/events/${editing.id}`, { method: "PUT", body: JSON.stringify(body) }) 
             : await apiFetch(`${API}/events`, { method: "POST", body: JSON.stringify(body) });
      pushToast(isEdit ? "Event updated!" : "Event created!"); onSaved();
    } catch (e) { pushToast(e.message, "error"); } finally { setSaving(false); }
  };

  return (
    <Modal title={isEdit ? "Edit Event" : "New Event"} icon={Trophy} onClose={onClose} wide vw={vw}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><Label required>Event Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div><Label required>Event Type</Label><PillGroup options={Object.entries(EVENT_TYPE_META).map(([v, m]) => ({ value: v, label: m.label, color: m.color }))} value={form.eventType} onChange={v => set("eventType", v)} /></div>
          <div><Label required>Mode</Label><PillGroup options={[{ value: "INDIVIDUAL", label: "Solo", color: C.success }, { value: "TEAM", label: "Team", color: C.deep }, { value: "BOTH", label: "Both", color: C.sky }]} value={form.participationMode} onChange={v => set("participationMode", v)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div><Label>Date & Time</Label><Input type="datetime-local" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} /></div>
          <div><Label>Venue</Label><Input value={form.venue} onChange={e => set("venue", e.target.value)} /></div>
        </div>
        <div><Label required>Status</Label><PillGroup options={Object.entries(EVENT_STATUS_META).map(([v, m]) => ({ value: v, label: m.label, color: m.color }))} value={form.status} onChange={v => set("status", v)} /></div>
        <div><Label>Eligible Classes</Label><ClassPicker classSections={classSections} selected={form.classIds} onToggle={id => set("classIds", form.classIds.includes(id) ? form.classIds.filter(x => x !== id) : [...form.classIds, id])} /></div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, paddingTop: 10, borderTop: `1.5px solid ${C.borderLight}` }}>
          <PrimaryBtn onClick={save} loading={saving}>{isEdit ? "Save Changes" : "Create Event"}</PrimaryBtn>
          <OutlineBtn onClick={onClose}>Cancel</OutlineBtn>
        </div>
      </div>
    </Modal>
  );
}

/* ── STAT CARD ── */
function StatCard({ IconComp, label, value, color = C.deep, delay = 0, loading, compact }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} className="fade-up" style={{ animationDelay: `${delay}ms`, background: C.white, borderRadius: compact ? 16 : 22, border: `1.5px solid ${C.borderLight}`, padding: compact ? "16px 14px 14px" : "24px 22px 20px", display: "flex", flexDirection: compact ? "row" : "column", alignItems: compact ? "center" : "flex-start", gap: compact ? 12 : 18, boxShadow: hov ? `0 16px 48px rgba(56,73,89,0.13)` : "0 2px 20px rgba(56,73,89,0.07)", transform: hov ? "translateY(-4px)" : "translateY(0)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${C.slate})`, opacity: hov ? 1 : 0.6 }} />
      <div style={{ width: compact ? 36 : 44, height: compact ? 36 : 44, flexShrink: 0, borderRadius: compact ? 10 : 14, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.borderLight}` }}>
        <IconComp size={compact ? 16 : 20} color={color} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: compact ? 22 : 32, fontWeight: 800, color: C.text, letterSpacing: "-1px" }}>{loading ? "..." : value}</p>
        <p style={{ margin: "2px 0 0", fontSize: compact ? 10 : 11, color: C.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function ActivitiesList() {
  const vw = useWindowWidth();
  const [tab, setTab] = useState("activities");
  const [activities, setActivities] = useState([]);
  const [events, setEvents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classSections, setClassSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState(null);

  const isMobile = bp.mobile(vw);
  const isTablet = bp.tablet(vw);
  const isDesktop = bp.desktop(vw);
  const isXs = bp.xs(vw);

  const pushToast = (msg) => alert(msg);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, e, y, cs] = await Promise.all([
        apiFetch(API), apiFetch(`${API}/events`), apiFetch(`${API}/academic-years`), apiFetch(`${API}/class-sections`)
      ]);
      setActivities(a.data || []); setEvents(e.data || []); setAcademicYears(y.data || []); setClassSections(cs.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tab === "activities" 
    ? activities.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : events.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  // Responsive values
  const pagePadding = isXs ? "16px 14px" : isMobile ? "20px 16px" : isTablet ? "24px 20px" : "28px 30px";
  const cardCols = isXs ? "1fr" : isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(280px, 1fr))";
  const statCols = isXs ? "1fr" : isMobile ? "repeat(3, 1fr)" : isTablet ? "repeat(3, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))";
  const cardGap = isMobile ? 14 : 20;
  const cardPad = isMobile ? 16 : 20;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: pagePadding, fontFamily: "'Inter', sans-serif", backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${C.sky}18 0%, transparent 50%)`, boxSizing: "border-box" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        @keyframes skelPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="search"]::-webkit-search-cancel-button { display: none; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ marginBottom: isMobile ? 20 : 28 }}>

        {/* Title row + Action buttons */}
        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 14 : 16, marginBottom: isMobile ? 16 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 16 }}>
            <div style={{ width: 4, height: isMobile ? 30 : 40, flexShrink: 0, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})` }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textLight, letterSpacing: "0.12em", textTransform: "uppercase" }}>Management</p>
              <h1 style={{ margin: 0, fontSize: isXs ? 20 : isMobile ? 24 : 32, fontWeight: 900, color: C.text, letterSpacing: "-0.5px", whiteSpace: isMobile ? "normal" : "nowrap" }}>Activities & Events</h1>
            </div>
          </div>

          {/* Action buttons — aligned right on desktop, full width on mobile */}
          <div style={{ display: "flex", flexDirection: isXs ? "column" : "row", gap: 10, width: isMobile ? "100%" : "auto", flexShrink: 0 }}>
            <OutlineBtn onClick={() => setModal({ type: "activity", data: null })} compact={isMobile}><Plus size={14} /> New Activity</OutlineBtn>
            <PrimaryBtn onClick={() => setModal({ type: "event", data: null })} compact={isMobile}><Trophy size={14} /> New Event</PrimaryBtn>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: statCols, gap: isMobile ? 10 : 16 }}>
          <StatCard IconComp={LayoutGrid} label="Total Activities" value={activities.length} delay={0} loading={loading} compact={isMobile} />
          <StatCard IconComp={Trophy} label="Active Events" value={events.length} color={C.success} delay={100} loading={loading} compact={isMobile} />
          <StatCard IconComp={Users} label="Participation" value="84%" color={C.sky} delay={200} loading={loading} compact={isMobile} />
        </div>
      </div>

      {/* ── MAIN TABLE CARD ── */}
      <div className="fade-up" style={{ background: C.white, borderRadius: isMobile ? 18 : 22, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(56,73,89,0.07)", overflow: "hidden", animationDelay: "300ms" }}>

        {/* Toolbar */}
        <div style={{ padding: isMobile ? "14px 16px" : "20px 24px", borderBottom: `1.5px solid ${C.borderLight}`, background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)` }}>

          {/* Tabs + Search row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: isMobile ? 16 : 24, flexShrink: 0 }}>
              {["activities", "events"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "8px 0", fontWeight: 800, fontSize: isMobile ? 13 : 14, color: tab === t ? C.deep : C.textLight, borderBottom: tab === t ? `2px solid ${C.deep}` : "2px solid transparent", cursor: "pointer", textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Search: icon-only toggle on mobile, full input on desktop */}
            {isMobile ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {searchOpen ? (
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={13} color={C.textLight} style={{ position: "absolute", left: 10, pointerEvents: "none" }} />
                    <input autoFocus type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "7px 10px 7px 30px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, outline: "none", width: isXs ? 140 : 180 }} />
                    <button onClick={() => { setSearchOpen(false); setSearch(""); }} style={{ background: "none", border: "none", padding: "0 0 0 6px", cursor: "pointer", color: C.textLight }}><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)} style={{ width: 34, height: 34, borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}>
                    <Search size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <Search size={14} color={C.textLight} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "8px 12px 8px 36px", borderRadius: 10, border: `1.5px solid ${C.borderLight}`, background: C.white, fontSize: 13, outline: "none", width: isTablet ? 200 : 240 }} />
              </div>
            )}
          </div>
        </div>

        {/* Card Grid */}
        <div style={{ padding: isMobile ? 14 : 24 }}>
          {loading ? <SkeletonCards vw={vw} /> : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: C.textLight }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${C.sky}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {tab === "activities" ? <BookOpen size={24} color={C.slate} /> : <Trophy size={24} color={C.slate} />}
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: C.text }}>No {tab} found</p>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>{search ? "Try a different search term" : `Create your first ${tab === "activities" ? "activity" : "event"}`}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: cardCols, gap: cardGap }}>
              {filtered.map((item, idx) => (
                <div key={item.id || idx}
                  style={{ padding: cardPad, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, background: C.white, transition: "all 0.25s", cursor: "default" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(56,73,89,0.08)"; e.currentTarget.style.borderColor = C.sky; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.borderLight; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.sky}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {tab === "activities" ? <BookOpen size={16} color={C.deep} /> : <Trophy size={16} color={C.warn} />}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setModal({ type: tab === "activities" ? "activity" : "event", data: item })} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.textLight, cursor: "pointer" }}><Edit2 size={13} /></button>
                      <button style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.danger}30`, background: `${C.danger}08`, display: "flex", alignItems: "center", justifyContent: "center", color: C.danger, cursor: "pointer" }}><Archive size={13} /></button>
                    </div>
                  </div>
                  <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{item.name}</h3>
                  <p style={{ fontSize: 12, color: C.textLight, marginTop: 4, lineHeight: 1.5, margin: "4px 0 0" }}>{item.description || "No description available."}</p>

                  {/* Optional tags row */}
                  {(item.category || item.status || item.participationType) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {item.category && CATEGORY_META[item.category] && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${CATEGORY_META[item.category].color}15`, color: CATEGORY_META[item.category].color }}>
                          {CATEGORY_META[item.category].label}
                        </span>
                      )}
                      {item.status && EVENT_STATUS_META[item.status] && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${EVENT_STATUS_META[item.status].color}15`, color: EVENT_STATUS_META[item.status].color }}>
                          {EVENT_STATUS_META[item.status].label}
                        </span>
                      )}
                      {item.participationType && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${C.sky}20`, color: C.deep }}>
                          {item.participationType}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {modal?.type === "activity" && (
        <ActivityFormModal editing={modal.data} academicYears={academicYears} classSections={classSections} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} pushToast={pushToast} vw={vw} />
      )}
      {modal?.type === "event" && (
        <EventFormModal editing={modal.data} academicYears={academicYears} classSections={classSections} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} pushToast={pushToast} vw={vw} />
      )}
    </div>
  );
}