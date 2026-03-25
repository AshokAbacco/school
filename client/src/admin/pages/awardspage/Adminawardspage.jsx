import React, { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, X, AlertCircle,
  Award, CheckCircle2, Sparkles,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

/* ─── DESIGN TOKENS — identical to Dashboard ─── */
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
  textMid:     "#4A6880",
  textLight:   "#6A89A7",
  success:     "#3DA882",
  danger:      "#D95C5C",
};

const CATEGORIES = [
  "ACADEMIC","ATTENDANCE","SPORTS","CULTURAL","DISCIPLINE","LEADERSHIP","SPECIAL",
];

const CATEGORY_COLOR = {
  ACADEMIC:   { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  ATTENDANCE: { bg: "#F0FDF4", text: "#15803D", dot: "#22C55E" },
  SPORTS:     { bg: "#FFF7ED", text: "#C2410C", dot: "#F97316" },
  CULTURAL:   { bg: "#FDF4FF", text: "#7E22CE", dot: "#A855F7" },
  DISCIPLINE: { bg: "#FFF1F2", text: "#BE123C", dot: "#F43F5E" },
  LEADERSHIP: { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  SPECIAL:    { bg: "#F0F9FF", text: "#0369A1", dot: "#0EA5E9" },
};

/* ─── SHARED UI ─── */
function Pulse({ w = "100%", h = 14, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: `${C.mist}55`, animation: "pulse 2s ease infinite",
    }} />
  );
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.SPECIAL;
  return (
    <span style={{
      background: c.bg, color: c.text,
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 8,
      fontSize: 10, fontWeight: 800, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {category}
    </span>
  );
}

/* ─── STAT CARD — matches Dashboard StatCard style ─── */
function StatCard({ IconComp, label, value, color = C.deep, delay = 0, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animationDelay: `${delay}ms`,
        background: C.white,
        borderRadius: 22,
        border: `1.5px solid ${C.borderLight}`,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        boxShadow: hov
          ? `0 16px 48px rgba(56,73,89,0.13), 0 0 0 2px ${C.sky}44`
          : "0 2px 20px rgba(56,73,89,0.07)",
        transform: hov ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative",
        overflow: "hidden",
        animation: "fadeUp 0.5s ease both",
        cursor: "default",
      }}
    >
      {/* top accent stripe */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${C.sky}, ${C.slate}, ${C.deep})`,
        borderRadius: "22px 22px 0 0",
        opacity: hov ? 1 : 0.6,
        transition: "opacity 0.3s",
      }} />
      {/* bg pattern */}
      <div style={{
        position: "absolute", right: -20, bottom: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.mist}33, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${C.borderLight}`,
      }}>
        <IconComp size={20} color={color} strokeWidth={1.8} />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <Pulse w="50%" h={38} r={8} />
          <Pulse w="70%" h={12} r={6} />
        </div>
      ) : (
        <div>
          <p style={{
            margin: 0, fontSize: 42, fontWeight: 800,
            color: C.text, lineHeight: 1, letterSpacing: "-2px",
          }}>
            {value ?? "—"}
          </p>
          <p style={{
            margin: "6px 0 0", fontSize: 11, color: C.textLight,
            fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── AWARD MODAL ─── */
function AwardModal({ award, onClose, onSaved }) {
  const [name, setName]         = useState(award?.name ?? "");
  const [description, setDesc]  = useState(award?.description ?? "");
  const [category, setCategory] = useState(award?.category ?? "ACADEMIC");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const isEdit = !!award;

  const handleSave = async () => {
    if (!name.trim()) { setError("Award name is required"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit
        ? `${API_URL}/api/admin/awards/${award.id}`
        : `${API_URL}/api/admin/awards`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name, description, category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      onSaved(json.message);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
        width: "100%", maxWidth: 440, padding: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>
            {isEdit ? "Edit Award" : "New Award Type"}
          </h2>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bg, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: C.textLight,
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Award Name <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Best Student, Leadership Award"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text,
              background: C.bg, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Category <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const c = CATEGORY_COLOR[cat]; const sel = category === cat;
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: "6px 12px", borderRadius: 99,
                  border: sel ? `2px solid ${c.dot}` : `1.5px solid ${C.borderLight}`,
                  background: sel ? c.bg : C.white,
                  color: sel ? c.text : C.textLight,
                  fontSize: 11, fontWeight: sel ? 700 : 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{cat}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Description <span style={{ fontSize: 11, fontWeight: 400, color: C.textLight }}>(optional)</span>
          </label>
          <textarea rows={2} value={description} onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this award given for?"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text,
              background: C.bg, outline: "none", resize: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px", borderRadius: 10,
            background: "#fff0f0", border: "1px solid #fecaca",
            marginBottom: 16, fontSize: 12, color: "#b91c1c",
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: C.white,
            color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: "10px", borderRadius: 12, border: "none",
            background: saving ? C.border : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
            color: saving ? C.textLight : "#fff",
            fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Award"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DELETE MODAL ─── */
function DeleteModal({ award, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/api/admin/awards/${award.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to delete");
      onDeleted(json.message);
    } catch (err) { setError(err.message); setDeleting(false); }
  };

  const blocked = award._count?.studentAwards > 0;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`,
        boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
        width: "100%", maxWidth: 380, padding: 24,
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "#fff0f0", border: "1.5px solid #fecaca",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            <Trash2 size={20} color="#dc2626" />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: C.text }}>Delete Award</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textLight }}>
            Are you sure you want to delete <strong style={{ color: C.text }}>{award.name}</strong>?
          </p>
          {blocked && (
            <p style={{
              margin: "8px 0 0", fontSize: 12, color: "#b91c1c",
              background: "#fff0f0", padding: "8px 12px",
              borderRadius: 8, border: "1px solid #fecaca",
            }}>
              {award._count.studentAwards} student(s) have received this award — deletion is blocked.
            </p>
          )}
        </div>

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 12px", borderRadius: 10,
            background: "#fff0f0", border: "1px solid #fecaca",
            marginBottom: 16, fontSize: 12, color: "#b91c1c",
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: C.white,
            color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting || blocked} style={{
            flex: 1, padding: "10px", borderRadius: 12, border: "none",
            background: (deleting || blocked) ? C.border : "#dc2626",
            color: (deleting || blocked) ? C.textLight : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: (deleting || blocked) ? "not-allowed" : "pointer",
          }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
export default function AdminAwardsPage() {
  const [awards, setAwards]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [editAward, setEditAward]     = useState(null);
  const [deleteAward, setDeleteAward] = useState(null);
  const [filterCat, setFilterCat]     = useState("ALL");

  const fetchAwards = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/admin/awards`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setAwards(json.data ?? []);
    } catch (err) {
      showToast("error", err.message ?? "Failed to load awards");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAwards(); }, []);

  const showToast = (type, message) => {
    setToast({ type, message }); setTimeout(() => setToast(null), 3500);
  };

  const handleSaved   = (msg) => { showToast("success", msg); setShowCreate(false); setEditAward(null); fetchAwards(); };
  const handleDeleted = (msg) => { showToast("success", msg); setDeleteAward(null); fetchAwards(); };

  const filtered       = filterCat === "ALL" ? awards : awards.filter((a) => a.category === filterCat);
  const categoryCounts = awards.reduce((acc, a) => { acc[a.category] = (acc[a.category] ?? 0) + 1; return acc; }, {});
  const totalAssigned  = awards.reduce((acc, a) => acc + (a._count?.studentAwards ?? 0), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      /* ↓ Same padding as Dashboard — 28px 30px */
      padding: "28px 30px",
      fontFamily: "'Inter', sans-serif",
      backgroundImage: `radial-gradient(ellipse at 0% 0%, ${C.mist}40 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, ${C.sky}18 0%, transparent 50%)`,
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
        .fade-up  { animation: fadeUp 0.5s ease both; }
        .slide-in { animation: slideIn 0.4s ease both; }
        /* ── stat grid: 3 cols on wide, 2 on medium, 1 on mobile ── */
        .awards-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px)  { .awards-stat-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 600px)  { .awards-stat-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 2000,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(56,73,89,0.18)",
          background: toast.type === "success" ? "#f0fdf4" : "#fff0f0",
          border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: toast.type === "success" ? "#15803d" : "#b91c1c",
          fontSize: 13, fontWeight: 600,
        }}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span> {toast.message}
        </div>
      )}

      {/* ══ HEADER — mirrors Dashboard header exactly ══ */}
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 16, marginBottom: 0 }}>
          {/* vertical accent bar */}
          <div style={{
            width: 4, borderRadius: 99,
            background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
            flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              display: "flex", alignItems: "flex-end",
              justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <p style={{
                  margin: 0, fontSize: 11, fontWeight: 700,
                  color: C.textLight, letterSpacing: "0.12em",
                  textTransform: "uppercase", marginBottom: 4,
                }}>
                  Master Settings
                </p>
                <h1 style={{
                  margin: 0,
                  fontSize: "clamp(22px, 3.5vw, 32px)",
                  fontWeight: 900, color: C.text,
                  letterSpacing: "-0.8px", lineHeight: 1.1,
                }}>
                  Award{" "}
                  <span style={{
                    background: `linear-gradient(90deg, ${C.slate}, ${C.deep})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                    Types
                  </span>
                </h1>
              </div>

              {/* New Award button */}
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  background: C.deep, color: "#fff",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(56,73,89,0.2)",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={15} /> New Award
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STAT CARDS — same dramatic style as Dashboard ══ */}
      <div className="awards-stat-grid" style={{ marginBottom: 18 }}>
        <StatCard
          IconComp={Award}
          label="Defined Types"
          value={awards.length}
          color={C.deep}
          delay={0}
          loading={loading}
        />
        <StatCard
          IconComp={CheckCircle2}
          label="Total Assignments"
          value={totalAssigned}
          color={C.success}
          delay={60}
          loading={loading}
        />
        <StatCard
          IconComp={Sparkles}
          label="Active Categories"
          value={Object.keys(categoryCounts).length}
          color={C.sky}
          delay={120}
          loading={loading}
        />
      </div>

      {/* ══ LIST PANEL — full width, same panel style as Dashboard ══ */}
      <div
        className="fade-up"
        style={{
          background: C.white,
          borderRadius: 20,
          border: `1.5px solid ${C.borderLight}`,
          boxShadow: "0 2px 20px rgba(56,73,89,0.07)",
          overflow: "hidden",
          animationDelay: "200ms",
        }}
      >
        {/* Category filter bar — same SectionHead style */}
        <div style={{
          padding: "15px 20px",
          borderBottom: `1.5px solid ${C.borderLight}`,
          background: `linear-gradient(90deg, ${C.bg} 0%, ${C.white} 100%)`,
          display: "flex", flexWrap: "wrap", gap: 8,
          alignItems: "center",
        }}>
          {["ALL", ...CATEGORIES].map((cat) => {
            const sel   = filterCat === cat;
            const c     = cat !== "ALL" ? CATEGORY_COLOR[cat] : null;
            const count = cat === "ALL" ? awards.length : (categoryCounts[cat] ?? 0);
            return (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: "6px 12px", borderRadius: 20,
                border: sel ? `2px solid ${c ? c.dot : C.deep}` : `1px solid ${C.borderLight}`,
                background: sel ? (c ? c.bg : C.deep) : C.white,
                color: sel ? (c ? c.text : "#fff") : C.textLight,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}>
                {c && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />}
                {cat === "ALL" ? "All" : cat}
                <span style={{
                  background: "rgba(0,0,0,0.08)",
                  padding: "1px 6px", borderRadius: 10, fontSize: 10,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ padding: "20px 22px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "center",
                  padding: 16, border: `1.5px solid ${C.borderLight}`, borderRadius: 14,
                }}>
                  <Pulse w={40} h={40} r={10} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Pulse w="40%" h={13} />
                    <Pulse w="60%" h={10} />
                  </div>
                  <Pulse w={70} h={24} r={8} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: `${C.sky}18`, border: `1px solid ${C.sky}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <span style={{ fontSize: 28 }}>🏅</span>
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>
                {filterCat === "ALL" ? "No award types yet" : `No ${filterCat} awards`}
              </p>
              <p style={{ margin: "6px 0 20px", fontSize: 12, color: C.textLight }}>
                {filterCat === "ALL"
                  ? "Create your first award type to get started"
                  : "Try a different category filter"}
              </p>
              {filterCat === "ALL" && (
                <button onClick={() => setShowCreate(true)} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 12, border: "none",
                  background: C.deep, color: "#fff",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>
                  <Plus size={14} /> Create First Award
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
                    background: C.white,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    animation: `fadeUp 0.35s ease ${i * 0.04}s both`,
                    flexWrap: "wrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.sky;
                    e.currentTarget.style.boxShadow = `0 4px 16px ${C.sky}28`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.borderLight;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}44)`,
                    border: `1.5px solid ${C.borderLight}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Award size={18} color={C.deep} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 700, color: C.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.name}
                    </p>
                    <p style={{
                      margin: "2px 0 0", fontSize: 11, color: C.textLight,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {a.description || "No description provided."}
                    </p>
                  </div>

                  {/* Usage count */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.deep }}>
                      {a._count?.studentAwards ?? 0}
                    </p>
                    <p style={{
                      margin: 0, fontSize: 9, color: C.textLight,
                      fontWeight: 700, textTransform: "uppercase",
                    }}>
                      assigned
                    </p>
                  </div>

                  {/* Category badge */}
                  <CategoryBadge category={a.category} />

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setEditAward(a)} title="Edit" style={{
                      width: 34, height: 34, borderRadius: 10,
                      border: `1px solid ${C.border}`, background: C.bg,
                      color: C.slate, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteAward(a)} title="Delete" style={{
                      width: 34, height: 34, borderRadius: 10,
                      border: "1px solid #fecaca", background: "#fff5f5",
                      color: "#dc2626", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate  && <AwardModal onClose={() => setShowCreate(false)} onSaved={handleSaved} />}
      {editAward   && <AwardModal award={editAward} onClose={() => setEditAward(null)} onSaved={handleSaved} />}
      {deleteAward && <DeleteModal award={deleteAward} onClose={() => setDeleteAward(null)} onDeleted={handleDeleted} />}
    </div>
  );
}