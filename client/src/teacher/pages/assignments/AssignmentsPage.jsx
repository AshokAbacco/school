// client/src/teacher/pages/assignments/AssignmentsPage.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  File,
  X,
  Eye,
  Send,
  Clock,
  Calendar,
  Users,
  ChevronDown,
  CheckCircle2,
  PenLine,
  Paperclip,
  Filter,
  MoreVertical,
  Download,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

// ── Same color palette as OnlineClassesPage ──────────────────
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
};

// ── Helpers ───────────────────────────────────────────────────
function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isPastDue(dueDate) {
  return new Date(dueDate) < new Date();
}

function statusBadge(status, dueDate) {
  const past = dueDate && isPastDue(dueDate) && status !== "CLOSED";
  if (past && status === "PUBLISHED") {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#fff0e0", color: "#b45309", fontFamily: "'Inter', sans-serif" }}>Overdue</span>;
  }
  const map = {
    DRAFT:     { bg: "#f0f4f8", color: "#6A89A7", label: "Draft" },
    PUBLISHED: { bg: "#e8f4fd", color: "#1a6fa8", label: "Published" },
    CLOSED:    { bg: "#f0f0f0", color: "#555",    label: "Closed" },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: s.bg, color: s.color, fontFamily: "'Inter', sans-serif" }}>
      {s.label}
    </span>
  );
}

function typeBadge(type) {
  const map = {
    REGULAR: { bg: `${C.mist}55`, color: C.slate, label: "Regular" },
    HOLIDAY: { bg: "#fde8e8", color: "#a81a1a", label: "Holiday" },
    WEEKEND: { bg: "#e8f0fd", color: "#1a3fa8", label: "Weekend" },
    PROJECT: { bg: "#e8fde8", color: "#1a7a1a", label: "Project" },
  };
  const s = map[type] || map.REGULAR;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: s.bg, color: s.color, fontFamily: "'Inter', sans-serif" }}>
      {s.label}
    </span>
  );
}

function fileIcon(name, mimetype) {
  if (!mimetype && !name) return <File size={14} color={C.slate} />;
  const ext = (name || "").split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return <span style={{fontSize:14}}>🖼️</span>;
  if (["pdf"].includes(ext)) return <span style={{fontSize:14}}>📄</span>;
  if (["doc","docx"].includes(ext)) return <span style={{fontSize:14}}>📝</span>;
  if (["xls","xlsx"].includes(ext)) return <span style={{fontSize:14}}>📊</span>;
  if (["ppt","pptx"].includes(ext)) return <span style={{fontSize:14}}>📊</span>;
  if (["zip","rar"].includes(ext)) return <span style={{fontSize:14}}>🗜️</span>;
  return <File size={14} color={C.slate} />;
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(36,51,64,0.45)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 20, border: `1.5px solid ${C.borderLight}`,
        boxShadow: `0 24px 64px rgba(56,73,89,0.22)`, width: "100%",
        maxWidth: wide ? 700 : 560, padding: "22px 24px", maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800, color: C.text }}>
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

