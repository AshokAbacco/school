// client/src/superAdmin/pages/IdCards/IdCardManagement.jsx
import React, { useEffect, useState, useRef } from "react";
import { getToken } from "../../../auth/storage";
import {
  Upload, LayoutTemplate, ShoppingBag, Trash2,
  RefreshCw, CheckCircle, X, ShoppingCart, Eye,
  Palette, RotateCcw, BookOpen,
} from "lucide-react";
import {
  ClassicVerticalCard,
  HorizontalSplitCard,
  MinimalModernCard,
  RoyalSouthIndianCard,
  MaroonCreamCard,
  CBSEGreenCard,
  CorporateSidebarCard,
  getTemplateComponent,
  SAMPLE_STUDENT,
} from "./idCardTemplates.jsx";

const API = import.meta.env.VITE_API_URL;

const STATUS_CONFIG = {
  PENDING:    { label: "Pending",    color: "#f59e0b", bg: "#fffbeb" },
  CONFIRMED:  { label: "Confirmed",  color: "#3b82f6", bg: "#eff6ff" },
  PROCESSING: { label: "Processing", color: "#8b5cf6", bg: "#f5f3ff" },
  DISPATCHED: { label: "Dispatched", color: "#f97316", bg: "#fff7ed" },
  DELIVERED:  { label: "Delivered",  color: "#10b981", bg: "#f0fdf4" },
  CANCELLED:  { label: "Cancelled",  color: "#ef4444", bg: "#fef2f2" },
};

const COLORS = {
  primary:   "#1e3a5f",
  secondary: "#6b7280",
  border:    "#e5e7eb",
  bgSoft:    "#f9fafb",
  accent:    "#3b82f6",
};

// ── Sample student for ID card preview ───────────────────────────────────────
const SAMPLE = {
  name:        "Aaliya Fathima",
  admissionNo: "ADM-2024-042",
  class:       "Grade 7 — Section A",
  fatherName:  "Mr. Mohammed Aslam",
  busNo:       "07",
  bloodGroup:  "B+",
  contactNo:   "9876543210",
};

const DEFAULT_THEME = {
  primary: "#1a5c38",
  accent:  "#c9a84c",
};

const PRESETS = [
  { primary: "#1a5c38", accent: "#c9a84c", label: "Green Gold" },
  { primary: "#1e3a5f", accent: "#e8b84b", label: "Navy Gold" },
  { primary: "#7b1f1f", accent: "#d4a853", label: "Maroon Gold" },
  { primary: "#1a237e", accent: "#ff6f00", label: "Blue Orange" },
  { primary: "#212121", accent: "#e53935", label: "Black Red" },
];

// ── IDCardPreview — uses ClassicVerticalCard from idCardTemplates.js ──────────
function IDCardPreview({ theme, logo }) {
  return <ClassicVerticalCard theme={theme} logo={logo} student={SAMPLE_STUDENT} />;
}

