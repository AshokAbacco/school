// client/src/components/HolidayList.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getToken } from "../auth/storage";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Building2,
  GraduationCap,
  Search,
  ChevronDown,
} from "lucide-react";

// ── Same color system as OnlineClassesPage ─────────────────────
const C = {
  slate:       "#6A89A7",
  mist:        "#BDDDFC",
  sky:         "#88BDF2",
  deep:        "#384959",
  deepDark:    "#243340",
  bg:          "#EDF3FA",
  white:       "#FFFFFF",
  border:      "#C8DCF0",
  borderLight: "#DDE9F5",
  text:        "#243340",
  textLight:   "#6A89A7",
};

// ── Accent palettes per holiday type ──────────────────────────
const GOV = {
  accent:    "#6366f1",
  accentBg:  "#eef2ff",
  accentMid: "#818cf8",
};
const SCH = {
  accent:    "#0891b2",
  accentBg:  "#ecfeff",
  accentMid: "#22d3ee",
};

// ── helpers ────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function govLabel(month, day) {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

function schoolDateLabel(startDate, endDate) {
  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  if (!endDate) return fmt(startDate);
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// ── Skeleton pulse (same as OnlineClassesPage) ─────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

// ── Input / Select / Label helpers (mirrors OnlineClassesPage) ─
function Label({ children }) {
  return (
    <label style={{
      fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
      color: C.text, display: "block", marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

function Input({ style, ...props }) {
  return (
    <input {...props} style={{
      width: "100%", padding: "10px 14px", borderRadius: 12,
      border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
      fontSize: 13, color: C.text, background: C.bg, outline: "none",
      marginBottom: 14, boxSizing: "border-box", ...style,
    }} />
  );
}

function SelectInput({ children, style, ...props }) {
  return (
    <select {...props} style={{
      width: "100%", padding: "10px 14px", borderRadius: 12,
      border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
      fontSize: 13, color: C.text, background: C.bg, outline: "none",
      marginBottom: 14, cursor: "pointer", boxSizing: "border-box", ...style,
    }}>
      {children}
    </select>
  );
}

// ── Modal wrapper (identical pattern) ─────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)", width: "100%",
        maxWidth: 520, padding: "22px 22px", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{
            margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 14,
            fontWeight: 800, color: C.text, flex: 1, marginRight: 10,
          }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bg, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.textLight, fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function HolidayList({ apiBase, isAdmin = false }) {
  const token = () => getToken();

  const [holidays,      setHolidays]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState("");
  const [filterType,    setFilterType]    = useState("ALL");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear,  setSelectedYear]  = useState("");

  const [modal,       setModal]       = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", type: "GOVERNMENT",
    month: "", day: "", startDate: "", endDate: "", academicYearId: "",
  });

  // ── fetch academic years ───────────────────────────────────
  const fetchYears = useCallback(async () => {
    try {
      const base = import.meta.env.VITE_API_URL;
      const res  = await fetch(`${base}/api/academic-years`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAcademicYears(Array.isArray(data) ? data : data.data ?? []);
    } catch (_) {}
  }, []);

  // ── fetch holidays ─────────────────────────────────────────
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.set("type", filterType);
      if (selectedYear)         params.set("academicYearId", selectedYear);

      const res = await fetch(`${apiBase}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Failed to load holidays. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, filterType, selectedYear]);

  useEffect(() => { fetchYears(); },    [fetchYears]);
  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  // ── form helpers ───────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm({ title:"", description:"", type:"GOVERNMENT", month:"", day:"", startDate:"", endDate:"", academicYearId:"" });
    setFormErr("");
    setModal(true);
  };

  const openEdit = (h) => {
    setEditTarget(h);
    setForm({
      title:          h.title,
      description:    h.description || "",
      type:           h.type,
      month:          h.month     ?? "",
      day:            h.day       ?? "",
      startDate:      h.startDate ? h.startDate.slice(0, 10) : "",
      endDate:        h.endDate   ? h.endDate.slice(0, 10)   : "",
      academicYearId: h.academicYearId ?? "",
    });
    setFormErr("");
    setModal(true);
  };

  const handleSave = async () => {
    setFormErr("");
    setSaving(true);
    try {
      const method = editTarget ? "PUT" : "POST";
      const url    = editTarget ? `${apiBase}/${editTarget.id}` : apiBase;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormErr(data.message || "Save failed."); return; }
      setModal(false);
      fetchHolidays();
    } catch (e) {
      setFormErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      setDeleteTarget(null);
      fetchHolidays();
    } catch (_) {}
    finally { setDeleting(false); }
  };

  // ── filtered lists ─────────────────────────────────────────
  const visible       = holidays.filter((h) => h.title.toLowerCase().includes(search.toLowerCase()));
  const govHolidays   = visible.filter((h) => h.type === "GOVERNMENT");
  const schoolHolidays = visible.filter((h) => h.type === "SCHOOL");

  const filterTabs = ["ALL", "GOVERNMENT", "SCHOOL"];

  // ── render ─────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .hl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important; }
        .hl-card { transition: transform 0.2s, box-shadow 0.2s; }
        .hl-row:hover { background: #fafcff !important; }
        .hl-row { transition: background 0.15s; }
        .filter-btn { transition: all 0.15s; }
        .icon-btn:hover { opacity: 0.8; }
      `}</style>

      <div style={{
        padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)",
        minHeight: "100vh", background: C.bg,
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Vertical accent bar — same as OnlineClassesPage */}
              <div style={{
                width: 4, height: 28, borderRadius: 99,
                background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
                flexShrink: 0,
              }} />
              <div>
                <h1 style={{
                  margin: 0, fontSize: "clamp(18px, 5vw, 26px)",
                  fontWeight: 800, color: C.text, letterSpacing: "-0.5px",
                }}>
                  Holidays
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                  {isAdmin
                    ? "Manage government and school holidays"
                    : "View all government and school holidays"}
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={openAdd}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 18px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: "#fff", fontFamily: "'Inter', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                <Plus size={15} /> Add Holiday
              </button>
            )}
          </div>
        </div>

        {/* ── Filter tabs (pill style — same as OnlineClassesPage) ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }} className="fade-up">
          {filterTabs.map((t) => (
            <button
              key={t}
              className="filter-btn"
              onClick={() => setFilterType(t)}
              style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${filterType === t ? C.deep : C.border}`,
                background: filterType === t ? C.deep : C.white,
                color: filterType === t ? "#fff" : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              {t === "ALL" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}

          {/* Search — inline with tabs on larger screens */}
          <div style={{ position: "relative", marginLeft: "auto", minWidth: 200 }}>
            <Search size={13} style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: C.textLight, pointerEvents: "none",
            }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holidays…"
              style={{
                paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                borderRadius: 99, border: `1.5px solid ${C.border}`,
                background: C.white, color: C.text, fontSize: 12,
                fontFamily: "'Inter', sans-serif", outline: "none", width: "100%",
              }}
            />
          </div>

          {/* Academic year filter */}
          {(filterType === "SCHOOL" || filterType === "ALL") && academicYears.length > 0 && (
            <div style={{ position: "relative" }}>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  appearance: "none", padding: "6px 28px 6px 12px", borderRadius: 99,
                  border: `1.5px solid ${C.border}`, background: C.white,
                  color: C.text, fontSize: 12, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", outline: "none",
                }}
              >
                <option value="">All Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{
                position: "absolute", right: 10, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none", color: C.textLight,
              }} />
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 14px", borderRadius: 12, background: "#fee8e8",
            border: "1px solid #f5b0b0", marginBottom: 16, fontSize: 13, color: "#8b1c1c",
          }}>
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        )}

        {/* ── Loading skeletons (same pattern as OnlineClassesPage) ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{
                background: C.white, borderRadius: 16,
                border: `1.5px solid ${C.borderLight}`, padding: 18,
              }}>
                {/* Section header skeleton */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <Pulse w={28} h={28} r={8} />
                  <Pulse w="30%" h={13} />
                  <div style={{ marginLeft: "auto" }}><Pulse w={28} h={20} r={99} /></div>
                </div>
                {[1, 2, 3].map((j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: `1px solid ${C.borderLight}` }}>
                    <Pulse w={10} h={10} r={99} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <Pulse w="50%" h={12} /><Pulse w="30%" h={10} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">

            {/* ── Government Holidays card ── */}
            {(filterType === "ALL" || filterType === "GOVERNMENT") && (
              <HolidaySection
                icon={<Building2 size={15} style={{ color: GOV.accent }} />}
                title="Government Holidays"
                palette={GOV}
                count={govHolidays.length}
                isAdmin={isAdmin}
              >
                {govHolidays.length === 0 ? (
                  <EmptyRow message="No government holidays found." />
                ) : (
                  govHolidays.map((h, idx) => (
                    <HolidayRow
                      key={h.id}
                      holiday={h}
                      label={govLabel(h.month, h.day)}
                      palette={GOV}
                      isAdmin={isAdmin}
                      onEdit={() => openEdit(h)}
                      onDelete={() => setDeleteTarget(h)}
                      delay={idx * 40}
                    />
                  ))
                )}
              </HolidaySection>
            )}

            {/* ── School Holidays card ── */}
            {(filterType === "ALL" || filterType === "SCHOOL") && (
              <HolidaySection
                icon={<GraduationCap size={15} style={{ color: SCH.accent }} />}
                title="School Holidays"
                palette={SCH}
                count={schoolHolidays.length}
                isAdmin={isAdmin}
              >
                {schoolHolidays.length === 0 ? (
                  <EmptyRow message="No school holidays found." />
                ) : (
                  schoolHolidays.map((h, idx) => (
                    <HolidayRow
                      key={h.id}
                      holiday={h}
                      label={schoolDateLabel(h.startDate, h.endDate)}
                      palette={SCH}
                      isAdmin={isAdmin}
                      onEdit={() => openEdit(h)}
                      onDelete={() => setDeleteTarget(h)}
                      yearName={h.academicYear?.name}
                      delay={idx * 40}
                    />
                  ))
                )}
              </HolidaySection>
            )}

            {/* All-empty state */}
            {visible.length === 0 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: `${C.mist}55`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <CalendarDays size={26} color={C.slate} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep }}>No holidays found</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>
                  {search ? `No results for "${search}"` : "No holidays have been added yet"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && isAdmin && (
        <Modal onClose={() => setModal(false)} title={editTarget ? "Edit Holiday" : "Add Holiday"}>
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Republic Day"
            />

            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional note"
              rows={2}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
                fontSize: 13, color: C.text, background: C.bg, outline: "none",
                resize: "vertical", marginBottom: 14, boxSizing: "border-box",
              }}
            />

            <Label>Type *</Label>
            <SelectInput
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="GOVERNMENT">Government</option>
              <option value="SCHOOL">School</option>
            </SelectInput>

            {form.type === "GOVERNMENT" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label>Month *</Label>
                  <SelectInput
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                  >
                    <option value="">Select month</option>
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </SelectInput>
                </div>
                <div>
                  <Label>Day *</Label>
                  <Input
                    type="number" min={1} max={31}
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    placeholder="1–31"
                  />
                </div>
              </div>
            )}

            {form.type === "SCHOOL" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <Label>Academic Year *</Label>
                <SelectInput
                  value={form.academicYearId}
                  onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                >
                  <option value="">Select year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </SelectInput>
              </>
            )}

            {formErr && (
              <p style={{ color: "#be123c", fontSize: 12, margin: "0 0 12px" }}>{formErr}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setModal(false)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  border: `1.5px solid ${C.border}`, background: C.white,
                  color: C.textLight, fontFamily: "'Inter', sans-serif",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, padding: "10px", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                  color: "#fff", fontFamily: "'Inter', sans-serif",
                  fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editTarget ? "Save Changes" : "Add Holiday"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && isAdmin && (
        <Modal onClose={() => setDeleteTarget(null)} title="Delete Holiday">
          <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: C.text }}>{deleteTarget.title}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setDeleteTarget(null)}
              style={{
                flex: 1, padding: "10px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, background: C.white,
                color: C.textLight, fontFamily: "'Inter', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                flex: 1, padding: "10px", borderRadius: 12, border: "none",
                background: "#ef4444", color: "#fff",
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.75 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Section card wrapper ───────────────────────────────────────
function HolidaySection({ icon, title, palette, count, children }) {
  return (
    <div className="hl-card" style={{
      background: C.white, borderRadius: 16,
      border: `1.5px solid ${C.borderLight}`,
      boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
      overflow: "hidden",
    }}>
      {/* Section header — same pill count badge as OnlineClassesPage status badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderBottom: `1.5px solid ${C.borderLight}`,
        background: "#fafcff",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: palette.accentBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
          {title}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 700,
          padding: "3px 10px", borderRadius: 99,
          background: palette.accentBg, color: palette.accent,
          fontFamily: "'Inter', sans-serif",
        }}>
          {count}
        </span>
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

// ── Holiday row ────────────────────────────────────────────────
function HolidayRow({ holiday, label, palette, isAdmin, onEdit, onDelete, yearName, delay = 0 }) {
  return (
    <div
      className="hl-row"
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "14px 18px", background: "transparent",
        borderTop: `1px solid ${C.borderLight}`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Colour dot */}
      <div style={{
        width: 10, height: 10, borderRadius: "50%",
        background: palette.accent, flexShrink: 0, marginTop: 4,
      }} />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
          {holiday.title}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <CalendarDays size={11} color={C.textLight} />
          {label}
          {yearName && (
            <span style={{
              padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 600,
              background: palette.accentBg, color: palette.accent,
            }}>
              {yearName}
            </span>
          )}
        </p>
        {holiday.description && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8fafc4" }}>
            {holiday.description}
          </p>
        )}
      </div>

      {/* Admin actions — same icon button pattern */}
      {isAdmin && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            className="icon-btn"
            onClick={onEdit}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: C.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Pencil size={13} color={C.slate} />
          </button>
          <button
            className="icon-btn"
            onClick={onDelete}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: "1.5px solid #f5b0b0", background: "#fff5f5",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} color="#c0392b" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Empty row ──────────────────────────────────────────────────
function EmptyRow({ message }) {
  return (
    <div style={{
      padding: "28px 18px", textAlign: "center",
      fontSize: 12, color: C.textLight,
      borderTop: `1px solid ${C.borderLight}`,
    }}>
      {message}
    </div>
  );
}