function Label({ children, required }) {
  return (
    <label style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.text, display: "block", marginBottom: 6 }}>
      {children}{required && <span style={{ color: "#c0392b", marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Input({ style, ...props }) {
  return (
    <input {...props} style={{
      width: "100%", padding: "10px 14px", borderRadius: 12,
      border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
      fontSize: 13, color: C.text, background: C.bg, outline: "none",
      marginBottom: 14, ...style,
    }} />
  );
}

function Select({ children, style, ...props }) {
  return (
    <select {...props} style={{
      width: "100%", padding: "10px 14px", borderRadius: 12,
      border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
      fontSize: 13, color: C.text, background: C.bg, outline: "none",
      marginBottom: 14, cursor: "pointer", ...style,
    }}>
      {children}
    </select>
  );
}

// ── Assignment mode toggle ─────────────────────────────────────
function ModeToggle({ mode, setMode }) {
  return (
    <div style={{ display: "flex", background: C.bg, borderRadius: 12, padding: 4, gap: 4, border: `1.5px solid ${C.border}`, marginBottom: 18 }}>
      {[
        { key: "text", icon: <PenLine size={13} />, label: "Type Assignment" },
        { key: "file", icon: <Paperclip size={13} />, label: "Upload Files" },
        { key: "both", icon: <FileText size={13} />, label: "Both" },
      ].map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 10px", borderRadius: 9,
            background: mode === m.key ? C.deep : "transparent",
            color: mode === m.key ? "#fff" : C.textLight,
            border: "none", fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {m.icon}{m.label}
        </button>
      ))}
    </div>
  );
}

// ── File drop zone ─────────────────────────────────────────────
function FileDropZone({ files, setFiles, existingFiles, removeExisting }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  function handleFiles(incoming) {
    const arr = Array.from(incoming);
    setFiles((prev) => [...prev, ...arr]);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Existing attachments (edit mode) */}
      {existingFiles?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, color: C.textLight, fontWeight: 600 }}>Existing files:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {existingFiles.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                {fileIcon(f.name)}
                <span style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: "'Inter', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button onClick={() => removeExisting(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <X size={12} color="#c0392b" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.sky : C.border}`,
          borderRadius: 14, padding: "22px 16px", textAlign: "center",
          background: dragging ? `${C.mist}33` : C.bg,
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <Upload size={22} color={C.slate} style={{ marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
          Drop files here or <span style={{ color: C.slate }}>browse</span>
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
          PDFs, images, docs — up to 50MB each
        </p>
      </div>
      <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

      {/* New files staged */}
      {files.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 10, background: "#e8f0fd", border: `1px solid #b3ccf5` }}>
              {fileIcon(f.name, f.type)}
              <span style={{ flex: 1, fontSize: 12, color: C.text, fontFamily: "'Inter', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ fontSize: 10, color: C.textLight, whiteSpace: "nowrap" }}>{(f.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                <X size={12} color="#c0392b" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType]   = useState("ALL");
  const [toggling, setToggling]       = useState(null);

  useEffect(() => { fetchAssignments(); }, []);

  async function fetchAssignments() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/teacher/assignments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssignments(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePublish(id, currentStatus) {
    try {
      setToggling(id);
      const res = await fetch(`${API_URL}/api/teacher/assignments/${id}/publish`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      setAssignments((prev) => prev.map((a) =>
        a.id === id ? { ...a, status: currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED" } : a
      ));
    } catch (e) {
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  const filtered = assignments.filter((a) => {
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchType   = filterType   === "ALL" || a.type   === filterType;
    return matchStatus && matchType;
  });

  const stats = {
    total:     assignments.length,
    published: assignments.filter((a) => a.status === "PUBLISHED").length,
    draft:     assignments.filter((a) => a.status === "DRAFT").length,
    overdue:   assignments.filter((a) => a.status === "PUBLISHED" && isPastDue(a.dueDate)).length,
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s ease forwards; }
        .asgn-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px)  { .asgn-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1100px) { .asgn-grid { grid-template-columns: repeat(3, 1fr); } }
        .asgn-card { transition: transform 0.2s, box-shadow 0.2s; }
        .asgn-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important; }
        .asgn-btn:hover { opacity: 0.8; }
        .filter-btn { transition: all 0.15s; }
        textarea { resize: vertical; }
        .stat-card { flex: 1; min-width: 120px; }
      `}</style>

      <div style={{ padding: "clamp(16px,3vw,28px) clamp(16px,3vw,32px)", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 4, height: 28, borderRadius: 99, background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`, flexShrink: 0 }} />
              <div>
                <h1 style={{ margin: 0, fontSize: "clamp(18px,5vw,26px)", fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>
                  Assignments
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                  Create, manage and publish student assignments
                </p>
              </div>
            </div>
            <button
              onClick={() => { setEditTarget(null); setShowModal(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
                borderRadius: 12, border: "none",
                background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`,
                color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              <Plus size={15} /> New Assignment
            </button>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }} className="fade-up">
          {[
            { label: "Total",     value: stats.total,     color: C.slate },
            { label: "Published", value: stats.published, color: "#1a6fa8" },
            { label: "Draft",     value: stats.draft,     color: C.textLight },
            { label: "Overdue",   value: stats.overdue,   color: "#b45309" },
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 12, background: "#fee8e8", border: "1px solid #f5b0b0", marginBottom: 16, fontSize: 13, color: "#8b1c1c" }}>
            <AlertCircle size={14} /><span>{error}</span>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }} className="fade-up">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["ALL", "DRAFT", "PUBLISHED", "CLOSED"].map((s) => (
              <button key={s} className="filter-btn" onClick={() => setFilterStatus(s)} style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${filterStatus === s ? C.deep : C.border}`,
                background: filterStatus === s ? C.deep : C.white,
                color: filterStatus === s ? "#fff" : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["ALL","REGULAR","HOLIDAY","WEEKEND","PROJECT"].map((t) => (
              <button key={t} className="filter-btn" onClick={() => setFilterType(t)} style={{
                padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${filterType === t ? C.sky : C.borderLight}`,
                background: filterType === t ? `${C.mist}55` : C.white,
                color: filterType === t ? C.deep : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}>
                {t === "ALL" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards ── */}
        {loading ? (
          <div className="asgn-grid">
            {[1,2,3].map((i) => (
              <div key={i} style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`, padding: 18 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <Pulse w={40} h={40} r={12} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Pulse w="70%" h={13} /><Pulse w="40%" h={10} />
                  </div>
                </div>
                <Pulse w="100%" h={8} r={6} /><div style={{ height: 8 }} />
                <Pulse w="60%" h={10} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `${C.mist}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={26} color={C.slate} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep }}>No assignments found</p>
            <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>Create your first assignment to get started</p>
          </div>
        ) : (
          <div className="asgn-grid fade-up">
            {filtered.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                toggling={toggling === a.id}
                onView={() => setViewTarget(a)}
                onEdit={() => { setEditTarget(a); setShowModal(true); }}
                onDelete={() => setDeleteTarget(a)}
                onTogglePublish={() => handleTogglePublish(a.id, a.status)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <AssignmentFormModal
          editTarget={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAssignments(); }}
        />
      )}

      {/* ── View detail modal ── */}
      {viewTarget && (
        <ViewModal
          assignment={viewTarget}
          onClose={() => setViewTarget(null)}
          onEdit={() => { setEditTarget(viewTarget); setViewTarget(null); setShowModal(true); }}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <DeleteModal
          assignment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); fetchAssignments(); }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
//  ASSIGNMENT CARD
// ═══════════════════════════════════════════════════════════════
function AssignmentCard({ assignment: a, onView, onEdit, onDelete, onTogglePublish, toggling }) {
  const sectionNames = a.sections?.map((s) => s.classSection?.name).filter(Boolean).join(", ") || "—";
  const hasFiles = a.attachmentKeys?.length > 0;
  const hasText  = !!a.description;

  return (
    <div className="asgn-card" style={{
      background: C.white, borderRadius: 16, border: `1.5px solid ${C.borderLight}`,
      padding: 18, display: "flex", flexDirection: "column", gap: 12,
      boxShadow: "0 2px 8px rgba(56,73,89,0.06)",
    }}>
      {/* top */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.mist}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpen size={18} color={C.slate} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</p>
            <p style={{ margin: 0, fontSize: 11, color: C.textLight, marginTop: 2 }}>{a.subject?.name || "No subject"}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {statusBadge(a.status, a.dueDate)}
          {typeBadge(a.type)}
        </div>
      </div>

      {/* meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <MetaRow icon={<Calendar size={12} color={C.slate} />} label={`Due: ${fmtDate(a.dueDate)}`} />
        <MetaRow icon={<Users size={12} color={C.slate} />} label={sectionNames} />
        <div style={{ display: "flex", gap: 8 }}>
          {hasText  && <MetaRow icon={<PenLine size={12} color={C.slate} />}   label="Text" />}
          {hasFiles && <MetaRow icon={<Paperclip size={12} color={C.slate} />} label={`${a.attachmentKeys.length} file${a.attachmentKeys.length > 1 ? "s" : ""}`} />}
        </div>
      </div>

      {/* divider */}
      <div style={{ height: 1, background: C.borderLight }} />

      {/* actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onView} style={{
          flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px", borderRadius: 10, border: `1.5px solid ${C.border}`,
          background: C.bg, color: C.slate, fontFamily: "'Inter', sans-serif",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          <Eye size={13} /> View
        </button>

        {a.status !== "CLOSED" && (
          <button
            onClick={onTogglePublish}
            disabled={toggling}
            style={{
              flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px", borderRadius: 10, border: "none",
              background: a.status === "PUBLISHED"
                ? "#f0f4f8"
                : `linear-gradient(135deg, #1a6fa8, ${C.deep})`,
              color: a.status === "PUBLISHED" ? C.textLight : "#fff",
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {toggling ? <Loader2 size={13} className="animate-spin" /> : a.status === "PUBLISHED" ? <><CheckCircle2 size={13} /> Published</> : <><Send size={13} /> Publish</>}
          </button>
        )}

        <button className="asgn-btn" onClick={onEdit} style={{ flex: 1, padding: "8px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pencil size={13} color={C.slate} />
        </button>
        <button className="asgn-btn" onClick={onDelete} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1.5px solid #f5b0b0", background: "#fff5f5", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={13} color="#c0392b" />
        </button>
      </div>
    </div>
  );
}

function MetaRow({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  VIEW MODAL
// ═══════════════════════════════════════════════════════════════
function ViewModal({ assignment: a, onClose, onEdit }) {
  return (
    <Modal title="Assignment Details" onClose={onClose} wide>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {statusBadge(a.status, a.dueDate)}
          {typeBadge(a.type)}
        </div>
        <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, color: C.slate, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Pencil size={12} /> Edit
        </button>
      </div>

      <h3 style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>{a.title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textLight }}>{a.subject?.name} · {a.academicYear?.name}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <InfoBox label="Due Date" value={fmtDate(a.dueDate)} />
        <InfoBox label="Sections" value={a.sections?.map((s) => s.classSection?.name).join(", ") || "—"} />
      </div>

      {a.description && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>Assignment Content</p>
          <div style={{ padding: "14px 16px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}`, fontSize: 13, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif", maxHeight: 240, overflowY: "auto" }}>
            {a.description}
          </div>
        </div>
      )}

      {a.attachmentKeys?.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>Attachments ({a.attachmentKeys.length})</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {a.attachmentNames?.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
                {fileIcon(name, a.attachmentTypes?.[i])}
                <span style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: "'Inter', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                {a.attachmentSignedUrls?.[i] && (
                  <a href={a.attachmentSignedUrls[i]} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, background: `${C.mist}55`, color: C.slate, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                    <Download size={11} /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, background: C.bg, border: `1.5px solid ${C.borderLight}` }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif" }}>{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  CREATE / EDIT FORM MODAL
// ═══════════════════════════════════════════════════════════════
const EMPTY_FORM = {
  title: "", description: "", type: "REGULAR", status: "DRAFT",
  dueDate: "", subjectId: "", academicYearId: "", classSectionIds: [],
};

function AssignmentFormModal({ editTarget, onClose, onSaved }) {
  const isEdit = !!editTarget;
  const [form, setForm]           = useState(isEdit ? mapEdit(editTarget) : EMPTY_FORM);
  const [mode, setMode]           = useState(
    isEdit
      ? (editTarget.description && editTarget.attachmentKeys?.length ? "both" : editTarget.attachmentKeys?.length ? "file" : "text")
      : "text"
  );
  const [newFiles, setNewFiles]   = useState([]);
  const [existingFiles, setExisting] = useState(
    isEdit ? editTarget.attachmentNames?.map((n, i) => ({ name: n, key: editTarget.attachmentKeys[i], type: editTarget.attachmentTypes?.[i] })) || [] : []
  );
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [subjects, setSubjects]   = useState([]);
  const [ayears, setAyears]       = useState([]);
  const [sections, setSections]   = useState([]);

  useEffect(() => { loadDropdowns(); }, []);

  async function loadDropdowns() {
    try {
      const h = { Authorization: `Bearer ${getToken()}` };
      const [sR, aR, cR] = await Promise.all([
        fetch(`${API_URL}/api/teacher/assignments/dropdowns/subjects`,       { headers: h }),
        fetch(`${API_URL}/api/teacher/assignments/dropdowns/academic-years`, { headers: h }),
        fetch(`${API_URL}/api/teacher/assignments/dropdowns/class-sections`, { headers: h }),
      ]);
      const [s, a, c] = await Promise.all([sR.json(), aR.json(), cR.json()]);
      setSubjects(s.data || []);
      setAyears(a.data || []);
      setSections(c.data || []);
    } catch (e) {
      setError("Failed to load dropdowns");
    }
  }

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function toggleSection(id) {
    setForm((f) => ({
      ...f,
      classSectionIds: f.classSectionIds.includes(id)
        ? f.classSectionIds.filter((x) => x !== id)
        : [...f.classSectionIds, id],
    }));
  }

  function removeExisting(idx) {
    setExisting((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.title.trim())    return setError("Title is required");
    if (!form.dueDate)         return setError("Due date is required");
    if (!form.subjectId)       return setError("Subject is required");
    if (!form.academicYearId)  return setError("Academic year is required");
    if (form.classSectionIds.length === 0) return setError("Select at least one class section");
    if ((mode === "text" || mode === "both") && !form.description.trim()) return setError("Assignment content/description is required");
    if ((mode === "file" || mode === "both") && newFiles.length === 0 && existingFiles.length === 0) return setError("Upload at least one file");

    try {
      setSaving(true);
      setError("");

      const fd = new FormData();
      fd.append("title",          form.title);
      fd.append("description",    mode === "file" ? "" : form.description);
      fd.append("type",           form.type);
      fd.append("status",         form.status);
      fd.append("dueDate",        new Date(form.dueDate).toISOString());
      fd.append("subjectId",      form.subjectId);
      fd.append("academicYearId", form.academicYearId);
      fd.append("classSectionIds", JSON.stringify(form.classSectionIds));

      if (isEdit) {
        fd.append("keepKeys", JSON.stringify(existingFiles.map((f) => f.key)));
      }

      for (const file of newFiles) {
        fd.append("files", file);
      }

      const url    = isEdit ? `${API_URL}/api/teacher/assignments/${editTarget.id}` : `${API_URL}/api/teacher/assignments`;
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed");
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Assignment" : "New Assignment"} onClose={onClose} wide>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#fee8e8", border: "1px solid #f5b0b0", marginBottom: 14, fontSize: 12, color: "#8b1c1c" }}>
          <AlertCircle size={13} /><span>{error}</span>
        </div>
      )}

      {/* Assignment content mode */}
      <Label required>Assignment Mode</Label>
      <ModeToggle mode={mode} setMode={setMode} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label required>Title</Label>
          <Input placeholder="e.g. Chapter 5 – Algebra Practice" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label required>Type</Label>
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="REGULAR">Regular</option>
            <option value="HOLIDAY">Holiday</option>
            <option value="WEEKEND">Weekend</option>
            <option value="PROJECT">Project</option>
          </Select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label required>Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} style={{ marginBottom: 14 }} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label required>Academic Year</Label>
          <Select value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}>
            <option value="">Select year</option>
            {ayears.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isActive ? " (Active)" : ""}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Subject</Label>
          <Select value={form.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      </div>

      <Label required>Class Sections</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {sections.map((s) => {
          const selected = form.classSectionIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleSection(s.id)}
              style={{
                padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${selected ? C.deep : C.border}`,
                background: selected ? C.deep : C.bg,
                color: selected ? "#fff" : C.textLight,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              {s.name}
            </button>
          );
        })}
        {sections.length === 0 && <span style={{ fontSize: 12, color: C.textLight }}>Loading sections...</span>}
      </div>

      {/* Typed content */}
      {(mode === "text" || mode === "both") && (
        <>
          <Label required={mode === "text"}>Assignment Content / Instructions</Label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={"Write the assignment questions, instructions, or details here...\n\nExample:\n1. Solve the following equations.\n2. Show all working steps.\n3. Submit in your exercise book."}
            rows={8}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontFamily: "'Inter', sans-serif",
              fontSize: 13, color: C.text, background: C.bg, outline: "none",
              lineHeight: 1.7, marginBottom: 14,
            }}
          />
        </>
      )}

      {/* File upload */}
      {(mode === "file" || mode === "both") && (
        <>
          <Label required={mode === "file"}>Attachments</Label>
          <FileDropZone
            files={newFiles}
            setFiles={setNewFiles}
            existingFiles={isEdit ? existingFiles : []}
            removeExisting={removeExisting}
          />
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
        <button
          onClick={() => { set("status", "DRAFT"); setTimeout(handleSave, 0); }}
          disabled={saving}
          style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bg, color: C.slate, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Save Draft
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${C.slate}, ${C.deep})`, color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : isEdit ? "Update Assignment" : "Create Assignment"}
        </button>
      </div>
    </Modal>
  );
}

function mapEdit(a) {
  return {
    title:           a.title || "",
    description:     a.description || "",
    type:            a.type || "REGULAR",
    status:          a.status || "DRAFT",
    dueDate:         a.dueDate ? a.dueDate.slice(0, 10) : "",
    subjectId:       a.subjectId || "",
    academicYearId:  a.academicYearId || "",
    classSectionIds: a.sections?.map((s) => s.classSectionId) || [],
  };
}

// ═══════════════════════════════════════════════════════════════
//  DELETE MODAL
// ═══════════════════════════════════════════════════════════════
function DeleteModal({ assignment: a, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  async function handleDelete() {
    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/api/teacher/assignments/${a.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed");
      }
      onDeleted();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title="Delete Assignment" onClose={onClose}>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textLight, fontFamily: "'Inter', sans-serif" }}>
        Are you sure you want to delete <strong style={{ color: C.text }}>{a.title}</strong>?
        This will archive the assignment and it won't be visible to students.
      </p>
      {error && <p style={{ color: "#c0392b", fontSize: 12, margin: "0 0 12px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.white, color: C.textLight, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Keep
        </button>
        <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "#c0392b", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : "Delete"}
        </button>
      </div>
    </Modal>
  );
}