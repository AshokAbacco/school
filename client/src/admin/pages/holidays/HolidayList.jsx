// client/src/admin/pages/holidays/HolidayList.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import PageLayout from "../../components/PageLayout";
import {
  CalendarDays, Plus, Trash2, Pencil, X,
  Loader2, Building2, GraduationCap, AlertCircle, Check, RefreshCw,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;
const BASE = `${API_URL}/api`;

// ─── Design tokens — matches CurriculumPage / AwardsPage exactly ─────────────
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatGovDate(month, day) {
  if (!month || !day) return "—";
  return `${MONTHS[month - 1]} ${day}`;
}

function formatSchoolDate(start, end) {
  if (!start) return "—";
  const s = new Date(start).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  if (!end) return s;
  const e = new Date(end).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  return s === e ? s : `${s} – ${e}`;
}

// ── Pulse skeleton ────────────────────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return <div className="animate-pulse" style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }} />;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", borderRadius: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      background: type === "error" ? "#FFF1F2" : "#F0FDF4",
      color:      type === "error" ? "#BE123C"  : "#15803D",
      border:     `1px solid ${type === "error" ? "#FECDD3" : "#86EFAC"}`,
      fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
      minWidth: 240,
    }}>
      {type === "error" ? <AlertCircle size={15} /> : <Check size={15} />}
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, display: "flex" }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Modal input style ─────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text,
  background: C.bg, outline: "none", fontFamily: "'Inter', sans-serif",
  transition: "border-color 0.15s",
};

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "", description: "", type: "GOVERNMENT",
  month: "", day: "", startDate: "", endDate: "", academicYearId: "",
};