// ── MiniCard thumbnail — tiny version for template picker ─────────────────────
function MiniCard({ primary, accent }) {
  return (
    <div style={{
      width: "100%", background: "white", borderRadius: 8,
      border: `1.5px solid ${primary}`, overflow: "hidden", fontFamily: "sans-serif",
    }}>
      <div style={{ background: primary, padding: "6px 4px", textAlign: "center" }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", background: "white",
          border: `1.5px solid ${accent}`, margin: "0 auto 3px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 8, color: primary }}>★</span>
        </div>
      </div>
      <div style={{ padding: "4px", textAlign: "center" }}>
        <div style={{ width: 24, height: 30, background: "#f3f4f6", borderRadius: 3, margin: "0 auto 3px", border: `1px solid ${accent}` }} />
        <div style={{ background: accent, borderRadius: 3, padding: "1px 4px", marginBottom: 3 }}>
          <span style={{ fontSize: 7, color: "white", fontWeight: 700 }}>STUDENT NAME</span>
        </div>
        {["Class", "Father", "Blood"].map((l) => (
          <div key={l} style={{ display: "flex", gap: 2, marginBottom: 1 }}>
            <span style={{ fontSize: 6, color: "#9ca3af", flex: 1, textAlign: "left" }}>{l}</span>
            <span style={{ fontSize: 6, color: "#374151", fontWeight: 600 }}>——</span>
          </div>
        ))}
      </div>
      <div style={{ background: primary, padding: "2px 4px", textAlign: "center" }}>
        <span style={{ fontSize: 6, color: accent, fontWeight: 700, letterSpacing: 1 }}>ID CARD</span>
      </div>
    </div>
  );
}

// ── Color row ─────────────────────────────────────────────────────────────────
function ColorRow({ label, hint, value, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold" style={{ color: COLORS.primary }}>{label}</span>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg border" style={{ background: value, borderColor: COLORS.border }} />
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border-0 p-0"
            style={{ background: "transparent" }} />
          <span className="text-xs font-mono" style={{ color: COLORS.secondary }}>{value}</span>
        </div>
      </div>
      {hint && <p className="text-[10px] mt-1 px-1" style={{ color: COLORS.secondary }}>{hint}</p>}
    </div>
  );
}

// ── Available base templates for customization ────────────────────────────────
const BASE_TEMPLATES = [
  { key: "CLASSIC_VERTICAL",  label: "Classic Vertical",   Component: ClassicVerticalCard  },
  { key: "NAVY_HORIZONTAL",   label: "Horizontal Split",   Component: HorizontalSplitCard  },
  { key: "MINIMAL_MODERN",    label: "Minimal Modern",     Component: MinimalModernCard    },
  { key: "ROYAL_SOUTH",       label: "Royal South Indian", Component: RoyalSouthIndianCard },
  { key: "MAROON_CREAM",      label: "Maroon & Cream",     Component: MaroonCreamCard      },
  { key: "CBSE_GREEN",        label: "CBSE Green Clean",   Component: CBSEGreenCard        },
  { key: "CORPORATE_SIDEBAR", label: "Corporate Sidebar",  Component: CorporateSidebarCard },
];

// ── Customize tab content ─────────────────────────────────────────────────────
function CustomizeTab({ onTemplateSaved }) {
  const [selectedKey, setSelectedKey] = useState("CLASSIC_VERTICAL");
  const [theme, setTheme]             = useState(DEFAULT_THEME);
  const [logo, setLogo]               = useState(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [showNamePopup, setShowNamePopup] = useState(false);
  const [themeName, setThemeName]         = useState("");
  const logoRef = useRef();

  const setColor = (key) => (val) => setTheme((t) => ({ ...t, [key]: val }));

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (file) setLogo(URL.createObjectURL(file));
  };

  const handleSaveClick = () => {
    const base = BASE_TEMPLATES.find((t) => t.key === selectedKey);
    setThemeName(base?.label || "");
    setSaveError("");
    setShowNamePopup(true);
  };

  const handleConfirmSave = async () => {
    if (!themeName.trim()) { setSaveError("Please enter a name."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/id-cards/templates/coded`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:        themeName.trim(),
          templateKey:  selectedKey,
          primaryColor: theme.primary,
          accentColor:  theme.accent,
          description:  `Custom theme based on ${selectedKey}`,
        }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(text); }
// AFTER
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.alreadyExists) {
        setSaveError("A template with these exact colors already exists. Try adjusting the colors.");
        setSaving(false);
        return;
      }
      setShowNamePopup(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onTemplateSaved) onTemplateSaved();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Resolve the live preview component
  const PreviewComp = BASE_TEMPLATES.find((t) => t.key === selectedKey)?.Component || ClassicVerticalCard;

  return (
    <div className="space-y-5">

      {/* ── Step 1: Pick a template layout ── */}
      <div className="rounded-xl p-4" style={{ background: "white", border: `1px solid ${COLORS.border}` }}>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.primary }}>
          Step 1 — Pick a Layout
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BASE_TEMPLATES.map(({ key, label, Component }) => (
            <div
              key={key}
              onClick={() => setSelectedKey(key)}
              className="cursor-pointer rounded-xl overflow-hidden transition-all hover:opacity-90"
              style={{
                border: `2px solid ${selectedKey === key ? COLORS.accent : COLORS.border}`,
                background: selectedKey === key ? "#eff6ff" : "white",
              }}
            >
              {/* Mini scaled preview — fixed height container, card scaled inside */}
              <div style={{
                background: "#f3f4f6",
                height: 120,
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: 4,
              }}>
                <div style={{
                  flexShrink: 0,
                  transform: key === "NAVY_HORIZONTAL" ? "scale(0.22)" : "scale(0.27)",
                  transformOrigin: "top center",
                  width: key === "NAVY_HORIZONTAL" ? 380 : 280,
                }}>
                  <Component theme={theme} logo={null} student={SAMPLE_STUDENT} />
                </div>
              </div>
              {/* Label */}
              <div className="px-2 py-2">
                <p className="text-[11px] font-bold truncate" style={{ color: selectedKey === key ? COLORS.accent : COLORS.primary }}>
                  {label}
                </p>
                {selectedKey === key && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: COLORS.accent, color: "white" }}>
                    ✓ Selected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 2: Customize colors + logo ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left controls */}
        <div className="w-full lg:w-72 space-y-4 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.primary }}>
            Step 2 — Customize Colors & Logo
          </p>

          {/* Logo */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "white", border: `1px solid ${COLORS.border}` }}>
            <p className="text-xs font-bold" style={{ color: COLORS.primary }}>School Logo</p>
            <div
              onClick={() => logoRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer hover:opacity-80 transition-all"
              style={{ border: `2px dashed ${COLORS.border}`, background: COLORS.bgSoft }}>
              {logo
                ? <img src={logo} alt="Logo" className="h-12 object-contain" />
                : <>
                    <Upload size={18} style={{ color: COLORS.secondary }} />
                    <p className="text-xs font-semibold" style={{ color: COLORS.secondary }}>Click to upload logo</p>
                    <p className="text-[10px]" style={{ color: COLORS.secondary }}>PNG or JPG recommended</p>
                  </>}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            {logo && (
              <button onClick={() => setLogo(null)} className="w-full text-xs font-semibold py-1.5 rounded-lg"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary }}>
                Remove Logo
              </button>
            )}
          </div>

          {/* Colors */}
          <div className="rounded-xl p-4 space-y-4" style={{ background: "white", border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center gap-2">
              <Palette size={13} style={{ color: COLORS.primary }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.primary }}>Colors</p>
            </div>
            <ColorRow label="Primary Color" hint="Header, footer, icons" value={theme.primary} onChange={setColor("primary")} />
            <ColorRow label="Accent Color"  hint="Ribbon, name band, borders" value={theme.accent} onChange={setColor("accent")} />

            {/* Presets */}
            <div>
              <p className="text-[10px] font-bold mb-2" style={{ color: COLORS.secondary }}>Quick presets</p>
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map((preset) => (
                  <button key={preset.label}
                    onClick={() => setTheme({ primary: preset.primary, accent: preset.accent })}
                    title={preset.label}
                    className="flex gap-0.5 rounded-lg overflow-hidden border transition-all hover:scale-105 active:scale-95"
                    style={{ borderColor: COLORS.border }}>
                    <div style={{ width: 20, height: 20, background: preset.primary }} />
                    <div style={{ width: 20, height: 20, background: preset.accent }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={handleSaveClick}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: saved ? "#10b981" : COLORS.accent }}>
              {saved ? "✓ Saved to Templates!" : "Save Theme"}
            </button>
            <button onClick={() => { setTheme(DEFAULT_THEME); setLogo(null); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary, background: "white" }}>
              <RotateCcw size={13} /> Reset Colors
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="flex-1 flex flex-col items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-wide self-start" style={{ color: COLORS.primary }}>
            Step 3 — Live Preview
          </p>
          <div className="w-full flex items-center justify-center rounded-2xl p-4 sm:p-6 overflow-x-auto"
            style={{ background: "white", border: `1px solid ${COLORS.border}`, minHeight: 400 }}>
            <div style={{ width: "100%", maxWidth: 400 }}>
              <PreviewComp theme={theme} logo={logo} student={SAMPLE_STUDENT} />
            </div>
          </div>
          <p className="text-xs text-center" style={{ color: COLORS.secondary }}>
            Preview with sample data — actual student info will appear on generated cards
          </p>
        </div>
      </div>

      {/* ── Name Popup ── */}
      {showNamePopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "white", border: `1px solid ${COLORS.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold" style={{ color: COLORS.primary }}>Name this Theme</p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.secondary }}>Appears in template picker when placing orders</p>
              </div>
              <button onClick={() => setShowNamePopup(false)} className="p-1.5 rounded-lg hover:bg-gray-100" style={{ color: COLORS.secondary }}>
                <X size={16} />
              </button>
            </div>

            {/* Color + template preview */}
            <div className="flex gap-3 mb-4 p-3 rounded-xl" style={{ background: COLORS.bgSoft, border: `1px solid ${COLORS.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: theme.primary }} />
              <div style={{ width: 28, height: 28, borderRadius: 6, background: theme.accent }} />
              <div className="flex flex-col justify-center">
                <p className="text-xs font-semibold" style={{ color: COLORS.primary }}>{theme.primary} · {theme.accent}</p>
                <p className="text-[10px]" style={{ color: COLORS.secondary }}>
                  {BASE_TEMPLATES.find((t) => t.key === selectedKey)?.label} layout
                </p>
              </div>
            </div>

            <input
              type="text"
              placeholder="e.g. Green Gold Theme, Our School Colors…"
              value={themeName}
              onChange={(e) => { setThemeName(e.target.value); setSaveError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm mb-2"
              style={{ border: `1px solid ${saveError ? "#ef4444" : COLORS.border}`, outline: "none" }}
            />
            {saveError && <p className="text-xs mb-2" style={{ color: "#ef4444" }}>{saveError}</p>}

            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowNamePopup(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary }}>Cancel</button>
              <button onClick={handleConfirmSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: saving ? "#93c5fd" : COLORS.accent }}>
                {saving ? "Saving…" : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3 coded templates to seed into DB ────────────────────────────────────────
const CODED_TEMPLATES = [
  { templateKey: "CLASSIC_VERTICAL",  title: "Classic Vertical",   primaryColor: "#1a5c38", accentColor: "#c9a84c", description: "Traditional portrait card with colored header" },
  { templateKey: "NAVY_HORIZONTAL",   title: "Horizontal Split",   primaryColor: "#1e3a5f", accentColor: "#e8b84b", description: "Modern landscape card with colored left panel" },
  { templateKey: "MINIMAL_MODERN",    title: "Minimal Modern",     primaryColor: "#212121", accentColor: "#e53935", description: "Clean minimal card with circular photo" },
  { templateKey: "ROYAL_SOUTH",       title: "Royal South Indian", primaryColor: "#1a3a5c", accentColor: "#d4a853", description: "South Indian style with ornate logo and diamond details" },
  { templateKey: "MAROON_CREAM",      title: "Maroon & Cream",     primaryColor: "#7b1f1f", accentColor: "#c9a84c", description: "Karnataka/Tamil Nadu style with cream body and ornate dividers" },
  { templateKey: "CBSE_GREEN",        title: "CBSE Green Clean",   primaryColor: "#1a5c38", accentColor: "#f59e0b", description: "CBSE school style with barcode strip" },
  { templateKey: "CORPORATE_SIDEBAR", title: "Corporate Sidebar",  primaryColor: "#1e3a5f", accentColor: "#3b82f6", description: "Professional style with vertical sidebar" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function IdCardManagement() {
  const [tab, setTab]             = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [schools, setSchools]                   = useState([]);
  const [schoolClasses, setSchoolClasses]       = useState([]);
  const [loadingClasses, setLoadingClasses]     = useState(false);
  const [expandedClass, setExpandedClass]       = useState(null);
  const [classStudents, setClassStudents]       = useState({});
  const [loadingStudents, setLoadingStudents]   = useState({});
  const [loading, setLoading]     = useState(false);

  const [uploadModal, setUploadModal]         = useState(false);
  const [orderModal, setOrderModal]           = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [uploadForm, setUploadForm]   = useState({ title: "", description: "", file: null });
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef();
  const seededRef    = useRef(false);

  const [orderForm, setOrderForm] = useState({
    schoolId: "", templateId: "", contactName: "",
    contactPhone: "", contactEmail: "", notes: "",
    classDetails: [{ className: "", studentCount: "" }],
  });
  const [orderError, setOrderError]     = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

  const fetchTemplates = async (schoolId = null) => {
    setLoading(true);
    try {
      const url  = schoolId ? `${API}/api/id-cards/templates?schoolId=${schoolId}` : `${API}/api/id-cards/templates`;
      const res  = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/id-cards/orders`, { headers: authHeaders() });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSchools = async () => {
    try {
      const res  = await fetch(`${API}/api/schools`, { headers: authHeaders() });
      const data = await res.json();
      setSchools(data.schools || data || []);
    } catch (err) { console.error(err); }
  };

  const fetchClassesForSchool = async (schoolId) => {
    if (!schoolId) { setSchoolClasses([]); return; }
    setLoadingClasses(true);
    try {
      const res  = await fetch(`${API}/api/class-sections?schoolId=${schoolId}`, { headers: authHeaders() });
      const data = await res.json();
      setSchoolClasses(data.classSections || data.classes || data || []);
    } catch (err) { console.error(err); setSchoolClasses([]); }
    finally { setLoadingClasses(false); }
  };

// AFTER
useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      seedCodedTemplates();
    }
    if (tab === "templates") fetchTemplates();
    else if (tab === "orders") fetchOrders();
  }, [tab]);

  // Seed the 3 coded templates into DB on first load (safe — backend skips duplicates)
  const seedCodedTemplates = async () => {
    try {
      await Promise.all(
        CODED_TEMPLATES.map((t) =>
          fetch(`${API}/api/id-cards/templates/coded`, {
            method:  "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body:    JSON.stringify(t),
          })
        )
      );
    } catch (err) {
      console.error("seedCodedTemplates error:", err);
    }
  };

  const handleUpload = async () => {
    setUploadError("");
    if (!uploadForm.file)  { setUploadError("Please select an image."); return; }
    if (!uploadForm.title) { setUploadError("Title is required."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadForm.file);
      fd.append("title", uploadForm.title);
      fd.append("description", uploadForm.description);
      const res  = await fetch(`${API}/api/id-cards/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadModal(false);
      setUploadForm({ title: "", description: "", file: null });
      fetchTemplates();
    } catch (err) { setUploadError(err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`${API}/api/id-cards/templates/${id}`, { method: "DELETE", headers: authHeaders() });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) { console.error(err); }
  };

  const fetchStudentsForClass = async (cls) => {
    if (classStudents[cls.id]) return;
    setLoadingStudents((p) => ({ ...p, [cls.id]: true }));
    try {
      const res  = await fetch(
        `${API}/api/students?classSectionId=${cls.id}&schoolId=${orderForm.schoolId}&limit=200&page=1`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setClassStudents((p) => ({ ...p, [cls.id]: data.students || [] }));
    } catch (err) { console.error(err); }
    finally { setLoadingStudents((p) => ({ ...p, [cls.id]: false })); }
  };

  const openOrderModal = () => {
    fetchSchools();
    setSchoolClasses([]); setExpandedClass(null);
    setClassStudents({}); setLoadingStudents({});
    setOrderForm({ schoolId: "", templateId: "", contactName: "", contactPhone: "", contactEmail: "", notes: "", classDetails: [] });
    setOrderError(""); setOrderSuccess(false);
    setOrderModal(true);
  };

  const totalCards = orderForm.classDetails.reduce((sum, r) => sum + (Number(r.studentCount) || 0), 0);

  const handlePlaceOrder = async () => {
    setOrderError("");
    if (!orderForm.schoolId) { setOrderError("Please select a school."); return; }
    const validClasses = orderForm.classDetails.filter((r) => r.className && Number(r.studentCount) > 0);
    if (validClasses.length === 0) { setOrderError("Add at least one class with student count."); return; }
    setPlacingOrder(true);
    try {
      const res = await fetch(`${API}/api/id-cards/orders/place`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: orderForm.schoolId, templateId: orderForm.templateId || null,
          contactName: orderForm.contactName || null, contactPhone: orderForm.contactPhone || null,
          contactEmail: orderForm.contactEmail || null, notes: orderForm.notes || null,
          classDetails: validClasses,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");
      setOrderSuccess(true);
      fetchOrders();
      setTimeout(() => { setOrderModal(false); setOrderSuccess(false); }, 2000);
    } catch (err) { setOrderError(err.message); }
    finally { setPlacingOrder(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await fetch(`${API}/api/id-cards/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: COLORS.bgSoft }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: COLORS.primary }}>ID Card Management</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: COLORS.secondary }}>Manage templates, customize design and place orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {tab === "templates" && (
            <button onClick={() => setUploadModal(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white"
              style={{ background: COLORS.accent }}>
              <Upload size={13} /> Upload Template
            </button>
          )}
          <button onClick={openOrderModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white"
            style={{ background: "#10b981" }}>
            <ShoppingCart size={13} /> Place Order
          </button>
        </div>
      </div>

      {/* Tabs — now 3 */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "#e5e7eb" }}>
        {[
          { key: "templates", label: "Templates", icon: LayoutTemplate },
          { key: "orders",    label: "Orders",    icon: ShoppingBag },
          { key: "customize", label: "Customize", icon: Palette },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === key ? "#fff" : "transparent",
              color:      tab === key ? COLORS.primary : COLORS.secondary,
              boxShadow:  tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Templates Tab ── */}
      {tab === "templates" && (
        loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={20} className="animate-spin" style={{ color: COLORS.accent }} />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 rounded-2xl"
            style={{ border: `2px dashed ${COLORS.border}`, background: "#fff" }}>
            <LayoutTemplate size={40} style={{ color: COLORS.border }} />
            <p className="mt-3 font-semibold" style={{ color: COLORS.secondary }}>No templates yet</p>
            <p className="text-sm mt-1" style={{ color: COLORS.secondary }}>Upload an ID card design template</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl overflow-hidden shadow-sm"
                style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>

                {/* Thumbnail — live card preview for CODED, image for UPLOADED */}
                <div className="relative p-3 flex items-start justify-center" style={{ background: "#f3f4f6", minHeight: 140, overflow: "hidden" }}>
                  {t.templateType === "CODED" ? (
                    <div style={{
                      width: t.templateKey === "NAVY_HORIZONTAL" ? 380 : 280,
                      transform: t.templateKey === "NAVY_HORIZONTAL" ? "scale(0.28)" : "scale(0.34)",
                      transformOrigin: "top center",
                      flexShrink: 0,
                    }}>
                      {(() => {
                        const Comp = getTemplateComponent(t.templateKey);
                        return (
                          <Comp
                            theme={{ primary: t.primaryColor || "#1a5c38", accent: t.accentColor || "#c9a84c" }}
                            logo={null}
                            student={SAMPLE_STUDENT}
                          />
                        );
                      })()}
                    </div>
                  ) : t.imageUrl ? (
                    <>
                      <img src={t.imageUrl} alt={t.title} className="w-full object-cover" style={{ maxHeight: 120 }} />
                      <button onClick={() => setPreviewTemplate(t)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Eye size={13} color="#fff" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center" style={{ minHeight: 100 }}>
                      <LayoutTemplate size={32} style={{ color: COLORS.border }} />
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="font-bold text-sm truncate" style={{ color: COLORS.primary }}>{t.title}</p>

                  {/* Type badge */}
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-1"
                    style={{
                      background: t.templateType === "CODED" ? "#f0fdf4" : "#eff6ff",
                      color:      t.templateType === "CODED" ? "#15803d" : "#3b82f6",
                    }}>
                    {t.templateType === "CODED" ? "⚡ Built-in Template" : "🖼 Uploaded Design"}
                  </span>

                  {t.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: COLORS.secondary }}>{t.description}</p>}

                  {/* Color swatches for coded templates */}
                  {t.templateType === "CODED" && (
                    <div className="flex gap-1.5 mt-2">
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: t.primaryColor }} title="Primary" />
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: t.accentColor }} title="Accent" />
                      <span className="text-[10px] ml-1" style={{ color: COLORS.secondary }}>Current colors</span>
                    </div>
                  )}

                  <p className="text-xs mt-2" style={{ color: COLORS.secondary }}>
                    {new Date(t.uploadedAt).toLocaleDateString("en-IN")}
                  </p>

                  {/* Only allow delete for uploaded templates */}
                  {t.templateType !== "CODED" && (
                    <button onClick={() => handleDelete(t.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold mt-3"
                      style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Orders Tab ── */}
      {tab === "orders" && (
        loading ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw size={20} className="animate-spin" style={{ color: COLORS.accent }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 rounded-2xl"
            style={{ border: `2px dashed ${COLORS.border}`, background: "#fff" }}>
            <ShoppingBag size={40} style={{ color: COLORS.border }} />
            <p className="mt-3 font-semibold" style={{ color: COLORS.secondary }}>No orders yet</p>
            <button onClick={openOrderModal}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "#10b981" }}>
              Place First Order
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: "#fff", border: `1px solid ${COLORS.border}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 800 }}>
                <thead>
                  <tr style={{ background: COLORS.bgSoft, borderBottom: `1px solid ${COLORS.border}` }}>
                    {["School", "Template", "Classes & Count", "Total Cards", "Contact", "Ordered On", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-xs" style={{ color: COLORS.secondary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const sc      = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                    const classes = Array.isArray(order.classDetails) ? order.classDetails : [];
                    return (
                      <tr key={order.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color: COLORS.primary }}>{order.schoolName}</p>
                        </td>
                        <td className="px-4 py-3">
                          {order.template
                            ? <div className="flex items-center gap-2">
                                {order.template.imageUrl && <img src={order.template.imageUrl} alt="" className="w-10 h-6 object-cover rounded" />}
                                <span className="text-xs font-medium" style={{ color: COLORS.primary }}>{order.template.title}</span>
                              </div>
                            : <span className="text-xs" style={{ color: COLORS.secondary }}>No template</span>}
                        </td>
                        <td className="px-4 py-3" style={{ maxWidth: 200 }}>
                          <div className="flex flex-wrap gap-1">
                            {classes.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: "#eff6ff", color: "#3b82f6" }}>
                                {c.className} ({c.studentCount})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-lg" style={{ color: COLORS.primary }}>{order.totalCards}</span>
                        </td>
                        <td className="px-4 py-3">
                          {order.contactName
                            ? <><p className="text-xs font-medium" style={{ color: COLORS.primary }}>{order.contactName}</p>
                               <p className="text-xs" style={{ color: COLORS.secondary }}>{order.contactPhone || order.contactEmail || ""}</p></>
                            : <span className="text-xs" style={{ color: COLORS.secondary }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: COLORS.secondary }}>
                          {new Date(order.orderedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <select value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className="text-xs font-bold rounded-full px-3 py-1 appearance-none cursor-pointer"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44`, outline: "none" }}>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Customize Tab ── */}
      {tab === "customize" && <CustomizeTab onTemplateSaved={fetchTemplates} />}

      {/* ── Upload Modal ── */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#fff" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>Upload ID Card Template</h2>
            {uploadError && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#ef4444" }}>{uploadError}</div>}
            <div onClick={() => fileInputRef.current?.click()}
              className="mb-4 rounded-xl flex flex-col items-center justify-center cursor-pointer"
              style={{ border: `2px dashed ${uploadForm.file ? COLORS.accent : COLORS.border}`, padding: "24px", background: uploadForm.file ? "#eff6ff" : COLORS.bgSoft }}>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => setUploadForm((p) => ({ ...p, file: e.target.files[0] }))} />
              {uploadForm.file
                ? <><img src={URL.createObjectURL(uploadForm.file)} alt="Preview" className="max-h-32 rounded-lg object-contain mb-2" />
                    <p className="text-xs font-semibold" style={{ color: COLORS.accent }}>{uploadForm.file.name}</p></>
                : <><Upload size={28} style={{ color: COLORS.border }} />
                    <p className="text-sm mt-2 font-semibold" style={{ color: COLORS.secondary }}>Click to select image</p>
                    <p className="text-xs mt-1" style={{ color: COLORS.secondary }}>JPEG, PNG, WebP — max 5 MB</p></>}
            </div>
            <input type="text" placeholder="Template title *" value={uploadForm.title}
              onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full mb-3 px-4 py-2.5 rounded-xl text-sm"
              style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
            <textarea placeholder="Description (optional)" value={uploadForm.description}
              onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))}
              rows={2} className="w-full mb-4 px-4 py-2.5 rounded-xl text-sm resize-none"
              style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
            <div className="flex gap-3">
              <button onClick={() => { setUploadModal(false); setUploadError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: uploading ? "#93c5fd" : COLORS.accent }}>
                {uploading ? "Uploading…" : "Upload Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Modal ── */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-2xl rounded-2xl" style={{ background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <div>
                <h2 className="text-lg font-bold" style={{ color: COLORS.primary }}>Place ID Card Order</h2>
                <p className="text-sm" style={{ color: COLORS.secondary }}>Select school, template and enter class details</p>
              </div>
              <button onClick={() => setOrderModal(false)} className="p-2 rounded-lg" style={{ background: COLORS.bgSoft }}><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {orderSuccess && (
                <div className="p-4 rounded-xl text-sm font-semibold flex items-center gap-2" style={{ background: "#f0fdf4", color: "#15803d" }}>
                  <CheckCircle size={16} /> Order placed successfully!
                </div>
              )}
              {orderError && <div className="p-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#ef4444" }}>{orderError}</div>}
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: COLORS.primary }}>School *</label>
                <select value={orderForm.schoolId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setOrderForm((p) => ({ ...p, schoolId: sid, classDetails: [], templateId: "" }));
                    fetchClassesForSchool(sid);
                    if (sid) fetchTemplates(sid);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: `1px solid ${COLORS.border}`, outline: "none" }}>
                  <option value="">Select a school</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: COLORS.primary }}>Template (optional)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div onClick={() => setOrderForm((p) => ({ ...p, templateId: "" }))}
                    className="rounded-xl p-2 cursor-pointer text-center text-xs font-semibold"
                    style={{ border: `2px solid ${!orderForm.templateId ? COLORS.accent : COLORS.border}`, background: !orderForm.templateId ? "#eff6ff" : "#fff", color: !orderForm.templateId ? COLORS.accent : COLORS.secondary }}>
                    No template
                  </div>
                  {templates.map((t) => (
                    <div key={t.id} onClick={() => setOrderForm((p) => ({ ...p, templateId: t.id }))}
                      className="rounded-xl overflow-hidden cursor-pointer"
                      style={{ border: `2px solid ${orderForm.templateId === t.id ? COLORS.accent : COLORS.border}` }}>
                      {t.templateType === "CODED" ? (
                        <div className="p-2" style={{ background: "#f9fafb" }}>
                          <MiniCard
                            primary={t.primaryColor || "#1a5c38"}
                            accent={t.accentColor   || "#c9a84c"}
                            title={t.title}
                          />
                        </div>
                      ) : t.imageUrl ? (
                        <img src={t.imageUrl} alt={t.title} className="w-full h-16 object-cover" />
                      ) : null}
                      <p className="text-xs font-semibold text-center py-1 px-2 truncate"
                        style={{ color: orderForm.templateId === t.id ? COLORS.accent : COLORS.primary }}>
                        {t.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold" style={{ color: COLORS.primary }}>Classes & Student Count *</label>
                  {orderForm.schoolId && !loadingClasses && schoolClasses.length > 0 && (
                    <button onClick={() => setOrderForm((p) => ({ ...p, classDetails: schoolClasses.map((c) => ({ className: c.name, studentCount: c._count?.studentEnrollments || 0, studentIds: [] })) }))}
                      className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: "#eff6ff", color: COLORS.accent }}>
                      + Add All Classes
                    </button>
                  )}
                </div>
                {!orderForm.schoolId && <p className="text-xs py-3 text-center rounded-xl" style={{ background: COLORS.bgSoft, color: COLORS.secondary }}>Select a school first</p>}
                {orderForm.schoolId && loadingClasses && <p className="text-xs py-3 text-center rounded-xl" style={{ background: COLORS.bgSoft, color: COLORS.secondary }}>Loading classes…</p>}
                {!loadingClasses && schoolClasses.length > 0 && (
                  <div className="space-y-2">
                    {schoolClasses.map((cls) => {
                      const existing   = orderForm.classDetails.find((r) => r.className === cls.name);
                      const isSelected = !!existing;
                      const isExpanded = expandedClass === cls.id;
                      const students   = classStudents[cls.id] || [];
                      const isLoadingStu = loadingStudents[cls.id];
                      const selectedIds  = new Set(existing?.studentIds || []);
                      const totalInClass = cls._count?.studentEnrollments || 0;
                      return (
                        <div key={cls.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}` }}>
                          <div className="flex items-center gap-3 p-3" style={{ background: isSelected ? "#eff6ff" : "#fff" }}>
                            <input type="checkbox" checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const allIds = (classStudents[cls.id] || []).map(s => s.id);
                                  setOrderForm((p) => ({ ...p, classDetails: [...p.classDetails, { className: cls.name, studentCount: totalInClass, studentIds: allIds }] }));
                                  if (!classStudents[cls.id]) fetchStudentsForClass(cls);
                                } else {
                                  setOrderForm((p) => ({ ...p, classDetails: p.classDetails.filter((r) => r.className !== cls.name) }));
                                  if (expandedClass === cls.id) setExpandedClass(null);
                                }
                              }}
                              className="w-4 h-4 cursor-pointer accent-blue-500 flex-shrink-0" />
                            <span className="flex-1 text-sm font-semibold" style={{ color: isSelected ? COLORS.accent : COLORS.primary }}>{cls.name}</span>
                            {isSelected && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#dbeafe", color: COLORS.accent }}>{existing.studentCount} students</span>}
                            {!isSelected && totalInClass > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: COLORS.bgSoft, color: COLORS.secondary }}>{totalInClass} students</span>}
                            {isSelected && (
                              <button onClick={() => { if (!isExpanded) { fetchStudentsForClass(cls); setExpandedClass(cls.id); } else setExpandedClass(null); }}
                                className="text-xs font-semibold px-2 py-1 rounded-lg"
                                style={{ background: isExpanded ? COLORS.accent : "#dbeafe", color: isExpanded ? "#fff" : COLORS.accent }}>
                                {isExpanded ? "▲ Hide" : "▼ Students"}
                              </button>
                            )}
                          </div>
                          {isSelected && isExpanded && (
                            <div style={{ borderTop: `1px solid ${COLORS.border}`, background: "#f8fafc" }}>
                              {isLoadingStu ? <p className="text-xs text-center py-3" style={{ color: COLORS.secondary }}>Loading…</p>
                              : students.length === 0 ? <p className="text-xs text-center py-3" style={{ color: COLORS.secondary }}>No students found</p>
                              : <>
                                  <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${COLORS.border}`, background: "#f1f5f9" }}>
                                    <input type="checkbox" checked={selectedIds.size === students.length}
                                      onChange={(e) => {
                                        const allIds = e.target.checked ? students.map(s => s.id) : [];
                                        setOrderForm((p) => ({ ...p, classDetails: p.classDetails.map((r) => r.className === cls.name ? { ...r, studentIds: allIds, studentCount: allIds.length } : r) }));
                                      }}
                                      className="w-4 h-4 accent-blue-500 cursor-pointer" />
                                    <span className="text-xs font-bold" style={{ color: COLORS.primary }}>Select All ({students.length})</span>
                                  </div>
                                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                                    {students.map((stu) => {
                                      const checked = selectedIds.has(stu.id);
                                      const name = stu.personalInfo ? `${stu.personalInfo.firstName} ${stu.personalInfo.lastName}` : stu.name;
                                      const admNo = stu.enrollments?.[0]?.admissionNumber || "—";
                                      return (
                                        <label key={stu.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer"
                                          style={{ borderBottom: `1px solid ${COLORS.border}`, background: checked ? "#eff6ff" : "#fff" }}>
                                          <input type="checkbox" checked={checked}
                                            onChange={(e) => {
                                              const newIds = e.target.checked ? [...selectedIds, stu.id] : [...selectedIds].filter(id => id !== stu.id);
                                              setOrderForm((p) => ({ ...p, classDetails: p.classDetails.map((r) => r.className === cls.name ? { ...r, studentIds: newIds, studentCount: newIds.length } : r) }));
                                            }}
                                            className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0" />
                                          <span className="text-sm flex-1" style={{ color: COLORS.primary }}>{name}</span>
                                          <span className="text-xs" style={{ color: COLORS.secondary }}>#{admNo}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {orderForm.schoolId && !loadingClasses && schoolClasses.length === 0 && (
                  <p className="text-xs py-3 text-center rounded-xl" style={{ background: "#fffbeb", color: "#b45309" }}>No classes found for this school.</p>
                )}
                {totalCards > 0 && (
                  <div className="mt-3 px-3 py-2 rounded-xl text-sm font-bold flex items-center justify-between" style={{ background: "#f0fdf4", color: "#15803d" }}>
                    <span>{orderForm.classDetails.filter(r => r.studentCount).length} classes selected</span>
                    <span>Total: {totalCards} cards</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: COLORS.primary }}>Contact Person (optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Name" value={orderForm.contactName} onChange={(e) => setOrderForm((p) => ({ ...p, contactName: e.target.value }))} className="px-3 py-2 rounded-xl text-sm" style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
                  <input type="text" placeholder="Phone" value={orderForm.contactPhone} onChange={(e) => setOrderForm((p) => ({ ...p, contactPhone: e.target.value }))} className="px-3 py-2 rounded-xl text-sm" style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
                  <input type="email" placeholder="Email" value={orderForm.contactEmail} onChange={(e) => setOrderForm((p) => ({ ...p, contactEmail: e.target.value }))} className="px-3 py-2 rounded-xl text-sm" style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: COLORS.primary }}>Notes (optional)</label>
                <textarea placeholder="Any special instructions..." value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl text-sm resize-none" style={{ border: `1px solid ${COLORS.border}`, outline: "none" }} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setOrderModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.secondary }}>Cancel</button>
              <button onClick={handlePlaceOrder} disabled={placingOrder} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: placingOrder ? "#6ee7b7" : "#10b981" }}>
                {placingOrder ? "Placing Order…" : `Place Order${totalCards > 0 ? ` (${totalCards} cards)` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }} onClick={() => setPreviewTemplate(null)}>
          <div className="w-full sm:w-auto sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#fff", maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <div className="min-w-0 flex-1 mr-3">
                <p className="font-bold text-sm truncate" style={{ color: COLORS.primary }}>{previewTemplate.title}</p>
                <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5" style={{ background: previewTemplate.isDefault ? "#eff6ff" : "#f0fdf4", color: previewTemplate.isDefault ? "#3b82f6" : "#15803d" }}>
                  {previewTemplate.isDefault ? "🌐 Platform Default" : "⭐ Your Design"}
                </span>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="flex items-center justify-center rounded-full flex-shrink-0 font-bold text-lg" style={{ width: 34, height: 34, background: "#f3f4f6", color: "#374151", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <img src={previewTemplate.imageUrl} alt={previewTemplate.title} style={{ width: "100%", height: "auto", display: "block" }} />
              {previewTemplate.description && <p className="px-4 py-3 text-sm" style={{ color: COLORS.secondary }}>{previewTemplate.description}</p>}
            </div>
            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setPreviewTemplate(null)} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: COLORS.primary }}>Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}