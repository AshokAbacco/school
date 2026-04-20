// client/src/student/pages/Homework/HomeworkPage.jsx

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Paperclip,
  Tag,
  ChevronRight,
  Inbox,
  Filter,
  Eye,
} from "lucide-react";
import { getToken } from "../../../auth/storage";

const API_URL = import.meta.env.VITE_API_URL;

// ── Design tokens — matches the existing stormy palette ──────
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
  accent:      "#5B9BD5",
};

// ── Helpers ──────────────────────────────────────────────────

function Pulse({ w = "100%", h = 13, r = 8 }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, background: `${C.mist}55` }}
    />
  );
}

function typeBadge(type) {
  const map = {
    REGULAR: { bg: "#E8F4FD", color: "#1A6FA8", label: "Regular" },
    HOLIDAY: { bg: "#FFF3E0", color: "#E65100", label: "Holiday" },
    WEEKEND: { bg: "#F3E5F5", color: "#6A1B9A", label: "Weekend" },
    PROJECT: { bg: "#E8F5E9", color: "#2E7D32", label: "Project" },
  };
  const s = map[type] || map.REGULAR;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
      background: s.bg, color: s.color,
      fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em",
    }}>
      {s.label}
    </span>
  );
}

function dueDateColor(dueDateStr) {
  if (!dueDateStr) return C.textLight;
  const diff = new Date(dueDateStr) - new Date();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0)   return "#b91c1c";  // overdue
  if (days < 2)   return "#d97706";  // due soon
  return C.textLight;
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtRelative(dt) {
  if (!dt) return "";
  const diff = new Date(dt) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0)  return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

function fileIcon(type = "") {
  if (type.includes("pdf"))   return "📄";
  if (type.includes("image")) return "🖼️";
  if (type.includes("word") || type.includes("doc")) return "📝";
  return "📎";
}

// ── Skeleton card ────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      border: `1.5px solid ${C.borderLight}`,
      padding: 20, display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Pulse w={44} h={44} r={12} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Pulse w="65%" h={13} />
          <Pulse w="40%" h={10} />
        </div>
        <Pulse w={60} h={22} r={99} />
      </div>
      <Pulse w="90%" h={10} />
      <Pulse w="75%" h={10} />
      <div style={{ display: "flex", gap: 8 }}>
        <Pulse w={100} h={30} r={10} />
        <Pulse w={100} h={30} r={10} />
      </div>
    </div>
  );
}