function HolidayModal({ holiday, academicYears, onClose, onSaved }) {
  const isEdit = !!holiday;
  const [form, setForm] = useState(isEdit ? {
    title: holiday.title || "", description: holiday.description || "",
    type: holiday.type || "GOVERNMENT",
    month: holiday.month || "", day: holiday.day || "",
    startDate: holiday.startDate ? holiday.startDate.split("T")[0] : "",
    endDate:   holiday.endDate   ? holiday.endDate.split("T")[0]   : "",
    academicYearId: holiday.academicYearId || "",
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.title.trim()) return setErr("Title is required.");
    if (form.type === "GOVERNMENT") {
      if (!form.month || !form.day) return setErr("Month and day are required.");
    } else {
      if (!form.startDate) return setErr("Start date is required.");
      if (!form.academicYearId) return setErr("Academic year is required.");
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        ...(form.type === "GOVERNMENT"
          ? { month: Number(form.month), day: Number(form.day) }
          : { startDate: form.startDate, endDate: form.endDate || null, academicYearId: form.academicYearId }),
      };
      const url = isEdit ? `${BASE}/admin/holidays/${holiday.id}` : `${BASE}/admin/holidays`;
      const r   = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const j   = await r.json();
      if (!r.ok) throw new Error(j.message || `HTTP ${r.status}`);
      onSaved(j, isEdit ? "updated" : "created");
    } catch (e) {
      setErr(e.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const cardWrap = { background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.18)", width: "100%", maxWidth: 480 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={cardWrap}>

        {/* Header — same pattern as CurriculumPage cards */}
        <div style={{ padding: "14px 20px", background: `linear-gradient(90deg, ${C.bg}, ${C.white})`, borderBottom: `1.5px solid ${C.borderLight}`, borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CalendarDays size={16} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{isEdit ? "Edit Holiday" : "Add Holiday"}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{isEdit ? "Update holiday details" : "Create a new holiday entry"}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textLight }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type toggle */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>Holiday Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "GOVERNMENT", label: "Government", Icon: Building2 },
                { key: "SCHOOL",     label: "School",     Icon: GraduationCap },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => set("type", key)} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "9px 0", borderRadius: 10, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
                  background: form.type === key ? `linear-gradient(135deg, ${C.slate}, ${C.deep})` : C.bg,
                  color: form.type === key ? "#fff" : C.textLight,
                  border: `1.5px solid ${form.type === key ? C.deep : C.border}`,
                  transition: "all 0.15s",
                }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Title *">
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="e.g. Independence Day" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.sky}
              onBlur={e  => e.target.style.borderColor = C.border} />
          </Field>

          <Field label="Description">
            <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional note" style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.sky}
              onBlur={e  => e.target.style.borderColor = C.border} />
          </Field>

          {form.type === "GOVERNMENT" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Month *">
                <select value={form.month} onChange={e => set("month", e.target.value)} style={inputStyle}>
                  <option value="">Select</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="Day *">
                <input type="number" min={1} max={31} value={form.day}
                  onChange={e => set("day", e.target.value)} placeholder="1–31" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = C.sky}
                  onBlur={e  => e.target.style.borderColor = C.border} />
              </Field>
            </div>
          )}

          {form.type === "SCHOOL" && (
            <>
              <Field label="Academic Year *">
                <select value={form.academicYearId} onChange={e => set("academicYearId", e.target.value)} style={inputStyle}>
                  <option value="">Select academic year</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Start Date *">
                  <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.sky}
                    onBlur={e  => e.target.style.borderColor = C.border} />
                </Field>
                <Field label="End Date">
                  <input type="date" value={form.endDate} min={form.startDate}
                    onChange={e => set("endDate", e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.sky}
                    onBlur={e  => e.target.style.borderColor = C.border} />
                </Field>
              </div>
            </>
          )}

          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#FFF1F2", border: "1px solid #FECDD3", fontSize: 12, fontWeight: 600, color: "#BE123C", fontFamily: "'Inter', sans-serif" }}>
              <AlertCircle size={13} /> {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1.5px solid ${C.borderLight}`, display: "flex", gap: 10, borderRadius: "0 0 20px 20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textLight, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 2, padding: "10px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.75 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Add Holiday"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Dialog ─────────────────────────────────────────────────────────────
function DeleteDialog({ holiday, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/admin/holidays/${holiday.id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) { const j = await r.json(); throw new Error(j.message || "Delete failed"); }
      onDeleted(holiday.id);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(36,51,64,0.45)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 24px 64px rgba(56,73,89,0.18)", width: "100%", maxWidth: 360, padding: "28px 24px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "#FFF1F2", border: "1px solid #FECDD3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#BE123C" />
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Delete Holiday?</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textLight, margin: "0 0 24px" }}>
          <strong>"{holiday.title}"</strong> will be permanently removed.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.textLight, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none",
            background: "#BE123C", color: "#fff",
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {loading && <Loader2 size={13} className="animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Holiday Table ─────────────────────────────────────────────────────────────
function HolidayTable({ holidays, dateCell, dateLabel, yearCol, academicYears = [], onEdit, onDelete }) {
  const yearMap = useMemo(() => {
    const m = {}; academicYears.forEach(y => { m[y.id] = y.name; }); return m;
  }, [academicYears]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${C.borderLight}`, background: C.bg }}>
            {["Title", dateLabel, ...(yearCol ? ["Academic Year"] : []), "Description", "Actions"].map(h => (
              <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holidays.map((h, i) => (
            <tr key={h.id}
              style={{ borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? C.white : `${C.mist}08`, transition: "background 0.12s", cursor: "default" }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.sky}10`}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.white : `${C.mist}08`}>
              {/* Title */}
              <td style={{ padding: "12px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${C.sky}33, ${C.mist}55)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CalendarDays size={14} color={C.slate} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{h.title}</span>
                </div>
              </td>
              {/* Date */}
              <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 500, color: C.textLight, whiteSpace: "nowrap" }}>{dateCell(h)}</td>
              {/* Year */}
              {yearCol && <td style={{ padding: "12px 18px", fontSize: 13, color: C.textLight }}>{yearMap[h.academicYearId] || "—"}</td>}
              {/* Description */}
              <td style={{ padding: "12px 18px", fontSize: 12, color: C.textLight, fontStyle: h.description ? "normal" : "italic" }}>
                {h.description || "—"}
              </td>
              {/* Actions */}
              <td style={{ padding: "12px 18px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(h)} title="Edit" style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Pencil size={12} color={C.slate} />
                  </button>
                  <button onClick={() => onDelete(h)} title="Delete" style={{ width: 30, height: 30, borderRadius: 8, border: "1.5px solid #FECDD3", background: "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Trash2 size={12} color="#BE123C" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function HolidayList() {
  const [holidays, setHolidays]           = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [spinning, setSpinning]           = useState(false);
  const [filterType, setFilterType]       = useState("ALL");
  const [filterYear, setFilterYear]       = useState("ALL");
  const [modalHoliday, setModalHoliday]   = useState(undefined);
  const [deleteHoliday, setDeleteHoliday] = useState(null);
  const [toast, setToast]                 = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, yRes] = await Promise.all([
        fetch(`${BASE}/admin/holidays`,  { headers: authHeaders() }),
        fetch(`${BASE}/academic-years`, { headers: authHeaders() }),
      ]);
      const hData = await hRes.json();
      const yData = await yRes.json();
      setHolidays(Array.isArray(hData) ? hData : hData.holidays || []);
      setAcademicYears(Array.isArray(yData) ? yData : yData.academicYears || []);
    } catch {
      showToast("Failed to load holidays", "error");
    } finally { setLoading(false); }
  }, []);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    loadData().finally(() => setTimeout(() => setSpinning(false), 600));
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => holidays.filter(h => {
    if (filterType !== "ALL" && h.type !== filterType) return false;
    if (filterYear !== "ALL" && h.type === "SCHOOL" && h.academicYearId !== filterYear) return false;
    return true;
  }), [holidays, filterType, filterYear]);

  const govHolidays    = filtered.filter(h => h.type === "GOVERNMENT");
  const schoolHolidays = filtered.filter(h => h.type === "SCHOOL");

  const handleSaved = (saved, action) => {
    setHolidays(prev => action === "updated" ? prev.map(h => h.id === saved.id ? saved : h) : [...prev, saved]);
    setModalHoliday(undefined);
    showToast(`Holiday ${action} successfully`);
  };

  const handleDeleted = (id) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    setDeleteHoliday(null);
    showToast("Holiday deleted");
  };

  const totalGov    = holidays.filter(h => h.type === "GOVERNMENT").length;
  const totalSchool = holidays.filter(h => h.type === "SCHOOL").length;

  const cardWrap = { background: C.white, borderRadius: 18, border: `1.5px solid ${C.borderLight}`, boxShadow: "0 2px 16px rgba(56,73,89,0.06)", overflow: "hidden" };

  // ── Section card header (same as Curriculum/Awards) ──
  const sectionHeader = (Icon, title, count) => (
    <div style={{ padding: "14px 18px", background: `linear-gradient(90deg, ${C.bg}, ${C.white})`, borderBottom: `1.5px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.sky}, ${C.deep})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color="#fff" />
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", flex: 1 }}>{title}</p>
      <span style={{ background: `${C.mist}66`, color: C.textLight, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{count}</span>
    </div>
  );

  return (
    <PageLayout>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes hl-spin { to { transform: rotate(360deg); } }
        .hl-spinning { animation: hl-spin 0.6s linear; }
        .hl-fade { animation: fadeUp 0.45s ease forwards; }
        .hl-page { padding: 20px 16px; }
        .hl-stats { grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 480px)  { .hl-page { padding: 20px 20px; } }
        @media (min-width: 640px)  { .hl-stats { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px)  { .hl-page { padding: 24px 28px; } }
        @media (min-width: 1024px) { .hl-page { padding: 28px 32px; } }
      `}</style>

      <div className="hl-page" style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="hl-fade">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
                <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px", fontFamily: "'Inter', sans-serif" }}>
                  Holiday Management
                </h1>
              </div>
              <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                Manage government and school holidays for attendance tracking
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: `1.5px solid ${C.borderLight}`,
                  background: C.white,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: loading ? "not-allowed" : "pointer",
                  color: C.textLight,
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = `${C.mist}55`; e.currentTarget.style.borderColor = C.border; }}}
                onMouseLeave={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.borderLight; }}
              >
                <RefreshCw size={14} className={spinning ? "hl-spinning" : ""} />
              </button>

              {/* Add Holiday */}
              <button onClick={() => setModalHoliday(null)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: `0 4px 12px ${C.deep}33`,
              }}>
                <Plus size={15} /> Add Holiday
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="hl-stats hl-fade" style={{ display: "grid", gap: 14, marginBottom: 20, animationDelay: "0.05s" }}>
          {[
            { label: "Total Holidays", value: holidays.length, Icon: CalendarDays, color: C.slate },
            { label: "Government",     value: totalGov,        Icon: Building2,    color: C.sky   },
            { label: "School",         value: totalSchool,     Icon: GraduationCap, color: C.deep  },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} style={{ ...cardWrap, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "18px 18px 0 0" }} />
              <div style={{ padding: "18px 18px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <Icon size={16} color={color} />
                </div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>{value}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="hl-fade" style={{ ...cardWrap, padding: "12px 16px", marginBottom: 18, animationDelay: "0.08s", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ display: "inline-flex", gap: 2, background: `${C.mist}44`, padding: 4, borderRadius: 12 }}>
            {[
              { key: "ALL",        label: "All"        },
              { key: "GOVERNMENT", label: "Government" },
              { key: "SCHOOL",     label: "School"     },
            ].map(t => (
              <button key={t.key} onClick={() => setFilterType(t.key)} style={{
                padding: "7px 14px", borderRadius: 9, border: "none",
                background: filterType === t.key ? C.white : "transparent",
                color: filterType === t.key ? C.deep : C.textLight,
                fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: filterType === t.key ? "0 1px 6px rgba(56,73,89,0.10)" : "none",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {(filterType === "ALL" || filterType === "SCHOOL") && academicYears.length > 0 && (
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{
              marginLeft: "auto", padding: "8px 12px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 12, color: C.text,
              background: C.bg, outline: "none", fontFamily: "'Inter', sans-serif", cursor: "pointer",
            }}>
              <option value="ALL">All Academic Years</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1,2].map(i => (
              <div key={i} style={{ ...cardWrap, padding: 20 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <Pulse w={36} h={36} r={10} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Pulse w="40%" h={14} /><Pulse w="24%" h={10} />
                  </div>
                </div>
                <Pulse w="100%" h={48} r={10} />
                <div style={{ marginTop: 10 }}><Pulse w="100%" h={48} r={10} /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardWrap, padding: "56px 0", textAlign: "center" }} className="hl-fade">
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <CalendarDays size={26} color={C.sky} strokeWidth={1.5} />
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>No holidays found</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textLight, margin: "0 0 20px" }}>Add government or school holidays to get started.</p>
            <button onClick={() => setModalHoliday(null)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              <Plus size={14} /> Add Holiday
            </button>
          </div>
        ) : (
          <div className="hl-fade" style={{ display: "flex", flexDirection: "column", gap: 16, animationDelay: "0.12s" }}>
            {govHolidays.length > 0 && (filterType === "ALL" || filterType === "GOVERNMENT") && (
              <div style={cardWrap}>
                {sectionHeader(Building2, "Government Holidays", govHolidays.length)}
                <HolidayTable holidays={govHolidays}
                  dateCell={h => formatGovDate(h.month, h.day)}
                  dateLabel="Date (Every Year)"
                  onEdit={h => setModalHoliday(h)} onDelete={h => setDeleteHoliday(h)} />
              </div>
            )}
            {schoolHolidays.length > 0 && (filterType === "ALL" || filterType === "SCHOOL") && (
              <div style={cardWrap}>
                {sectionHeader(GraduationCap, "School Holidays", schoolHolidays.length)}
                <HolidayTable holidays={schoolHolidays}
                  dateCell={h => formatSchoolDate(h.startDate, h.endDate)}
                  dateLabel="Date Range" yearCol academicYears={academicYears}
                  onEdit={h => setModalHoliday(h)} onDelete={h => setDeleteHoliday(h)} />
              </div>
            )}
          </div>
        )}
      </div>

      {modalHoliday !== undefined && (
        <HolidayModal holiday={modalHoliday} academicYears={academicYears}
          onClose={() => setModalHoliday(undefined)} onSaved={handleSaved} />
      )}
      {deleteHoliday && (
        <DeleteDialog holiday={deleteHoliday} onClose={() => setDeleteHoliday(null)} onDeleted={handleDeleted} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </PageLayout>
  );
}