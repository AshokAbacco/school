import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { getToken } from "../../../auth/storage";
import PageLayout from "../../components/PageLayout";

const API_URL = import.meta.env.VITE_API_URL;

// ─── Design tokens (matches your existing admin palette) ─────────────────────
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

const CATEGORIES = [
  "ACADEMIC",
  "ATTENDANCE",
  "SPORTS",
  "CULTURAL",
  "DISCIPLINE",
  "LEADERSHIP",
  "SPECIAL",
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

// ─── helpers ──────────────────────────────────────────────────────────────────
const CategoryBadge = ({ category }) => {
  const c = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.SPECIAL;
  return (
    <span
      style={{ background: c.bg, color: c.text }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
    >
      <span style={{ background: c.dot }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {category}
    </span>
  );
};

function Pulse({ w = "100%", h = 14, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

// ─── Award Form Modal ─────────────────────────────────────────────────────────
function AwardModal({ award, onClose, onSaved }) {
  const [name, setName]           = useState(award?.name ?? "");
  const [description, setDesc]    = useState(award?.description ?? "");
  const [category, setCategory]   = useState(award?.category ?? "ACADEMIC");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const isEdit = !!award;

  const handleSave = async () => {
    if (!name.trim()) { setError("Award name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const url    = isEdit
        ? `${API_URL}/api/admin/awards/${award.id}`
        : `${API_URL}/api/admin/awards`;
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name, description, category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      onSaved(json.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(36,51,64,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        style={{
          background: C.white, borderRadius: 20,
          border: `1.5px solid ${C.borderLight}`,
          boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
          width: "100%", maxWidth: 440, padding: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>
            {isEdit ? "Edit Award" : "New Award Type"}
          </h2>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.textLight }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Award Name <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Best Student, Leadership Award"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.bg, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Category <span style={{ color: "#e53e3e" }}>*</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const c   = CATEGORY_COLOR[cat];
              const sel = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: "6px 12px", borderRadius: 99,
                    border: sel ? `2px solid ${c.dot}` : `1.5px solid ${C.borderLight}`,
                    background: sel ? c.bg : C.white,
                    color: sel ? c.text : C.textLight,
                    fontSize: 11, fontWeight: sel ? 700 : 500,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
            Description <span style={{ color: C.textLight, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this award given for?"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.bg, outline: "none",
              resize: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#fff0f0", border: "1px solid #fecaca", marginBottom: 16, fontSize: 12, color: "#b91c1c" }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: "10px", borderRadius: 12, border: "none",
              background: saving ? C.border : `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              color: saving ? C.textLight : "#fff",
              fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Award"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ award, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}/api/admin/awards/${award.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to delete");
      onDeleted(json.message);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(36,51,64,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        style={{
          background: C.white, borderRadius: 20,
          border: `1.5px solid ${C.borderLight}`,
          boxShadow: "0 24px 64px rgba(56,73,89,0.22)",
          width: "100%", maxWidth: 380, padding: 24,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fff0f0", border: "1.5px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Trash2 size={20} color="#dc2626" />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: C.text }}>Delete Award</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.textLight }}>
            Are you sure you want to delete <strong style={{ color: C.text }}>{award.name}</strong>?
          </p>
          {award._count?.studentAwards > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {award._count.studentAwards} student(s) have received this award — deletion is blocked.
            </p>
          )}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#fff0f0", border: "1px solid #fecaca", marginBottom: 16, fontSize: 12, color: "#b91c1c" }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || award._count?.studentAwards > 0}
            style={{
              flex: 1, padding: "10px", borderRadius: 12, border: "none",
              background: (deleting || award._count?.studentAwards > 0) ? C.border : "#dc2626",
              color: (deleting || award._count?.studentAwards > 0) ? C.textLight : "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: (deleting || award._count?.studentAwards > 0) ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminAwardsPage() {
  const [awards, setAwards]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editAward, setEditAward]   = useState(null);
  const [deleteAward, setDeleteAward] = useState(null);
  const [filterCat, setFilterCat]   = useState("ALL");

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAwards(); }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaved = (message) => {
    showToast("success", message);
    setShowCreate(false);
    setEditAward(null);
    fetchAwards();
  };

  const handleDeleted = (message) => {
    showToast("success", message);
    setDeleteAward(null);
    fetchAwards();
  };

  // Group awards by category for display
  const filtered = filterCat === "ALL"
    ? awards
    : awards.filter((a) => a.category === filterCat);

  const categoryCounts = awards.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageLayout>
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `radial-gradient(circle at 15% 0%, ${C.mist}28 0%, transparent 50%)`,
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 2000,
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            boxShadow: "0 8px 32px rgba(56,73,89,0.18)",
            background: toast.type === "success" ? "#f0fdf4" : "#fff0f0",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            color: toast.type === "success" ? "#15803d" : "#b91c1c",
            fontSize: 13, fontWeight: 600,
          }}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
              <h1 style={{ margin: 0, fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                Award Types
              </h1>
            </div>
            <p style={{ margin: 0, paddingLeft: 14, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
              Configure award types that class teachers can assign to students
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: `0 4px 12px ${C.deep}33`,
            }}
          >
            <Plus size={15} /> New Award
          </button>
        </div>

        {/* ── Category Filter ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["ALL", ...CATEGORIES].map((cat) => {
            const sel = filterCat === cat;
            const c   = cat !== "ALL" ? CATEGORY_COLOR[cat] : null;
            const count = cat === "ALL" ? awards.length : (categoryCounts[cat] ?? 0);
            return (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  padding: "6px 12px", borderRadius: 99,
                  border: sel
                    ? `2px solid ${c ? c.dot : C.deep}`
                    : `1.5px solid ${C.borderLight}`,
                  background: sel ? (c ? c.bg : `${C.sky}18`) : C.white,
                  color: sel ? (c ? c.text : C.deep) : C.textLight,
                  fontSize: 11, fontWeight: sel ? 700 : 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {c && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />}
                {cat === "ALL" ? "All" : cat}
                <span style={{
                  background: sel ? (c ? `${c.dot}22` : `${C.sky}22`) : `${C.mist}55`,
                  color: sel ? (c ? c.text : C.deep) : C.textLight,
                  borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4].map((i) => (
              <div key={i} style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <Pulse w={36} h={36} r={10} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Pulse w="35%" h={13} />
                  <Pulse w="55%" h={10} />
                </div>
                <Pulse w={80} h={26} r={99} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.sky}18`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ fontSize: 26 }}>🏅</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>
              {filterCat === "ALL" ? "No award types yet" : `No ${filterCat} awards`}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textLight }}>
              {filterCat === "ALL" ? "Create your first award type to get started" : "Try a different category filter"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((award, i) => (
              <div
                key={award.id}
                style={{
                  background: C.white,
                  borderRadius: 14,
                  border: `1.5px solid ${C.borderLight}`,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 1px 4px rgba(56,73,89,0.04)",
                  transition: "box-shadow 0.2s",
                  animation: `fadeUp 0.35s ease ${i * 0.04}s both`,
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 4px 16px ${C.sky}28`}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 4px rgba(56,73,89,0.04)"}
              >
                {/* Icon */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${C.sky}22, ${C.mist}55)`, border: `1px solid ${C.sky}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>🏅</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {award.name}
                  </p>
                  {award.description && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {award.description}
                    </p>
                  )}
                </div>

                {/* Usage count */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.deep }}>{award._count?.studentAwards ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 10, color: C.textLight }}>assigned</p>
                </div>

                {/* Category badge */}
                <CategoryBadge category={award.category} />

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditAward(award)}
                    style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.slate }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteAward(award)}
                    style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #fecaca", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Modals */}
      {showCreate && (
        <AwardModal onClose={() => setShowCreate(false)} onSaved={handleSaved} />
      )}
      {editAward && (
        <AwardModal award={editAward} onClose={() => setEditAward(null)} onSaved={handleSaved} />
      )}
      {deleteAward && (
        <DeleteModal award={deleteAward} onClose={() => setDeleteAward(null)} onDeleted={handleDeleted} />
      )}
    </div>
    </PageLayout>
  );
}