// ── Assignment card ──────────────────────────────────────────
function AssignmentCard({ hw }) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = hw.dueDate && new Date(hw.dueDate) < new Date();
  const dateColor = dueDateColor(hw.dueDate);
  const hasFiles  = hw.attachmentNames?.length > 0;

  return (
    <div
      className="hw-card"
      style={{
        background: C.white,
        borderRadius: 16,
        border: isOverdue
          ? "1.5px solid #fca5a5"
          : `1.5px solid ${C.borderLight}`,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 2px 10px rgba(56,73,89,0.06)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onClick={() => setExpanded((p) => !p)}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Subject icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.mist}66, ${C.sky}33)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <BookOpen size={18} color={C.deep} />
        </div>

        {/* Title + subject */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {hw.title}
          </p>
          <p style={{
            margin: "3px 0 0", fontSize: 11, color: C.textLight,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {hw.subject?.name || "General"}
          </p>
        </div>

        {/* Type badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {typeBadge(hw.type)}
          {isOverdue && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#b91c1c",
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>
              OVERDUE
            </span>
          )}
        </div>
      </div>

      {/* Due date + teacher */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Calendar size={11} color={dateColor} />
          <span style={{ fontSize: 11, color: dateColor, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            {fmtDate(hw.dueDate)}
          </span>
          {hw.dueDate && (
            <span style={{ fontSize: 10, color: dateColor, fontFamily: "'DM Sans', sans-serif" }}>
              · {fmtRelative(hw.dueDate)}
            </span>
          )}
        </div>
        {hw.teacher && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={11} color={C.slate} />
            <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'DM Sans', sans-serif" }}>
              {hw.teacher.firstName} {hw.teacher.lastName}
            </span>
          </div>
        )}
      </div>

      {/* Description (expandable) */}
      {hw.description && (
        <p style={{
          margin: 0, fontSize: 12, color: C.textLight,
          lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
          display: "-webkit-box", WebkitLineClamp: expanded ? 999 : 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {hw.description}
        </p>
      )}

      {/* Expand toggle */}
      {hw.description && hw.description.length > 100 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
          style={{
            alignSelf: "flex-start", fontSize: 11, fontWeight: 600,
            color: C.accent, background: "none", border: "none",
            cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}

      {/* Divider */}
      {hasFiles && <div style={{ height: 1, background: C.borderLight }} />}

      {/* Attachments */}
{hasFiles && (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <p style={{ 
      margin: 0, fontSize: 10, fontWeight: 700, color: C.slate,
      textTransform: "uppercase", letterSpacing: "0.08em",
      fontFamily: "'DM Sans', sans-serif" 
    }}>
      Attachments ({hw.attachmentNames.length})
    </p>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {hw.attachmentNames.map((name, i) => {
        const fileUrl = hw.attachmentSignedUrls?.[i]; // The secure link from backend
        
        return (
          <div
            key={i}
            onClick={(e) => e.stopPropagation()} // Prevent card from toggling
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", borderRadius: 10,
              background: C.bg, border: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 16 }}>{fileIcon(hw.attachmentTypes?.[i])}</span>
            <span style={{ 
              flex: 1, fontSize: 12, color: C.deep, 
              fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }}>
              {name}
            </span>
            
            <div style={{ display: "flex", gap: 6 }}>
              {/* VIEW OPTION */}
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 10px", borderRadius: 6,
                    background: C.white, border: `1px solid ${C.border}`,
                    color: C.accent, fontSize: 10, fontWeight: 700,
                    textDecoration: "none", cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = C.mist + '33'}
                  onMouseOut={(e) => e.currentTarget.style.background = C.white}
                >
                  <Eye size={12} /> VIEW
                </a>
              )}
              
              {/* DOWNLOAD OPTION */}
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={name}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "6px", borderRadius: 6,
                    background: C.white, border: `1px solid ${C.border}`,
                    color: C.slate, cursor: "pointer"
                  }}
                >
                  <Download size={13} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function HomeworkPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filterType, setFilterType]   = useState("ALL");

  useEffect(() => { fetchAssignments(); }, []);

  async function fetchAssignments() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/api/student/homework`, {
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

  const FILTERS = ["ALL", "REGULAR", "HOLIDAY", "WEEKEND", "PROJECT"];

  const filtered = filterType === "ALL"
    ? assignments
    : assignments.filter((a) => a.type === filterType);

  const counts = assignments.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  const overdue = assignments.filter(
    (a) => a.dueDate && new Date(a.dueDate) < new Date()
  ).length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
        .hw-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 640px)  { .hw-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1100px) { .hw-grid { grid-template-columns: repeat(3, 1fr); } }
        .hw-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(56,73,89,0.12) !important;
        }
        .filter-pill { transition: all 0.15s ease; }
        .filter-pill:hover { opacity: 0.85; }
      `}</style>

      <div style={{
        padding: "clamp(16px, 3vw, 28px) clamp(16px, 3vw, 32px)",
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }} className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 4, height: 28, borderRadius: 99,
              background: `linear-gradient(180deg, ${C.sky}, ${C.deep})`,
              flexShrink: 0,
            }} />
            <div>
              <h1 style={{
                margin: 0,
                fontSize: "clamp(18px, 5vw, 26px)",
                fontWeight: 800,
                color: C.text,
                letterSpacing: "-0.5px",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                Homework
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: C.textLight, fontWeight: 500 }}>
                Assignments published by your teachers
              </p>
            </div>
          </div>

          {/* Stat pills */}
          {!loading && assignments.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 10,
                background: C.white, border: `1px solid ${C.border}`,
                fontSize: 12, color: C.deep, fontWeight: 600,
              }}>
                <FileText size={13} color={C.slate} />
                {assignments.length} total
              </div>
              {overdue > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 10,
                  background: "#fee2e2", border: "1px solid #fca5a5",
                  fontSize: 12, color: "#b91c1c", fontWeight: 700,
                }}>
                  <AlertCircle size={13} />
                  {overdue} overdue
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 14px", borderRadius: 12,
            background: "#fee8e8", border: "1px solid #f5b0b0",
            marginBottom: 16, fontSize: 13, color: "#8b1c1c",
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Filter pills ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }} className="fade-up">
          {FILTERS.map((f) => {
            const count = f === "ALL" ? assignments.length : (counts[f] || 0);
            const active = filterType === f;
            return (
              <button
                key={f}
                className="filter-pill"
                onClick={() => setFilterType(f)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${active ? C.deep : C.border}`,
                  background: active ? C.deep : C.white,
                  color: active ? "#fff" : C.textLight,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                    background: active ? "rgba(255,255,255,0.22)" : `${C.mist}99`,
                    color: active ? "#fff" : C.slate,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="hw-grid">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "60px 0", gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: `${C.mist}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Inbox size={28} color={C.slate} />
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.deep }}>
              No assignments found
            </p>
            <p style={{ margin: 0, fontSize: 12, color: C.textLight }}>
              {filterType === "ALL"
                ? "Your teachers haven't published any homework yet"
                : `No ${filterType.toLowerCase()} assignments`}
            </p>
          </div>
        ) : (
          <div className="hw-grid fade-up">
            {filtered.map((hw) => (
              <AssignmentCard key={hw.id} hw={hw} />
            ))}
          </div>
        )}
      </div>

      
    </>
  );
  
}